/**
 * Host half of the mind-map plugin: the LOCAL MODEL BRIDGE.
 *
 * The whole feature still lives in the client half (`./client`): the projection
 * adapter, the layout, and the layering engine need the Conversation
 * projections and the DOM. What the client cannot do is call a model — a browser
 * bundle reaches no `llm` service, and this package's client factory only
 * receives `require`. The host half therefore owns exactly one thing: the
 * documented `ctx.llm.stream` call behind two same-origin HTTP routes, so the
 * 「智能分层」 button in the view can have a model judge 下推 / 换行 / 回溯
 * while the offline lexical engine stays the default and the fallback.
 *
 * Why an HTTP route rather than a Remote namespace: a Remote the client can
 * address needs a generated Typert schema shipped with the package, which is a
 * build step this repo deliberately does not have (see README「开发」). A named
 * route on `ctx.webServer` needs no codegen, no wire schema, and no client
 * service injection — and `fetch` is already available in the page that hosts
 * the view. The cost is that the bridge is a local HTTP surface; it is
 * therefore narrow by construction (two exact paths, JSON only, a body cap, a
 * token cap, a temperature cap, and a timeout) and it never returns anything but
 * the model's raw text, so no provider credential or service handle can leak
 * through it.
 *
 * Route contract (all JSON, all same-origin):
 *
 *   GET  /plugin-mindmap/info
 *     → { ok, llm: boolean, providers: [{id,name}], default: {provider, model} }
 *     Reports whether a model call is possible and which route it would take.
 *
 *   POST /plugin-mindmap/layer
 *     ← { system, user, provider?, model?, temperature?, maxTokens?, timeoutMs? }
 *     → { ok: true, text, provider, model, usage } | { ok: false, error, message }
 *
 * The prompt text itself is owned by the client half (it is also a UI asset the
 * user can read and copy), so the host never hardcodes it: this module is a
 * transport, not a policy holder.
 */

/** Route prefix owned by this plugin. Both routes are `exact`, so a collision
 * with another package's prefix (e.g. the API gateway's `/api`) is impossible. */
const ROUTE_BASE = "/plugin-mindmap";

/** Largest accepted request body. The prompt is a few KB; 256 KiB is generous
 * and still bounds one request's memory. */
const MAX_BODY_BYTES = 262144;

/** Hard caps applied to whatever the client asks for. */
const MAX_TOKENS_DEFAULT = 700;
const MAX_TOKENS_LIMIT = 2000;
const TEMPERATURE_MIN = 0;
const TEMPERATURE_MAX = 1;
const TIMEOUT_DEFAULT_MS = 90000;
const TIMEOUT_MIN_MS = 5000;
const TIMEOUT_MAX_MS = 300000;

/**
 * Clamp a numeric field into a range, falling back when it is not a number.
 * @param value - candidate from the request body.
 * @param min - inclusive lower bound.
 * @param max - inclusive upper bound.
 * @param fallback - used when `value` is not a finite number.
 * @returns a finite number inside the range.
 */
function clampNumber(value, min, max, fallback) {
	const number = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(number)) return fallback;
	return Math.min(max, Math.max(min, number));
}

/**
 * Write one JSON response.
 * @param res - node response.
 * @param status - HTTP status.
 * @param payload - JSON-serializable body.
 */
function sendJson(res, status, payload) {
	let body;
	try {
		body = JSON.stringify(payload);
	} catch {
		body = JSON.stringify({ ok: false, error: "unserializable", message: "the reply could not be encoded" });
		status = 500;
	}
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store",
		"content-length": Buffer.byteLength(body)
	});
	res.end(body);
}

/**
 * Read and parse a bounded JSON request body.
 *
 * A body over {@link MAX_BODY_BYTES} is refused and the socket is drained, so a
 * runaway sender cannot pin memory; malformed JSON is a client error, never a
 * thrown exception inside the route.
 *
 * @param req - node request.
 * @returns the parsed value, or an error tag.
 */
function readJsonBody(req) {
	return new Promise((resolve) => {
		const chunks = [];
		let size = 0;
		let settled = false;
		const finish = (result) => {
			if (settled) return;
			settled = true;
			resolve(result);
		};
		req.on("data", (chunk) => {
			if (settled) return;
			size += chunk.length;
			if (size > MAX_BODY_BYTES) {
				finish({ ok: false, error: "body-too-large", message: `request body exceeds ${MAX_BODY_BYTES} bytes` });
				return;
			}
			chunks.push(chunk);
		});
		req.on("end", () => {
			if (settled) return;
			const raw = Buffer.concat(chunks).toString("utf8");
			if (raw.trim().length === 0) {
				finish({ ok: false, error: "empty-body", message: "the request carried no JSON body" });
				return;
			}
			try {
				finish({ ok: true, value: JSON.parse(raw) });
			} catch (error) {
				finish({ ok: false, error: "bad-json", message: `request body is not JSON: ${String(error?.message ?? error)}` });
			}
		});
		req.on("error", (error) => finish({ ok: false, error: "request-error", message: String(error?.message ?? error) }));
	});
}

/**
 * The plain text of one completed assistant turn.
 *
 * Text deltas are the streaming surface, but a provider may hand back only
 * `block-end` frames; taking the block's text as a fallback is what keeps a
 * route from silently returning an empty fragment on such an adapter.
 *
 * @param deltas - accumulated text-delta text.
 * @param blocks - text blocks seen in `block-end` chunks.
 * @returns the reply text.
 */
function replyText(deltas, blocks) {
	if (deltas.length > 0) return deltas;
	return blocks.join("");
}

/**
 * Run one model call and return its whole text.
 *
 * `ctx.llm.stream` reports adapter, dispatch, and iteration failures as a
 * terminal `finish` chunk whose reason is `error`/`aborted`, so the finish
 * reason is inspected rather than assumed: a failed call must not look like an
 * empty but successful reply.
 *
 * @param llm - the live `llm` service.
 * @param request - validated call request.
 * @param signal - cancellation, already wired to the timeout and the response.
 * @returns the reply text plus route metadata.
 */
async function streamLayer(llm, request, signal) {
	const options = {
		provider: request.provider,
		model: request.model,
		messages: [{ role: "user", content: [{ type: "text", text: request.user }] }],
		temperature: request.temperature,
		maxTokens: request.maxTokens,
		signal
	};
	if (request.system.length > 0) options.system = request.system;
	let deltas = "";
	const blocks = [];
	let usage;
	let reason;
	for await (const chunk of llm.stream(options)) {
		if (chunk === null || typeof chunk !== "object") continue;
		if (chunk.type === "text-delta" && typeof chunk.text === "string") deltas += chunk.text;
		else if (chunk.type === "block-end" && typeof chunk.block?.text === "string") blocks.push(chunk.block.text);
		else if (chunk.type === "usage" && typeof chunk.usage === "object") usage = chunk.usage;
		else if (chunk.type === "finish") reason = chunk.reason;
	}
	if (reason !== undefined && typeof reason === "object" && reason !== null) {
		if (reason.kind === "error" || reason.kind === "aborted") {
			const failure = reason.failure ?? {};
			const error = new Error(String(failure.message ?? reason.kind));
			error.code = String(failure.code ?? reason.kind);
			throw error;
		}
	}
	return { text: replyText(deltas, blocks), usage };
}

/**
 * Validate one `POST /layer` body.
 * @param value - parsed JSON body.
 * @returns the normalized request, or an error tag.
 */
function normalizeLayerRequest(value) {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return { ok: false, error: "bad-request", message: "the body must be a JSON object" };
	}
	const user = typeof value.user === "string" ? value.user : "";
	if (user.trim().length === 0) return { ok: false, error: "no-prompt", message: "`user` (the rendered layering prompt) is required" };
	return {
		ok: true,
		request: {
			system: typeof value.system === "string" ? value.system : "",
			user,
			provider: typeof value.provider === "string" ? value.provider : "",
			model: typeof value.model === "string" ? value.model : "",
			temperature: clampNumber(value.temperature, TEMPERATURE_MIN, TEMPERATURE_MAX, 0.3),
			maxTokens: Math.round(clampNumber(value.maxTokens, 1, MAX_TOKENS_LIMIT, MAX_TOKENS_DEFAULT)),
			timeoutMs: Math.round(clampNumber(value.timeoutMs, TIMEOUT_MIN_MS, TIMEOUT_MAX_MS, TIMEOUT_DEFAULT_MS))
		}
	};
}

/**
 * Resolve the provider/model route for one call.
 *
 * The request wins; otherwise the harness' own default selection is used, which
 * is what the user already configured for this profile — so the bridge works
 * with no plugin-specific model settings at all.
 *
 * @param ctx - host context.
 * @param request - normalized request.
 * @returns the resolved route, or an error tag.
 */
function resolveRoute(ctx, request) {
	let fallback = {};
	try {
		const selection = ctx.get("agentDefaultModel")?.currentSelection?.();
		if (selection !== null && typeof selection === "object") fallback = selection;
	} catch {
		/* no default selection available: the request must carry its own route */
	}
	const provider = request.provider.length > 0 ? request.provider : String(fallback.provider ?? "");
	const model = request.model.length > 0 ? request.model : String(fallback.model ?? "");
	if (provider.length === 0 || model.length === 0) {
		return { ok: false, error: "no-route", message: "no provider/model: pass them in the body or configure a default model in DSH settings" };
	}
	return { ok: true, provider, model };
}

/**
 * The `llm` service, when this composition has one.
 * @param ctx - host context.
 * @returns the service, or undefined.
 */
function llmService(ctx) {
	try {
		const llm = ctx.get("llm");
		return llm !== undefined && typeof llm.stream === "function" ? llm : undefined;
	} catch {
		return undefined;
	}
}

/**
 * `GET /info` — can this bridge reach a model, and through which route.
 * @param ctx - host context.
 * @param res - node response.
 */
function handleInfo(ctx, res) {
	const llm = llmService(ctx);
	let providers = [];
	let selection = null;
	try {
		const list = llm === undefined ? undefined : llm.listProviders?.();
		if (Array.isArray(list)) providers = list.map((entry) => ({ id: String(entry?.id ?? ""), name: String(entry?.name ?? entry?.id ?? "") }));
	} catch {
		providers = [];
	}
	try {
		const current = ctx.get("agentDefaultModel")?.currentSelection?.();
		if (current !== null && typeof current === "object") {
			selection = { provider: String(current.provider ?? ""), model: String(current.model ?? "") };
		}
	} catch {
		selection = null;
	}
	sendJson(res, 200, {
		ok: true,
		version: 1,
		llm: llm !== undefined,
		providers,
		default: selection,
		limits: { maxTokens: MAX_TOKENS_LIMIT, maxBodyBytes: MAX_BODY_BYTES, timeoutMs: TIMEOUT_MAX_MS }
	});
}

/**
 * `POST /layer` — one model call, answered with the model's raw text.
 * @param ctx - host context.
 * @param req - node request.
 * @param res - node response.
 */
async function handleLayer(ctx, req, res) {
	const llm = llmService(ctx);
	if (llm === undefined) {
		sendJson(res, 503, { ok: false, error: "no-llm", message: "this composition has no `llm` service, so the model path is unavailable" });
		return;
	}
	const body = await readJsonBody(req);
	if (!body.ok) {
		sendJson(res, body.error === "body-too-large" ? 413 : 400, body);
		return;
	}
	const normalized = normalizeLayerRequest(body.value);
	if (!normalized.ok) {
		sendJson(res, 400, normalized);
		return;
	}
	const route = resolveRoute(ctx, normalized.request);
	if (!route.ok) {
		sendJson(res, 409, route);
		return;
	}
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), normalized.request.timeoutMs);
	// A closed connection means nobody will read the reply: stop paying for it.
	res.on("close", () => controller.abort());
	try {
		const result = await streamLayer(llm, { ...normalized.request, provider: route.provider, model: route.model }, controller.signal);
		sendJson(res, 200, {
			ok: true,
			text: result.text,
			provider: route.provider,
			model: route.model,
			usage: result.usage ?? null
		});
	} catch (error) {
		const message = String(error?.message ?? error);
		const aborted = controller.signal.aborted;
		sendJson(res, aborted ? 504 : 502, {
			ok: false,
			error: aborted ? "timeout" : String(error?.code ?? "llm-failed"),
			message
		});
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Mount the bridge on the host web carrier.
 *
 * The routes are registered through the context's effect chain (cordis disposes
 * them with the plugin), and every failure is answered as JSON: a route that
 * throws would otherwise reach the carrier as an empty 500 and the view could
 * not tell "no model configured" from "the harness is broken".
 *
 * @param ctx - host context.
 */
function apply(ctx) {
	const webServer = ctx.get("webServer");
	if (webServer === undefined || typeof webServer.register !== "function") {
		ctx.logger?.warn?.("@nydsg/dsh-mindmap: no webServer in this composition — the model bridge is disabled (the offline engine still works)");
		return;
	}
	/**
	 * Register one route and tie its lifetime to this plugin.
	 *
	 * The carrier awaits the handler, so the wrapper RETURNS a promise that
	 * settles only after the response has been written — and that promise never
	 * rejects: a rejection would reach the carrier as an unhandled handler
	 * failure with an empty reply, which is exactly the diagnostic the view
	 * cannot live without.
	 *
	 * @param path - exact pathname.
	 * @param handler - handler owning the response.
	 */
	const route = (path, handler) => {
		const dispose = webServer.register({
			kind: "exact",
			path,
			handler: (req, res) => {
				let result;
				try {
					result = handler(req, res);
				} catch (error) {
					ctx.logger?.warn?.(`@nydsg/dsh-mindmap: ${path} threw: ${String(error?.message ?? error)}`);
					sendJson(res, 500, { ok: false, error: "bridge-failed", message: String(error?.message ?? error) });
					return Promise.resolve();
				}
				return Promise.resolve(result).catch((error) => {
					ctx.logger?.warn?.(`@nydsg/dsh-mindmap: ${path} failed: ${String(error?.message ?? error)}`);
					try {
						sendJson(res, 500, { ok: false, error: "bridge-failed", message: String(error?.message ?? error) });
					} catch {
						/* the response is already gone */
					}
				});
			}
		});
		ctx.effect(() => dispose, `@nydsg/dsh-mindmap: ${path}`);
	};
	route(`${ROUTE_BASE}/info`, (req, res) => {
		if (req.method !== "GET" && req.method !== "HEAD") {
			sendJson(res, 405, { ok: false, error: "method-not-allowed", message: "GET /plugin-mindmap/info" });
			return;
		}
		handleInfo(ctx, res);
	});
	route(`${ROUTE_BASE}/layer`, (req, res) => {
		if (req.method !== "POST") {
			sendJson(res, 405, { ok: false, error: "method-not-allowed", message: "POST /plugin-mindmap/layer" });
			return;
		}
		return handleLayer(ctx, req, res);
	});
}

export { apply };

/** The host half needs the web carrier to mount its bridge on. Declared as a
 * hard dependency so the routes are registered against a live service; a
 * composition without it simply leaves the plugin's host fiber pending, and the
 * client half keeps working offline. */
export const inject = ["webServer"];
