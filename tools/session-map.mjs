/**
 * Render one REAL session log as the map this plugin would draw for it.
 *
 * Every other tool in this repo runs on fixtures I wrote. This one runs the plugin's
 * own engine over a session that actually happened: it reads the multi-frame zstd log
 * under `~/.dsh/sessions`, reconstructs each turn's question and reply, resolves the
 * branch forest with the same `resolveLinks` the view calls, derives the layering
 * state with the same `layerState`, and lays the tree out with the same
 * `layoutTree` / `placeTree` / `edgePath`. Nothing is re-implemented and nothing is
 * sampled — so what it prints is the judgment the plugin would make, on your data.
 *
 * Three outputs:
 *
 *  1. the document's three operations per turn (下推 / 换行 / 回溯) with the score that
 *     decided it, as an indented tree;
 *  2. the document's `{{MINDMAP_STATE}}` — the clean Markdown nested list a model
 *     judge would be given;
 *  3. a standalone HTML page drawn from the plugin's OWN stylesheet and geometry, and
 *     a PNG of it when a Chromium-based browser is available.
 *
 * Run: node tools/session-map.mjs [sessionId|latest] [outDir] [--depth N]
 *   node tools/session-map.mjs latest .            # newest session, artifacts here
 *   node tools/session-map.mjs session-62bb… ./out
 */

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { zstdDecompressSync } from "node:zlib";
import vm from "node:vm";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = readFileSync(join(REPO, "lib", "client.js"), "utf8");

// ── arguments ─────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
/** `--depth N` overrides the resolver's documented level cap for this run. */
const depthAt = argv.indexOf("--depth");
const DEPTH = depthAt >= 0 ? Number(argv[depthAt + 1]) : 5;
const positional = argv.filter((arg, index) => !arg.startsWith("--") && !(depthAt >= 0 && index === depthAt + 1));
const WANTED = positional[0] ?? process.env.DSH_SESSION_ID ?? "latest";
const OUT_DIR = resolve(positional[1] ?? process.cwd());

// ── the plugin's own engine ───────────────────────────────────────────────

/** Extract one `//#region name` block from the bundle. */
function regionOf(name) {
	const start = SOURCE.indexOf(`//#region ${name}`);
	if (start < 0) throw new Error(`session-map: region ${name} not found in lib/client.js`);
	const end = SOURCE.indexOf("//#endregion", start);
	return SOURCE.slice(SOURCE.indexOf("\n", start) + 1, end);
}

const sandbox = { Intl, Math, JSON, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const api = vm.runInContext(
	`(function () {
		${regionOf("lib/client/lexical.js")}
		${regionOf("lib/client/branching.js")}
		${regionOf("lib/client/layout.js")}
		${regionOf("lib/client/prompt.js")}
		${regionOf("lib/client/layering.js")}
		return {
			resolveLinks, layoutTree, placeTree, edgePath,
			layerConfig, layerState, layerSummary, layerOperationOf, layerFragmentMarkdown,
			LAYER_OPERATIONS, LINK_MIN_SCORE, LINK_MAX_DEPTH, LINK_MAX_AGE
		};
	})()`,
	sandbox,
	{ filename: "session-map-regions.js" }
);

const cfg = api.layerConfig({ maxDepth: DEPTH });

// ── the session log ───────────────────────────────────────────────────────

const SESSIONS = join(homedir(), ".dsh", "sessions");

/**
 * Every `session.v4.jsonl.zstd` under the sessions root, newest first.
 * @returns `{ id, path, mtime }[]`.
 */
function sessionFiles() {
	const found = [];
	const walk = (dir, depth) => {
		if (depth > 3) return;
		let entries;
		try {
			entries = readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const path = join(dir, entry.name);
			if (entry.isDirectory()) walk(path, depth + 1);
			else if (entry.name.endsWith(".jsonl.zstd")) {
				const id = path.split(/[\\/]/).find((part) => part.startsWith("session-")) ?? entry.name;
				found.push({ id, path, mtime: statSync(path).mtimeMs });
			}
		}
	};
	walk(SESSIONS, 0);
	return found.sort((left, right) => right.mtime - left.mtime);
}

/**
 * Decompress one session log into its records.
 *
 * The on-disk shape is a SEQUENCE of zstd frames, one per append, so a single
 * `zstdDecompressSync` returns only the first frame (the 199-byte session header) of
 * a multi-megabyte file. Each frame is located by its magic number and decompressed
 * on its own, then the JSONL lines are joined; a truncated tail line (a live session
 * still being written) is skipped rather than fatal.
 *
 * @param path - session file.
 * @returns parsed records.
 */
function records(path) {
	const buffer = readFileSync(path);
	const magic = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
	const offsets = [];
	let at = 0;
	for (;;) {
		const found = buffer.indexOf(magic, at);
		if (found < 0) break;
		offsets.push(found);
		at = found + magic.length;
	}
	const chunks = [];
	for (let index = 0; index < offsets.length; index += 1) {
		const start = offsets[index];
		const end = index + 1 < offsets.length ? offsets[index + 1] : buffer.length;
		try {
			const out = zstdDecompressSync(buffer.subarray(start, end));
			if (out.length > 0) chunks.push(out.toString("utf8"));
		} catch {
			/* a frame still being written cannot be read yet */
		}
	}
	const parsed = [];
	for (const line of chunks.join("").split("\n")) {
		if (line.length === 0) continue;
		try {
			parsed.push(JSON.parse(line));
		} catch {
			/* truncated tail */
		}
	}
	return parsed;
}

/**
 * Whether a `user/message` record is something a person typed.
 *
 * The structural test comes first because it is exact: a real human message carries
 * `source.kind === "user"` plus an `rpcId` and a `clientTimeZone`, while everything
 * the harness splices in declares itself — `runtime-context` (the policy snapshot),
 * `plugin:hindsight` (the memory guide), `tool-jobs` (a "background job finished"
 * notice). Those notices are the ones worth catching structurally: they arrive at the
 * same point in the transcript as a question, so a text-only filter happily counts
 * "background job pwsh-49 …" as a turn and then pairs it with the next reply.
 *
 * The text heuristics stay as a backstop for a build that changes the source shape —
 * they are what `tools/measure-sessions.mjs` has always used.
 *
 * @param record - the parsed `user/message` record.
 * @returns true for a human question.
 */
function isHumanQuestion(record) {
	const kind = record?.data?.source?.kind;
	if (typeof kind === "string") {
		if (kind !== "user") return false;
		return true;
	}
	const text = contentText(record?.data?.content);
	const trimmed = text.trim();
	if (trimmed.length === 0 || trimmed.length > 1200) return false;
	if (trimmed.startsWith("<")) return false;
	if (/^Current runtime context/i.test(trimmed)) return false;
	if (/^The approval policy changed/i.test(trimmed)) return false;
	if (/^background job /i.test(trimmed)) return false;
	if (/^Reminder — this repo's Hindsight tools/i.test(trimmed)) return false;
	return true;
}

/**
 * Concatenate every `text` part of a content list.
 * @param content - the record's content array.
 * @returns the joined text.
 */
function contentText(content) {
	if (!Array.isArray(content)) return "";
	return content
		.filter((part) => part !== null && typeof part === "object" && part.type === "text" && typeof part.text === "string")
		.map((part) => part.text.trim())
		.filter((text) => text.length > 0)
		.join("\n");
}

/**
 * Pull `[prompt, answer]` turns out of one session's records.
 * @param list - parsed records.
 * @returns turns in order.
 */
function turnsOf(list) {
	const turns = [];
	let current = null;
	for (const record of list) {
		if (record?.type === "user/message") {
			if (!isHumanQuestion(record)) continue;
			const question = contentText(record.data?.content);
			if (question.trim().length === 0) continue;
			current = { prompt: question, reply: "" };
			turns.push(current);
		} else if (record?.type === "assistant/message" && current !== null) {
			const reply = contentText(record.data?.message?.content);
			if (reply.length > 0) current.reply = current.reply.length === 0 ? reply : `${current.reply}\n${reply}`;
		}
	}
	return turns.filter((turn) => turn.prompt.length > 0);
}

const files = sessionFiles();
const chosen = WANTED === "latest"
	? files[0]
	: files.find((entry) => entry.id === WANTED || entry.id.includes(WANTED)) ?? files[0];
if (chosen === undefined) {
	console.error(`session-map: no session log found under ${SESSIONS}`);
	process.exit(1);
}

const raw = turnsOf(records(chosen.path));
if (raw.length === 0) {
	console.error(`session-map: ${chosen.id} has no readable human turn`);
	process.exit(1);
}

const turns = raw.map((turn, index) => ({
	id: `turn:${index + 1}`,
	number: index + 1,
	ordinal: index + 1,
	modules: [],
	promptText: turn.prompt,
	answerText: turn.reply,
	text: turn.prompt,
	hasPrompt: true,
	running: false,
	error: false,
	interrupted: false,
	label: `第 ${index + 1} 轮`
}));

const branch = api.resolveLinks(turns, new Map(), { maxDepth: DEPTH });
const state = api.layerState(turns, branch, cfg);
const summary = api.layerSummary(state);

// ── the text report ───────────────────────────────────────────────────────

/** Human name of a link kind, as the badge renders it. */
const KIND = {
	root: "起始",
	title: "总标题",
	previous: "接上一轮",
	auto: "词面命中",
	sibling: "同级并列",
	manual: "手动指定",
	model: "模型判定"
};
/** The operation tag for one turn, e.g. `[回溯]`. */
const tagOf = (operation) => api.LAYER_OPERATIONS.find((entry) => entry.id === operation)?.tag ?? "[?]";
/** The document's own name for one operation. */
const nameOf = (operation) => api.LAYER_OPERATIONS.find((entry) => entry.id === operation)?.zh ?? String(operation);

const lines = [];
lines.push(`# 本会话导图（插件自己的判定）`);
lines.push("");
lines.push(`   日志   ${chosen.path}`);
lines.push(`   会话   ${chosen.id}`);
lines.push(`   引擎   lib/client.js（阈值 LINK_MIN_SCORE = ${api.LINK_MIN_SCORE}，层级上限 ${api.LINK_MAX_DEPTH}，回看 ${api.LINK_MAX_AGE} 轮）`);
lines.push(`   轮数   ${turns.length}（只取真人提问；宿主注入的上下文块已滤除）`);
lines.push(`   操作   下推 ${summary.push} · 换行 ${summary.sibling} · 回溯 ${summary.branch}（模型判定 ${summary.model} · 手动 ${summary.manual}）`);
lines.push("");
lines.push(`## 一、逐轮判定（缩进 = 父节点；方括号 = 文档定义的操作）`);
lines.push("");

const childrenOf = (id) => state.nodes.filter((node) => node.parentId === id);
const roots = state.nodes.filter((node) => node.parentId === null);
const walk = (node, depth) => {
	const score = node.kind === "auto" ? ` 命中 ${node.score.toFixed(2)}` : node.kind === "sibling" ? ` 层级上限` : "";
	const parent = node.parentId === null ? "总标题" : `#${state.byId.get(node.parentId)?.number}`;
	lines.push(`   ${"│  ".repeat(depth)}${depth > 0 ? "├─ " : ""}${tagOf(node.operation)} #${node.number} ${node.label}`);
	lines.push(`   ${"│  ".repeat(depth)}${depth > 0 ? "│  " : ""}  ${KIND[node.kind] ?? node.kind}${score} · 父 ${parent} · 第 ${node.depth} 层`);
	for (const child of childrenOf(node.id)) walk(child, depth + 1);
};
if (roots.length === 0) lines.push("   （没有可成图的轮次）");
for (const root of roots) walk(root, 0);

lines.push("");
lines.push(`## 二、文档的 {{MINDMAP_STATE}}（干净嵌套列表，无标注）`);
lines.push("");
for (const line of (state.markdown.length > 0 ? state.markdown : "（空）").split("\n")) lines.push(`   ${line}`);

const report = lines.join("\n");
console.log(report);

// ── the picture ───────────────────────────────────────────────────────────

const css = SOURCE.match(/const CSS = `([\s\S]*?)`;\n/)[1];
const localeBlock = SOURCE.match(/const zh = \{([\s\S]*?)\n\t\t\};/)[1];
const zh = {};
for (const match of localeBlock.matchAll(/"([^"]+)":\s*"((?:[^"\\]|\\.)*)"/g)) zh[match[1]] = match[2].replace(/\\"/g, '"');
/** Locale lookup with `{name}` substitution, mirroring the plugin's seat. */
const t = (key, vars = {}) => String(zh[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`));
const esc = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const CARD_W = 268;
const layout = api.layoutTree(branch, Math.max(12, DEPTH));
/** Estimated card height — the one value the real view measures instead. */
const heights = new Map();
for (const entry of layout.nodes) {
	const prompt = entry.node.turn.promptText;
	const inner = CARD_W - 22;
	const rows = Math.min(4, Math.max(1, Math.ceil((prompt.length * 12.4) / inner)));
	heights.set(entry.node.turn.id, entry.node.turn.id === "__title__" ? 104 : 17 + rows * 20 + 17 + 6);
}
const placed = api.placeTree(layout, heights);
const anchor = placed.boxes.find((box) => box.parentId === "__root__");

/** One turn card, with the operation badge the 1.4.1 view draws. */
function card(box) {
	const turn = box.node.turn;
	const node = state.byId.get(turn.id);
	const fromAnchor = box.parentId === "__title__";
	const link = fromAnchor
		? t("branch.firstTag")
		: box.node.link.kind === "root"
			? t("branch.rootTag")
			: box.node.link.kind === "manual"
				? t("branch.manualTag")
				: box.node.link.kind === "sibling"
					? t("branch.siblingTag")
					: box.node.link.kind === "previous"
						? t("branch.previousTag")
						: t("branch.autoTag", { score: box.node.link.score.toFixed(2) });
	const kids = box.node.children.length;
	return `<div class="mm-card${fromAnchor ? " mm-card--first" : ""}" style="left:${box.x}px;top:${box.y}px;width:${CARD_W}px" data-turn="${esc(turn.id)}">
	<button type="button" class="mm-card__face">
		<span class="mm-card__head">
			<span class="mm-card__no">${esc(turn.label)}</span>
			<span class="mm-card__link mm-card__link--${esc(box.node.link.kind)}">${esc(link)}</span>
		</span>
		<span class="mm-card__text">${esc(turn.promptText)}</span>
		<span class="mm-card__foot">${esc(`${tagOf(node?.operation)} ${nameOf(node?.operation)}`)}${kids > 0 ? ` · ${esc(t("branch.continues", { n: kids }))}` : ""}</span>
	</button>
</div>`;
}

const cards = placed.boxes.filter((box) => box !== anchor).map(card).join("\n");
const anchorHtml = anchor === undefined ? "" : `<div class="mm-anchor" style="left:${anchor.x}px;top:${anchor.y}px;width:${CARD_W}px">
	<div class="mm-anchor__head">
		<span class="mm-anchor__kicker">${esc(t("anchor.kicker"))}</span>
		<span class="mm-anchor__count">${esc(t("anchor.branches", { n: anchor.node.children.length }))}</span>
	</div>
	<div class="mm-anchor__text">${esc(anchor.node.turn.promptText)}</div>
	<div class="mm-anchor__foot">${esc(t("anchor.foot", { n: turns.length }))}</div>
</div>`;
const edges = placed.edges
	.map((edge) => `<path d="${api.edgePath(edge.from, edge.to)}" class="mm-edge mm-edge--${esc(edge.kind)}" fill="none"/>`)
	.join("\n");

const turnRows = state.nodes.map((node) => `<div class="mm-row mm-row--${node.operation === "push" ? "assistant" : node.operation === "branch" ? "tool" : "user"}">
	<button type="button" class="mm-row__body">
		<span class="mm-row__head">
			<span class="mm-row__kind">${esc(tagOf(node.operation))}</span>
			<span class="mm-row__seq">#${node.number} · 第 ${node.depth} 层</span>
		</span>
		<span class="mm-row__title">${esc(node.label)}</span>
	</button>
</div>`).join("\n");

const page = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>本会话导图 · ${esc(chosen.id)}</title>
<style>
:root {
	--dsw-alias-bg-layer-1: #ffffff;
	--dsw-alias-bg-layer-2: #f7f8fa;
	--dsw-alias-bg-module-platform: #ffffff;
	--dsw-alias-border-l1: rgba(20, 22, 26, 0.14);
	--dsw-alias-border-l2: rgba(20, 22, 26, 0.24);
	--dsw-alias-border-l3: rgba(20, 22, 26, 0.34);
	--dsw-alias-label-primary: #14161a;
	--dsw-alias-label-secondary: #4a4f57;
	--dsw-alias-label-tertiary: #6b7280;
	--dsw-alias-label-caption: #8b919b;
	--dsw-alias-interactive-bg-hover: rgba(20, 22, 26, 0.05);
	--dsw-alias-interactive-bg-active: rgba(20, 22, 26, 0.09);
	--dsw-alias-state-business-primary: #2f6feb;
	--dsw-alias-state-warn-primary: #b25a00;
	--dsw-alias-state-success-primary: #1f7a4d;
	--dsw-font-family: "Segoe UI", "Microsoft YaHei", system-ui, sans-serif;
	--dsw-font-markdown-code-font-family: "Cascadia Mono", Consolas, monospace;
	--dsw-corner-shape: 10px;
}
html, body { margin: 0; height: 100%; }
body { background: #ffffff; font-family: var(--dsw-font-family); }
.mm-tabs { display: flex; align-items: center; gap: 4px; padding: 0 16px; border-bottom: 1px solid var(--dsw-alias-border-l1); height: 40px; flex: none; }
.mm-tab { padding: 0 10px; height: 40px; display: inline-flex; align-items: center; font-size: 13px; color: var(--dsw-alias-label-secondary); }
.mm-tab--on { color: var(--dsw-alias-label-primary); font-weight: 600; box-shadow: inset 0 -2px 0 var(--dsw-alias-state-business-primary); }
.mm-root { display: flex; flex-direction: column; }
${css}
.mm-chart { padding-bottom: 24px; }
</style></head>
<body>
<div class="mm-scope mm-root">
	<div class="mm-tabs"><span class="mm-tab">对话</span><span class="mm-tab">轨迹</span><span class="mm-tab mm-tab--on">导图</span></div>
	<div class="mm-bar">
		<span class="mm-bar__title">${esc(t("bar.title"))}</span>
		<span class="mm-bar__meta">${esc(`${turns.length} 轮 · 只取真人提问`)}</span>
		<span class="mm-bar__meta">v1.4.1</span>
		<span class="mm-bar__spacer"></span>
		<button type="button" class="mm-btn">${esc(t("layer.modeOffline"))}</button>
		<button type="button" class="mm-btn">${esc(t("bar.depth"))} ${esc(cfg.maxDepth)}</button>
		<button type="button" class="mm-btn">${esc(t("bar.export"))}</button>
	</div>
	<div class="mm-body">
		<div class="mm-chart">
			<div class="mm-chart__title">
				<span class="mm-chart__name">${esc(t("branch.legend"))}</span>
				<span class="mm-bar__meta">${esc(t("chart.levels", { n: layout.columns }))}</span>
				<span class="mm-chart__ops">${esc(t("layer.counts", { push: summary.push, sibling: summary.sibling, branch: summary.branch }))}</span>
			</div>
			<div class="mm-canvas" style="width:${placed.width}px;height:${placed.height}px">
				<svg class="mm-canvas__edges" width="${placed.width}" height="${placed.height}" viewBox="0 0 ${placed.width} ${placed.height}" aria-hidden="true">
${edges}
				</svg>
${anchorHtml}
${cards}
			</div>
		</div>
		<aside class="mm-detail">
			<div class="mm-sec mm-layer">
				<div class="mm-sec__head">${esc(t("layer.title"))}</div>
				<div class="mm-note">${esc(t("layer.legend", { push: t("op.push"), sibling: t("op.sibling"), branch: t("op.branch") }))}</div>
				<div class="mm-note">${esc(t("layer.countsDetail", { push: summary.push, sibling: summary.sibling, branch: summary.branch, model: summary.model, manual: summary.manual }))}</div>
				<div class="mm-note">${esc(t("layer.offlineNote", { depth: cfg.maxDepth }))}</div>
			</div>
			<div class="mm-sec">
				<div class="mm-sec__head">${esc(t("layer.copyState"))}</div>
				<pre class="mm-quote">${esc(state.markdown)}</pre>
			</div>
			<div class="mm-sec">
				<div class="mm-sec__head">逐轮判定</div>
${turnRows}
			</div>
		</aside>
	</div>
</div>
</body></html>
`;

mkdirSync(OUT_DIR, { recursive: true });
const base = `mindmap-${chosen.id}`;
const htmlPath = join(OUT_DIR, `${base}.html`);
writeFileSync(htmlPath, page, "utf8");

const BROWSERS = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
];
const browser = BROWSERS.find((candidate) => {
	try {
		readFileSync(candidate);
		return true;
	} catch {
		return false;
	}
});

let pngPath = null;
if (browser !== undefined) {
	const width = Math.round(placed.width) + 440;
	const height = Math.round(placed.height) + 40 + 46 + 40 + 24 + 8;
	pngPath = join(OUT_DIR, `${base}.png`);
	const result = spawnSync(browser, [
		"--headless=new",
		"--disable-gpu",
		"--hide-scrollbars",
		"--force-device-scale-factor=1",
		"--virtual-time-budget=1500",
		`--window-size=${width},${height}`,
		`--screenshot=${pngPath}`,
		`file:///${htmlPath.replace(/\\/g, "/")}`
	], { encoding: "utf8" });
	try {
		if (readFileSync(pngPath).length === 0) pngPath = null;
	} catch {
		pngPath = null;
		console.error(result.stderr ?? "session-map: the browser produced no file");
	}
}

console.log("");
console.log(`画布   ${Math.round(placed.width)}×${Math.round(placed.height)}px · ${layout.columns} 列 · ${placed.boxes.length} 张卡片 · ${placed.edges.length} 条连线 · ${branch.roots.length} 条起始分支`);
console.log(`HTML   ${htmlPath}`);
console.log(pngPath === null ? "PNG    （未找到 Chromium 系浏览器，只输出了 HTML）" : `PNG    ${pngPath}`);
