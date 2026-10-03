/**
 * dsh-mindmap host-bridge gate.
 *
 * The host half is the only part of this plugin that talks to a live harness
 * service (`ctx.llm`) and to the browser (`ctx.webServer` routes). It cannot be
 * exercised by the client gates at all — they never load `lib/index.js` — and
 * its failure modes are the expensive ones: a route that throws instead of
 * answering, a model failure reported as an empty success, a request that is
 * never cancelled when the page goes away, or an unbounded body that a stuck
 * caller can grow in memory.
 *
 * So this gate imports the real host module and drives it against a fake cordis
 * context, a fake node request/response pair, and a fake `llm` service — the
 * same contract, none of the network. Every assertion names a property, not an
 * incidental result.
 *
 * Run: node tools/host.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

/**
 * Locate the host half by probing candidates, so a mutation copy that carries
 * only `lib/` still loads its own module rather than the original repository's.
 * @param from - directory of this script.
 * @returns the resolved module path.
 */
function hostPath(from) {
	for (const candidate of [join(from, "..", "lib", "index.js"), join(from, "lib", "index.js")]) {
		const path = resolve(candidate);
		if (existsSync(path)) return path;
	}
	throw new Error(`host gate: lib/index.js not found near ${from}`);
}

const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = hostPath(here);
const source = readFileSync(sourcePath, "utf8");
const problems = [];
const notes = [];
const ok = (condition, message) => {
	if (!condition) problems.push(message);
};

// ── fakes ─────────────────────────────────────────────────────────────────

/** A minimal event emitter matching the node request surface the bridge uses. */
function fakeRequest(method, chunks = []) {
	const listeners = new Map();
	return {
		method,
		on(name, fn) {
			const list = listeners.get(name) ?? [];
			list.push(fn);
			listeners.set(name, list);
			return this;
		},
		emit(name, value) {
			for (const fn of listeners.get(name) ?? []) fn(value);
		},
		/** Feed the body and end the request. */
		send(body) {
			const parts = chunks.length > 0 ? chunks : (body === undefined ? [] : [Buffer.from(body, "utf8")]);
			for (const part of parts) this.emit("data", part);
			this.emit("end");
		}
	};
}

/** A minimal response recorder. */
function fakeResponse(onClose) {
	const state = { status: 0, headers: null, body: "", finished: false, closeListeners: [] };
	return {
		state,
		writeHead(status, headers) {
			state.status = status;
			state.headers = headers;
		},
		end(body) {
			state.body = body;
			state.finished = true;
			if (typeof onClose === "function") onClose();
		},
		on(name, fn) {
			if (name === "close") state.closeListeners.push(fn);
			return this;
		},
		/** Simulate the page going away. */
		close() {
			for (const fn of state.closeListeners) fn();
		},
		json() {
			try {
				return JSON.parse(state.body);
			} catch {
				return null;
			}
		}
	};
}

/** A fake `llm` service that records every call and yields scripted chunks. */
function fakeLlm(script) {
	const calls = [];
	return {
		calls,
		stream(options) {
			calls.push(options);
			const chunks = typeof script === "function" ? script(options) : script;
			return {
				async *[Symbol.asyncIterator]() {
					for (const chunk of chunks) {
						if (options.signal?.aborted === true) throw new Error("aborted");
						yield chunk;
						if (chunk.type === "text-delta" && options.signal?.aborted === true) throw new Error("aborted");
					}
				}
			};
		}
	};
}

/** A fake `llm` whose stream never produces a chunk until the call is aborted.
 *
 * It also gives up after a hard deadline. That is not decoration: the assertion
 * this fake exists for is "a closed connection aborts the model call", and a
 * bridge that forgot to abort would otherwise leave the gate WAITING forever —
 * a hung gate proves nothing, while a fast failure proves the property is gone.
 */
function stallingLlm() {
	const calls = [];
	return {
		calls,
		stream(options) {
			calls.push(options);
			return {
				[Symbol.asyncIterator]() {
					return {
						next: () => new Promise((_, reject) => {
							const timer = setTimeout(() => reject(new Error("stalled: the call was never cancelled")), 1500);
							const abort = () => {
								clearTimeout(timer);
								reject(new Error("aborted by signal"));
							};
							if (options.signal?.aborted === true) abort();
							else options.signal?.addEventListener("abort", abort);
						})
					};
				}
			};
		}
	};
}

/**
 * Build a cordis-shaped host context around one fake web carrier.
 * @param options - services to expose and whether to expose a web carrier.
 * @returns the context plus the recorded routes and warnings.
 */
function fakeContext(options = {}) {
	const routes = new Map();
	const warnings = [];
	const effects = [];
	const services = {
		webServer: options.webServer === false ? undefined : {
			register(route) {
				if (routes.has(route.path)) throw new Error(`duplicate route ${route.path}`);
				routes.set(route.path, route);
				return () => routes.delete(route.path);
			}
		},
		llm: options.llm,
		agentDefaultModel: options.defaultModel === undefined ? undefined : { currentSelection: () => options.defaultModel }
	};
	const ctx = {
		logger: { warn: (message) => warnings.push(String(message)), error: (message) => warnings.push(String(message)) },
		get: (name) => services[name],
		effect: (fn, label) => {
			const dispose = fn();
			effects.push({ label, dispose });
			return () => {
				if (typeof dispose === "function") dispose();
			};
		}
	};
	return { ctx, routes, warnings, effects };
}

/**
 * Drive one request against a recorded route.
 * @param route - registered route record.
 * @param method - HTTP method.
 * @param body - raw request body, or undefined.
 * @param options - `close` to simulate the page leaving before the reply.
 * @returns the response recorder and the handler promise.
 */
async function call(route, method, body, options = {}) {
	const req = fakeRequest(method);
	const res = fakeResponse();
	const pending = Promise.resolve(route.handler(req, res));
	if (options.close === true) res.close();
	req.send(body === undefined ? undefined : (typeof body === "string" ? body : JSON.stringify(body)));
	await pending.catch(() => {});
	return res;
}

// ── the module face ───────────────────────────────────────────────────────

const module = await import(pathToFileURL(sourcePath).href);
ok(typeof module.apply === "function", "lib/index.js must export apply");
ok(Array.isArray(module.inject), "lib/index.js must export an inject array");
ok(
	Array.isArray(module.inject) && module.inject.includes("webServer"),
	"the host half must declare webServer: the bridge is mounted on it"
);
ok(!/export\s+default/.test(source), "the host half must not add a default export — the loader would take it instead of the namespace");
ok(
	/export\s*\{\s*apply\s*\}/.test(source),
	"the host half must keep the bare `export { apply }` statement the browser-facing check gate looks for"
);

// ── mounting ──────────────────────────────────────────────────────────────

{
	const { ctx, routes, warnings, effects } = fakeContext({ webServer: false });
	module.apply(ctx);
	ok(routes.size === 0, "without a web carrier nothing may be registered");
	ok(warnings.some((line) => line.includes("webServer")), "a missing web carrier must be reported, not swallowed");
	ok(effects.length === 0, "no effect may be claimed without a carrier");
}

{
	const { ctx, routes, effects } = fakeContext({ llm: fakeLlm([]) });
	module.apply(ctx);
	ok(routes.size === 2, `expected exactly two routes, got ${routes.size}`);
	ok(routes.has("/plugin-mindmap/info"), "the info route must be registered by path");
	ok(routes.has("/plugin-mindmap/layer"), "the layer route must be registered by path");
	for (const route of routes.values()) {
		ok(route.kind === "exact", `route ${route.path} must be exact — a prefix route would swallow unrelated paths`);
	}
	ok(effects.length === 2, "both routes must be tied to the plugin's effect chain so unload removes them");
	// Unloading must actually withdraw them.
	for (const entry of effects) entry.dispose();
	ok(routes.size === 0, "disposing the plugin's effects must remove both routes");
}

// ── GET /info ─────────────────────────────────────────────────────────────

{
	const { ctx, routes } = fakeContext({
		llm: fakeLlm([]),
		defaultModel: { provider: "deepseek-official", model: "deepseek-v4-pro", reasoningEffort: "high" }
	});
	module.apply(ctx);
	const info = routes.get("/plugin-mindmap/info");
	const res = await call(info, "GET");
	ok(res.state.status === 200, `GET /info must answer 200, got ${res.state.status}`);
	const body = res.json();
	ok(body?.ok === true, "GET /info must report ok");
	ok(body?.llm === true, "GET /info must report that a model call is possible");
	ok(body?.default?.provider === "deepseek-official", "GET /info must carry the profile's default provider");
	ok(String(res.state.headers?.["content-type"] ?? "").includes("application/json"), "the reply must be JSON");

	const wrong = await call(info, "POST");
	ok(wrong.state.status === 405, `a wrong method on /info must answer 405, got ${wrong.state.status}`);
}

{
	const { ctx, routes } = fakeContext({});
	module.apply(ctx);
	const res = await call(routes.get("/plugin-mindmap/info"), "GET");
	const body = res.json();
	ok(body?.llm === false, "a composition without `llm` must be reported as model-less, not as an error");
	ok(body?.default === null, "a composition without a default selection must report null");
}

// ── POST /layer ───────────────────────────────────────────────────────────

{
	const llm = fakeLlm([
		{ type: "block-start", index: 0, blockType: "text" },
		{ type: "text-delta", index: 0, text: "[下推]\n" },
		{ type: "text-delta", index: 0, text: "- Web 框架\n  - Django" },
		{ type: "usage", usage: { inputTokens: 12, outputTokens: 7 } },
		{ type: "finish", reason: { kind: "stop" } }
	]);
	const { ctx, routes } = fakeContext({ llm });
	module.apply(ctx);
	const res = await call(routes.get("/plugin-mindmap/layer"), "POST", {
		system: "SYSTEM",
		user: "USER",
		provider: "deepseek-official",
		model: "deepseek-v4-pro",
		temperature: 0.3,
		maxTokens: 400
	});
	ok(res.state.status === 200, `a successful call must answer 200, got ${res.state.status}`);
	const body = res.json();
	ok(body?.ok === true, "a successful call must report ok");
	ok(body?.text === "[下推]\n- Web 框架\n  - Django", `the reply must be the model's own text, got ${JSON.stringify(body?.text)}`);
	ok(body?.usage?.outputTokens === 7, "token usage must be passed through when the adapter reports it");
	ok(llm.calls.length === 1, "exactly one model call per request");
	const call0 = llm.calls[0];
	ok(call0.system === "SYSTEM", "the system prompt must reach the model call");
	ok(call0.temperature === 0.3, "the temperature must reach the model call");
	ok(
		Array.isArray(call0.messages) && call0.messages[0]?.role === "user"
			&& call0.messages[0].content?.[0]?.type === "text" && call0.messages[0].content[0].text === "USER",
		`the rendered layering prompt must arrive as one user text message, got ${JSON.stringify(call0.messages)}`
	);
}

// An adapter that emits no deltas but complete blocks must still produce text.
{
	const llm = fakeLlm([
		{ type: "block-end", index: 0, block: { type: "text", text: "[换行]\n- JavaScript" } },
		{ type: "finish", reason: { kind: "stop" } }
	]);
	const { ctx, routes } = fakeContext({ llm });
	module.apply(ctx);
	const res = await call(routes.get("/plugin-mindmap/layer"), "POST", { user: "U", provider: "p", model: "m" });
	ok(res.json()?.text === "[换行]\n- JavaScript", "a block-only adapter must still yield the reply text");
}

// A missing route falls back to the profile's default model selection.
{
	const llm = fakeLlm([{ type: "finish", reason: { kind: "stop" } }]);
	const { ctx, routes } = fakeContext({ llm, defaultModel: { provider: "deepseek-official", model: "deepseek-v4-pro" } });
	module.apply(ctx);
	const res = await call(routes.get("/plugin-mindmap/layer"), "POST", { user: "U" });
	ok(res.state.status === 200, `a call with no explicit route must fall back to the default selection, got ${res.state.status}`);
	ok(llm.calls[0]?.provider === "deepseek-official" && llm.calls[0]?.model === "deepseek-v4-pro", "the default route must reach the model call");
}

// With neither a request route nor a default selection the bridge must say so.
{
	const { ctx, routes } = fakeContext({ llm: fakeLlm([]) });
	module.apply(ctx);
	const res = await call(routes.get("/plugin-mindmap/layer"), "POST", { user: "U" });
	ok(res.state.status === 409, `no route at all must answer 409, got ${res.state.status}`);
	ok(res.json()?.error === "no-route", "the refusal must name the missing route");
}

// A model failure is a failure, never an empty success.
{
	const llm = fakeLlm([
		{ type: "text-delta", index: 0, text: "partial" },
		{ type: "finish", reason: { kind: "error", failure: { message: "quota exceeded", code: "rate-limit" } } }
	]);
	const { ctx, routes } = fakeContext({ llm });
	module.apply(ctx);
	const res = await call(routes.get("/plugin-mindmap/layer"), "POST", { user: "U", model: "m", provider: "p" });
	ok(res.state.status === 502, `a failed call must not answer 200, got ${res.state.status}`);
	ok(res.json()?.ok === false, "a failed call must not report ok");
	ok(String(res.json()?.message ?? "").includes("quota exceeded"), "the provider's failure message must be relayed");
}

// An aborted finish reason is also a failure, not a partial answer.
{
	const llm = fakeLlm([{ type: "finish", reason: { kind: "aborted", failure: { message: "cancelled", code: "aborted" } } }]);
	const { ctx, routes } = fakeContext({ llm });
	module.apply(ctx);
	const res = await call(routes.get("/plugin-mindmap/layer"), "POST", { user: "U", model: "m", provider: "p" });
	ok(res.state.status === 502, `an aborted model call must not answer 200, got ${res.state.status}`);
}

// Body validation: no prompt, not JSON, and over the cap.
{
	const llm = fakeLlm([]);
	const { ctx, routes } = fakeContext({ llm });
	module.apply(ctx);
	const route = routes.get("/plugin-mindmap/layer");
	const empty = await call(route, "POST", { system: "S" });
	ok(empty.state.status === 400 && empty.json()?.error === "no-prompt", "a body without `user` must be refused as a client error");
	const malformed = await call(route, "POST", "not json at all");
	ok(malformed.state.status === 400 && malformed.json()?.error === "bad-json", "a non-JSON body must be refused as a client error");
	const huge = await call(route, "POST", `{"user":"${"x".repeat(300000)}"}`);
	ok(huge.state.status === 413 && huge.json()?.error === "body-too-large", "an oversized body must be refused before it is parsed");
	ok(llm.calls.length === 0, "no refused request may reach the model");
	ok((await call(route, "GET")).state.status === 405, "a wrong method on /layer must answer 405");
}

// The caller's caps are clamped, not trusted.
{
	const llm = fakeLlm([{ type: "finish", reason: { kind: "stop" } }]);
	const { ctx, routes } = fakeContext({ llm });
	module.apply(ctx);
	await call(routes.get("/plugin-mindmap/layer"), "POST", {
		user: "U", model: "m", provider: "p", temperature: 9, maxTokens: 999999, timeoutMs: 1
	});
	const call0 = llm.calls[0];
	ok(call0.temperature <= 1, `temperature must be clamped, got ${call0.temperature}`);
	ok(call0.maxTokens <= 2000, `maxTokens must be capped, got ${call0.maxTokens}`);
	ok(typeof call0.signal?.aborted === "boolean", "every model call must carry an abort signal");
}

// The page going away cancels the call instead of paying for a reply nobody reads.
{
	const llm = stallingLlm();
	const { ctx, routes } = fakeContext({ llm });
	module.apply(ctx);
	const req = fakeRequest("POST");
	const res = fakeResponse();
	const pending = Promise.resolve(routes.get("/plugin-mindmap/layer").handler(req, res));
	req.send(JSON.stringify({ user: "U", model: "m", provider: "p" }));
	// Wait for the call to be IN FLIGHT before dropping the page: the property under
	// test is "an in-flight call is cancelled", and closing first would only prove
	// something about event ordering.
	for (let tick = 0; tick < 100 && llm.calls.length === 0; tick += 1) {
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
	ok(llm.calls.length === 1, "the call must have reached the model before the page left");
	res.close();
	await pending.catch(() => {});
	ok(llm.calls[0].signal.aborted === true, "a closed connection must abort the model call");
	ok(res.state.status === 504, `an aborted call must answer 504, got ${res.state.status}`);
}

/*
 * A route whose work rejects answers JSON.
 *
 * The carrier calls the registered wrapper, not the inner handler, so an async
 * rejection that escaped would surface as an empty 500 and the view could not
 * tell a broken bridge from an unconfigured model. A request object without
 * `on` makes the body reader reject — a real-enough failure to drive the path.
 */
{
	const { ctx, routes } = fakeContext({ llm: fakeLlm([]) });
	module.apply(ctx);
	const res = fakeResponse();
	routes.get("/plugin-mindmap/layer").handler({ method: "POST" }, res);
	await new Promise((resolve) => setTimeout(resolve, 0));
	ok(res.state.finished === true, "a rejecting route must still answer");
	ok(res.state.status === 500, `an internal failure must answer 500, got ${res.state.status}`);
	ok(res.json()?.error === "bridge-failed", "an internal failure must be labelled, not answered with an empty body");
	ok((res.state.headers?.["content-type"] ?? "").includes("application/json"), "even a failure must answer JSON");
}

notes.push(`host module: ${sourcePath}`);
notes.push(`assertions cover mounting, /info, /layer, refusals, clamping, and cancellation`);

if (problems.length === 0) {
	console.log("host: PASS (0 problems)");
	process.exit(0);
}
console.log(`host: FAIL (${problems.length} problem(s))`);
for (const problem of problems) console.log(`  - ${problem}`);
process.exit(1);
