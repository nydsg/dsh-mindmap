/**
 * Render a documentation screenshot of the mind-map view, using the plugin's OWN
 * stylesheet and its OWN layout arithmetic.
 *
 * WHY THIS EXISTS
 * ---------------
 * The README shows what the view looks like, and this machine cannot screenshot
 * the running app: the web server requires authorization, and the view only
 * exists inside a logged-in DSH page. Shipping a hand-drawn mockup instead would
 * be a picture of something the code does not necessarily do.
 *
 * So the picture is assembled from the two things that ARE the plugin:
 *
 *  - the CSS string extracted from `lib/client.js` (token block and all), so the
 *    borders, the flat surface and the type scale in the image are the real ones;
 *  - `layoutTree` + `placeTree` + `edgePath` extracted from the bundle and run on
 *    the sample conversation below, so every card position and every connector
 *    path in the image is what the plugin computes.
 *
 * What is hand-written is the DOM skeleton that wraps those numbers — a real
 * screenshot would come from React rendering `MindMapBody`. The image therefore
 * shows the layout and the styling faithfully, and the surrounding chrome
 * approximately. Keep it honest: this is a rendered preview, not a screen grab.
 *
 * The DSH `--dsw-*` tokens are not available outside the app, so the harness
 * defines light-theme values for them; the plugin's own rules only ever reference
 * the aliases it declares, so the flat surface is unaffected.
 *
 * Requires a Chromium-based browser. Run: node tools/screenshot.mjs
 */

import { readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import vm from "node:vm";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = readFileSync(join(REPO, "lib", "client.js"), "utf8");
const OUT = join(REPO, "docs", "screenshot.png");

/**
 * The sample conversation the picture shows, as `[prompt, reply]`.
 *
 * Shaped like a real session, and that shape is the point:
 *
 *  - most turns CHAIN — a question follows the answer before it, whatever the
 *    subject, which is the structural default;
 *  - turn 5 is the other case: it names an older thread's words again (loader 行 /
 *    id / 清单文件), so it rejoins that branch instead of the previous turn, and the
 *    map shows a real branch rather than one strip.
 *
 * Kept to seven turns deliberately. Because the layout opens rightwards one column
 * per level, a chain of N turns is a picture N columns wide — so even a truthful
 * sample stops being a usable screenshot somewhere around here.
 */
const SAMPLE = [
	["我要给 DSH 写一个插件，先把项目结构搭起来", "先分两半：宿主半边只导出 apply，客户端半边注册视图。"],
	["这个插件的清单文件怎么写，cordis.patch.yml 要放哪", "放在包根目录，dsh.bundle.patch 指向它；两处 @ 记得加引号，否则 YAML 解析会拒绝整个文件。"],
	["插件装完了要重启 Harness 吗", "要。客户端模块图与 bundle 路由在启动时一次性生成，热加载不会让新的 bundle 路由凭空出现。"],
	["插件的客户端半边怎么注册一个新的会话视图页签", "往 conversation.view 插槽注册，id 用页签名，改完要重启才生效。"],
	// Names the first thread's words again (清单文件 / loader 行 / id), so it rejoins
	// turn 2 instead of continuing turn 4.
	["清单文件里的 loader 行 id 能不能随便写", "id 是稳定身份，同一个 id 插两次会让启动失败。"],
	["思维导图视图的卡片配色能不能换成深色主题", "别写死颜色，全部走令牌层：卡片底色跟 --mm-fill，描边用 --mm-line-strong。"],
	["深色主题下卡片的对比度要满足多少", "正文 4.5:1，小字也一样；描边不适用那个门槛。"]
];

/** Extract one `//#region name` block from the bundle. */
function regionOf(name) {
	const start = SOURCE.indexOf(`//#region ${name}`);
	const end = SOURCE.indexOf("//#endregion", start);
	return SOURCE.slice(SOURCE.indexOf("\n", start) + 1, end);
}

// ── the plugin's own layout arithmetic ─────────────────────────────────────

const sandbox = { Intl, Math, JSON, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const api = vm.runInContext(
	`(function () {
		${regionOf("lib/client/lexical.js")}
		${regionOf("lib/client/branching.js")}
		${regionOf("lib/client/layout.js")}
		return { resolveLinks, layoutTree, placeTree, edgePath };
	})()`,
	sandbox
);

const turns = SAMPLE.map(([prompt, answer], index) => ({
	id: `turn:${index + 1}`,
	number: index + 1,
	promptText: prompt,
	// `text` and `answerText` both carry the reply: the matcher reads answerText,
	// and the panel quote below uses text.
	text: prompt,
	answerText: answer,
	hasPrompt: true,
	modules: [],
	running: false,
	error: false,
	interrupted: false,
	label: `第 ${index + 1} 轮`
}));

const branch = api.resolveLinks(turns, new Map());
const layout = api.layoutTree(branch, 12);

// ── the plugin's own stylesheet ────────────────────────────────────────────

const css = SOURCE.match(/const CSS = `([\s\S]*?)`;\n/)[1];
const localeBlock = SOURCE.match(/const zh = \{([\s\S]*?)\n\t\t\};/)[1];
const zh = {};
for (const match of localeBlock.matchAll(/"([^"]+)":\s*"((?:[^"\\]|\\.)*)"/g)) {
	zh[match[1]] = match[2].replace(/\\"/g, '"');
}
/** Locale lookup with `{name}` substitution, mirroring the plugin's seat. */
const t = (key, vars = {}) => String(zh[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`));

// ── card heights, the one value the real view measures ─────────────────────
//
// The view reads each card's painted height; here the text is known up front, so
// the height is estimated from the same numbers the CSS uses: 13px/20px text,
// 4-line clamp, 8px/10px padding, and the head/foot lines.

const CARD_W = 268;
const CHAR_W = 12.4;
/**
 * Estimate a card's painted height from its question text.
 * @param prompt - the question.
 * @returns height in pixels.
 */
function cardHeight(prompt) {
	const inner = CARD_W - 22;
	const lines = Math.min(4, Math.max(1, Math.ceil((prompt.length * CHAR_W) / inner)));
	return 17 + lines * 20 + 17 + 6;
}

const heights = new Map();
for (const entry of layout.nodes) {
	const prompt = entry.node.turn.promptText;
	heights.set(entry.node.turn.id, entry.node.turn.id === "__title__" ? 104 : cardHeight(prompt));
}
const placed = api.placeTree(layout, heights);

/** Escape text for HTML. */
const esc = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ── DOM, matching the class names and nesting the view renders ─────────────

const anchor = placed.boxes.find((box) => box.parentId === "__root__");

/**
 * One turn card.
 * @param box - placed box.
 * @returns HTML.
 */
function card(box) {
	const turn = box.node.turn;
	const fromAnchor = box.parentId === "__title__";
	const link = fromAnchor
		? t("branch.firstTag")
		: box.node.link.kind === "manual"
			? t("branch.manualTag")
			: box.node.link.kind === "previous"
				? t("branch.previousTag")
				: t("branch.autoTag", { score: box.node.link.score.toFixed(2) });
	const children = box.node.children.length;
	return `<div class="mm-card${fromAnchor ? " mm-card--first" : ""}" style="left:${box.x}px;top:${box.y}px;width:${CARD_W}px">
	<button type="button" class="mm-card__face">
		<span class="mm-card__head">
			<span class="mm-card__no">${esc(turn.label)}</span>
			<span class="mm-card__link mm-card__link--${box.node.link.kind}">${esc(link)}</span>
		</span>
		<span class="mm-card__text">${esc(turn.promptText)}</span>
		<span class="mm-card__foot">${esc(t("turn.nodes", { n: 6 }))}${children > 0 ? ` · ${esc(t("branch.continues", { n: children }))}` : ""}</span>
	</button>
</div>`;
}

const cards = placed.boxes.filter((box) => box !== anchor).map(card).join("\n");

const anchorHtml = `<div class="mm-anchor" style="left:${anchor.x}px;top:${anchor.y}px;width:${CARD_W}px">
	<div class="mm-anchor__head">
		<span class="mm-anchor__kicker">${esc(t("anchor.kicker"))}</span>
		<span class="mm-anchor__count">${esc(t("anchor.branches", { n: anchor.node.children.length }))}</span>
	</div>
	<div class="mm-anchor__text">${esc(anchor.node.turn.promptText)}</div>
	<div class="mm-anchor__foot">${esc(t("anchor.foot", { n: turns.length }))}</div>
</div>`;

const edges = placed.edges
	.map((edge) => `<path d="${api.edgePath(edge.from, edge.to)}" class="mm-edge mm-edge--${edge.kind}" fill="none"/>`)
	.join("\n");

/** A module row in the side panel, for the selected turn. */
function moduleRow(kind, seq, title, selected) {
	return `<div class="mm-row mm-row--${kind}${selected ? " mm-row--selected" : ""}">
	<button type="button" class="mm-row__body">
		<span class="mm-row__head">
			<span class="mm-row__kind">${esc(t(`kind.${kind === "assistant-step" ? "assistant" : kind}`))}</span>
			<span class="mm-row__seq">${esc(t("detail.seq", { n: seq }))}</span>
		</span>
		<span class="mm-row__title">${esc(title)}</span>
	</button>
</div>`;
}

// The panel shows the turn that was LINKED BY CONTEXT (the last one), using its
// real prompt and real reply, so the picture cannot drift from the sample above.
const selectedTurn = turns[turns.length - 1];
const rows = [
	moduleRow("user", 18, selectedTurn.promptText, false),
	moduleRow("assistant-step", 21, selectedTurn.answerText, true),
	moduleRow("tool", 22, "ripgrep: 搜索 --dsw-alias-label-secondary 的定义", false),
	moduleRow("assistant-step", 24, "建议把卡片文字的对比度提到 7:1，次要文字保持 4.5:1 以上。", false),
	moduleRow("context", 25, "已注入 3 条上下文：主题令牌表、字号规范、对比度要求。", false)
].join("\n");

// ── the page ───────────────────────────────────────────────────────────────

const page = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>dsh-mindmap</title>
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
.mm-root { height: 100vh; }
/* The app's own tab strip, approximated: it is the context the view lives in. */
.mm-tabs { display: flex; align-items: center; gap: 4px; padding: 0 16px; border-bottom: 1px solid var(--dsw-alias-border-l1); height: 40px; flex: none; }
.mm-tab { padding: 0 10px; height: 40px; display: inline-flex; align-items: center; font-size: 13px; color: var(--dsw-alias-label-secondary); }
.mm-tab--on { color: var(--dsw-alias-label-primary); font-weight: 600; box-shadow: inset 0 -2px 0 var(--dsw-alias-state-business-primary); }
.mm-root { display: flex; flex-direction: column; }
${css}
.mm-chart { padding-bottom: 24px; }
</style></head>
<body>
<div class="mm-scope mm-root">
	<div class="mm-tabs">
		<span class="mm-tab">对话</span>
		<span class="mm-tab">轨迹</span>
		<span class="mm-tab mm-tab--on">导图</span>
	</div>
	<div class="mm-bar">
		<span class="mm-bar__title">${esc(t("bar.title"))}</span>
		<button type="button" class="mm-btn">${esc(t("bar.export"))}</button>
		<button type="button" class="mm-btn">${esc(t("bar.collapseAll"))}</button>
		<span class="mm-bar__spacer"></span>
		<button type="button" class="mm-btn">${esc(t("bar.depth"))} 12</button>
	</div>
	<div class="mm-body">
		<div class="mm-chart">
			<div class="mm-chart__title">
				<span class="mm-chart__name">${esc(t("branch.legend"))}</span>
				<span class="mm-bar__meta">${esc(t("bar.meta", { turns: turns.length, nodes: 68 }))}</span>
				<span class="mm-bar__meta">${esc(t("chart.levels", { n: layout.columns }))}</span>
				<span class="mm-bar__meta">${esc(t("block.hint"))}</span>
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
			<div class="mm-sec">
				<div class="mm-sec__head">${esc(t("modules.title", { turn: selectedTurn.label }))}<span class="mm-sec__count">${esc(t("turn.nodes", { n: 5 }))}</span></div>
				<pre class="mm-quote">${esc(selectedTurn.answerText)}</pre>
${rows}
			</div>
		</aside>
	</div>
</div>
</body></html>
`;

// ── shoot it ───────────────────────────────────────────────────────────────

const BROWSERS = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
];

const dir = mkdtempSync(join(tmpdir(), "mm-shot-"));
const pagePath = join(dir, "shot.html");
writeFileSync(pagePath, page, "utf8");
mkdirSync(dirname(OUT), { recursive: true });

/** First browser path that actually exists. */
function findBrowser() {
	for (const candidate of BROWSERS) {
		try {
			readFileSync(candidate);
			return candidate;
		} catch {
			/* keep looking */
		}
	}
	return null;
}

const browser = findBrowser();
if (browser === null) {
	console.error("screenshot: no Chromium-based browser found; looked for:", BROWSERS.join(", "));
	process.exit(1);
}

// The window must clear the whole canvas plus the chrome above it, or the shot
// clips the last row of cards. The chrome is the tab strip (40), the toolbar (~46),
// the chart title (~40) and the chart's bottom padding (24).
const width = Math.round(placed.width) + 380;
const height = Math.round(placed.height) + 40 + 46 + 40 + 24 + 8;
const result = spawnSync(browser, [
	"--headless=new",
	"--disable-gpu",
	"--hide-scrollbars",
	"--force-device-scale-factor=1",
	"--virtual-time-budget=1500",
	`--window-size=${width},${height}`,
	`--screenshot=${OUT}`,
	`file:///${pagePath.replace(/\\/g, "/")}`
], { encoding: "utf8" });

/** Whether the browser wrote a non-empty PNG. */
function shootSucceeded() {
	try {
		return readFileSync(OUT).length > 0;
	} catch {
		return false;
	}
}

if (!shootSucceeded()) {
	console.error(result.stderr ?? "screenshot: the browser produced no file");
	rmSync(dir, { recursive: true, force: true });
	process.exit(1);
}

console.log(`screenshot: docs/screenshot.png (${width}×${height})`);
console.log(`  turns ${turns.length} · columns ${layout.columns} · boxes ${placed.boxes.length} · connectors ${placed.edges.length}`);
console.log(`  roots ${branch.roots.length} · canvas ${Math.round(placed.width)}×${Math.round(placed.height)}px`);
rmSync(dir, { recursive: true, force: true });
