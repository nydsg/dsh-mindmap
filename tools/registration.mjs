/**
 * dsh-mindmap registration gate.
 *
 * The gates in check.mjs/behaviour.mjs cover syntax and the pure engine. This
 * one covers the seam that only breaks at runtime: `apply(ctx)` against a
 * cordis-shaped context. It stubs the five services the plugin injects, records
 * every slot registration, and then drives the registered entry's `inject()`
 * and its component with stub hooks — exactly the path a real session takes.
 *
 * Why it exists: a plugin whose view crashes at render time is retired from its
 * slot cell by the renderer's abdicating error boundary, so the tab silently
 * disappears with no visible error. Nothing else in the repo would catch that.
 *
 * Run: node tools/registration.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import vm from "node:vm";

/**
 * Locate the bundle by probing candidates rather than assuming a fixed depth, so
 * the gate keeps working when it (or a patched copy of it) runs from elsewhere.
 * @param from - directory of this script.
 * @returns the module source.
 */
function loadSource(from) {
	const candidates = [
		join(from, "..", "lib", "client.js"),
		join(from, "lib", "client.js"),
		"D:/Codex-workspace/dsh-mindmap/lib/client.js"
	];
	for (const candidate of candidates) {
		const path = resolve(candidate);
		if (existsSync(path)) return { source: readFileSync(path, "utf8"), path };
	}
	throw new Error(`registration gate: lib/client.js not found near ${from} (tried ${candidates.join(", ")})`);
}

const here = dirname(fileURLToPath(import.meta.url));
const { source, path: sourcePath } = loadSource(here);

const problems = [];
const notes = [];
const ok = (condition, message) => {
	if (!condition) problems.push(message);
};

/**
 * Slice the bundle source between two anchors.
 * @param text - full bundle source.
 * @param from - opening anchor.
 * @param to - closing anchor, searched after `from`.
 * @returns the slice, or an empty string when either anchor is missing.
 */
function section(text, from, to) {
	const start = text.indexOf(from);
	if (start < 0) return "";
	const end = text.indexOf(to, start + from.length);
	return end < 0 ? text.slice(start) : text.slice(start, end);
}

/**
 * Slice one `#region` block out of the bundle by name.
 * @param text - full bundle source.
 * @param name - region label, e.g. `lib/client/branching.js`.
 * @returns the region body, or an empty string when absent.
 */
function regionOf(text, name) {
	const start = text.indexOf(`//#region ${name}`);
	if (start < 0) return "";
	const end = text.indexOf("//#endregion", start);
	return end < 0 ? "" : text.slice(text.indexOf("\n", start) + 1, end);
}

// ── a browser-shaped sandbox with the module loader ────────────────────────

const created = [];
const loaded = [];
const sandbox = {
	Intl,
	Math,
	JSON,
	console,
	document: {
		querySelector: () => null,
		createElement: () => {
			const el = { dataset: {}, textContent: "", setAttribute() {} };
			created.push(el);
			return el;
		},
		head: { appendChild() {} }
	},
	setTimeout,
	clearTimeout
};
sandbox.window = { __ModuleLoader__: { load: (r) => loaded.push(r) } };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

/*
 * The branch resolver is pure, so the gate drives it directly rather than through
 * the view: the properties worth pinning (a parent must be strictly earlier; the
 * resolved forest must be acyclic) are properties of that function, and checking
 * them through a rendered tree would only add emulation risk.
 */
const branchApi = vm.runInContext(
	`(function () { ${regionOf(source, "lib/client/lexical.js")}\n${regionOf(source, "lib/client/branching.js")}\nreturn { resolveLinks, cosineSimilarity, overridesToRecord, overridesFromRecord }; })()`,
	sandbox,
	{ filename: "branching-regions.js" }
);

/*
 * Function components call Hooks, and a stub without a dispatcher makes the
 * FIRST Hook call return undefined — which throws inside the body. Real React
 * supplies per-render hook slots; so does this: one slot ring per component
 * invocation, with a fresh cursor. `let`, because the walker resets the ring
 * before each component call (a `const` here threw silently inside the walker).
 */
let hookSlots = [];
let hookCursor = 0;
const hookSlot = (index, init) => {
	if (hookSlots[index] === undefined) hookSlots[index] = { value: typeof init === "function" ? init() : init, ref: { current: init ?? null } };
	return hookSlots[index];
};

const React = {
	createElement: (type, props, ...children) => ({
		type,
		props: props ?? {},
		// React flattens and drops null/undefined children; the stub must not keep
		// an empty array where React would pass undefined.
		children: children.flat(Infinity).filter((child) => child !== null && child !== undefined)
	}),
	useMemo: (fn) => fn(),
	useState: (init) => {
		const slot = hookSlot(hookCursor++, init);
		return [slot.value, (next) => {
			slot.value = typeof next === "function" ? next(slot.value) : next;
		}];
	},
	useCallback: (fn) => fn,
	useEffect: () => {},
	useRef: (init) => {
		const slot = hookSlot(hookCursor++, init);
		slot.ref.current ??= init ?? null;
		return slot.ref;
	},
	Component: class {
		constructor(props) {
			this.props = props;
			this.state = null;
		}

		setState(next) {
			this.state = { ...(this.state ?? {}), ...next };
		}
	}
};

vm.runInContext(source, sandbox, { filename: "lib/client.js" });
ok(loaded.length === 1, `expected one __ModuleLoader__.load call, saw ${loaded.length}`);
const registration = loaded[0];
ok(registration?.id === "@nydsg/dsh-mindmap", `registration id is ${JSON.stringify(registration?.id)}`);
const plugin = registration.factory((specifier) => {
	if (specifier === "react") return React;
	throw new Error(`unexpected require: ${specifier}`);
});

ok(typeof plugin.apply === "function", "client bundle does not export apply");
ok(Array.isArray(plugin.inject), "client bundle does not export an inject array");

// ── the cordis context stub ───────────────────────────────────────────────

const effects = [];
const registrations = [];
const localeDicts = new Map();

const CHAT_SNAPSHOT = {
	order: ["n1", "n2"],
	nodes: {
		get(key) {
			if (key === "n1") {
				return {
					key: "n1",
					kind: "user",
					anchorSeq: 1,
					location: { kind: "turn", turn: { turn: 1 } },
					data: { seq: 1, content: [{ type: "text", text: "帮我做一个思维导图插件，思维导图要能点击" }] }
				};
			}
			return {
				key: "n2",
				kind: "assistant-step",
				anchorSeq: 2,
				location: { kind: "step", turn: { turn: 1 }, step: { step: 0 } },
				data: { seq: 2, blocks: [{ kind: "text", text: "先确认插件形态与展示方式" }] }
			};
		}
	}
};

let targetRequested = null;
const ctx = {
	effect: (fn, label) => {
		const dispose = fn();
		effects.push({ label, dispose });
		return () => {
			if (typeof dispose === "function") dispose();
		};
	},
	logger: { warn: (m) => notes.push(`warn: ${m}`), error: (m) => problems.push(`logger.error: ${m}`) },
	locale: {
		register: (ns, dicts) => {
			ok(!localeDicts.has(ns), `locale namespace ${ns} registered twice`);
			localeDicts.set(ns, dicts);
			return () => {};
		},
		bind: (ns) => {
			const dicts = localeDicts.get(ns) ?? {};
			const zh = dicts.zh ?? {};
			return (key, params) => {
				const template = zh[key] ?? key;
				if (params === undefined) return template;
				return template.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
			};
		}
	},
	slots: {
		inject: (key, callback) => {
			ok(key === "conversation.view", `slot inject requested an unexpected key: ${key}`);
			callback();
		},
		register: (options, component) => {
			registrations.push({ options, component });
			return () => {};
		}
	},
	sessions: {
		binding: (id) => (id === "session-1" ? { sessionId: id, session: {} } : undefined),
		scope: (id) => (id === "session-1" ? { get: (name) => (name === "conversation" ? scopedConversation : undefined) } : undefined)
	},
	uiConversation: {
		binding: (binding) => ({
			target: (name) => {
				targetRequested = name;
				ok(name === "chat", `requested an unexpected projection target: ${name}`);
				return {
					getSnapshot: () => CHAT_SNAPSHOT,
					subscribe: () => () => {}
				};
			}
		})
	},
	uiSession: {
		provide: () => {
			problems.push("apply() called uiSession.provide — the `chat` hook is already owned by ui-chat and a second declaration aborts the whole session binding");
		}
	}
};

const draftWrites = [];
const scopedConversation = {
	input: {
		for: () => ({
			actions: {
				setDraft: (text) => draftWrites.push(text)
			}
		})
	}
};

// ── run apply ─────────────────────────────────────────────────────────────

try {
	plugin.apply(ctx);
} catch (error) {
	problems.push(`apply() threw: ${error.stack ?? error.message}`);
}

ok(localeDicts.size === 1, `expected exactly one locale namespace, saw ${localeDicts.size}`);
ok(registrations.length === 1, `expected exactly one slot registration, saw ${registrations.length}`);

if (registrations.length === 1) {
	const { options, component } = registrations[0];
	ok(options.name === "conversation.view", `registered into ${options.name}, expected conversation.view`);
	ok(options.id === "mindmap", `registration id is ${options.id}, expected mindmap`);
	ok(typeof options.order === "number", "registration must declare an order");
	ok(typeof options.label === "function", "registration must declare a label thunk");
	ok(typeof options.inject === "function", "registration must declare an inject factory");
	ok(typeof component === "function", "registration must supply a component");
	ok(options.label() === "导图", `label resolved to ${JSON.stringify(options.label())}, expected 导图`);
	// A view must not declare children it does not fill: declaring and never
	// filling a single slot renders an empty hole inside the view.
	ok(options.children === undefined, "this view declares no child slots and must not declare any");

	let injected = null;
	try {
		injected = options.inject("session-1");
	} catch (error) {
		problems.push(`inject() threw for a live session: ${error.stack ?? error.message}`);
	}
	ok(targetRequested === "chat", `inject() did not touch the chat projection (saw ${targetRequested})`);

	if (injected !== null) {
		/*
		 * Reproduce the renderer's inject-face binding contract exactly
		 * (`bindInjectSources`): source objects are declared under `hooks` under
		 * their RAW name and are minted into `use<Name>` props by
		 * standardHookPropName. A face that skips `hooks` has its keys passed
		 * through verbatim — which is how a raw source object once reached the view
		 * as a non-callable `useChat`. Asserting the SHAPE here, not just that the
		 * key exists, is what turns that class of mistake red.
		 */
		ok(
			injected.hooks !== undefined,
			"inject() must declare sources under `hooks`; without it the renderer passes the face through verbatim and the view receives raw source objects instead of Hooks"
		);
		const sources = injected.hooks ?? {};
		ok(
			Object.keys(sources).every((name) => !/^use[A-Z]/.test(name)),
			`inject().hooks must be keyed by RAW source names; saw ${JSON.stringify(Object.keys(sources))} — the renderer adds the use* prefix`
		);
		const bound = { ...injected };
		delete bound.hooks;
		delete bound.keyedHooks;
		for (const [name, source] of Object.entries(sources)) {
			const hookName = `use${name.charAt(0).toUpperCase()}${name.slice(1)}`;
			bound[hookName] = (selector, equal) => {
				// Stand-in for observableHook: it IS callable, which is the property
				// the real failure violated.
				const value = selector(source.getSnapshot());
				return equal === undefined ? value : value;
			};
		}
		ok(typeof bound.useChat === "function", "the bound face must expose useChat as a callable Hook");

		// The view must render with the real snapshot and with an empty one.
		for (const [label, snapshot] of [["populated", CHAT_SNAPSHOT], ["empty", null]]) {
			const face = { ...bound, useChat: (selector) => selector(snapshot) };
			try {
				const tree = component({ ...face, writeDraft: () => true, t: ctx.locale.bind("mindmap") });
				ok(tree !== null && tree !== undefined, `view rendered nothing for the ${label} snapshot`);
			} catch (error) {
				problems.push(`view threw for the ${label} snapshot: ${error.stack ?? error.message}`);
			}
		}

		/*
		 * The collapsed surface must carry the user's question and must NOT carry
		 * the assistant's reply.
		 *
		 * Asserted against the render function's SOURCE rather than by walking a
		 * rendered element tree: an earlier attempt at tree walking spent far more
		 * effort on React-emulation fidelity (hook slots, class components,
		 * props.children folding) than on the property under test, and each
		 * emulation gap showed up as a misleading red. The structural claim is
		 * exact and stable: the block face (a single button) carries the prompt, and
		 * the module rows only exist inside the `mm-block__children` panel that the
		 * `isOpen` branch produces.
		 */
		{
			const cardSource = section(source, "function renderTreeCard(", "function renderTurnModules(");
			ok(cardSource.length > 0, "could not locate renderTreeCard in the bundle");
			ok(cardSource.includes("turn.promptText"), "the tree card must render the user's prompt text");
			ok(!cardSource.includes("turn.answerText"), "the tree card must not render the assistant's reply");
			ok(!cardSource.includes("renderCard("), "the tree card must not render module rows — an expanded card would move every connector below it");
			ok(cardSource.includes('"mm-card__face"'), "the card face must be its own button");
			ok(cardSource.includes("mm-card__more"), "the deeper-branch control must be a separate button");

			// Module rows live in the side panel, not in the card, so the tree geometry
			// never depends on a card's expansion state.
			const modulesSource = section(source, "function renderTurnModules(", "function renderBranchPanel(");
			ok(modulesSource.length > 0, "could not locate renderTurnModules in the bundle");
			ok(modulesSource.includes("renderCard("), "the module rows must be rendered by the side panel");
			ok(modulesSource.includes("answerText"), "selecting a card must reveal that turn's reply in the panel");
			ok(modulesSource.includes("hasDetail"), "the module list must yield to the module analysis once a row is selected");
		}

		/*
		 * The left-hand title is what makes this ONE hierarchy instead of several
		 * unrelated entry points, so its two distinguishing properties are asserted:
		 * it cannot be selected (no button and no selection callback, because it is
		 * not a turn), and it is rendered by its own function rather than by the turn
		 * card path.
		 */
		{
			const anchorSource = section(source, "function renderAnchorCard(", "function renderTreeCard(");
			ok(anchorSource.length > 0, "could not locate renderAnchorCard in the bundle");
			ok(anchorSource.includes("mm-anchor"), "the title must have its own visual identity, not a turn card's");
			ok(!anchorSource.includes("mm-card__face"), "the title must not be a selectable card face");
			ok(!anchorSource.includes("<button"), "the title must not contain a button element");
			ok(!anchorSource.includes("onSelectTurn"), "the title must not be selectable — it is not a turn");
			ok(!anchorSource.includes("turn.modules"), "the title must not render module counts — it owns none");
			ok(source.includes("mm-card--first"), "a node entered from the title must be marked so its accent bar stays flat");
		}

		/*
		 * The layout must place nodes arithmetically. A measured layout is what
		 * produced a tree with no visible lines: coordinates were read from the DOM
		 * after paint, so they were a frame stale, and any missed pass left the
		 * connector layer empty.
		 */
		{
			const layoutSource = section(source, "function layoutTree(", "function edgePath(");
			ok(layoutSource.length > 0, "could not locate layoutTree in the bundle");
			ok(layoutSource.includes("depth * (CARD_W + COL_GAP)"), "columns must be computed from branch depth");
			ok(layoutSource.includes("placeTree"), "the layout must resolve to pixel geometry");
			ok(source.includes("function edgePath("), "the layout must own the connector geometry");
			ok(
				!layoutSource.includes("getBoundingClientRect"),
				"layout must not measure the DOM to place nodes"
			);
			// The canvas size and the card offsets both come from the same numbers, so
			// a connector can never point at a coordinate the layout did not produce.
			const placed = section(source, "function placeTree(", "/**\n\t\t * SVG path for one parent");
			ok(placed.includes("edges.push"), "placeTree must emit the connector list");
			ok(placed.includes("width") && placed.includes("height"), "placeTree must report the canvas extents");
		}

		/*
		 * A branch tree that can cycle would recurse forever. `resolveLinks` must
		 * never hand a turn a parent that is not strictly earlier, including after a
		 * hand edit names a later turn.
		 */
		{
			const turn = (id) => ({ id, number: Number(id.split(":")[1]), promptText: `问题 ${id}`, text: `问题 ${id}` });
			const turns = ["turn:1", "turn:2", "turn:3"].map(turn);
			const forward = branchApi.resolveLinks(turns, new Map([["turn:1", "turn:3"]]));
			ok(forward.nodes.get("turn:1").parent === null, "a parent that is not strictly earlier must be refused");
			const chain = branchApi.resolveLinks(turns, new Map([["turn:3", "turn:2"], ["turn:2", "turn:1"]]));
			const seen = new Set();
			let walker = chain.nodes.get("turn:3");
			let guard = 0;
			while (walker !== undefined && walker.parent !== null && guard < 10) {
				ok(!seen.has(walker.turn.id), "the resolved tree must be acyclic");
				seen.add(walker.turn.id);
				walker = chain.nodes.get(walker.parent);
				guard += 1;
			}
			ok(guard < 10, "walking the resolved parents must terminate");
			ok(chain.nodes.get("turn:3").children.length === 0, "a leaf must have no children");
			ok(chain.roots.length === 1 && chain.roots[0].turn.id === "turn:1", "the chain must resolve to exactly one root");
		}

		// The registered component must forward the locale seat to its boundary:
		// without `t` a caught error cannot render its message.
		{
			const probeProps = { ...bound, useChat: (selector) => selector(null), writeDraft: () => true, t: ctx.locale.bind("mindmap") };
			const outer = component(probeProps);
			ok(typeof outer?.props?.t === "function", "the view must pass the locale seat down to its error boundary");
			ok(outer?.children?.length >= 1, "the view must render its body inside the boundary");
		}

		try {
			const writer = injected.writeDraft;
			writer("测试草稿");
			ok(draftWrites.length === 1 && draftWrites[0] === "测试草稿", "writeDraft must reach the scoped composer actions");
		} catch (error) {
			problems.push(`writeDraft threw: ${error.stack ?? error.message}`);
		}
	}

	// An unknown session must fail loud, not render a broken tab.
	let unknownThrew = false;
	try {
		options.inject("missing-session");
	} catch {
		unknownThrew = true;
	}
	ok(unknownThrew, "inject() must throw for an unknown session id");
}

// Locale dictionaries must cover every key the view asks for. The view's keys
// are collected from the source, so a key added to the view without a
// dictionary entry fails here instead of rendering the raw key.
const zh = localeDicts.get("mindmap")?.zh ?? {};
const en = localeDicts.get("mindmap")?.en ?? {};
const usedKeys = new Set();
for (const match of source.matchAll(/\bt\(\s*"([a-z][a-zA-Z0-9_.]*)"\s*[,)]/g)) usedKeys.add(match[1]);
for (const match of source.matchAll(/\bt\(\s*`kind\.\$\{[^}]+\}`/g)) void match;
for (const key of usedKeys) {
	if (!(key in zh)) problems.push(`locale key "${key}" is used by the view but missing from the zh dictionary`);
	if (!(key in en)) problems.push(`locale key "${key}" is used by the view but missing from the en dictionary`);
}
const zhKeys = Object.keys(zh);
const enKeys = Object.keys(en);
ok(zhKeys.length === enKeys.length, `dictionaries differ in size: zh=${zhKeys.length} en=${enKeys.length}`);
for (const key of zhKeys) if (!(key in en)) problems.push(`locale key "${key}" exists in zh but not en`);

notes.push(`bundle: ${sourcePath}`);
notes.push(`locale keys: ${zhKeys.length} zh / ${enKeys.length} en; view-referenced: ${usedKeys.size}`);

// ── report ────────────────────────────────────────────────────────────────

for (const note of notes) console.log(`note: ${note}`);
if (problems.length === 0) {
	console.log("registration: PASS (0 problems)");
	process.exit(0);
}
console.log(`registration: FAIL (${problems.length} problem(s))`);
for (const problem of problems) console.log(`  - ${problem}`);
process.exit(1);
