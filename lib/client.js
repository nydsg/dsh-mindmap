window.__ModuleLoader__.load({
	id: "@nydsg/dsh-mindmap",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const React = require("react");
		const h = React.createElement;

		//#region lib/client/style.js
		/**
		 * Style tag id claimed for this plugin. The module loader records the
		 * `data-plugin` owner of every style a factory injects, so HMR can retire
		 * exactly this plugin's CSS on reload.
		 */
		const CSS_TAG_ID = "@nydsg/dsh-mindmap/view.css";

		/*
		 * Token block — the only place literal colours are allowed to appear.
		 * Every alias below is a themed DSH token; the fallback after each comma
		 * only exists so a token renamed by a future DSH release degrades to a
		 * readable value instead of an invalid declaration (which would silently
		 * drop the whole property). Component rules reference the alias only.
		 */
		const CSS = `/*
 * Token block — the only place literal colours are allowed to appear.
 * Every alias below is a themed DSH token; the fallback after each comma only
 * exists so a token renamed by a future DSH release degrades to a readable value
 * instead of an invalid declaration (which would silently drop the property).
 * Component rules reference the alias only.
 */
.mm-scope {
	--mm-bg: var(--dsw-alias-bg-layer-1);
	--mm-panel: var(--dsw-alias-bg-layer-2);
	--mm-fill: var(--dsw-alias-bg-module-platform);
	--mm-line: var(--dsw-alias-border-l1, rgba(128, 128, 128, 0.18));
	--mm-line-strong: var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.3));
	--mm-line-faint: var(--dsw-alias-border-l3, rgba(128, 128, 128, 0.4));
	--mm-text: var(--dsw-alias-label-primary);
	--mm-text-2: var(--dsw-alias-label-secondary);
	--mm-text-3: var(--dsw-alias-label-tertiary);
	--mm-text-4: var(--dsw-alias-label-caption);
	--mm-hover: var(--dsw-alias-interactive-bg-hover);
	--mm-active: var(--dsw-alias-interactive-bg-active);
	--mm-accent: var(--dsw-alias-state-business-primary);
	--mm-warn: var(--dsw-alias-state-warn-primary);
	--mm-ok: var(--dsw-alias-state-success-primary);
	--mm-radius: var(--dsw-corner-shape, 10px);
}

.mm-root {
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
	width: 100%;
	height: 100%;
	overflow: hidden;
	background: var(--mm-bg);
	color: var(--mm-text);
}

/* Visible failure surface. A render-time throw inside a slot entry makes the
 * renderer abdicate that entry, which would otherwise leave the view silently
 * blank with the tab still listed. */
.mm-crash {
	margin: 16px;
	padding: 12px 14px;
	border: 0.5px solid var(--mm-line-strong);
	border-radius: var(--mm-radius);
	background: var(--mm-fill);
	overflow: auto;
}

.mm-crash__title {
	font-size: 13px;
	font-weight: 600;
	line-height: 20px;
	color: var(--mm-warn);
	margin-bottom: 6px;
}

.mm-crash__body {
	font-family: var(--dsw-font-markdown-code-font-family, monospace);
	font-size: 11px;
	line-height: 18px;
	color: var(--mm-text-2);
	white-space: pre-wrap;
	word-break: break-word;
}

/* ── toolbar ─────────────────────────────────────────────────────────────── */

.mm-bar {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px;
	padding: 10px 16px;
	border-bottom: 0.5px solid var(--mm-line);
	flex: none;
}

.mm-bar__title {
	font-size: 13px;
	font-weight: 600;
	line-height: 20px;
	color: var(--mm-text);
	margin-right: 4px;
}

.mm-bar__meta {
	font-size: 11px;
	line-height: 18px;
	color: var(--mm-text-3);
}

.mm-bar__spacer {
	flex: 1 1 auto;
	min-width: 8px;
}

.mm-btn {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	height: 26px;
	padding: 0 10px;
	border: 1px solid var(--mm-line-strong);
	background: transparent;
	color: var(--mm-text-2);
	font-family: var(--dsw-font-family);
	font-size: 12px;
	line-height: 18px;
	cursor: pointer;
	white-space: nowrap;
}

.mm-btn:hover {
	background: var(--mm-hover);
	color: var(--mm-text);
}

.mm-btn:disabled {
	color: var(--mm-text-4);
	cursor: not-allowed;
	background: transparent;
}

.mm-btn--active {
	background: var(--mm-active);
	color: var(--mm-text);
}

.mm-btn--primary {
	background: var(--mm-accent);
	border-color: var(--mm-accent);
	color: var(--mm-bg);
}

.mm-btn:focus-visible,
.mm-card__face:focus-visible,
.mm-row__body:focus-visible,
.mm-kw:focus-visible,
.mm-idea:focus-visible,
.mm-chip:focus-visible,
.mm-input:focus-visible {
	outline: 2px solid var(--mm-accent);
	outline-offset: 1px;
}

/* ── layout: scroller + horizontal tree + side panel ─────────────────────── */

.mm-body {
	display: flex;
	min-height: 0;
	flex: 1 1 auto;
}

.mm-chart {
	flex: 1 1 auto;
	min-width: 0;
	overflow: auto;
	padding: 12px 16px 32px;
}

.mm-chart__title {
	display: flex;
	align-items: baseline;
	flex-wrap: wrap;
	gap: 8px;
	padding: 2px 0 10px;
}

.mm-chart__name {
	font-size: 12px;
	font-weight: 600;
	line-height: 18px;
	color: var(--mm-text-2);
}

.mm-detail {
	flex: none;
	width: 360px;
	max-width: 42vw;
	border-left: 0.5px solid var(--mm-line);
	background: var(--mm-panel);
	overflow: auto;
	padding: 14px 16px 28px;
	display: flex;
	flex-direction: column;
	gap: 12px;
}

/* The tree surface. Its size is computed by the layout, so it is the scroller's
 * content and every node can be absolutely positioned inside it. */
.mm-canvas {
	position: relative;
	flex: none;
}

.mm-canvas__edges {
	position: absolute;
	left: 0;
	top: 0;
	pointer-events: none;
	overflow: visible;
}

/* Orthogonal connectors: solid 1px lines in a flat colour, no dashes and no
 * gradient — the line's job is to say "this hangs off that", nothing more. */
.mm-edge {
	stroke: var(--mm-line-faint);
	stroke-width: 1;
	stroke-linecap: square;
	stroke-linejoin: miter;
}

.mm-edge--manual {
	stroke: var(--mm-accent);
	stroke-width: 2;
}

/* A side-by-side placement is a real structural decision, so its connector is
 * drawn a shade stronger than the default without competing with a hand pin. */
.mm-edge--sibling {
	stroke: var(--mm-line-strong);
	stroke-width: 2;
}

.mm-edge--model {
	stroke: var(--mm-text-3);
	stroke-dasharray: 3 3;
}

/* ── tree cards ──────────────────────────────────────────────────────────── */

/*
 * Flat by construction: a 1px outline and a solid fill, no radius and no
 * shadow. The card is a box in a hierarchy, not a raised object — and a radius
 * would also blur the exact column edge the orthogonal connectors attach to.
 */
.mm-card {
	position: absolute;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	border: 1px solid var(--mm-line);
	border-left: 3px solid var(--mm-accent);
	background: var(--mm-fill);
	overflow: hidden;
}

/* A node entered straight from the title: flat all round, so the first level
 * after the anchor does not read as a stack of branch roots. */
.mm-card--first {
	border-left-width: 1px;
}

.mm-card--picked {
	border-color: var(--mm-accent);
	background: var(--mm-hover);
}

.mm-card--holds {
	border-color: var(--mm-ok);
}

.mm-card--pinned {
	border-left-color: var(--mm-warn);
}

/* Keyword-filter miss: a token colour, not CSS opacity, because an opacity value
 * would make the real contrast depend on whatever sits behind it. */
.mm-card--dim {
	border-left-color: var(--mm-line-strong);
}

.mm-card--dim .mm-card__text,
.mm-card--dim .mm-card__head {
	color: var(--mm-text-4);
}

/* ── title anchor: the single left-hand entry point ──────────────────────── */

.mm-anchor {
	position: absolute;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 10px 12px;
	/* No left accent bar and no radius: this node starts the map, so it must not
	 * look like one more branch hanging off something. */
	border: 1px solid var(--mm-line-strong);
	background: var(--mm-panel);
	overflow: hidden;
}

.mm-anchor__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 6px;
}

.mm-anchor__kicker {
	font-size: 10px;
	font-weight: 600;
	line-height: 16px;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--mm-accent);
}

.mm-anchor__count {
	font-size: 10px;
	line-height: 16px;
	color: var(--mm-text-4);
	font-variant-numeric: tabular-nums;
}

.mm-anchor__text {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 5;
	overflow: hidden;
	word-break: break-word;
	white-space: pre-wrap;
	font-size: 14px;
	font-weight: 600;
	line-height: 22px;
	color: var(--mm-text);
}

.mm-anchor__foot {
	font-size: 10px;
	line-height: 16px;
	color: var(--mm-text-3);
}

.mm-anchor__more {
	margin: 2px 0 0;
}

.mm-card__face {
	display: flex;
	flex-direction: column;
	gap: 4px;
	width: 100%;
	padding: 8px 10px;
	border: none;
	background: transparent;
	color: var(--mm-text);
	font-family: var(--dsw-font-family);
	font-size: 13px;
	line-height: 20px;
	text-align: left;
	cursor: pointer;
}

.mm-card__face:hover {
	background: var(--mm-hover);
}

.mm-card__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 6px;
}

.mm-card__no {
	font-size: 10px;
	font-weight: 600;
	line-height: 16px;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--mm-accent);
}

.mm-card__link {
	font-size: 10px;
	line-height: 16px;
	color: var(--mm-text-4);
	font-variant-numeric: tabular-nums;
}

.mm-card__link--manual {
	color: var(--mm-warn);
}

/* A structural continuation is a different KIND of claim from a wording match, so
 * it is labelled differently rather than silently folded into "auto": the map is
 * telling you it chained to the previous turn, not that it found a match. */
.mm-card__link--previous {
	color: var(--mm-ok);
}

/* 换行新建: placed beside its predecessor, because going deeper would pass the
 * documented level limit. It is neither a match nor a continuation. */
.mm-card__link--sibling {
	color: var(--mm-accent);
}

/* A model judgment is a different author, not a different operation: the badge
 * names the operation and this colour says who decided it. */
.mm-card__link--model {
	color: var(--mm-text-2);
}

.mm-card__text {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 4;
	overflow: hidden;
	word-break: break-word;
	white-space: pre-wrap;
}

.mm-card__foot {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 6px;
	font-size: 10px;
	line-height: 16px;
	color: var(--mm-text-3);
}

.mm-card__flag {
	color: var(--mm-warn);
}

.mm-card__more {
	margin: 6px 10px 8px;
}

/* ── side panel: module rows, keywords, branch controls ──────────────────── */

.mm-empty {
	margin: 32px auto;
	max-width: 380px;
	text-align: center;
	color: var(--mm-text-3);
	font-size: 13px;
	line-height: 22px;
}

.mm-empty__title {
	font-size: 13px;
	font-weight: 600;
	line-height: 20px;
	color: var(--mm-text-2);
	margin-bottom: 4px;
}

.mm-sec {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.mm-sec__head {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 11px;
	font-weight: 600;
	line-height: 18px;
	color: var(--mm-text-2);
}

.mm-sec__count {
	font-weight: 400;
	color: var(--mm-text-4);
}

.mm-detail__head {
	display: flex;
	align-items: center;
	gap: 8px;
}

.mm-detail__title {
	flex: 1 1 auto;
	font-size: 13px;
	font-weight: 600;
	line-height: 20px;
	color: var(--mm-text);
}

.mm-detail__meta {
	font-size: 11px;
	line-height: 18px;
	color: var(--mm-text-3);
}

.mm-quote {
	margin: 0;
	padding: 8px 10px;
	border: 0.5px solid var(--mm-line);
	border-radius: var(--mm-radius);
	background: var(--mm-fill);
	color: var(--mm-text);
	font-family: var(--dsw-font-family);
	font-size: 12px;
	line-height: 20px;
	white-space: pre-wrap;
	word-break: break-word;
	max-height: 320px;
	overflow: auto;
}

.mm-quote--dim {
	color: var(--mm-text-2);
}

/* Module rows inside the side panel. */
.mm-row {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: 6px;
	width: 100%;
	padding: 7px 10px 7px 12px;
	border: 0.5px solid var(--mm-line);
	border-radius: 0 var(--mm-radius) var(--mm-radius) 0;
	background: var(--mm-fill);
	color: var(--mm-text);
}

.mm-row::before {
	content: "";
	position: absolute;
	left: -0.5px;
	top: -0.5px;
	bottom: -0.5px;
	width: 2px;
	border-radius: 2px 0 0 2px;
	background: var(--mm-line-faint);
}

.mm-row--user::before {
	background: var(--mm-accent);
}

.mm-row--assistant::before {
	background: var(--mm-ok);
}

.mm-row--tool::before {
	background: var(--mm-warn);
}

.mm-row--selected {
	background: var(--mm-hover);
	border-color: var(--mm-line-strong);
}

.mm-row__body {
	display: flex;
	flex-direction: column;
	gap: 4px;
	width: 100%;
	padding: 0;
	border: none;
	background: transparent;
	color: inherit;
	font-family: var(--dsw-font-family);
	font-size: 12px;
	line-height: 20px;
	text-align: left;
	cursor: pointer;
}

.mm-row__head {
	display: flex;
	align-items: center;
	gap: 6px;
}

.mm-row__kind {
	flex: none;
	font-size: 10px;
	font-weight: 600;
	line-height: 16px;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--mm-text-3);
}

.mm-row--user .mm-row__kind {
	color: var(--mm-accent);
}

.mm-row__seq {
	flex: none;
	font-size: 10px;
	line-height: 16px;
	color: var(--mm-text-4);
	font-variant-numeric: tabular-nums;
}

.mm-row__title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.mm-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
}

.mm-chip {
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	padding: 1px 7px;
	border: 0.5px solid var(--mm-line);
	border-radius: 999px;
	background: transparent;
	color: var(--mm-text-2);
	font-family: var(--dsw-font-family);
	font-size: 10px;
	line-height: 16px;
	cursor: pointer;
}

.mm-chip:hover {
	background: var(--mm-hover);
	color: var(--mm-text);
}

.mm-kw {
	display: flex;
	align-items: center;
	gap: 8px;
	width: 100%;
	padding: 3px 4px;
	border: none;
	border-radius: 6px;
	background: transparent;
	color: var(--mm-text);
	font-family: var(--dsw-font-family);
	font-size: 12px;
	line-height: 18px;
	text-align: left;
	cursor: pointer;
}

.mm-kw:hover {
	background: var(--mm-hover);
}

.mm-kw__term {
	flex: none;
	min-width: 64px;
	max-width: 132px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.mm-kw__bar {
	position: relative;
	flex: 1 1 auto;
	height: 6px;
	border-radius: 999px;
	background: var(--mm-line);
	overflow: hidden;
}

.mm-kw__fill {
	position: absolute;
	inset: 0 auto 0 0;
	border-radius: 999px;
	background: var(--mm-accent);
}

.mm-kw__num {
	flex: none;
	min-width: 34px;
	text-align: right;
	font-size: 10px;
	line-height: 16px;
	color: var(--mm-text-4);
	font-variant-numeric: tabular-nums;
}

.mm-idea {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	width: 100%;
	padding: 8px 10px;
	border: 0.5px solid var(--mm-line);
	border-radius: var(--mm-radius);
	background: transparent;
	color: var(--mm-text);
	font-family: var(--dsw-font-family);
	font-size: 12px;
	line-height: 20px;
	text-align: left;
	cursor: pointer;
}

.mm-idea:hover {
	background: var(--mm-hover);
	border-color: var(--mm-line-strong);
}

.mm-idea__text {
	flex: 1 1 auto;
}

.mm-idea__go {
	flex: none;
	font-size: 10px;
	line-height: 20px;
	color: var(--mm-accent);
}

.mm-note {
	font-size: 11px;
	line-height: 18px;
	color: var(--mm-text-3);
}

.mm-code {
	font-family: var(--dsw-font-markdown-code-font-family, monospace);
	font-size: 11px;
	line-height: 18px;
	color: var(--mm-text-2);
	word-break: break-all;
}

/* ── branch controls ─────────────────────────────────────────────────────── */

.mm-branch__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.mm-branch__picker {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.mm-branch__pickerRow {
	display: flex;
	gap: 6px;
}

.mm-input {
	flex: 1 1 auto;
	min-width: 0;
	height: 26px;
	padding: 0 8px;
	border: 0.5px solid var(--mm-line-strong);
	border-radius: var(--mm-radius);
	background: var(--mm-bg);
	color: var(--mm-text);
	font-family: var(--dsw-font-family);
	font-size: 12px;
}

/* ── layering: operation counts, fields, and the two judge states ─────────── */

/* The three-operation tally beside the tree caption. It is a summary of the
 * MAP as drawn, so it reads as caption text rather than as a control. */
.mm-chart__ops {
	font-size: 10px;
	line-height: 16px;
	color: var(--mm-text-3);
	font-variant-numeric: tabular-nums;
}

.mm-layer {
	gap: 8px;
}

.mm-field {
	display: flex;
	align-items: center;
	gap: 8px;
}

.mm-field__label {
	flex: 0 0 46%;
	font-size: 11px;
	line-height: 16px;
	color: var(--mm-text-3);
}

/* The selected member of a choice row. Colour, not weight: a weight change
 * would reflow the row and move every chip beside it. */
.mm-chip--on {
	border-color: var(--mm-accent);
	color: var(--mm-accent);
}
`;

		/**
		 * Install the plugin's style tag once per module materialization.
		 * @returns the claimed tag id.
		 */
		function installStyle() {
			if (typeof document === "undefined") return CSS_TAG_ID;
			const existing = document.querySelector(
				`style[data-plugin-css=${JSON.stringify(CSS_TAG_ID)}]`
			);
			if (existing !== null) return CSS_TAG_ID;
			const tag = document.createElement("style");
			tag.dataset.plugin = "@nydsg/dsh-mindmap";
			tag.dataset.pluginCss = CSS_TAG_ID;
			tag.textContent = CSS;
			document.head.appendChild(tag);
			return CSS_TAG_ID;
		}
		//#endregion

		//#region lib/client/locales.js
		/** Dictionary namespace owned by this plugin. */
		const NS = "mindmap";

		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"view.mindmap": "导图",
			"bar.title": "对话思维导图",
			"bar.meta": "{turns} 轮 · {nodes} 模块",
			"bar.collapseAll": "收起全部",
			"bar.expandAll": "展开全部",
			"bar.maxTurns": "显示轮数",
			"bar.focus": "聚焦此轮",
			"bar.export": "复制大纲",
			"bar.exported": "大纲已复制到剪贴板",
			"empty.title": "本会话还没有可成图的轨迹",
			"empty.hint": "发送第一条消息后，每一轮都会变成一个只显示提问的区块——点它才展开回复与关键词。",
			"block.hint": "仅显示提问 · 点击区块展开",
			"modules.title": "{turn} 的模块",
			"modules.noAnswer": "这一轮还没有回复文本。",
			"branch.legend": "横向层级树 · 总标题起步；没命中更早的提问就接上一轮",
			"branch.roots": "{n} 条分支起点",
			"branch.firstTag": "起始分支",
			"branch.continues": "↓ {n} 条续接",			"branch.autoTag": "自动匹配 {score}",
			"branch.previousTag": "接上一轮",
			"branch.manualTag": "手动指定",
			"branch.rootTag": "分支起点",
			"branch.title": "分支归属",
			"branch.nowAuto": "自动匹配到 {parent}（相似度 {score}）",
			"branch.nowPrevious": "接在上一轮 {parent} 之后：这一问没有点名任何更早的问题，所以按对话顺序作为它的子节点",
			"branch.nowManual": "已手动接到 {parent}",
			"branch.nowRoot": "这是一个分支起点",
			"branch.makeRoot": "改为新分支",
			"branch.makeAuto": "恢复自动",
			"branch.pickOpen": "选择父问题",
			"branch.pickClose": "取消选择",
			"branch.pickHint": "填轮次号，把它接到那一轮的问题下面",
			"branch.pickPlaceholder": "父问题轮次号，如 3",
			"branch.pickConfirm": "连接",
			"branch.pickInvalid": "轮次号无效：必须是一个更早的轮次",
			"branch.candidates": "相似的前序提问",
			"branch.noCandidates": "前序提问中没有相似项，已作为新分支。",
			"branch.pinTo": "接到「{turn}」下面",
			"branch.childrenOf": "「{turn}」下面有 {n} 条续接",
			"branch.linked": "已将 {turn} 接到 {parent}",
			"branch.rooted": "已将 {turn} 改为新分支",
			"branch.autoRestored": "{turn} 已恢复自动匹配",
			"branch.reset": "清除 {n} 处手动分支",
			"branch.resetHint": "清除所有手动连接，全部交回自动匹配",
			"branch.selectModule": "已选中本轮，可在上方调整它接在哪条分支；右侧列出该轮的模块行，点任一行看详情。",
			"branch.more": "还有 {n} 条续接 · 展开更深一层",
			"branch.moreHint": "把这棵子树再展开一层",
			"anchor.kicker": "总标题",
			"anchor.branches": "{n} 条起始分支",
			"anchor.foot": "共 {n} 轮 · 向右逐层展开",
			"chart.levels": "{n} 层",
			"bar.depth": "分支层数",
			"bar.depthHint": "限制每个分支起点向下画几层，再点可翻倍",
			"block.expand": "展开本轮：回复、工具调用与关键词",
			"block.collapse": "收起本轮",
			"block.hidden": "回复已收起",
			"block.noPrompt": "（本轮没有提问文本，点击查看回复）",
			"crash.title": "视图渲染失败（已拦截，未让页签消失）",
			"crash.hint": "请把上面的错误文本发给我。",
			"turn.label": "第 {n} 轮",
			"turn.nodes": "{n} 个模块",
			"turn.pending": "进行中",
			"turn.error": "该轮出错",
			"turn.interrupted": "已中断",
			"kind.user": "提问",
			"kind.steering": "追问",
			"kind.assistant": "回复",
			"kind.reasoning": "思考",
			"kind.tool": "工具",
			"kind.context": "上下文",
			"kind.other": "事件",
			"card.expand": "点击展开原文",
			"detail.title": "模块详情",
			"detail.empty": "点击左侧任意模块，查看它「回复了什么、被问了什么」。",
			"detail.prompt": "提问原文",
			"detail.answer": "回复原文",
			"detail.reasoning": "思考过程",
			"detail.tools": "工具调用",
			"detail.context": "上下文注入",
			"detail.keywords": "本模块关键词",
			"detail.analysis": "前序模块分析（向后推演）",
			"detail.analysisHint": "只看这一轮之前的模块：重复出现的主题词最可能延续，只出现一次的词最可能是新话题。",
			"detail.ideas": "候选后续提问",
			"detail.ideasActivate": "点击载入输入框",
			"detail.noKeywords": "该模块文本过短，未提取到关键词。",
			"detail.noIdeas": "前序模块不足两轮，暂不推演后续提问。",
			"detail.earlier": "此前 {n} 轮",
			"detail.seq": "序号 {n}",
			"detail.tokens": "文本 {n} 字",
			"detail.weight": "权重 {n}",
			"kw.filter": "仅看含「{term}」的模块",
			"kw.cleared": "已清除关键词过滤",
			"kw.where": "{turns} 轮 / {hits} 次",
			"notice.draftLoaded": "已载入输入框，可继续编辑后发送",
			"notice.draftUnavailable": "输入框当前不可用，文本已复制到剪贴板",
			"op.push": "[下推]",
			"op.sibling": "[换行]",
			"op.branch": "[回溯]",
			"branch.siblingTag": "[换行] 同级新建",
			"branch.modelTag": "{op} 模型判定",
			"branch.nowSibling": "判断为「换行新建」：把它作为 {parent} 的同级节点，因为再向下就会超过 {depth} 层上限",
			"branch.nowModel": "模型判定为「{op}」，接在 {parent} 下",
			"layer.title": "智能分层（下推 / 换行 / 回溯）",
			"layer.legend": "文档定义的三操作：{push} 作为上一节点的子节点深入；{sibling} 作为同级节点并列；{branch} 从更早的祖先重新建立分支。",
			"layer.modeOffline": "离线词面判定",
			"layer.modeModel": "模型判定",
			"layer.modeHint": "在离线词面判定与模型判定之间切换",
			"layer.counts": "下推 {push} · 换行 {sibling} · 回溯 {branch}",
			"layer.countsDetail": "本图判定：下推 {push} · 换行 {sibling} · 回溯 {branch}；其中模型判定 {model} 轮、手动指定 {manual} 轮。",
			"layer.offlineNote": "离线判定不调用模型：问到更早的提问就「回溯」，延续上一轮就「下推」，再向下会超过 {depth} 层上限时「换行」并列。",
			"layer.uncapped": "不限",
			"layer.bridgeUnknown": "正在探测宿主桥……",
			"layer.bridgeReady": "宿主桥可用，模型路由：{route}",
			"layer.bridgeMissing": "宿主桥不可用或本组合没有 llm 服务：模型判定无法运行，请检查 DSH 的模型设置。",
			"layer.noRoute": "未配置",
			"layer.provider": "provider",
			"layer.model": "model",
			"layer.run": "运行模型判定",
			"layer.stop": "停止",
			"layer.limit": "每次最多判定最近 {n} 轮，逐轮调用模型并更新状态；可随时停止。",
			"layer.clear": "清除 {n} 轮模型判定",
			"layer.clearHint": "丢弃本会话的模型判定，回到离线词面判定",
			"layer.cleared": "已清除模型判定",
			"layer.failed": "模型判定失败：{message}",
			"layer.progress": "正在判定 {turn}（{done}/{total}）…",
			"layer.stopped": "已停止（完成 {done}/{total}）",
			"layer.done": "判定完成（{done}/{total}）",
			"layer.variables": "可替换变量与配置",
			"layer.maxDepth": "最大层级（{{MAX_DEPTH}}，0 = 不限）",
			"layer.nodeMaxChars": "节点最大字数（{{NODE_MAX_CHARS}}）",
			"layer.temperature": "模型温度（{{TEMPERATURE}}，0.2–0.5）",
			"layer.language": "输出语言（{{LANGUAGE}}）",
			"layer.outputFormat": "输出格式（{{OUTPUT_FORMAT}}）",
			"layer.protocol": "提示词与导图状态",
			"layer.copyPrompt": "复制系统提示词",
			"layer.copyTemplate": "复制用户模板",
			"layer.copyState": "复制导图状态",
			"layer.copyFragment": "复制本轮片段",
			"layer.copiedPrompt": "系统提示词已复制（含本次配置）",
			"layer.copiedTemplate": "用户输入模板已复制",
			"layer.copiedState": "思维导图状态（Markdown 嵌套列表）已复制",
			"layer.copiedFragment": "本轮片段已复制（含操作标注）",
			"layer.variableHint": "文档的可替换变量都会在调用模型前替换成实际值。",
			"layer.selectTurn": "在左侧选中一轮，即可查看它被判定为哪个操作、接在谁下面，以及它的片段。",
			"layer.selected": "本轮判定 · {turn}",
			"layer.selectedLine": "操作 {op} · 父节点 {parent} · 层级 {depth} · 来源 {source}",
			"layer.noOperation": "无",
			"layer.atTitle": "总标题",
			"layer.source.offline": "离线词面判定",
			"layer.source.model": "模型判定",
			"layer.source.manual": "手动指定",
			"layer.noFetch": "当前页面没有 fetch，无法调用宿主桥",
			"layer.noPrevious": "（无，本轮是导图起点）",
			"layer.none": "（无）"
		};

		/** English dictionary (key set mirrors {@link zh}). */
		const en = {
			"view.mindmap": "Map",
			"bar.title": "Conversation mind map",
			"bar.meta": "{turns} turns · {nodes} modules",
			"bar.collapseAll": "Collapse all",
			"bar.expandAll": "Expand all",
			"bar.maxTurns": "Turns shown",
			"bar.focus": "Focus this turn",
			"bar.export": "Copy outline",
			"bar.exported": "Outline copied to clipboard",
			"empty.title": "No trajectory to map yet",
			"empty.hint": "Send the first message: every turn becomes a block showing only your question — click it to reveal the reply and keywords.",
			"block.hint": "questions only · click a block to expand",
			"modules.title": "Modules in {turn}",
			"modules.noAnswer": "This turn has no reply text yet.",
			"branch.legend": "horizontal hierarchy · opens from the title; chains to the previous turn unless it names an older one",
			"branch.roots": "{n} branch roots",
			"branch.firstTag": "first branch",
			"branch.continues": "↓ {n} continuations",
			"branch.autoTag": "auto {score}",
			"branch.previousTag": "chained",
			"branch.manualTag": "pinned",
			"branch.rootTag": "branch root",
			"branch.title": "Branch",
			"branch.nowAuto": "Matched to {parent} (similarity {score})",
			"branch.nowPrevious": "Chained after the previous turn {parent}: this question names no earlier thread, so it follows the conversation and becomes its child",
			"branch.nowManual": "Pinned under {parent}",
			"branch.nowRoot": "This question starts its own branch",
			"branch.makeRoot": "Make a new branch",
			"branch.makeAuto": "Back to automatic",
			"branch.pickOpen": "Pick a parent question",
			"branch.pickClose": "Cancel",
			"branch.pickHint": "Enter a turn number to attach this question under it",
			"branch.pickPlaceholder": "parent turn number, e.g. 3",
			"branch.pickConfirm": "Link",
			"branch.pickInvalid": "Invalid turn: it must be an earlier turn",
			"branch.candidates": "Similar earlier questions",
			"branch.noCandidates": "No similar earlier question — kept as a new branch.",
			"branch.pinTo": "Attach under \"{turn}\"",
			"branch.childrenOf": "\"{turn}\" has {n} continuations",
			"branch.linked": "Linked {turn} under {parent}",
			"branch.rooted": "{turn} is now a branch root",
			"branch.autoRestored": "{turn} is back to automatic matching",
			"branch.reset": "Clear {n} manual links",
			"branch.resetHint": "Drop every manual link and hand them all back to the matcher",
			"branch.selectModule": "This turn is selected — set its branch above, or open the block and click a module row for details.",
			"branch.more": "{n} more continuations · expand one level",
			"branch.moreHint": "Draw one more level of this subtree",
			"anchor.kicker": "TITLE",
			"anchor.branches": "{n} first branches",
			"anchor.foot": "{n} turns · opens rightwards, one level at a time",
			"chart.levels": "{n} levels",
			"bar.depth": "Branch levels",
			"bar.depthHint": "How many levels to draw below each branch root; click to double",
			"block.expand": "Expand this turn: reply, tool calls, and keywords",
			"block.collapse": "Collapse this turn",
			"block.hidden": "reply folded",
			"block.noPrompt": "(no prompt text in this turn — click to see the reply)",
			"crash.title": "View failed to render (intercepted — the tab stays listed)",
			"crash.hint": "Send me the error text above.",
			"turn.label": "Turn {n}",
			"turn.nodes": "{n} modules",
			"turn.pending": "running",
			"turn.error": "turn failed",
			"turn.interrupted": "interrupted",
			"kind.user": "ASK",
			"kind.steering": "STEER",
			"kind.assistant": "REPLY",
			"kind.reasoning": "THINK",
			"kind.tool": "TOOL",
			"kind.context": "CONTEXT",
			"kind.other": "EVENT",
			"card.expand": "Click to expand",
			"detail.title": "Module detail",
			"detail.empty": "Click any module on the left to see what it asked and what it answered.",
			"detail.prompt": "Prompt",
			"detail.answer": "Answer",
			"detail.reasoning": "Reasoning",
			"detail.tools": "Tool calls",
			"detail.context": "Injected context",
			"detail.keywords": "Module keywords",
			"detail.analysis": "Earlier modules (backward analysis)",
			"detail.analysisHint": "Modules before this one only: repeated terms most likely continue, single-occurrence terms are probably a new topic.",
			"detail.ideas": "Suggested next questions",
			"detail.ideasActivate": "Click to load into the composer",
			"detail.noKeywords": "Too little text in this module to extract keywords.",
			"detail.noIdeas": "Fewer than two earlier turns — nothing to extrapolate yet.",
			"detail.earlier": "{n} earlier turns",
			"detail.seq": "seq {n}",
			"detail.tokens": "{n} chars",
			"detail.weight": "weight {n}",
			"kw.filter": "Show only modules containing \"{term}\"",
			"kw.cleared": "Keyword filter cleared",
			"kw.where": "{turns} turns / {hits} hits",
			"notice.draftLoaded": "Loaded into the composer — edit before sending",
			"notice.draftUnavailable": "Composer unavailable; text copied to the clipboard",
			"op.push": "[push]",
			"op.sibling": "[sibling]",
			"op.branch": "[branch]",
			"branch.siblingTag": "[sibling] new side-by-side",
			"branch.modelTag": "{op} judged by the model",
			"branch.nowSibling": "Judged 换行新建: placed beside {parent}, because one level deeper would exceed the {depth}-level limit",
			"branch.nowModel": "The model judged {op}, attached under {parent}",
			"layer.title": "Smart layering (push / sibling / branch)",
			"layer.legend": "The three operations: {push} goes one level deeper as a child of the previous node; {sibling} stands beside it at the same level; {branch} reopens an older ancestor as a new branch.",
			"layer.modeOffline": "Offline wording judge",
			"layer.modeModel": "Model judge",
			"layer.modeHint": "Switch between the offline wording judge and the model judge",
			"layer.counts": "push {push} · sibling {sibling} · branch {branch}",
			"layer.countsDetail": "This map: push {push} · sibling {sibling} · branch {branch}; {model} turn(s) judged by the model, {manual} pinned by hand.",
			"layer.offlineNote": "The offline judge calls no model: naming an older question is 回溯, continuing the previous turn is 下推, and a turn that would exceed the {depth}-level limit is placed side-by-side (换行).",
			"layer.uncapped": "uncapped",
			"layer.bridgeUnknown": "Probing the host bridge…",
			"layer.bridgeReady": "Host bridge ready — model route: {route}",
			"layer.bridgeMissing": "Host bridge unavailable, or this composition has no `llm` service: the model judge cannot run. Check DSH's model settings.",
			"layer.noRoute": "not configured",
			"layer.provider": "provider",
			"layer.model": "model",
			"layer.run": "Run the model judge",
			"layer.stop": "Stop",
			"layer.limit": "Judges at most the last {n} turns, one model call per turn, updating the state as it goes. Stop at any time.",
			"layer.clear": "Clear {n} model judgment(s)",
			"layer.clearHint": "Drop this session's model judgments and return to the offline judge",
			"layer.cleared": "Model judgments cleared",
			"layer.failed": "Model judge failed: {message}",
			"layer.progress": "Judging {turn} ({done}/{total})…",
			"layer.stopped": "Stopped ({done}/{total})",
			"layer.done": "Judged {done}/{total}",
			"layer.variables": "Variables and configuration",
			"layer.maxDepth": "Max levels ({{MAX_DEPTH}}, 0 = uncapped)",
			"layer.nodeMaxChars": "Max node characters ({{NODE_MAX_CHARS}})",
			"layer.temperature": "Model temperature ({{TEMPERATURE}}, 0.2–0.5)",
			"layer.language": "Output language ({{LANGUAGE}})",
			"layer.outputFormat": "Output format ({{OUTPUT_FORMAT}})",
			"layer.protocol": "Prompt and mind-map state",
			"layer.copyPrompt": "Copy system prompt",
			"layer.copyTemplate": "Copy user template",
			"layer.copyState": "Copy mind-map state",
			"layer.copyFragment": "Copy this turn's fragment",
			"layer.copiedPrompt": "System prompt copied (with this run's configuration)",
			"layer.copiedTemplate": "User-input template copied",
			"layer.copiedState": "Mind-map state (Markdown nested list) copied",
			"layer.copiedFragment": "This turn's fragment copied (with its operation marker)",
			"layer.variableHint": "Every documented variable is substituted before the model is called.",
			"layer.selectTurn": "Select a turn on the left to see which operation it was judged to be, what it attaches to, and its fragment.",
			"layer.selected": "This turn's judgment · {turn}",
			"layer.selectedLine": "operation {op} · parent {parent} · level {depth} · source {source}",
			"layer.noOperation": "none",
			"layer.atTitle": "the title",
			"layer.source.offline": "offline wording judge",
			"layer.source.model": "model judge",
			"layer.source.manual": "pinned by hand",
			"layer.noFetch": "this page has no fetch, so the host bridge cannot be called",
			"layer.noPrevious": "(none — this turn starts the map)",
			"layer.none": "(none)"
		};
		//#endregion

		//#region lib/client/lexical.js
		/**
		 * Local keyword engine. Zero network, zero host calls: the view owns the
		 * analysis so the map is instant and works offline.
		 *
		 * Tokenization segments CJK with `Intl.Segmenter` (the platform word
		 * segmenter) and falls back to bigrams when the runtime lacks it; Latin
		 * runs are lowercased and stripped of a short suffix so `cache` / `caches`
		 * collapse. Scoring is turn-level TF-IDF: a term that repeats inside one
		 * turn and is rare across turns wins, which is exactly "what is this module
		 * about" for a short technical conversation.
		 */

		const STOPWORDS = new Set([
			"的", "了", "是", "在", "和", "与", "或", "也", "都", "就", "而", "及", "等",
			"这", "那", "你", "我", "他", "她", "它", "我们", "你们", "他们", "自己",
			"一个", "一些", "可以", "需要", "应该", "因为", "所以", "但是", "如果",
			"然后", "现在", "已经", "还是", "这个", "那个", "什么", "怎么", "为什么",
			"以及", "并且", "或者", "不过", "非常", "进行", "通过", "关于", "对于",
			"进行", "没有", "不是", "就是", "可能", "一下", "一样", "时候", "问题",
			"使用", "支持", "提供", "实现", "包括", "其中", "同时", "之后", "之前",
			"the", "a", "an", "and", "or", "but", "if", "then", "than", "that", "this",
			"these", "those", "is", "are", "was", "were", "be", "been", "being", "am",
			"do", "does", "did", "doing", "have", "has", "had", "having", "will",
			"would", "shall", "should", "can", "could", "may", "might", "must", "not",
			"no", "yes", "of", "in", "on", "at", "to", "for", "from", "by", "with",
			"without", "about", "into", "over", "under", "again", "further", "once",
			"here", "there", "when", "where", "why", "how", "all", "any", "both",
			"each", "few", "more", "most", "other", "some", "such", "only", "own",
			"same", "so", "too", "very", "just", "now", "as", "it", "its", "you",
			"your", "we", "our", "they", "them", "their", "he", "she", "his", "her",
			"i", "me", "my", "mine", "what", "which", "who", "whom", "because",
			"while", "during", "before", "after", "up", "down", "out", "off", "get",
			"got", "make", "made", "use", "used", "using", "one", "two", "also",
			"let", "lets", "please", "want", "need", "needs", "see", "look", "like"
		]);

		/** A single CJK ideograph (BMP plus the common extension blocks). */
		const CJK_CHAR = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff]/;
		/** A Latin/digit token run. */
		const LATIN_RUN = /[A-Za-z][A-Za-z0-9_+#.\-]*|\d+(?:\.\d+)?/g;

		/** Cached `Intl.Segmenter` (undefined when the runtime lacks it). */
		let segmenter;

		/**
		 * Resolve the word segmenter, or `undefined` on a runtime without it.
		 * @returns the segmenter instance when available.
		 */
		function wordSegmenter() {
			if (segmenter !== undefined) return segmenter ?? undefined;
			try {
				const Segmenter = typeof Intl === "object" ? Intl.Segmenter : undefined;
				segmenter = typeof Segmenter === "function"
					? new Segmenter("zh-Hans", { granularity: "word" })
					: null;
			} catch {
				segmenter = null;
			}
			return segmenter ?? undefined;
		}

		/**
		 * Light suffix stripping so inflected Latin forms share one term.
		 * @param token - lowercased Latin word.
		 * @returns the stem candidate.
		 */
		function stem(token) {
			if (token.length <= 4) return token;
			for (const suffix of ["ations", "ation", "ings", "ing", "ies", "ed", "es", "s"]) {
				if (!token.endsWith(suffix)) continue;
				const cut = token.slice(0, token.length - suffix.length);
				if (cut.length < 3) continue;
				return suffix === "ies" ? `${cut}y` : cut;
			}
			return token;
		}

		/**
		 * Segment one text into candidate terms, two passes over that text.
		 *
		 * Empirically `Intl.Segmenter` in `word` mode returns SINGLE CHARACTERS for
		 * most Chinese words (`思维导图` → `思维|导|图`), so a length filter alone
		 * would drop half of every term. Pass 1 therefore also collects every
		 * adjacent 2–4 character merge; pass 2 keeps the longest merge that repeats
		 * INSIDE this text and suppresses the characters it covers, which is what
		 * turns `思维`+`导`+`图` into the term the user actually typed — without a
		 * dictionary and without depending on the segmenter agreeing with us.
		 *
		 * @param text - raw module text.
		 * @returns resolved terms in source order (duplicates preserved).
		 */
		function segmentText(text) {
			if (typeof text !== "string" || text.length === 0) return [];
			const clipped = text.length > 4000 ? text.slice(0, 4000) : text;
			const raw = [];
			const merges = [];
			for (const chunk of clipped.split(/\s+/)) {
				if (chunk.length === 0) continue;
				LATIN_RUN.lastIndex = 0;
				let match;
				while ((match = LATIN_RUN.exec(chunk)) !== null) {
					const token = stem(match[0].toLowerCase().replace(/[.\-+#]+$/, ""));
					if (token.length >= 2 && !STOPWORDS.has(token) && !/^\d+$/.test(token)) raw.push({ term: token, index: -1 });
				}
				const han = chunk.replace(/[\x00-\x7f]+/g, " ");
				if (!CJK_CHAR.test(han)) continue;
				const parts = [];
				const seg = wordSegmenter();
				if (seg !== undefined) {
					for (const part of seg.segment(han)) {
						if (part.isWordLike !== true) continue;
						const value = part.segment.trim();
						if (value.length === 0) continue;
						parts.push({ term: value, index: raw.length });
						raw.push({ term: value, index: raw.length });
					}
				} else {
					// No segmenter: CJK bigrams are the only available unit.
					for (const run of han.split(/[^\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+/)) {
						if (run.length < 2) continue;
						for (let i = 0; i + 1 < run.length; i += 1) {
							parts.push({ term: run.slice(i, i + 2), index: raw.length });
							raw.push({ term: run.slice(i, i + 2), index: raw.length });
						}
					}
				}
				// A merge is offered only inside a run of consecutive single-character
				// segments, and only where every covered segment is single: a segment
				// the segmenter returned whole (思维, 安装) is already a word and is
				// never merged across, so the two sources cannot contradict each
				// other. Consequence, accepted deliberately: a four-character word
				// the segmenter half-split (思维导图 → 思维 + 导|图) is reported as its
				// pieces rather than reconstructed. Guessing at it would require a
				// dictionary, and inventing 导图插件 out of a sliding window is worse
				// than reporting 导图 + 插件. Windows start at every position —
				// stepping by two would skip a run that begins at an odd offset — and
				// pass 2's longest-first, leftmost-first adoption resolves overlaps.
				for (let i = 0; i + 3 < parts.length; i += 1) {
					if (![0, 1, 2, 3].every((offset) => parts[i + offset].term.length === 1)) continue;
					merges.push(compoundAt(parts, i, 4));
				}
				for (let i = 0; i + 1 < parts.length; i += 1) {
					if (parts[i].term.length !== 1 || parts[i + 1].term.length !== 1) continue;
					merges.push(compoundAt(parts, i, 2));
				}
			}

			// Pass 2: adopt the longest merges first, retire the characters they
			// cover. No repetition requirement: longest-match-wins already prefers a
			// real four-character compound over its two-character halves, and
			// demanding a repeat would drop every term that occurs once in a short
			// module.
			const suppressed = new Set();
			const adopted = new Map();
			const candidates = merges
				.filter((merge) => merge.term.length >= 2)
				.sort((left, right) => right.term.length - left.term.length || left.at - right.at);
			for (const merge of candidates) {
				if (merge.covered.some((index) => suppressed.has(index))) continue;
				for (const index of merge.covered) suppressed.add(index);
				const anchor = merge.covered[merge.covered.length - 1];
				const list = adopted.get(anchor) ?? [];
				list.push(merge.term);
				adopted.set(anchor, list);
			}

			const terms = [];
			for (let i = 0; i < raw.length; i += 1) {
				const term = raw[i].term;
				if (!suppressed.has(i) && term.length >= 2 && !STOPWORDS.has(term)) terms.push(term);
				for (const value of adopted.get(i) ?? []) terms.push(value);
			}
			return terms;
		}

		/**
		 * Build one merge candidate over `width` consecutive single-character
		 * segments starting at `start`.
		 * @param parts - the chunk's segments with their term indices.
		 * @param start - first segment index.
		 * @param width - how many segments to join.
		 * @returns the merge candidate.
		 */
		function compoundAt(parts, start, width) {
			const covered = [];
			let term = "";
			for (let offset = 0; offset < width; offset += 1) {
				term += parts[start + offset].term;
				covered.push(parts[start + offset].index);
			}
			return { term, covered, at: start };
		}

		/** Per-text term memo. Keyed by the text itself, bounded to avoid unbounded growth. */
		const TERM_CACHE = new Map();
		/** Upper bound on cached segmentations (one conversation's worth of modules). */
		const TERM_CACHE_LIMIT = 2000;

		/**
		 * {@link segmentText} with a bounded memo — the chart asks for the same
		 * module text on every render (chips, filtering, keyword roll-ups).
		 * @param text - raw module text.
		 * @returns resolved terms.
		 */
		function termsOf(text) {
			if (typeof text !== "string" || text.length === 0) return [];
			const cached = TERM_CACHE.get(text);
			if (cached !== undefined) return cached;
			const terms = segmentText(text);
			if (TERM_CACHE.size >= TERM_CACHE_LIMIT) TERM_CACHE.clear();
			TERM_CACHE.set(text, terms);
			return terms;
		}

		/**
		 * Collapse a term list into weighted keywords with turn document frequency.
		 * @param texts - one entry per turn (missing text counts as empty).
		 * @returns weighted terms, strongest first.
		 */
		function keywordsOf(texts) {
			const documents = (Array.isArray(texts) ? texts : []).map((text) => termsOf(text ?? ""));
			const docFrequency = new Map();
			const totalCount = new Map();
			const firstTurn = new Map();
			for (let i = 0; i < documents.length; i += 1) {
				const counts = new Map();
				for (const term of documents[i]) {
					counts.set(term, (counts.get(term) ?? 0) + 1);
					totalCount.set(term, (totalCount.get(term) ?? 0) + 1);
					if (!firstTurn.has(term)) firstTurn.set(term, i);
				}
				for (const term of counts.keys()) docFrequency.set(term, (docFrequency.get(term) ?? 0) + 1);
			}
			const scored = [];
			for (const [term, count] of totalCount) {
				if (count < 2) continue;
				const df = docFrequency.get(term) ?? 1;
				const local = documents[documents.length - 1].filter((value) => value === term).length;
				const score = count * (1 + Math.log(documents.length / df)) * (1 + local / Math.max(1, count));
				scored.push({ term, score, count, df, firstTurn: firstTurn.get(term) ?? 0 });
			}
			scored.sort((left, right) => right.score - left.score || left.term.localeCompare(right.term));
			const max = scored.length === 0 ? 1 : scored[0].score;
			return scored.map((entry) => ({ ...entry, weight: entry.score / max }));
		}

		/**
		 * Terms that occur in a scope, with their per-turn hit distribution.
		 * @param texts - turn texts inside the scope.
		 * @returns per-term statistics.
		 */
		function termProfile(texts) {
			const documents = (Array.isArray(texts) ? texts : []).map((text) => termsOf(text ?? ""));
			const perTurn = documents.map((list) => {
				const counts = new Map();
				for (const term of list) counts.set(term, (counts.get(term) ?? 0) + 1);
				return counts;
			});
			const profile = new Map();
			for (let i = 0; i < perTurn.length; i += 1) {
				for (const [term, count] of perTurn[i]) {
					const entry = profile.get(term) ?? { term, hits: 0, turns: new Set() };
					entry.hits += count;
					entry.turns.add(i);
					profile.set(term, entry);
				}
			}
			return profile;
		}

		/**
		 * Backward analysis over the modules that come BEFORE one node.
		 *
		 * This is the "look at the earlier modules, then extrapolate forward" step:
		 * scope terms that already repeat are the running topic and are proposed as
		 * continuations; the newest turn's distinctive terms are what the
		 * conversation just moved onto. A term appearing in only one turn is
		 * reported separately as a likely-new topic rather than dressed up as a
		 * theme.
		 *
		 * @param scopeTexts - per-turn text of the turns before the selected node.
		 * @param currentText - the selected node's own text.
		 * @returns themes, emerging terms, and suggested next questions.
		 */
		function analyzeBackward(scopeTexts, currentText) {
			const profile = termProfile(scopeTexts);
			const themes = [];
			for (const entry of profile.values()) {
				if (entry.turns.size < 2 || entry.hits < 2) continue;
				themes.push({
					term: entry.term,
					turns: entry.turns.size,
					hits: entry.hits,
					score: entry.hits * entry.turns.size
				});
			}
			themes.sort((left, right) => right.score - left.score || left.term.localeCompare(right.term));
			const ranked = themes.slice(0, 24);
			const keep = new Set(ranked.map((entry) => entry.term));

			const emerging = [];
			const currentProfile = termProfile([currentText]);
			for (const entry of currentProfile.values()) {
				if (keep.has(entry.term)) continue;
				emerging.push({ term: entry.term, hits: entry.hits });
			}
			emerging.sort((left, right) => right.hits - left.hits || left.term.localeCompare(right.term));

			const topThemes = ranked.slice(0, 3).map((entry) => entry.term);
			const combined = [...topThemes, ...emerging.slice(0, 3).map((entry) => entry.term)];
			const ideas = suggestQuestions(combined, topThemes, scopeTexts.length);
			return {
				themes: ranked,
				emerging: emerging.slice(0, 12),
				turnCount: scopeTexts.length,
				ideas
			};
		}

		/**
		 * Compose candidate next questions from the analyzed terms.
		 * @param terms - strongest repeated terms plus emerging ones, in priority order.
		 * @param themes - the repeated-theme subset, used to decide the template mix.
		 * @param earlierTurns - how many turns the analysis covered.
		 * @returns de-duplicated question strings.
		 */
		function suggestQuestions(terms, themes, earlierTurns) {
			const unique = [];
			for (const term of terms) if (term.length > 0 && !unique.includes(term)) unique.push(term);
			if (unique.length === 0 || earlierTurns < 2) return [];
			const subject = unique[0];
			const second = unique[1] ?? subject;
			const third = unique[2] ?? second;
			const templates = [
				"围绕「{a}」继续展开：把上一轮没说完的部分补全，并给出具体做法。",
				"把「{a}」和「{b}」的关系讲清楚：它们如何互相影响，有没有冲突？",
				"针对「{a}」给出可执行的下一步，并列出验收标准。",
				"「{a}」目前还有哪些边界情况没覆盖？逐条说明并给出处理方案。",
				"如果「{a}」的前提不成立，替代方案是什么？对比「{b}」说明取舍。",
				"把前面几轮关于「{a}」「{b}」的结论汇总成一份清单，并标出仍然不确定的点。"
			];
			const offset = themes.length >= 2 ? 0 : 1;
			const picked = [];
			for (let i = 0; i + offset < templates.length && picked.length < 3; i += 1) {
				const template = templates[i + offset];
				picked.push(
					template
						.replace(/\{a\}/g, subject)
						.replace(/\{b\}/g, second)
						.replace(/\{c\}/g, third)
				);
			}
			return picked;
		}
		//#endregion

		//#region lib/client/branching.js
		/**
		 * Turning the turn sequence into a BRANCH TREE.
		 *
		 * Each turn asks a question; the interesting structure is which earlier
		 * question this one continues. The rule is local and explainable: compare
		 * this turn's QUESTION against every earlier question, take the best match
		 * above a cosine floor, and attach to it — where "match" means the two
		 * questions share terms, weighted so that a term rare across this session
		 * counts for more than one every turn uses. Nothing above the floor means
		 * the question is new and starts its own branch.
		 *
		 * Automatic answers are guesses, so a person can override any node: pin it
		 * to another node, or pin it as a branch root. A pinned node is never
		 * re-guessed, which is what makes the map stay as the user arranged it.
		 */

		/**
		 * Minimum shared-signal ratio that counts as "this continues that question".
		 *
		 * The two measured classes, from the showcase conversations and this machine's
		 * real ones: a genuine continuation — a question that names the older one's
		 * topic again — lands at 0.44–1.00, while a pair that merely reuses the
		 * session's background vocabulary reaches at most 0.28. Both sides of that gap
		 * are asserted by `behaviour.mjs`, because a threshold is only as good as the
		 * separation underneath it.
		 *
		 * 0.40 was the value read straight off that table (the gap's midpoint). It was
		 * then deliberately TIGHTENED to 0.50, at the product owner's request, to make
		 * a 回溯 claim harder to earn: 0.50 sits well clear of the false class (0.28)
		 * and above the bottom of the genuine band, so borderline pairs in 0.44–0.50 —
		 * measured example: 0.4391 for "深色主题下卡片的对比度需要满足 4.5:1 吗"
		 * continuing "思维导图的卡片配色能不能换成深色主题" — stop being reported as
		 * "rejoining an older thread" and fall back to the structural rule instead.
		 * That is the intended trade: fewer, better-evidenced 回溯 links, and more
		 * turns placed by conversation order (which is also usually the same parent
		 * when the two turns are adjacent).
		 *
		 * Note this is NOT the cosine floor of an earlier revision: cosine scored the
		 * false pair at 0.20 and a true pair at 0.32, so no cosine threshold could
		 * separate them at all.
		 */
		const LINK_MIN_SCORE = 0.5;
		/**
		 * How far back a match may reach. A question that only resembles something
		 * forty turns ago is far more likely to be a new topic than a continuation,
		 * and long-range links make the drawn tree unreadable.
		 */
		const LINK_MAX_AGE = 12;

		/**
		 * The documented level cap, in BRANCH levels below the title.
		 *
		 * The requirement document's 判断逻辑 and 约束与偏好 both ask for a bounded
		 * hierarchy (“一般不超过 5 层；若层级过深，可考虑合并或拆分节点”), and its
		 * 配置建议 table names 5 as 最大层级. A turn whose natural parent already sits
		 * at the cap is therefore placed as a SIBLING of that parent — the document's
		 * 换行新建 — instead of one level deeper: the map grows sideways at the cap
		 * rather than marching off to the right. The label records it as its own
		 * decision ({@link LINK_SIBLING}) rather than as a continuation, because the
		 * structure genuinely differs. `0` disables the cap.
		 */
		const LINK_MAX_DEPTH = 5;

		/**
		 * Cosine similarity between the weighted term vectors of two questions.
		 *
		 * The weights are the session's own IDF, so a term unique to these two
		 * questions dominates the score while a term present in every question
		 * decays to nothing — the standard reason raw term overlap alone links the
		 * wrong turns.
		 *
		 * @param left - weighted profile of the earlier question.
		 * @param right - weighted profile of the later question.
		 * @returns similarity in [0, 1], 0 when either side has no terms.
		 */
		function cosineSimilarity(left, right) {
			if (left === undefined || right === undefined || left.size === 0 || right.size === 0) return 0;
			const [small, large] = left.size <= right.size ? [left, right] : [right, left];
			let dot = 0;
			for (const [term, weight] of small) {
				const other = large.get(term);
				if (other !== undefined) dot += weight * other;
			}
			if (dot === 0) return 0;
			let leftNorm = 0;
			for (const weight of left.values()) leftNorm += weight * weight;
			let rightNorm = 0;
			for (const weight of right.values()) rightNorm += weight * weight;
			if (leftNorm === 0 || rightNorm === 0) return 0;
			return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
		}

		/**
		 * How many questions a term may appear in and still count as a signal.
		 *
		 * The background of a session is its shared vocabulary: the product name,
		 * the file it is about, "how do I". A term at or below this document
		 * frequency is specific by construction.
		 */
		const LINK_SIGNAL_DF = 2;

		/**
		 * Per-question weighted term vectors plus the question's distinctive subset.
		 *
		 * A question has two vocabularies. Its BACKGROUND is the vocabulary the whole
		 * session shares (the product name, "plugin", "how do I"); its SIGNAL is what
		 * it is specifically about — terms whose session document-frequency is at most
		 * {@link LINK_SIGNAL_DF}, or that reach the question's own median IDF.
		 *
		 * Both arms are needed. The document-frequency arm is what keeps a SHORT
		 * session honest: with two questions every term has IDF above the median, so a
		 * median-only rule would call the background signal and two unrelated
		 * questions would link. The median arm keeps a long session usable: without
		 * it, a term used four times in a forty-question session is still "rare" by
		 * count yet is plainly background.
		 *
		 * @param turns - turn models in order.
		 * @returns aligned profiles; a turn with no question text gets an empty one.
		 */
		function questionProfiles(turns) {
			const documents = turns.map((turn) => termsOf(turn.promptText.length > 0 ? turn.promptText : turn.text));
			const documentFrequency = new Map();
			for (const document of documents) {
				for (const term of new Set(document)) documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
			}
			const total = Math.max(1, documents.length);
			return documents.map((document) => {
				const counts = new Map();
				for (const term of document) counts.set(term, (counts.get(term) ?? 0) + 1);
				const vector = new Map();
				const signalVector = new Map();
				const idfByTerm = new Map();
				for (const [term, count] of counts) {
					const df = documentFrequency.get(term) ?? 1;
					// Smoothed IDF; the clamp keeps a term that appears everywhere at a
					// small but non-zero weight instead of collapsing the vector to zero.
					const idf = Math.max(0.08, Math.log(1 + total / (1 + df)));
					const weight = (1 + Math.log(count)) * idf;
					idfByTerm.set(term, idf);
					vector.set(term, weight);
				}
				const distinct = new Set();
				const sorted = [...idfByTerm.values()].sort((left, right) => left - right);
				const median = sorted.length === 0 ? 0 : sorted[Math.floor(sorted.length / 2)];
				for (const [term, idf] of idfByTerm) {
					const df = documentFrequency.get(term) ?? 1;
					if (df > LINK_SIGNAL_DF && idf < median) continue;
					distinct.add(term);
					signalVector.set(term, vector.get(term));
				}
				return { vector, signalVector, distinctive: distinct };
			});
		}

		/**
		 * How much of the two questions' shared vocabulary is SIGNAL rather than
		 * background.
		 *
		 * Returning a ratio rather than a cosine is deliberate: cosine alone does not
		 * separate the cases, because it also depends on how many terms the questions
		 * happen to have. Measured, a genuine continuation shares a large part of the
		 * smaller question's signal (0.44–1.00), while a pair that merely reuses the
		 * session's background vocabulary reaches at most 0.28. Thresholding the ratio
		 * separates them where a raw cosine floor of 0.3 does not (cosine scored the
		 * false pair 0.20 and a true pair 0.32 — overlapping bands).
		 *
		 * @param left - an earlier question's profile.
		 * @param right - the later question's profile.
		 * @returns ratio in [0, 1]; 0 when either side has no signal vocabulary.
		 */
		function signalOverlap(left, right) {
			let shared = 0;
			const [small, large] = left.distinctive.size <= right.distinctive.size ? [left, right] : [right, left];
			for (const term of small.distinctive) {
				const weight = small.signalVector.get(term) ?? 0;
				const other = large.signalVector.get(term);
				if (other === undefined) continue;
				shared += Math.min(weight, other);
			}
			if (shared === 0) return 0;
			let smallerWeight = 0;
			for (const value of small.signalVector.values()) smallerWeight += value;
			if (smallerWeight === 0) return 0;
			return shared / smallerWeight;
		}

		/**
		 * Rank the earlier questions this one could continue.
		 *
		 * Two conditions, in order: the questions must share SIGNAL vocabulary (not
		 * just the session's background words), and that shared signal must cover a
		 * large enough share of the smaller question — see {@link signalOverlap}.
		 *
		 * @param index - index of the question in the session.
		 * @param profiles - aligned question profiles.
		 * @returns candidates, strongest first.
		 */
		function linkCandidates(index, profiles) {
			const candidates = [];
			const from = Math.max(0, index - LINK_MAX_AGE);
			const mine = profiles[index];
			for (let earlier = index - 1; earlier >= from; earlier -= 1) {
				const theirs = profiles[earlier];
				const score = signalOverlap(theirs, mine);
				if (score <= 0) continue;
				candidates.push({ index: earlier, score });
			}
			candidates.sort((left, right) => right.score - left.score || right.index - left.index);
			return candidates;
		}

		/**
		 * Whether a value is Map-like.
		 *
		 * Deliberately duck-typed rather than `instanceof Map`: an `instanceof` test
		 * is realm-bound, so a Map built in another realm (a test sandbox, an
		 * iframe) fails it and the caller silently falls back to "no overrides" —
		 * which drops exactly the manual edits this map exists to preserve.
		 *
		 * @param value - candidate.
		 * @returns whether it supports the Map read surface.
		 */
		function isMapLike(value) {
			return typeof value === "object" && value !== null
				&& typeof value.get === "function"
				&& typeof value.has === "function"
				&& typeof value.forEach === "function";
		}

		/**
		 * Resolve every turn's parent link into a branch forest.
		 *
		 * The rule, in order:
		 *
		 *  1. a hand-pinned parent wins over everything — that is what pinning means;
		 *  2. a JUDGMENT made elsewhere (`options.seed`, the model path) comes next: it
		 *     is the same kind of automatic answer as the wording matcher, just decided
		 *     by a model instead of by shared vocabulary;
		 *  3. an explicit WORDING match to an earlier question wins over the chain —
		 *     that is the only evidence that this turn is rejoining a specific older
		 *     thread;
		 *  4. otherwise the turn continues the one immediately before it. In a
		 *     conversation the next question follows the last answer; that is the
		 *     structure, not a guess, so it does not have to be earned by similarity;
		 *  5. the first turn starts the map;
		 *  6. and a turn that would land deeper than {@link LINK_MAX_DEPTH} is placed
		 *     beside its predecessor instead of below it (the document's 换行新建).
		 *
		 * Why (4) is not a similarity test any more — measured, not assumed. Over the
		 * real sessions on this machine (`tools/measure-sessions.mjs`), every genuine
		 * follow-up scored **0.00–0.33** on both wording and context overlap: real
		 * follow-ups are pronoun-like and short ("是对的", "我在终端执行完了"), so they
		 * repeat almost none of the reply's nouns. A threshold high enough to refuse a
		 * topic change therefore refuses real follow-ups too — the previous release
		 * shipped exactly that mistake, and sent 8 of 9 real follow-ups to their own
		 * branch. Chain by default; let wording break the chain.
		 *
		 * `overrides` maps a turn id to a parent turn id or to `null` meaning
		 * "branch root". Overrides win over every other rule and are never
		 * re-derived, so a hand-arranged map stays hand-arranged.
		 *
		 * @param turns - turn models in order.
		 * @param overrides - manual parent choices.
		 * @param options - `{ seed, maxDepth }`; `seed` maps a turn id to
		 * `{ parent, operation }` (an automatic judgment from the model path), and
		 * `maxDepth` overrides {@link LINK_MAX_DEPTH} (0 = uncapped).
		 * @returns nodes with parent/children/link metadata, plus the root order.
		 */
		function resolveLinks(turns, overrides, options) {
			const manual = isMapLike(overrides) ? overrides : new Map();
			const seed = isMapLike(options?.seed) ? options.seed : new Map();
			const requestedDepth = Number(options?.maxDepth);
			const maxDepth = Number.isFinite(requestedDepth)
				? Math.min(12, Math.max(0, Math.round(requestedDepth)))
				: LINK_MAX_DEPTH;
			const profiles = questionProfiles(turns);
			const candidates = turns.map((_, index) => linkCandidates(index, profiles));
			const nodes = new Map();
			const indexById = new Map();
			const depthById = new Map();
			for (let index = 0; index < turns.length; index += 1) indexById.set(turns[index].id, index);
			/**
			 * Whether a seeded judgment names a usable parent.
			 *
			 * The same acyclicity rule as everywhere else: only a strictly earlier turn
			 * may be a parent, so a model that names a later node (or itself) is ignored
			 * rather than trusted into a cycle.
			 *
			 * @param judgment - the seeded entry, if any.
			 * @param index - the turn's position.
			 * @returns whether the judgment is usable.
			 */
			const usableSeed = (judgment, index) => {
				if (judgment === null || typeof judgment !== "object" || Array.isArray(judgment)) return false;
				const parent = judgment.parent;
				if (parent === null || parent === undefined) return true;
				if (typeof parent !== "string") return false;
				const at = indexById.get(parent);
				return at !== undefined && at < index;
			};
			for (let index = 0; index < turns.length; index += 1) {
				const turn = turns[index];
				const isManual = manual.has(turn.id);
				const chosen = manual.get(turn.id);
				const judgment = seed.get(turn.id);
				const judged = !isManual && usableSeed(judgment, index) ? judgment : undefined;
				let parent = null;
				let score = 0;
				let kind = "root";
				let operation;
				if (isManual) {
					// An explicit `null` means "branch root" and MUST suppress the
					// matcher — that is the whole point of pinning. Only an absent entry
					// hands the decision back to the guess below.
					if (typeof chosen === "string") {
						parent = chosen;
						score = 1;
					}
					kind = "manual";
				} else if (judged !== undefined) {
					parent = judged.parent === undefined ? null : judged.parent;
					score = 1;
					kind = "model";
					if (typeof judged.operation === "string") operation = judged.operation;
				} else {
					const best = candidates[index][0];
					if (best !== undefined && best.score >= LINK_MIN_SCORE) {
						parent = turns[best.index].id;
						score = best.score;
						kind = "auto";
					} else if (index > 0) {
						parent = turns[index - 1].id;
						score = 0;
						kind = "previous";
					}
				}
				// A parent must be an earlier turn: the tree has to stay acyclic and
				// ordered even after a hand edit.
				if (parent !== null) {
					const parentIndex = indexById.get(parent) ?? -1;
					if (parentIndex < 0 || parentIndex >= index) {
						parent = null;
						kind = isManual ? "manual" : "root";
						score = 0;
						operation = undefined;
					}
				}
				// The documented level cap. Walking UP the ancestor chain keeps the
				// parent strictly earlier by construction, and the walk terminates
				// because every ancestor's index is smaller. A hand-pinned parent is
				// deliberately exempt: the cap is a default, the pin is an instruction.
				let capped = false;
				if (parent !== null && !isManual && maxDepth > 0) {
					let guard = 0;
					while (parent !== null && (depthById.get(parent) ?? 1) + 1 > maxDepth && guard <= turns.length) {
						const above = nodes.get(parent);
						if (above === undefined) break;
						parent = above.parent;
						capped = true;
						guard += 1;
					}
					if (capped) {
						// Sibling of the node the turn would have continued: the same
						// claim the document calls 换行新建, and the reason it must not be
						// labelled as a continuation.
						kind = "sibling";
						operation = "sibling";
						score = 0;
					}
				}
				const depth = parent === null ? 1 : (depthById.get(parent) ?? 1) + 1;
				depthById.set(turn.id, depth);
				const link = { kind, score };
				if (operation !== undefined) link.operation = operation;
				nodes.set(turn.id, {
					turn,
					index,
					depth,
					parent,
					children: [],
					link,
					candidates: candidates[index].slice(0, 5)
				});
			}
			const roots = [];
			for (const turn of turns) {
				const node = nodes.get(turn.id);
				if (node.parent === null) roots.push(node);
				else nodes.get(node.parent)?.children.push(node);
			}
			for (const node of nodes.values()) {
				node.children.sort((left, right) => left.index - right.index);
			}
			return { nodes, roots };
		}

		/**
		 * JSON-safe view of the manual parent choices, for storage.
		 * @param overrides - manual parent choices.
		 * @returns a plain object keyed by turn id.
		 */
		function overridesToRecord(overrides) {
			const record = {};
			for (const [id, parent] of overrides) record[id] = parent;
			return record;
		}

		/**
		 * Rebuild manual parent choices from stored JSON.
		 * @param record - parsed stored object.
		 * @returns a Map; empty when the record is malformed.
		 */
		function overridesFromRecord(record) {
			const map = new Map();
			if (typeof record !== "object" || record === null) return map;
			for (const [id, parent] of Object.entries(record)) {
				if (typeof id !== "string") continue;
				if (parent === null) map.set(id, null);
				else if (typeof parent === "string") map.set(id, parent);
			}
			return map;
		}
		//#endregion

		//#region lib/client/prompt.js
		/**
		 * The layering prompt, as specified by the requirement document.
		 *
		 * This module is ASSETS, not logic: the system prompt, the user-input
		 * template, and the operation vocabulary are kept verbatim-able so the
		 * 「提示词」 panel can show and copy exactly what the plugin sends. Nothing
		 * here decides anything — {@link buildLayerSystemPrompt} substitutes the
		 * documented `{{VARIABLE}}` placeholders and appends the run's config, and
		 * the layering engine reads the operation ids from {@link LAYER_OPERATIONS}.
		 *
		 * The prompt is Chinese by design (the document's own text), and it is the
		 * client half that owns it — not the host bridge — because it is also a UI
		 * asset the user reads and copies, and because keeping it on one side means
		 * there is exactly one copy to drift.
		 */

		/**
		 * The three operations, in the document's own vocabulary.
		 *
		 * `id` is the machine name (`push` / `sibling` / `branch`, the same three
		 * the document's maintenance section names for a JSON transport); `tag` is
		 * the marker the model must print on the first line of its fragment; `zh`
		 * and `en` are the human names used in labels and in the prompt text.
		 */
		const LAYER_OPERATIONS = [
			{ id: "push", tag: "[下推]", zh: "父类下推", en: "push" },
			{ id: "sibling", tag: "[换行]", zh: "换行新建", en: "sibling" },
			{ id: "branch", tag: "[回溯]", zh: "回溯分支", en: "branch" }
		];

		/**
		 * Every spelling of an operation marker this parser accepts.
		 *
		 * The document's Chinese tags are the contract; the English ids and names
		 * are accepted because a model that was told to answer in English, or that
		 * echoes the JSON transport, must not produce an unparsable fragment.
		 */
		const LAYER_TAGS = {
			"[下推]": "push", "[换行]": "sibling", "[回溯]": "branch",
			"[push]": "push", "[sibling]": "sibling", "[branch]": "branch",
			"[PUSH]": "push", "[SIBLING]": "sibling", "[BRANCH]": "branch",
			"父类下推": "push", "换行新建": "sibling", "回溯分支": "branch"
		};

		/**
		 * Configuration defaults, straight from the document's 插件配置建议 table.
		 *
		 * `maxDepth` 5 and `nodeMaxChars` 15 are the document's numbers; the
		 * temperature band 0.2–0.5 is the document's stability recommendation and is
		 * enforced by {@link layerNumber}, not merely suggested. `mode` starts
		 * offline: the lexical engine is this plugin's identity and needs no model.
		 */
		const LAYER_DEFAULTS = Object.freeze({
			mode: "offline",
			maxDepth: 5,
			nodeMaxChars: 15,
			language: "zh",
			outputFormat: "markdown",
			temperature: 0.3,
			temperatureMin: 0.2,
			temperatureMax: 0.5,
			maxTokens: 700,
			timeoutMs: 90000,
			turnLimit: 24,
			provider: "",
			model: ""
		});

		/**
		 * The document's system prompt, verbatim.
		 *
		 * Kept as one template literal with the documented `{{VARIABLE}}`
		 * placeholders intact, so what a user copies out of the plugin is the
		 * document's text and not a paraphrase of it.
		 */
		const LAYER_SYSTEM_PROMPT = `# DSH-Mindmap 智能分层提示词

## 角色定位
你是 DSH-Mindmap 思维导图构建引擎，负责在对话过程中动态生成、调整并维护思维导图结构。你具备深度语义理解与上下文追踪能力，能够自动判断当前问题或回答与已有节点之间的逻辑关系，并决定其应归属的层级与分支。

## 核心目标
每一轮对话中，接收当前用户问题或你的回答，结合历史思维导图节点，分析语义关联，并选择以下三种操作之一：

1. 父类下推
   若当前内容是对上一节点的细化、追问、解释或直接延续，则将其作为上一节点的子节点，画线下推，形成更深入的层级。

2. 换行新建
   若当前内容是由上一回答引出的新问题，或与上一节点属于同一层级的不同方面，则换行新建一个同级节点，保持结构并列。

3. 回溯分支
   若当前内容与更早的某个节点高度相关，而非直接延续上一节点，则从该祖先节点重新建立一个新的分支，书写新问题，形成横向扩展。

## 判断逻辑
- 语义相似度：比较当前内容与最近节点的关键词、意图和主题，判断是否属于同一脉络。
- 对话流向：识别当前内容是“深入”“并列”还是“跳转”。
- 上下文连贯性：优先保持思维导图的逻辑连贯，避免孤立节点，确保每个节点都有明确的父级或同级归属。
- 层级深度：合理控制层级，一般不超过 {{MAX_DEPTH}} 层；若层级过深，可考虑合并或拆分节点。
- 不确定原则：若无法确定归属，优先选择“换行新建”，保持结构清晰。

## 输出格式
以 Markdown 嵌套列表表示思维导图结构，例如：

\`\`\`markdown
- 根节点
  - 子节点 A
    - 子节点 A1
  - 子节点 B
- 新分支根节点
\`\`\`

每次输出时，仅输出新增或调整的部分，并注明操作类型：

- [下推]
- [换行]
- [回溯]

## 约束与偏好
- 保持节点标题简洁，建议不超过 {{NODE_MAX_CHARS}} 字。
- 自动推断隐含关系，无需用户显式指定层级。
- 若无法确定归属，优先选择“换行新建”。
- 每次操作后，更新思维导图全局状态，确保后续判断基于最新结构。
- 使用优雅、专业的语言描述节点，避免口语化冗余。
- 不输出与思维导图无关的解释，除非用户要求。
- 保持节点命名一致，避免同义重复。

## 启动指令
当接收到新的对话内容时，请立即执行以下步骤：

1. 提取当前内容的核心意图与关键词。
2. 遍历历史思维导图节点，计算语义关联度。
3. 根据关联度与对话流向，选择“下推 / 换行 / 回溯”操作。
4. 输出调整后的思维导图片段，并标注操作类型。
5. 更新内部思维导图状态，等待下一轮输入。`;

		/** The document's user-input template, verbatim. */
		const LAYER_USER_TEMPLATE = `【历史思维导图】
{{MINDMAP_STATE}}

【最近对话节点】
上一节点：{{LAST_NODE}}
上一问题：{{LAST_QUESTION}}
上一回答：{{LAST_ANSWER}}

【当前输入】
当前问题：{{CURRENT_QUESTION}}
当前回答：{{CURRENT_ANSWER}}

请判断当前内容应执行：父类下推 / 换行新建 / 回溯分支，并仅输出新增或调整后的思维导图片段。
首行必须是 [下推]、[换行] 或 [回溯] 之一，其余行是 Markdown 嵌套列表片段。`;

		/**
		 * The run's configuration block, appended to the system prompt.
		 *
		 * This is how `{{MAX_DEPTH}}` / `{{NODE_MAX_CHARS}}` / `{{LANGUAGE}}` /
		 * `{{OUTPUT_FORMAT}}` reach the model: the document's prompt body uses the
		 * first two inline, and the last two are stated here. Restating all four in
		 * one block also makes the effective values auditable in the copied prompt.
		 */
		const LAYER_CONFIG_BLOCK = `## 本次配置
- 最大层级 MAX_DEPTH = {{MAX_DEPTH_VALUE}}（超过时按文档选择“换行新建”）
- 节点最大字数 NODE_MAX_CHARS = {{NODE_MAX_CHARS_VALUE}}
- 输出语言 LANGUAGE = {{LANGUAGE_VALUE}}
- 输出格式 OUTPUT_FORMAT = {{OUTPUT_FORMAT_VALUE}}
- 不确定归属时：换行新建`;

		/** What each documented variable means, for the panel that lists them. */
		const LAYER_VARIABLES = [
			{ name: "MAX_DEPTH", zh: "最大层级，默认 5" },
			{ name: "NODE_MAX_CHARS", zh: "节点最大字数，默认 15" },
			{ name: "LANGUAGE", zh: "输出语言，默认中文" },
			{ name: "OUTPUT_FORMAT", zh: "输出格式，默认 Markdown 嵌套列表" },
			{ name: "MINDMAP_STATE", zh: "当前思维导图状态" },
			{ name: "LAST_NODE", zh: "上一节点" },
			{ name: "CURRENT_QUESTION", zh: "当前问题" },
			{ name: "CURRENT_ANSWER", zh: "当前回答" }
		];

		/** Human name of one operation id. */
		const LAYER_OP_LABEL = { push: "父类下推", sibling: "换行新建", branch: "回溯分支" };

		/** Output format names, as the document states them. */
		const LAYER_FORMATS = { markdown: "Markdown 嵌套列表", json: "JSON（保留 operation 字段）" };

		/** Language names. */
		const LAYER_LANGUAGES = { zh: "中文", en: "English" };

		/**
		 * Substitute `{{NAME}}` placeholders.
		 *
		 * An unknown placeholder is left standing rather than blanked out: a prompt
		 * with `{{FOO}}` in it is a readable bug report, while a prompt with an empty
		 * string where a value belongs is a silently weaker instruction.
		 *
		 * @param text - template text.
		 * @param values - placeholder name → replacement.
		 * @returns the filled text.
		 */
		function fillLayerTemplate(text, values) {
			if (typeof text !== "string" || text.length === 0) return "";
			return text.replace(/\{\{([A-Z_]+)\}\}/g, (match, name) => {
				const value = values[name];
				return value === undefined || value === null ? match : String(value);
			});
		}

		/**
		 * The system prompt for one run: the documented prompt plus the effective
		 * configuration, all placeholders resolved.
		 * @param config - normalized layer config.
		 * @returns the system prompt text.
		 */
		function buildLayerSystemPrompt(config) {
			const values = {
				MAX_DEPTH: config.maxDepth > 0 ? config.maxDepth : "不限",
				MAX_DEPTH_VALUE: config.maxDepth > 0 ? config.maxDepth : "不限",
				NODE_MAX_CHARS: config.nodeMaxChars,
				NODE_MAX_CHARS_VALUE: config.nodeMaxChars,
				LANGUAGE: LAYER_LANGUAGES[config.language] ?? config.language,
				LANGUAGE_VALUE: LAYER_LANGUAGES[config.language] ?? config.language,
				OUTPUT_FORMAT: LAYER_FORMATS[config.outputFormat] ?? config.outputFormat,
				OUTPUT_FORMAT_VALUE: config.outputFormat === "json"
					? 'JSON 数组，每项含 operation（push/sibling/branch）、path（从根到新节点的标签数组）'
					: LAYER_FORMATS.markdown
			};
			return `${fillLayerTemplate(LAYER_SYSTEM_PROMPT, values)}\n\n${fillLayerTemplate(LAYER_CONFIG_BLOCK, values)}`;
		}

		/**
		 * The user turn for one run: the document's template with the whole context
		 * substituted.
		 * @param input - mind-map state plus the last and current node/question/answer.
		 * @returns the user prompt text.
		 */
		function buildLayerUserPrompt(input) {
			const values = {
				MINDMAP_STATE: typeof input.state === "string" && input.state.length > 0 ? input.state : "（空）",
				LAST_NODE: input.lastNode ?? "（无，本轮是导图起点）",
				LAST_QUESTION: input.lastQuestion ?? "（无）",
				LAST_ANSWER: input.lastAnswer ?? "（无）",
				CURRENT_QUESTION: input.currentQuestion ?? "（无）",
				CURRENT_ANSWER: input.currentAnswer ?? "（无）"
			};
			return fillLayerTemplate(LAYER_USER_TEMPLATE, values);
		}

		/**
		 * The exact request one model call carries.
		 *
		 * Transport-neutral on purpose: the view posts this to the host bridge, and
		 * the gate asserts on it directly, so "the prompt the plugin sends" is one
		 * value rather than two that can disagree.
		 *
		 * @param config - normalized layer config.
		 * @param input - context for the user template.
		 * @returns system, user, and the sampling knobs.
		 */
		function buildLayerRequest(config, input) {
			return {
				system: buildLayerSystemPrompt(config),
				user: buildLayerUserPrompt(input),
				provider: config.provider,
				model: config.model,
				temperature: config.temperature,
				maxTokens: config.maxTokens,
				timeoutMs: config.timeoutMs
			};
		}
		//#endregion

		//#region lib/client/layering.js
		/**
		 * The layering engine: operations, global state, and the fragment protocol.
		 *
		 * The document asks for three operations — 父类下推 (push), 换行新建
		 * (sibling), 回溯分支 (branch) — chosen by judging the current content
		 * against the existing mind map, one Markdown nested-list fragment per turn,
		 * and a global state that every judgment is based on.
		 *
		 * The plugin has two judges for that same question, and this module is where
		 * they meet:
		 *
		 *  - OFFLINE (the default, and the only one that runs without a model): the
		 *    wording matcher in `branching.js` decides, and its link kinds map onto
		 *    the operations — a wording match to an older question is 回溯分支, the
		 *    structural continuation of the previous turn is 父类下推, and breaking
		 *    the chain because a push would exceed the documented depth limit is
		 *    换行新建. The measured justification for that first pair lives in the
		 *    README; the ordering is what keeps real follow-ups attached.
		 *  - MODEL (opt-in, `mode: "model"`): the prompt in `prompt.js` is sent with
		 *    this module's rendered state, and the model's answer is parsed back into
		 *    the same operation vocabulary — including 换行新建 for “无法判断归属”,
		 *    which the offline judge resolves the other way (the conversation's order
		 *    is structure, not a guess — see README「分支是怎么定的」).
		 *
		 * Everything here is pure: no DOM, no fetch, no clock. The view owns the
		 * transport; this module owns what a state looks like, what a fragment means,
		 * and which node a fragment attaches to.
		 */

		/**
		 * Clamp one numeric config field.
		 * @param value - candidate.
		 * @param min - inclusive lower bound.
		 * @param max - inclusive upper bound.
		 * @param fallback - used when the value is not a finite number.
		 * @returns a finite number inside the range.
		 */
		function layerNumber(value, min, max, fallback) {
			const number = typeof value === "number" ? value : Number(value);
			if (!Number.isFinite(number)) return fallback;
			return Math.min(max, Math.max(min, number));
		}

		/**
		 * Normalize a stored or partial configuration.
		 *
		 * Everything the user can type is treated as untrusted input: a bad value
		 * degrades to the document's default instead of poisoning the tree (a
		 * `maxDepth` of -3 would otherwise make every turn a root).
		 *
		 * @param raw - stored or partial config.
		 * @returns a complete, in-range config.
		 */
		function layerConfig(raw) {
			const source = raw !== null && typeof raw === "object" ? raw : {};
			const mode = source.mode === "model" ? "model" : "offline";
			const language = source.language === "en" ? "en" : "zh";
			const outputFormat = source.outputFormat === "json" ? "json" : "markdown";
			return {
				mode,
				// 0 is the documented way to say "no depth limit"; the document's own
				// recommendation is 5.
				maxDepth: Math.round(layerNumber(source.maxDepth, 0, 12, LAYER_DEFAULTS.maxDepth)),
				nodeMaxChars: Math.round(layerNumber(source.nodeMaxChars, 4, 60, LAYER_DEFAULTS.nodeMaxChars)),
				language,
				outputFormat,
				// The document's stability band. Applying it here rather than trusting
				// the field is the point: a temperature of 1.2 is what makes a map
				// sprout random branches.
				temperature: layerNumber(source.temperature, LAYER_DEFAULTS.temperatureMin, LAYER_DEFAULTS.temperatureMax, LAYER_DEFAULTS.temperature),
				maxTokens: Math.round(layerNumber(source.maxTokens, 64, 2000, LAYER_DEFAULTS.maxTokens)),
				timeoutMs: Math.round(layerNumber(source.timeoutMs, 5000, 300000, LAYER_DEFAULTS.timeoutMs)),
				turnLimit: Math.round(layerNumber(source.turnLimit, 1, 200, LAYER_DEFAULTS.turnLimit)),
				provider: typeof source.provider === "string" ? source.provider : "",
				model: typeof source.model === "string" ? source.model : ""
			};
		}

		/**
		 * One node label: whitespace collapsed, clipped to the documented length.
		 *
		 * The document asks for 简洁、专业的节点标题 with a 15-character default; the
		 * clipping is what keeps a rambling question from turning into a card-sized
		 * node in the exported state. An ellipsis marks the cut so a clipped label is
		 * never mistaken for the whole question.
		 *
		 * @param text - raw label source.
		 * @param maxChars - character budget.
		 * @returns the label.
		 */
		function layerNodeLabel(text, maxChars) {
			const normalized = String(text ?? "").replace(/\s+/g, " ").trim();
			const budget = Math.max(1, Math.round(layerNumber(maxChars, 1, 200, LAYER_DEFAULTS.nodeMaxChars)));
			if (normalized.length <= budget) return normalized;
			return `${normalized.slice(0, Math.max(1, budget - 1)).trimEnd()}…`;
		}

		/** Operation id for a link kind, or null when the kind carries its own. */
		function layerOperationOfLink(kind) {
			if (kind === "previous") return "push";
			if (kind === "auto") return "branch";
			if (kind === "sibling") return "sibling";
			if (kind === "root" || kind === "title") return "sibling";
			return null;
		}

		/**
		 * The operation one resolved node represents.
		 *
		 * A model- or hand-judged link records its own operation (the model may call
		 * the same structural parent 下推 or 换行), so that field wins; otherwise the
		 * kind decides.
		 *
		 * @param node - resolved branch node.
		 * @returns an operation id, or null for a node with no judgment (the title).
		 */
		function layerOperationOf(node) {
			const link = node?.link;
			if (link === undefined || link === null) return null;
			if (typeof link.operation === "string" && LAYER_OP_LABEL[link.operation] !== undefined) return link.operation;
			return layerOperationOfLink(link.kind);
		}

		/**
		 * Build the global mind-map state from the turns and their resolved links.
		 *
		 * This is the document's `{{MINDMAP_STATE}}`: every drawn turn as a node with
		 * its operation, its depth, and its parent, plus the rendered Markdown nested
		 * list. The state is derived, never stored: the turns and the link decisions
		 * are the source of truth, so a state can never disagree with the tree it
		 * describes.
		 *
		 * @param turns - turn models in order.
		 * @param branch - resolved branch forest.
		 * @param config - normalized layer config (for labels and depth accounting).
		 * @returns the state: ordered nodes, an index, per-operation counts, and Markdown.
		 */
		function layerState(turns, branch, config) {
			const list = Array.isArray(turns) ? turns : [];
			const forest = branch?.nodes;
			const nodes = [];
			const byId = new Map();
			const counts = { push: 0, sibling: 0, branch: 0, root: 0, manual: 0, model: 0 };
			const first = list[0];
			const rootLabel = first === undefined
				? ""
				: (layerNodeLabel(first.promptText.length > 0 ? first.promptText : first.text, config.nodeMaxChars) || `#${first.number}`);
			for (const turn of list) {
				const resolved = typeof forest?.get === "function" ? forest.get(turn.id) : undefined;
				const parentId = resolved === undefined ? null : resolved.parent;
				const parent = parentId === null ? undefined : byId.get(parentId);
				const operation = resolved === undefined ? "sibling" : (layerOperationOf(resolved) ?? "sibling");
				const kind = resolved?.link?.kind ?? "root";
				const node = {
					id: turn.id,
					number: turn.number,
					label: layerNodeLabel(turn.promptText.length > 0 ? turn.promptText : turn.text, config.nodeMaxChars) || `#${turn.number}`,
					question: turn.promptText,
					answer: turn.answerText,
					parentId,
					depth: parent === undefined ? 1 : parent.depth + 1,
					operation,
					kind,
					score: typeof resolved?.link?.score === "number" ? resolved.link.score : 0,
					source: kind === "model" ? "model" : kind === "manual" ? "manual" : "offline",
					children: []
				};
				nodes.push(node);
				byId.set(node.id, node);
				if (counts[operation] !== undefined) counts[operation] += 1;
				if (counts[node.source] !== undefined) counts[node.source] += 1;
				if (parent !== undefined) parent.children.push(node);
			}
			const state = { nodes, byId, counts, rootLabel, markdown: "" };
			state.markdown = layerStateMarkdown(state, config);
			return state;
		}

		/**
		 * Render a state as the document's Markdown nested list.
		 *
		 * No operation markers here on purpose: the document's own 历史节点 example is
		 * a bare nested list, and the markers belong to the FRAGMENT a model returns
		 * (“仅输出新增或调整的部分，并注明操作类型”).
		 *
		 * No synthetic title line either, even though the DRAWN map has one. The title
		 * card repeats the first question (`withTitleNode` takes its text from the
		 * first turn) and is a rendering device, not a node — emitting it here would
		 * hand the model the same question twice, once as a parent and once as a
		 * child, which is exactly the "obvious wrong nesting" the document's 验收标准
		 * forbids.
		 *
		 * @param state - layer state.
		 * @param config - normalized layer config.
		 * @returns the Markdown nested list.
		 */
		function layerStateMarkdown(state, config) {
			const lines = [];
			const walk = (node, depth) => {
				lines.push(`${"  ".repeat(depth)}- ${node.label}`);
				for (const child of node.children) walk(child, depth + 1);
			};
			for (const root of state.nodes.filter((node) => node.parentId === null)) walk(root, 0);
			return lines.join("\n");
		}

		/**
		 * Strip a Markdown code fence, keeping the fenced body.
		 *
		 * Models fence their fragments routinely; a fence left in place would make
		 * the first list-looking line a ``` line and the parse would find no node.
		 *
		 * @param text - raw model reply.
		 * @returns the unfenced text.
		 */
		function stripLayerFence(text) {
			const raw = String(text ?? "").replace(/\r\n?/g, "\n").trim();
			const match = raw.match(/^```[a-zA-Z]*\n([\s\S]*?)\n?```$/);
			if (match !== null) return match[1].trim();
			return raw.replace(/^```[a-zA-Z]*\s*/,"").replace(/\s*```$/,"").trim();
		}

		/**
		 * Normalize a model-supplied operation word.
		 * @param value - operation id, Chinese name, or tag.
		 * @returns an operation id, or null.
		 */
		function layerOperationId(value) {
			const raw = String(value ?? "").trim();
			if (raw.length === 0) return null;
			if (LAYER_OP_LABEL[raw] !== undefined) return raw;
			const tag = LAYER_TAGS[raw];
			if (tag !== undefined) return tag;
			const lowered = raw.toLowerCase().replace(/^\[|\]$/g, "").trim();
			if (LAYER_OP_LABEL[lowered] !== undefined) return lowered;
			if (lowered === "child" || lowered === "down" || lowered === "deeper") return "push";
			if (lowered === "same" || lowered === "same-level" || lowered === "parallel") return "sibling";
			if (lowered === "back" || lowered === "ancestor" || lowered === "rejoin") return "branch";
			return null;
		}

		/**
		 * Clean one list item into a node label.
		 * @param text - item text.
		 * @returns the label.
		 */
		function layerListLabel(text) {
			return String(text ?? "")
				.replace(/`/g, "")
				.replace(/\*\*/g, "")
				.replace(/^\s*\[[^\]]*\]\s*/, "")
				.replace(/\s*\[(下推|换行|回溯|push|sibling|branch)\]\s*$/i, "")
				.replace(/[：:]\s*$/, "")
				.trim();
		}

		/**
		 * Parse the Markdown nested list of a fragment into an ordered tree.
		 *
		 * Indentation decides nesting, and one indent unit is whatever the fragment
		 * actually uses (2 spaces, 4 spaces, or a tab): a fragment written at four
		 * spaces must not read as two levels of empty nodes.
		 *
		 * @param text - fragment body.
		 * @returns the roots, each `{ label, children }`.
		 */
		function parseLayerList(text) {
			const roots = [];
			const stack = [];
			const lines = String(text ?? "").split("\n");
			for (const line of lines) {
				const match = line.match(/^([ \t]*)(?:[-*+]|\d+[.)])\s+(.+?)\s*$/);
				if (match === null) continue;
				const indent = match[1].replace(/\t/g, "    ").length;
				const label = layerListLabel(match[2]);
				if (label.length === 0) continue;
				const node = { label, children: [] };
				while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop();
				if (stack.length === 0) roots.push(node);
				else stack[stack.length - 1].node.children.push(node);
				stack.push({ indent, node });
			}
			return roots;
		}

		/**
		 * Parse a JSON fragment body — the document's machine-readable alternative
		 * (`operation` plus a path, or `operation` plus nodes).
		 * @param text - candidate JSON text.
		 * @returns `{ operation, labels }`, or null when it is not that shape.
		 */
		function parseLayerJson(text) {
			const raw = String(text ?? "").trim();
			if (raw.length === 0 || !/^[[{]/.test(raw)) return null;
			let value = null;
			try {
				value = JSON.parse(raw);
			} catch {
				const open = raw.indexOf("{");
				const close = raw.lastIndexOf("}");
				if (open < 0 || close <= open) return null;
				try {
					value = JSON.parse(raw.slice(open, close + 1));
				} catch {
					return null;
				}
			}
			const entry = Array.isArray(value) ? value[0] : value;
			if (entry === null || typeof entry !== "object") return null;
			const operation = layerOperationId(entry.operation ?? entry.op ?? entry.type);
			if (operation === null) return null;
			const labels = [];
			const path = Array.isArray(entry.path) ? entry.path : Array.isArray(entry.labels) ? entry.labels : null;
			if (path !== null) for (const item of path) labels.push(layerListLabel(typeof item === "string" ? item : item?.label ?? ""));
			else if (Array.isArray(entry.nodes)) for (const item of entry.nodes) labels.push(layerListLabel(typeof item === "string" ? item : item?.label ?? ""));
			else if (typeof entry.label === "string" || typeof entry.node === "string") labels.push(layerListLabel(entry.label ?? entry.node));
			const kept = labels.filter((label) => label.length > 0);
			if (kept.length === 0) return null;
			return { operation, labels: kept };
		}

		/**
		 * Parse one model reply into an operation plus the labels it named.
		 *
		 * Both documented transports are accepted — the Markdown fragment with its
		 * `[下推]/[换行]/[回溯]` marker, and the JSON form with an `operation` field —
		 * because the document offers both and a model may pick either. Nothing here
		 * throws: an unparsable reply is reported as `ok: false` with whatever text
		 * the model did send, which is what the panel shows instead of a blank tree.
		 *
		 * @param text - raw model reply.
		 * @returns `{ ok, operation, rootLabel, childLabel, path, leaves, reason, raw }`.
		 */
		function parseLayerFragment(text) {
			const raw = String(text ?? "");
			const cleaned = stripLayerFence(raw);
			const empty = { ok: false, operation: null, rootLabel: "", childLabel: "", path: [], leaves: [], reason: "empty", raw };
			if (cleaned.length === 0) return empty;

			const json = parseLayerJson(cleaned);
			if (json !== null) {
				return {
					ok: true,
					operation: json.operation,
					rootLabel: json.labels[0],
					childLabel: json.labels[1] ?? "",
					path: json.labels,
					leaves: json.labels,
					reason: "json",
					raw
				};
			}

			// Earliest marker wins: a reply that quotes the instruction list before its
			// own fragment would otherwise be read as a fragment with no operation.
			let operation = null;
			let at = -1;
			for (const [marker, id] of Object.entries(LAYER_TAGS)) {
				const index = cleaned.indexOf(marker);
				if (index < 0) continue;
				if (at < 0 || index < at) {
					at = index;
					operation = id;
				}
			}
			const body = operation === null ? cleaned : cleaned.slice(at);
			const roots = parseLayerList(body);
			if (roots.length === 0) {
				return { ...empty, operation, reason: operation === null ? "no-fragment" : "no-nodes", raw };
			}
			const first = roots[0];
			const path = [first.label];
			let cursor = first;
			while (cursor.children.length > 0) {
				cursor = cursor.children[0];
				path.push(cursor.label);
			}
			const leaves = [];
			const collect = (node) => {
				leaves.push(node.label);
				for (const child of node.children) collect(child);
			};
			for (const root of roots) collect(root);
			if (operation === null) {
				return { ok: false, operation: null, rootLabel: first.label, childLabel: first.children[0]?.label ?? "", path, leaves, reason: "no-operation", raw };
			}
			return {
				ok: true,
				operation,
				rootLabel: first.label,
				childLabel: first.children[0]?.label ?? "",
				path,
				leaves,
				reason: "markdown",
				raw
			};
		}

		/**
		 * Normalize a label for comparison.
		 * @param text - label text.
		 * @returns lowercase text without spaces or punctuation.
		 */
		function layerNormalizeLabel(text) {
			return String(text ?? "").toLowerCase().replace(/[\s·、，,。.：:；;！!？?（）()\[\]「」『』"“”'’*`]/g, "");
		}

		/**
		 * Find the existing node a fragment's root label names.
		 *
		 * Three descending checks: the same normalized label, one label containing the
		 * other, then shared terms covering most of the smaller side. This is a LOOKUP,
		 * not a judgment — the operation was already decided; the lookup only answers
		 * "which node did it mean".
		 *
		 * @param state - the state as of the turn being placed.
		 * @param label - the fragment's root label.
		 * @returns the matched node, or null.
		 */
		function layerMatchLabel(state, label) {
			const needle = layerNormalizeLabel(label);
			if (needle.length === 0) return null;
			for (const node of state.nodes) {
				if (layerNormalizeLabel(node.label) === needle) return node;
			}
			for (const node of state.nodes) {
				const hay = layerNormalizeLabel(node.label);
				if (hay.length === 0) continue;
				if (hay.includes(needle) || needle.includes(hay)) return node;
			}
			const mine = termsOf(needle);
			if (mine.length === 0) return null;
			let best = null;
			let bestScore = 0;
			for (const node of state.nodes) {
				const theirs = new Set(termsOf(node.label));
				if (theirs.size === 0) continue;
				let shared = 0;
				for (const term of mine) if (theirs.has(term)) shared += 1;
				const score = shared / Math.min(mine.length, theirs.size);
				if (score > bestScore) {
					bestScore = score;
					best = node;
				}
			}
			return bestScore >= 0.6 ? best : null;
		}

		/**
		 * Decide which node one parsed fragment attaches to.
		 *
		 * The operation the model reported decides the SHAPE, and this function only
		 * resolves the target:
		 *
		 *  - 下推 → the previous turn becomes the parent (the fragment's root is the
		 *    new node's label);
		 *  - 换行 → the new node stands beside the previous turn, so it takes the
		 *    previous turn's parent — for a previous turn that is itself a root, that
		 *    means becoming a new branch root;
		 *  - 回溯 → the fragment's root names an ancestor (the document's own example
		 *    repeats `- Python` before the new `- 爬虫`), so the ancestor is looked up
		 *    and the new node goes under it; an unidentifiable ancestor falls back to
		 *    the previous turn rather than inventing a branch.
		 *
		 * A parent that is not strictly earlier is refused, which is the same
		 * acyclicity guarantee the branch resolver enforces.
		 *
		 * @param state - the state as of the turn being placed.
		 * @param parsed - parsed fragment.
		 * @param context - `{ previousId, index }` of the turn being placed.
		 * @returns the placement decision.
		 */
		function applyLayerFragment(state, parsed, context) {
			const previousId = context?.previousId ?? null;
			const previous = previousId === null ? undefined : state.byId.get(previousId);
			if (parsed === null || parsed === undefined || parsed.operation === null) {
				return { ok: false, parentId: null, label: "", operation: null, matched: null, reason: parsed?.reason ?? "no-operation" };
			}
			let parentId = null;
			let label = parsed.rootLabel;
			let matched = null;
			let reason = parsed.reason ?? "ok";
			if (parsed.operation === "push") {
				parentId = previous === undefined ? null : previousId;
				if (previous === undefined) reason = "push-first";
			} else if (parsed.operation === "sibling") {
				parentId = previous === undefined ? null : previous.parentId;
				if (previous === undefined) reason = "sibling-first";
			} else {
				matched = layerMatchLabel(state, parsed.rootLabel);
				if (matched === null) {
					parentId = previous === undefined ? null : previousId;
					reason = "branch-unmatched";
				} else {
					parentId = matched.id;
					// The document's 回溯 example repeats the ancestor as the fragment's
					// root and puts the NEW node under it; with no child the root label
					// itself is the new node's name.
					label = parsed.childLabel.length > 0 ? parsed.childLabel : parsed.rootLabel;
				}
			}
			if (parentId !== null) {
				const parent = state.byId.get(parentId);
				if (parent === undefined) {
					parentId = null;
					reason = "parent-missing";
				}
			}
			return { ok: true, parentId, label, operation: parsed.operation, matched: matched === null ? null : matched.id, reason };
		}

		/**
		 * Render one fragment the way the document specifies it: the operation marker
		 * on the first line, then a Markdown nested list.
		 *
		 * @param operation - operation id.
		 * @param labels - root-first label chain (`[root, child, …]`).
		 * @param config - normalized layer config.
		 * @returns the fragment text.
		 */
		function layerFragmentMarkdown(operation, labels, config) {
			const tag = operation === null ? "" : (LAYER_OPERATIONS.find((entry) => entry.id === operation)?.tag ?? "");
			const budget = Math.max(1, Math.round(layerNumber(config?.nodeMaxChars, 1, 200, LAYER_DEFAULTS.nodeMaxChars)));
			const lines = tag.length > 0 ? [tag] : [];
			const list = Array.isArray(labels) ? labels : [];
			for (let index = 0; index < list.length; index += 1) {
				const label = layerNodeLabel(list[index], budget);
				if (label.length === 0) continue;
				lines.push(`${"  ".repeat(index)}- ${label}`);
			}
			return lines.join("\n");
		}

		/**
		 * How many nodes each operation produced — the panel's summary, and the
		 * evidence a user reads when deciding whether the wording rule is misfiring.
		 * @param state - layer state.
		 * @returns counts keyed by operation, plus a total.
		 */
		function layerSummary(state) {
			const counts = { push: 0, sibling: 0, branch: 0 };
			for (const node of state.nodes) {
				if (counts[node.operation] !== undefined) counts[node.operation] += 1;
			}
			return { ...counts, total: state.nodes.length, model: state.counts.model, manual: state.counts.manual };
		}

		/** Storage key for the layering configuration (one per profile, not per session). */
		const LAYER_CONFIG_KEY = "dsh.mindmap.layer.config";
		/** Storage key prefix for one session's model judgments. */
		const LAYER_LINKS_PREFIX = "dsh.mindmap.layer.links.";
		/** The host bridge's two routes (see lib/index.js). */
		const LAYER_INFO_ROUTE = "/plugin-mindmap/info";
		const LAYER_RUN_ROUTE = "/plugin-mindmap/layer";

		/**
		 * JSON-safe view of the model's judgments, for storage.
		 *
		 * A judgment is `turnId → { parent, operation, label, reason }`, and an absent
		 * entry means "the automatic judge decides" — the same absence-versus-explicit
		 * distinction the manual overrides need, which is why this is a Map.
		 *
		 * @param links - model judgments.
		 * @returns a plain object.
		 */
		function layerLinksToRecord(links) {
			const record = {};
			if (!isMapLike(links)) return record;
			links.forEach((value, key) => {
				if (typeof key !== "string" || value === null || typeof value !== "object") return;
				record[key] = {
					parent: typeof value.parent === "string" ? value.parent : null,
					operation: typeof value.operation === "string" ? value.operation : null,
					label: typeof value.label === "string" ? value.label : "",
					reason: typeof value.reason === "string" ? value.reason : ""
				};
			});
			return record;
		}

		/**
		 * Rebuild model judgments from stored JSON, dropping anything malformed.
		 * @param record - parsed stored object.
		 * @returns a Map; empty when the record is unusable.
		 */
		function layerLinksFromRecord(record) {
			const links = new Map();
			if (record === null || typeof record !== "object" || Array.isArray(record)) return links;
			for (const [key, value] of Object.entries(record)) {
				if (typeof key !== "string" || value === null || typeof value !== "object") continue;
				const parent = typeof value.parent === "string" ? value.parent : null;
				const operation = typeof value.operation === "string" && LAYER_OP_LABEL[value.operation] !== undefined ? value.operation : null;
				links.set(key, {
					parent,
					operation,
					label: typeof value.label === "string" ? value.label : "",
					reason: typeof value.reason === "string" ? value.reason : ""
				});
			}
			return links;
		}
		//#endregion

		//#region lib/client/chat-data.js
		/**
		 * Conversation projection adapters.
		 *
		 * Node extraction reads the Chat target's view nodes: `user` and `steering`
		 * carry `content` blocks, `assistant-step` carries text/reasoning/tool-call
		 * blocks. Nothing here trusts a field to exist — a projection that grows a
		 * new node kind must degrade to a labelled generic module, never throw.
		 */

		/** Kinds that carry prose worth showing as a module. */
		const PROSE_KINDS = new Set(["user", "steering", "assistant-step"]);

		/**
		 * Plain-text projection of a block list.
		 * @param blocks - content or assistant blocks, when present.
		 * @param dialect - which discriminator the blocks use (`type` for content, `kind` for assistant blocks).
		 * @returns the joined text.
		 */
		function blocksToText(blocks, dialect) {
			if (!Array.isArray(blocks)) return "";
			const parts = [];
			for (const block of blocks) {
				if (typeof block !== "object" || block === null) continue;
				const marker = dialect === "content" ? block.type : block.kind;
				if (marker === "text" && typeof block.text === "string") parts.push(block.text);
				else if (marker === "reasoning" && typeof block.text === "string") parts.push(block.text);
			}
			return parts.join("\n").trim();
		}

		/**
		 * Compact one-line preview.
		 * @param text - source text.
		 * @param limit - maximum characters.
		 * @returns the preview, ellipsized when clipped.
		 */
		function preview(text, limit) {
			const normalized = String(text ?? "").replace(/\s+/g, " ").trim();
			return normalized.length > limit ? `${normalized.slice(0, limit - 1).trimEnd()}…` : normalized;
		}

		/**
		 * Tool-call blocks of an assistant step.
		 * @param blocks - assistant blocks.
		 * @returns one entry per tool call.
		 */
		function toolCallsOf(blocks) {
			if (!Array.isArray(blocks)) return [];
			const calls = [];
			for (const block of blocks) {
				if (typeof block !== "object" || block === null || block.kind !== "tool-call") continue;
				const name = typeof block.name === "string" && block.name.length > 0 ? block.name : "tool";
				const raw = typeof block.argumentsRaw === "string" ? block.argumentsRaw : "";
				calls.push({ name, raw, summary: toolSummary(name, raw) });
			}
			return calls;
		}

		/**
		 * Read the most informative short field out of a tool-call argument payload.
		 * @param name - tool name.
		 * @param raw - raw JSON argument string.
		 * @returns a one-line summary.
		 */
		function toolSummary(name, raw) {
			if (raw.length === 0) return name;
			try {
				const args = JSON.parse(raw);
				if (typeof args === "object" && args !== null) {
					for (const key of ["command", "file_path", "filePath", "path", "pattern", "query", "url", "description", "prompt"]) {
						const value = args[key];
						if (typeof value === "string" && value.trim().length > 0) {
							return `${name} · ${preview(value, 96)}`;
						}
					}
					const keys = Object.keys(args);
					if (keys.length > 0) return `${name} · ${keys.slice(0, 4).join(", ")}`;
				}
			} catch {
				/* fall through to the truncated raw payload */
			}
			return `${name} · ${preview(raw, 96)}`;
		}

		/**
		 * Resolve the turn number a node belongs to.
		 * @param node - chat view node.
		 * @param fallback - sequence-derived fallback.
		 * @returns the turn number.
		 */
		function turnOf(node, fallback) {
			const location = node.location;
			if (typeof location === "object" && location !== null) {
				const turn = location.turn;
				if (typeof turn === "object" && turn !== null && typeof turn.turn === "number") return turn.turn;
				if (typeof turn === "number") return turn;
			}
			const data = node.data;
			if (typeof data === "object" && data !== null && typeof data.turn === "number") return data.turn;
			return fallback;
		}

		/**
		 * Normalize one chat view node into a render model.
		 * @param node - chat view node.
		 * @param index - predecessor count, used as a turn fallback.
		 * @returns the normalized module.
		 */
		function normalizeNode(node, index) {
			const data = typeof node.data === "object" && node.data !== null ? node.data : {};
			const seq = typeof data.seq === "number" ? data.seq : typeof node.anchorSeq === "number" ? node.anchorSeq : index;
			const kind = typeof node.kind === "string" ? node.kind : "unknown";
			const turn = turnOf(node, index);
			const base = {
				key: typeof node.key === "string" ? node.key : `${kind}:${seq}`,
				kind,
				seq,
				turn,
				time: typeof node.anchorSeq === "number" ? node.anchorSeq : undefined
			};

			if (kind === "user" || kind === "steering" || kind === "context") {
				const text = blocksToText(data.content, "content");
				return { ...base, text, title: preview(text, 96) || kind, hint: "" };
			}

			if (kind === "assistant-step") {
				const text = blocksToText(data.blocks, "assistant");
				const calls = toolCallsOf(data.blocks);
				const usage = typeof data.usage === "object" && data.usage !== null ? data.usage : undefined;
				return {
					...base,
					text,
					calls,
					usage,
					interrupted: data.interrupted === true,
					finalNode: data.finalNode,
					title: preview(text, 96) || (calls.length > 0 ? calls[0].summary : "assistant"),
					hint: calls.length > 0 ? `${calls.length} tool call(s)` : ""
				};
			}

			if (kind === "tool" || kind === "approval") {
				const name = typeof data.name === "string" ? data.name : kind;
				const raw = typeof data.argsRaw === "string" ? data.argsRaw : "";
				const summary = toolSummary(name, raw);
				return { ...base, text: summary, title: summary, hint: "", toolName: name, argsRaw: raw };
			}

			if (kind === "compaction" || kind === "command") {
				const text = typeof data.text === "string" ? data.text : "";
				return { ...base, text, title: preview(text, 96) || kind, hint: "" };
			}

			const text = blocksToText(data.content, "content") || blocksToText(data.blocks, "assistant");
			return { ...base, text, title: preview(text, 96) || kind, hint: "" };
		}

		/**
		 * Node ids inside one turn that carry prose.
		 * @param modules - normalized modules of the turn.
		 * @returns concatenated text.
		 */
		function turnText(modules) {
			return modules
				.filter((entry) => PROSE_KINDS.has(entry.kind))
				.map((entry) => entry.text)
				.filter((text) => typeof text === "string" && text.length > 0)
				.join("\n");
		}

		/**
		 * Build the whole render model from a Chat target snapshot.
		 * @param snapshot - chat projection snapshot.
		 * @param t - locale seat.
		 * @param overrides - manual parent choices (turn id → parent turn id or null).
		 * @param options - link-resolution options: `{ seed, maxDepth }` — the model
		 * path's judgments and the documented level cap.
		 * @returns the mind-map model, including the resolved branch forest.
		 */
		function buildModel(snapshot, t, overrides, options) {
			const nodes = snapshot?.nodes;
			const order = Array.isArray(snapshot?.order) ? snapshot.order : [];
			if (nodes === undefined || typeof nodes.get !== "function") {
				return {
					turns: [],
					branch: { nodes: new Map(), roots: [] },
					keywords: [],
					nodeById: new Map(),
					turnIndexById: new Map(),
					total: 0
				};
			}
			const modules = [];
			let index = 0;
			for (const key of order) {
				const node = nodes.get(key);
				if (typeof node !== "object" || node === null) {
					index += 1;
					continue;
				}
				modules.push(normalizeNode(node, index));
				index += 1;
			}

			const byTurn = new Map();
			for (const entry of modules) {
				const list = byTurn.get(entry.turn);
				if (list === undefined) byTurn.set(entry.turn, [entry]);
				else list.push(entry);
			}

			const turnNumbers = [...byTurn.keys()].sort((left, right) => left - right);
			const turns = turnNumbers.map((number, position) => {
				const list = byTurn.get(number) ?? [];
				const prompts = list.filter((entry) => entry.kind === "user" || entry.kind === "steering");
				const answers = list.filter((entry) => entry.kind === "assistant-step");
				return {
					id: `turn:${number}`,
					number,
					ordinal: position + 1,
					modules: list,
					promptText: turnText(prompts),
					answerText: turnText(answers),
					text: turnText(list),
					hasPrompt: prompts.length > 0,
					running: answers.some((entry) => entry.finalNode === undefined),
					error: answers.some((entry) => typeof entry.error === "string"),
					interrupted: answers.some((entry) => entry.interrupted === true),
					label: t("turn.label", { n: number })
				};
			});

			const nodeById = new Map();
			const turnIndexById = new Map();
			const turnTexts = [];
			for (let i = 0; i < turns.length; i += 1) {
				turns[i].analysisText = turnTexts.join("\n");
				turnTexts.push(turns[i].text);
				turnIndexById.set(turns[i].id, i);
				for (const entry of turns[i].modules) nodeById.set(`seq:${entry.seq}`, { module: entry, turnIndex: i, turn: turns[i] });
			}

			return {
				turns,
				branch: resolveLinks(turns, overrides, options),
				keywords: keywordsOf(turns.map((turn) => turn.text)),
				nodeById,
				turnIndexById,
				total: modules.length
			};
		}
		//#endregion

		//#region lib/client/outline.js
		/**
		 * Render the model as a plain-text outline (the export action).
		 * @param model - the mind-map model.
		 * @param t - locale seat.
		 * @returns markdown-ish outline text.
		 */
		function outlineText(model, t) {
			const lines = [`# ${t("bar.title")}`, ""];
			for (const turn of model.turns) {
				lines.push(`## ${turn.label}${turn.running ? ` (${t("turn.pending")})` : ""}`);
				for (const entry of turn.modules) {
					lines.push(`- [${t(`kind.${kindKey(entry.kind)}`)}] ${pickTitle(entry, t)}`);
				}
				lines.push("");
			}
			return lines.join("\n");
		}

		/**
		 * Locale key for a node kind.
		 * @param kind - raw node kind.
		 * @returns the `kind.*` suffix.
		 */
		function kindKey(kind) {
			if (kind === "user" || kind === "steering" || kind === "assistant-step") {
				return kind === "assistant-step" ? "assistant" : kind;
			}
			if (kind === "tool" || kind === "reasoning" || kind === "context" || kind === "compaction") return kind;
			return "other";
		}

		/**
		 * Human title for one module.
		 * @param entry - normalized module.
		 * @param t - locale seat.
		 * @returns the title.
		 */
		function pickTitle(entry, t) {
			return entry.title.length > 0 ? entry.title : t(`kind.${kindKey(entry.kind)}`);
		}
		//#endregion

		//#region lib/client/layout.js
		/**
		 * Horizontal tree layout.
		 *
		 * The tree is laid out by arithmetic rather than by measuring rendered
		 * blocks. That is the whole reason the connectors are reliable: a block's
		 * height depends on its prompt length and its font, so a measured layout has
		 * to be computed after paint, is one frame stale on every change, and
		 * silently produces no lines at all when the measurement pass does not run.
		 * Here every node gets (column = branch depth, row = a slot in a
		 * depth-ordered walk) and the connector geometry follows from those numbers.
		 */

		/** Fixed card width, so columns and connectors line up exactly. */
		const CARD_W = 268;
		/** Horizontal gap between columns; the connector runs through it. */
		const COL_GAP = 56;
		/** Extra breathing room after the title column, so the single entry point reads as separate from the tree. */
		const TITLE_GAP = 24;
		/** Vertical gap between two cards in the same column. */
		const NODE_GAP = 14;
		/** Canvas padding, leaving room for the curve control points. */
		const PAD = 12;
		/** Minimum card height used for the offline fallback; the real height is measured. */
		const CARD_MIN_H = 76;
		/**
		 * Identity of the synthetic left-hand node.
		 *
		 * The node is a value, not a turn: it owns the title column and the whole
		 * tree as its children, so the map reads as ONE hierarchy entered from the
		 * left instead of several equal-weight starting points. It deliberately
		 * carries no `turn`, which is what keeps it out of the side panel, the
		 * outline, and every per-turn control — those all key off the turn.
		 */
		const TITLE_NODE_ID = "__title__";
		/**
		 * Parent id of the title itself.
		 *
		 * A dedicated marker rather than `null`: the title is the tree's root, and
		 * "has no parent" must therefore be a test on the NODE, not on a parent
		 * reference that a fold rule could mistake for "a nested branch with unknown
		 * depth". That confusion is not hypothetical — it folded the whole map into
		 * the title the first time this layout ran.
		 */
		const TITLE_ROOT_ID = "__root__";

		/**
		 * Bind every branch root under one synthetic left-hand node.
		 *
		 * `roots` is the resolved forest's root order, and the title takes it
		 * verbatim, so the vertical order of the branches is unchanged — the title
		 * only removes the impression that they are unrelated entry points.
		 *
		 * @param branch - resolved branch forest.
		 * @returns the title node, or null for an empty forest.
		 */
		function withTitleNode(branch) {
			if (branch.roots.length === 0) return null;
			const first = branch.roots[0].turn;
			return {
				id: TITLE_NODE_ID,
				turn: {
					id: TITLE_NODE_ID,
					number: 0,
					ordinal: 0,
					modules: [],
					promptText: first.promptText,
					answerText: "",
					text: "",
					hasPrompt: first.hasPrompt,
					running: false,
					error: false,
					interrupted: false,
					label: `#${first.number}`
				},
				index: -1,
				parent: null,
				children: branch.roots,
				link: { kind: "title", score: 0 },
				candidates: []
			};
		}

		/**
		 * Assign every drawn node a column and a row.
		 *
		 * The row comes from the position of a node in a depth-ordered walk, so a
		 * parent always sorts after the subtree above it and before its own subtree.
		 * With the measured height of each card that ordering guarantees a parent's
		 * vertical center falls between its first and last child, which is what makes
		 * the fan-out from one parent read as a fan.
		 *
		 * Column 0 is the title node, so a turn's column is `depth + 1`: the drawing
		 * keeps one uniform depth unit while the depth the fold count talks about
		 * stays "levels of branches", which is what the toolbar offers.
		 *
		 * @param branch - resolved branch forest.
		 * @param depthLimit - how many levels to walk below each root.
		 * @returns positioned, drawn nodes plus the forest's extents.
		 */
		function layoutTree(branch, depthLimit) {
			const nodes = [];
			const hiddenBelow = new Map();
			const anchor = withTitleNode(branch);
			const walk = (node, depth, parentId) => {
				// Column 0 is the title column and sits TITLE_GAP further right than the
				// uniform column pitch would put it, so the single entry point reads as
				// separate from the tree it owns.
				const x = PAD + depth * (CARD_W + COL_GAP) + (depth === 0 ? 0 : TITLE_GAP);
				nodes.push({ node, depth, parentId, x, y: 0 });
				// The title is a fixed anchor: it never folds, and it never consumes one
				// of the branch levels the toolbar counts. It is exempted by ID, not by
				// the depth arithmetic, because at a limit of 1 the branches entered
				// from it must still be drawn — the count is about BRANCH levels, and
				// the title is not one of them.
				const isTitle = node.turn.id === TITLE_NODE_ID;
				const levels = depth - 1;
				if (!isTitle && levels + 1 >= depthLimit) {
					const cut = countDescendants(node);
					if (cut > 0) hiddenBelow.set(node.turn.id, cut);
					return;
				}
				for (const child of node.children) walk(child, depth + 1, node.turn.id);
			};
			if (anchor !== null) walk(anchor, 0, TITLE_ROOT_ID);
			return {
				nodes,
				anchor,
				hiddenBelow,
				columns: nodes.reduce((max, entry) => Math.max(max, entry.depth + 1), 0),
				rows: nodes.length
			};
		}

		/**
		 * How many nodes sit below one branch node.
		 * @param node - branch node.
		 * @returns descendant count.
		 */
		function countDescendants(node) {
			let count = 0;
			for (const child of node.children) count += 1 + countDescendants(child);
			return count;
		}

		/**
		 * Turn a laid-out tree into pixel geometry once card heights are known.
		 *
		 * Rows are allocated the way a tidy tree does it, NOT by a pre-order walk: a
		 * leaf consumes the next row slot, and an internal node is placed at the
		 * vertical center of its own children. A pre-order walk would put a parent
		 * ABOVE all of its children, so every connector would have to run back
		 * upwards — which is exactly what makes a left-to-right tree unreadable.
		 *
		 * @param layout - output of {@link layoutTree}.
		 * @param heights - measured card height by turn id.
		 * @returns positioned boxes, connector paths, and the canvas size.
		 */
		function placeTree(layout, heights) {
			const heightOf = (id) => heights.get(id) ?? CARD_MIN_H;
			const byId = new Map();
			const boxes = [];
			const edges = [];
			/** Node → laid-out entry, so the recursion does not re-scan the node list. */
			const entries = new Map(layout.nodes.map((entry) => [entry.node, entry]));
			let cursor = PAD;

			/**
			 * Place one node and its subtree.
			 * @param entry - laid-out node.
			 * @returns the vertical center of the placed subtree.
			 */
			const place = (entry) => {
				const id = entry.node.turn.id;
				const height = heightOf(id);
				// A folded node draws as a leaf: its hidden descendants are not drawn, so
				// they must not reserve rows.
				const folded = layout.hiddenBelow.has(id);
				const children = folded
					? []
					: entry.node.children.map((child) => entries.get(child)).filter((candidate) => candidate !== undefined);
				let centerY;
				let top;
				let bottom;
				if (children.length === 0) {
					top = cursor;
					centerY = top + height / 2;
					bottom = top + height;
					cursor = bottom + NODE_GAP;
				} else {
					const centers = children.map((child) => place(child));
					centerY = (centers[0] + centers[centers.length - 1]) / 2;
					top = centerY - height / 2;
					bottom = centerY + height / 2;
				}
				const box = { ...entry, y: top, height, centerY };
				boxes.push(box);
				byId.set(id, box);
				return centerY;
			};

			for (const root of layout.nodes.filter((entry) => entry.parentId === TITLE_ROOT_ID)) place(root);

			// Connectors, in two passes because the two kinds start from different
			// places: a box whose parent is a TURN starts at that turn's right edge,
			// and a box whose parent is the TITLE — a branch root, or a turn pinned to
			// the anchor — starts at the title's right edge. The title itself has no
			// parent to draw from, so it contributes no connector.
			for (const box of boxes) {
				if (box.parentId === TITLE_NODE_ID) {
					const anchor = byId.get(TITLE_NODE_ID);
					if (anchor === undefined) continue;
					edges.push({
						key: `${TITLE_NODE_ID}->${box.node.turn.id}`,
						from: { x: anchor.x + CARD_W, y: anchor.centerY },
						to: { x: box.x, y: box.centerY },
						kind: box.node.link.kind
					});
					continue;
				}
				if (box.parentId === TITLE_ROOT_ID) continue;
				const parent = byId.get(box.parentId);
				if (parent === undefined) continue;
				edges.push({
					key: `${box.parentId}->${box.node.turn.id}`,
					from: { x: parent.x + CARD_W, y: parent.centerY },
					to: { x: box.x, y: box.centerY },
					kind: box.node.link.kind
				});
			}

			const lowest = boxes.reduce((max, box) => Math.max(max, box.y + box.height), PAD);
			const width = Math.max(
				CARD_W + PAD * 2,
				PAD + layout.columns * (CARD_W + COL_GAP) - COL_GAP + PAD + TITLE_GAP
			);
			const height = Math.max(CARD_MIN_H + PAD * 2, lowest + PAD);
			return { boxes, byId, edges, width, height };
		}

		/**
		 * SVG path for one parent → child connector.
		 *
		 * An orthogonal elbow: out of the parent's right edge, half-way across the
		 * gap, then straight down (or up) to the child's center line and into its
		 * left edge. Straight segments and square corners are what keeps a busy tree
		 * legible and flat; a curve would add decoration without adding information,
		 * and it hides the exact row a branch turns on.
		 *
		 * When the two nodes are level, the path degenerates to a straight
		 * horizontal line, which is the honest drawing of "these two line up".
		 *
		 * @param from - parent's right edge center.
		 * @param to - child's left edge center.
		 * @returns an SVG path `d` string.
		 */
		function edgePath(from, to) {
			const mid = (from.x + to.x) / 2;
			if (Math.abs(to.y - from.y) < 0.5) {
				return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} L ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
			}
			// The corner radius is clamped to the available room on both axes: the
			// 4px round-off is a drawing detail, not geometry that may overrun a
			// short gap and fold the path back on itself.
			const radius = Math.min(4, Math.abs(mid - from.x), Math.abs(to.x - mid), Math.abs(to.y - from.y) / 2);
			const down = to.y > from.y ? 1 : -1;
			return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} `
				+ `L ${(mid - radius).toFixed(1)} ${from.y.toFixed(1)} `
				+ `Q ${mid.toFixed(1)} ${from.y.toFixed(1)} ${mid.toFixed(1)} ${(from.y + down * radius).toFixed(1)} `
				+ `L ${mid.toFixed(1)} ${(to.y - down * radius).toFixed(1)} `
				+ `Q ${mid.toFixed(1)} ${to.y.toFixed(1)} ${(mid + radius).toFixed(1)} ${to.y.toFixed(1)} `
				+ `L ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
		}
		//#endregion

		//#region lib/client/view.js
		/**
		 * Version marker. Rendered in the toolbar so a cached or not-yet-rebuilt
		 * bundle is distinguishable from a correct one at a glance — the client
		 * module system keys reload on the artifact's mtime and size, so "is my
		 * change actually loaded" is otherwise unanswerable from the page.
		 */
		const PLUGIN_VERSION = "1.4.1";

		/**
		 * Branch levels drawn from each root initially. The tree can grow deep and
		 * wide, so the newest work is not buried under a wall of earlier turns; the
		 * toolbar widens this on demand.
		 */
		const DRAW_DEPTHS = 3;
		/** Cap for {@link DRAW_DEPTHS}; the control stops here. */
		const MAX_DRAW_DEPTHS = 12;

		/**
		 * Last render failure, kept per plugin lifetime purely for diagnostics:
		 * the renderer's own boundary abdicates the entry on a throw, so without
		 * this the only symptom is a blank view and a tab that still renders.
		 */
		let lastFailure = null;

		/**
		 * Plugin-owned safety net around the view body.
		 *
		 * A throw inside a slot entry reaches the renderer's error boundary, which
		 * ABDICATES the entry: the view goes blank while the tab (built from the raw
		 * ledger) stays listed, and the user sees nothing at all. Catching here
		 * keeps the entry alive and turns an invisible failure into a readable one.
		 *
		 * Deliberately a plain function with a try/catch rather than a class
		 * `componentDidCatch`: React only honours error boundaries on class
		 * components, but the body is a pure render of projection data, so its
		 * failure mode is a throw during render — which a try/catch observes
		 * directly. The trade-off is that React's own boundary remains the last
		 * line of defence for anything thrown outside this call.
		 *
		 * @param props - `t` locale seat plus the body element as children.
		 * @returns the body, or a readable crash report.
		 */
		function MindMapBoundary(props) {
			const { t, children } = props;
			try {
				return children;
			} catch (error) {
				lastFailure = {
					message: error?.message ?? String(error),
					stack: String(error?.stack ?? ""),
					componentStack: ""
				};
				console.error("[@nydsg/dsh-mindmap] view crashed:", error);
			}
			const detail = [
				lastFailure?.message ?? "",
				lastFailure?.stack ?? ""
			].filter((part) => part.length > 0).join("\n\n");
			return h(
				"div",
				{ className: "mm-scope mm-root" },
				h(
					"div",
					{ className: "mm-crash" },
					h("div", { className: "mm-crash__title" }, `${t("view.mindmap")}: ${t("crash.title")}`),
					h("div", { className: "mm-crash__body" }, detail),
					h("div", { className: "mm-crash__body" }, t("crash.hint"))
				)
			);
		}

		/**
		 * The mind-map view: a vertical tree of turns and modules on the left, the
		 * selected module's prompt/answer/keywords plus the backward analysis on the
		 * right.
		 *
		 * The body runs inside {@link MindMapBoundary}; this wrapper only forwards
		 * the locale seat the boundary itself needs.
		 *
		 * @param props - slot-provided hooks, the session id, and the composer writer.
		 * @returns the view element tree.
		 */
		function MindMapView(props) {
			return h(MindMapBoundary, { t: props.t }, h(MindMapBody, props));
		}

		/**
		 * The view body. Every value it renders comes from the Chat projection, so
		 * it is written to tolerate any snapshot shape rather than assume one.
		 *
		 * @param props - slot-provided hooks, the session id, and the composer writer.
		 * @returns the view element tree.
		 */
		function MindMapBody(props) {
			const {
				useChat,
				sessionId,
				writeDraft,
				t
			} = props;
			const snapshot = useChat((value) => value);

			/*
			 * Manual branch arrangement, persisted per session: `turnId → parentId`
			 * pins a question under another one, `turnId → null` pins it as a branch
			 * root. A stored id with no value is not representable in JSON, so absence
			 * means "let the automatic matcher decide" — which is why the map is a Map
			 * and not an object.
			 */
			const storageKey = `dsh.mindmap.links.${sessionId}`;
			const [overrides, setOverrides] = React.useState(() => {
				try {
					if (typeof localStorage === "undefined") return new Map();
					const raw = localStorage.getItem(`dsh.mindmap.links.${sessionId}`);
					return raw === null ? new Map() : overridesFromRecord(JSON.parse(raw));
				} catch {
					return new Map();
				}
			});
			// A session switch must not carry the previous session's arrangement.
			const lastSession = React.useRef(sessionId);
			if (lastSession.current !== sessionId) {
				lastSession.current = sessionId;
				setOverrides(new Map());
			}
			const persistOverrides = React.useCallback((next) => {
				setOverrides(next);
				try {
					if (typeof localStorage === "undefined") return;
					if (next.size === 0) localStorage.removeItem(storageKey);
					else localStorage.setItem(storageKey, JSON.stringify(overridesToRecord(next)));
				} catch {
					/* storage is best-effort; the arrangement still applies this session */
				}
			}, [storageKey]);

			/*
			 * The layering configuration — the document's variables plus the model
			 * route. Stored once per profile rather than per session: it describes how
			 * this person wants a map built (层级上限, 节点字数, 语言, 输出格式, 温度,
			 * provider/model), not what one conversation contains.
			 */
			const [layerCfg, setLayerCfg] = React.useState(() => {
				try {
					if (typeof localStorage === "undefined") return layerConfig(undefined);
					return layerConfig(JSON.parse(localStorage.getItem(LAYER_CONFIG_KEY) ?? "null"));
				} catch {
					return layerConfig(undefined);
				}
			});
			const persistLayerCfg = React.useCallback((patch) => {
				setLayerCfg((current) => {
					const next = layerConfig({ ...current, ...patch });
					try {
						if (typeof localStorage !== "undefined") localStorage.setItem(LAYER_CONFIG_KEY, JSON.stringify(next));
					} catch {
						/* storage is best-effort; the configuration still applies this session */
					}
					return next;
				});
			}, []);

			/*
			 * The model path's judgments, persisted per session.
			 *
			 * Exactly like the manual pins: absent means "the automatic judge decides",
			 * an entry means "this turn's parent was judged". Manual pins still win over
			 * them, so the model can never overwrite a hand arrangement.
			 */
			const layerLinksKey = `${LAYER_LINKS_PREFIX}${sessionId}`;
			const [modelLinks, setModelLinks] = React.useState(() => {
				try {
					if (typeof localStorage === "undefined") return new Map();
					return layerLinksFromRecord(JSON.parse(localStorage.getItem(`${LAYER_LINKS_PREFIX}${sessionId}`) ?? "null"));
				} catch {
					return new Map();
				}
			});
			const lastLayerSession = React.useRef(sessionId);
			if (lastLayerSession.current !== sessionId) {
				lastLayerSession.current = sessionId;
				setModelLinks(new Map());
			}
			const persistModelLinks = React.useCallback((next) => {
				setModelLinks(next);
				try {
					if (typeof localStorage === "undefined") return;
					if (next.size === 0) localStorage.removeItem(layerLinksKey);
					else localStorage.setItem(layerLinksKey, JSON.stringify(layerLinksToRecord(next)));
				} catch {
					/* storage is best-effort; the judgments still apply this session */
				}
			}, [layerLinksKey]);

			/** What the host bridge reports about itself: whether a model call is possible. */
			const [bridge, setBridge] = React.useState(null);
			React.useEffect(() => {
				if (typeof fetch !== "function") return undefined;
				let alive = true;
				fetch(LAYER_INFO_ROUTE)
					.then((response) => response.json())
					.then((info) => {
						if (alive) setBridge(info);
					})
					.catch(() => {
						if (alive) setBridge({ ok: false, llm: false });
					});
				return () => {
					alive = false;
				};
			}, []);

			/*
			 * One model run: turns in order, each judged against the state built from the
			 * judgments so far — which is the document's 状态维护 rule ("每次操作后，更新
			 * 思维导图全局状态，确保后续判断基于最新结构"). The run token is what makes
			 * 停止 real: a late reply from a cancelled run is dropped instead of applied.
			 */
			const [layerRun, setLayerRun] = React.useState(null);
			const layerRunToken = React.useRef(0);

			/** Cancel an in-flight run; every later step checks the token. */
			const stopLayerRun = React.useCallback(() => {
				layerRunToken.current += 1;
				setLayerRun((current) => (current === null ? null : { ...current, running: false, cancelled: true }));
			}, []);

			/*
			 * The settings one build hands the resolver: the model's judgments when the
			 * model judge is on, and the documented level cap in both modes. Turning the
			 * model OFF keeps the stored judgments (so switching back is instant) but
			 * stops them from shaping the tree.
			 */
			const linkOptions = React.useMemo(() => ({
				seed: layerCfg.mode === "model" && modelLinks.size > 0 ? modelLinks : new Map(),
				maxDepth: layerCfg.maxDepth
			}), [layerCfg.mode, layerCfg.maxDepth, modelLinks]);

			/*
			 * The whole render model.
			 *
			 * Declared BEFORE the run callback that reads `model.turns`: a dependency
			 * array is evaluated during render, so a callback that named `model` above
			 * its own declaration would read a `const` in its temporal dead zone.
			 */
			const model = React.useMemo(() => buildModel(snapshot, t, overrides, linkOptions), [snapshot, t, overrides, linkOptions]);

			/** Post one layering call to the host bridge and return the model's text. */
			const callLayerBridge = React.useCallback(async (request) => {
				if (typeof fetch !== "function") throw new Error(t("layer.noFetch"));
				const response = await fetch(LAYER_RUN_ROUTE, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						system: request.system,
						user: request.user,
						provider: request.provider,
						model: request.model,
						temperature: request.temperature,
						maxTokens: request.maxTokens,
						timeoutMs: request.timeoutMs
					})
				});
				const payload = await response.json().catch(() => null);
				if (payload === null || payload.ok !== true) {
					const detail = payload === null ? `HTTP ${response.status}` : `${payload.error}: ${payload.message}`;
					throw new Error(detail);
				}
				return String(payload.text ?? "");
			}, [t]);

			/**
			 * Judge every turn with the model, in order, keeping the state current.
			 *
			 * Bounded by `turnLimit` on purpose: one call per turn is the document's
			 * protocol, and a 300-turn session would otherwise fire 300 requests without
			 * asking.
			 */
			const runModelJudge = React.useCallback(() => {
				const turns = model.turns;
				if (turns.length === 0) return;
				const token = layerRunToken.current + 1;
				layerRunToken.current = token;
				const total = Math.min(turns.length, layerCfg.turnLimit);
				const next = new Map(modelLinks);
				setLayerRun({ running: true, done: 0, total, error: "", cancelled: false, at: "" });
				const step = async () => {
					for (let index = 0; index < total; index += 1) {
						if (layerRunToken.current !== token) return;
						const turn = turns[index];
						const before = turns.slice(0, index);
						const previous = index > 0 ? turns[index - 1] : undefined;
						if (layerRunToken.current !== token) return;
						setLayerRun((current) => (current === null ? current : { ...current, at: turn.label, done: index }));
						const state = layerState(before, resolveLinks(before, new Map(), { seed: next, maxDepth: layerCfg.maxDepth }), layerCfg);
						const request = buildLayerRequest(layerCfg, {
							state: state.markdown,
							lastNode: previous === undefined
								? t("layer.noPrevious")
								: (state.byId.get(previous.id)?.label ?? layerNodeLabel(previous.promptText, layerCfg.nodeMaxChars)),
							lastQuestion: previous === undefined ? t("layer.none") : previous.promptText,
							lastAnswer: previous === undefined ? t("layer.none") : previous.answerText,
							currentQuestion: turn.promptText,
							currentAnswer: turn.answerText
						});
						let text;
						try {
							text = await callLayerBridge(request);
						} catch (error) {
							if (layerRunToken.current !== token) return;
							setLayerRun({ running: false, done: index, total, error: String(error?.message ?? error), cancelled: false, at: turn.label });
							return;
						}
						if (layerRunToken.current !== token) return;
						const parsed = parseLayerFragment(text);
						const placement = applyLayerFragment(state, parsed, { previousId: previous?.id ?? null, index });
						if (placement.ok) {
							next.set(turn.id, {
								parent: placement.parentId,
								operation: placement.operation,
								label: placement.label,
								reason: placement.reason
							});
						} else {
							next.delete(turn.id);
						}
						persistModelLinks(new Map(next));
						setLayerRun({
							running: index + 1 < total,
							done: index + 1,
							total,
							error: "",
							cancelled: false,
							at: turn.label,
							lastReason: placement.ok ? placement.reason : parsed.reason
						});
						// Yield to the browser so a long run stays cancellable and the
						// progress line actually paints.
						await new Promise((resolve) => setTimeout(resolve, 0));
					}
				};
				step().catch((error) => {
					setLayerRun((current) => (current === null ? current : { ...current, running: false, error: String(error?.message ?? error) }));
				});
			}, [model.turns, modelLinks, layerCfg, persistModelLinks, callLayerBridge, t]);

			/**
			 * Drop every model judgment for this session.
			 *
			 * Deliberately silent about the flash: the notice timer lives further down
			 * the body, and a callback that captured it here would read a `const` before
			 * it is initialized. The panel announces the result instead.
			 */
			const clearModelLinks = React.useCallback(() => {
				layerRunToken.current += 1;
				persistModelLinks(new Map());
				setLayerRun(null);
			}, [persistModelLinks]);

			// Which turn blocks are expanded. Opened is the exception, not the
			// default: the surface shows questions only until you ask for more.
			const [open, setOpen] = React.useState(() => new Set());
			const [selected, setSelected] = React.useState(null);
			const [selectedTurn, setSelectedTurn] = React.useState(null);
			const [depthLimit, setDepthLimit] = React.useState(DRAW_DEPTHS);
			const [term, setTerm] = React.useState("");
			const [notice, setNotice] = React.useState("");
			const [pickerFor, setPickerFor] = React.useState(null);
			const [pickerValue, setPickerValue] = React.useState("");
			const noticeTimer = React.useRef(null);

			/*
			 * Card heights, measured after paint.
			 *
			 * Only the HEIGHT is measured. Columns and rows come from
			 * {@link layoutTree}, so the connector geometry is already known; the one
			 * thing arithmetic cannot predict is how many lines a question wraps to.
			 */
			const cardRefs = React.useRef(new Map());
			const [heights, setHeights] = React.useState(() => new Map());
			const heightsRef = React.useRef(heights);

			const registerCard = React.useCallback((id) => (element) => {
				if (element === null) cardRefs.current.delete(id);
				else cardRefs.current.set(id, element);
			}, []);

			/**
			 * Publish card heights. Deep-equality guard so an unchanged layout returns
			 * the previous Map and React bails out instead of re-rendering forever.
			 */
			const publishHeights = React.useCallback(() => {
				const next = new Map();
				for (const [id, element] of cardRefs.current) {
					const height = element.getBoundingClientRect().height;
					if (height > 0) next.set(id, Math.round(height));
				}
				setHeights((current) => {
					if (current.size === next.size) {
						let same = true;
						for (const [id, value] of next) {
							if (current.get(id) !== value) {
								same = false;
								break;
							}
						}
						if (same) return current;
					}
					heightsRef.current = next;
					return next;
				});
			}, []);

			// After every commit (heights change with depth, width, and font)…
			React.useLayoutEffect(publishHeights);

			// …and after a layout shift React cannot see. The canvas is a fixed-width
			// surface inside a scroller, so a window resize only matters insofar as it
			// reflows the text inside a card.
			React.useEffect(() => {
				if (typeof window === "undefined") return undefined;
				window.addEventListener("resize", publishHeights);
				return () => window.removeEventListener("resize", publishHeights);
			}, [publishHeights]);

			// The picker closes when the selection changes; it targets one turn only.
			React.useEffect(() => setPickerFor(null), [selectedTurn]);

			const flash = React.useCallback((message) => {
				setNotice(message);
				if (noticeTimer.current !== null) clearTimeout(noticeTimer.current);
				noticeTimer.current = setTimeout(() => setNotice(""), 2600);
			}, []);

			React.useEffect(() => () => {
				if (noticeTimer.current !== null) clearTimeout(noticeTimer.current);
			}, []);

			/**
			 * Turns the active keyword filter excludes.
			 *
			 * Dimmed, never removed: the branch structure has to stay visible, and a
			 * hidden parent would orphan its children. Turning a filter into visible
			 * pruning is exactly how a tree view starts lying about its own shape.
			 */
			const dimmedTurns = React.useMemo(() => {
				if (term.length === 0) return null;
				const excluded = new Set();
				for (const turn of model.turns) {
					if (!termsOf(turn.text).includes(term)) excluded.add(turn.id);
				}
				return excluded;
			}, [model.turns, term]);

			const analysis = React.useMemo(() => {
				if (selected === null) return null;
				const hit = model.nodeById.get(selected);
				if (hit === undefined) return null;
				const scopeTexts = model.turns
					.slice(0, hit.turnIndex)
					.map((turn) => turn.text)
					.filter((text) => text.length > 0);
				const ownText = hit.module.text ?? "";
				return {
					hit,
					local: keywordsOf([ownText, hit.turn.promptText, hit.turn.answerText]).slice(0, 10),
					backward: analyzeBackward(scopeTexts, ownText)
				};
			}, [model, selected]);

			/** The branch node for one turn id. */
			const branchNode = React.useCallback((id) => model.branch.nodes.get(id), [model.branch]);
			/** Index of a turn id, or -1. */
			const indexOfTurn = React.useCallback((id) => model.turnIndexById.get(id) ?? -1, [model.turnIndexById]);
			/** Display label for a turn id. */
			const labelOfTurn = React.useCallback((id) => {
				const index = model.turnIndexById.get(id);
				return index === undefined ? id : model.turns[index].label;
			}, [model.turnIndexById, model.turns]);

			/**
			 * Pin a turn's parent. `parent === null` pins it as a branch root; a
			 * parent id pins it under that turn. Manual choices survive model
			 * rebuilds because they live in `overrides`, not in the derived tree.
			 */
			const setParent = React.useCallback((id, parent) => {
				const next = new Map(overrides);
				next.set(id, parent);
				persistOverrides(next);
				flash(parent === null
					? t("branch.rooted", { turn: labelOfTurn(id) })
					: t("branch.linked", { turn: labelOfTurn(id), parent: labelOfTurn(parent) }));
			}, [overrides, persistOverrides, flash, t, labelOfTurn]);

			/** Drop the manual choice so the matcher decides again. */
			const clearParent = React.useCallback((id) => {
				const next = new Map(overrides);
				next.delete(id);
				persistOverrides(next);
				flash(t("branch.autoRestored", { turn: labelOfTurn(id) }));
			}, [overrides, persistOverrides, flash, t, labelOfTurn]);

			/** Pin every hand edit away at once. */
			const resetAllLinks = React.useCallback(() => {
				persistOverrides(new Map());
				flash(t("branch.reset"));
			}, [persistOverrides, flash, t]);

			/** Pick the branch this turn should continue: its turn number submits. */
			const submitPicker = React.useCallback(() => {
				const raw = pickerValue.trim().replace(/[^0-9]/g, "");
				if (pickerFor === null || raw.length === 0) {
					setPickerFor(null);
					return;
				}
				const targetNumber = Number(raw);
				const target = model.turns.find((turn) => turn.number === targetNumber);
				const targetIndex = target === undefined ? -1 : indexOfTurn(target.id);
				if (target === undefined || targetIndex >= indexOfTurn(pickerFor)) {
					flash(t("branch.pickInvalid"));
					return;
				}
				setParent(pickerFor, target.id);
				setPickerFor(null);
				setPickerValue("");
			}, [pickerValue, pickerFor, model.turns, indexOfTurn, setParent, flash, t]);

			const toggleTurn = React.useCallback((id) => {
				setOpen((current) => {
					const next = new Set(current);
					if (next.has(id)) next.delete(id);
					else next.add(id);
					return next;
				});
			}, []);

			const exportOutline = React.useCallback(() => {
				const text = outlineText(model, t);
				try {
					if (typeof navigator !== "undefined" && navigator.clipboard !== undefined) {
						navigator.clipboard.writeText(text).then(
							() => flash(t("bar.exported")),
							() => flash(t("bar.exported"))
						);
						return;
					}
				} catch {
					/* fall through to the silent no-op */
				}
				flash(t("bar.exported"));
			}, [model, t, flash]);

			const loadDraft = React.useCallback((text) => {
				const ok = typeof writeDraft === "function" ? writeDraft(text) : false;
				if (ok) {
					flash(t("notice.draftLoaded"));
					return;
				}
				try {
					if (typeof navigator !== "undefined" && navigator.clipboard !== undefined) navigator.clipboard.writeText(text);
				} catch {
					/* clipboard is best-effort */
				}
				flash(t("notice.draftUnavailable"));
			}, [writeDraft, t, flash]);

			/** Copy one piece of the layering protocol, announcing the result. */
			const copyLayerText = React.useCallback((text, message) => {
				try {
					if (typeof navigator !== "undefined" && navigator.clipboard !== undefined) {
						navigator.clipboard.writeText(text).then(() => flash(message), () => flash(message));
						return;
					}
				} catch {
					/* fall through to the silent acknowledgement */
				}
				flash(message);
			}, [flash]);

			/*
			 * The global state and its operation counts.
			 *
			 * Derived from the resolved tree on every render rather than stored: a state
			 * that could disagree with the drawn map would be worse than no state at all.
			 */
			const layer = React.useMemo(() => layerState(model.turns, model.branch, layerCfg), [model.turns, model.branch, layerCfg]);
			const layerOps = React.useMemo(() => layerSummary(layer), [layer]);
			const selectedJudgment = selectedTurn === null ? null : (modelLinks.get(selectedTurn) ?? null);
			const running = layerRun !== null && layerRun.running === true;

			const head = h(
				"div",
				{ className: "mm-bar" },
				h("span", { className: "mm-bar__title" }, t("bar.title")),
				h("span", { className: "mm-bar__meta" }, t("bar.meta", { turns: model.turns.length, nodes: model.total })),
				h("span", { className: "mm-bar__meta" }, `v${PLUGIN_VERSION}`),
				h("span", { className: "mm-bar__spacer" }),
				term.length > 0
					? h(
						"button",
						{
							type: "button",
							className: "mm-btn mm-btn--active",
							onClick: () => {
								setTerm("");
								flash(t("kw.cleared"));
							},
							title: t("kw.cleared")
						},
						`# ${term}`
					)
					: null,
				h(
					"button",
					{
						type: "button",
						className: `mm-btn${layerCfg.mode === "model" ? " mm-btn--active" : ""}`,
						onClick: () => persistLayerCfg({ mode: layerCfg.mode === "model" ? "offline" : "model" }),
						disabled: model.turns.length === 0,
						title: t("layer.modeHint")
					},
					layerCfg.mode === "model" ? t("layer.modeModel") : t("layer.modeOffline")
				),
				h(
					"button",
					{
						type: "button",
						className: "mm-btn",
						onClick: () => setDepthLimit((current) => (current >= MAX_DRAW_DEPTHS ? DRAW_DEPTHS : Math.min(MAX_DRAW_DEPTHS, current * 2))),
						disabled: model.turns.length === 0,
						title: t("bar.depthHint")
					},
					`${t("bar.depth")} ${depthLimit}`
				),
				h(
					"button",
					{
						type: "button",
						className: "mm-btn",
						onClick: () => {
							const ids = model.turns.map((turn) => turn.id);
							setOpen((current) => (current.size >= ids.length ? new Set() : new Set(ids)));
						},
						disabled: model.turns.length === 0
					},
					open.size >= model.turns.length && model.turns.length > 0
						? t("bar.collapseAll")
						: t("bar.expandAll")
				),
				h(
					"button",
					{ type: "button", className: "mm-btn", onClick: exportOutline, disabled: model.turns.length === 0 },
					t("bar.export")
				)
			);

			const layout = React.useMemo(() => layoutTree(model.branch, depthLimit), [model.branch, depthLimit]);
			const placed = React.useMemo(() => placeTree(layout, heights), [layout, heights]);
			const anchorBox = placed.boxes.find((box) => box.parentId === TITLE_ROOT_ID) ?? null;

			const chart = model.turns.length === 0
				? h(
					"div",
					{ className: "mm-empty" },
					h("div", { className: "mm-empty__title" }, t("empty.title")),
					h("div", null, t("empty.hint"))
				)
				: h(
					"div",
					{ className: "mm-chart__title" },
					h("span", { className: "mm-chart__name" }, t("branch.legend")),
					h("span", { className: "mm-bar__meta" }, t("bar.meta", { turns: model.turns.length, nodes: model.total })),
					// The map now has exactly one entry point, so the old "N branch
					// roots" line described a structure that is no longer drawn. What is
					// worth saying instead is how deep the drawn hierarchy goes.
					h("span", { className: "mm-bar__meta" }, t("chart.levels", { n: layout.columns })),
					// The document's three operations, counted on the map as drawn: the
					// label of every card is one of them, so the counts are the honest
					// summary of how the map was judged.
					h("span", { className: "mm-chart__ops" }, t("layer.counts", { push: layerOps.push, sibling: layerOps.sibling, branch: layerOps.branch })),
					overrides.size > 0
						? h(
							"button",
							{
								type: "button",
								className: "mm-btn mm-btn--active",
								onClick: resetAllLinks,
								title: t("branch.resetHint")
							},
							t("branch.reset", { n: overrides.size })
						)
						: null,
					modelLinks.size > 0
						? h(
							"button",
							{
								type: "button",
								className: `mm-btn${layerCfg.mode === "model" ? " mm-btn--active" : ""}`,
								onClick: () => {
									clearModelLinks();
									flash(t("layer.cleared"));
								},
								title: t("layer.clearHint")
							},
							t("layer.clear", { n: modelLinks.size })
						)
						: h("span", { className: "mm-bar__meta" }, t("block.hint"))
				);

			const canvasRef = React.useRef(null);
			// One-shot diagnostic: enough to tell a stale page from an empty model
			// when someone reports the view as blank. Safe to delete.
			const reported = React.useRef(false);
			if (!reported.current && model.turns.length > 0) {
				reported.current = true;
				try {
					console.info("[@nydsg/dsh-mindmap v" + PLUGIN_VERSION + "]", {
						turns: model.turns.length,
						modules: model.total,
						roots: model.branch.roots.length,
						manual: overrides.size,
						firstQuestion: model.turns[0].promptText.slice(0, 60)
					});
				} catch {
					/* diagnostics must never break the view */
				}
			}

			const tree = model.turns.length === 0
				? null
				: h(
					"div",
					{
						className: "mm-canvas",
						style: { width: `${placed.width}px`, height: `${placed.height}px` },
						"aria-label": t("bar.title")
					},
					h(
						"svg",
						{
							className: "mm-canvas__edges",
							width: placed.width,
							height: placed.height,
							viewBox: `0 0 ${placed.width} ${placed.height}`,
							"aria-hidden": "true",
							focusable: "false"
						},
						placed.edges.map((edge) => h("path", {
							key: edge.key,
							d: edgePath(edge.from, edge.to),
							className: `mm-edge mm-edge--${edge.kind}`,
							fill: "none"
						}))
					),
					anchorBox === null ? null : renderAnchorCard({
						box: anchorBox,
						t,
						turns: model.turns.length,
						registerCard,
						onWiden: () => setDepthLimit((current) => Math.min(MAX_DRAW_DEPTHS, current + 3)),
						hidden: layout.hiddenBelow.get(anchorBox.node.turn.id) ?? 0
					}),
					placed.boxes.filter((box) => box !== anchorBox).map((box) => renderTreeCard({
						box,
						t,
						selectedTurn,
						selected,
						term,
						dimmedTurns,
						overrides,
						hidden: layout.hiddenBelow.get(box.node.turn.id) ?? 0,
						registerCard,
						onSelectTurn: setSelectedTurn,
						onSelect: setSelected,
						onTerm: setTerm,
						onWiden: () => setDepthLimit((current) => Math.min(MAX_DRAW_DEPTHS, current + 3))
					}))
				);

			const detail = h(
				"aside",
				{ className: "mm-detail", "aria-label": t("detail.title"), "aria-live": "polite" },
				notice.length > 0 ? h("div", { className: "mm-note" }, notice) : null,
				renderBranchPanel({
					turnId: selectedTurn,
					branch: model.branch,
					turns: model.turns,
					t,
					pickerFor,
					pickerValue,
					overrides,
					onTogglePicker: (id) => {
						setPickerFor((current) => (current === id ? null : id));
						setPickerValue("");
					},
					onPickerValue: setPickerValue,
					onSubmitPicker: submitPicker,
					onSetParent: setParent,
					onClearParent: clearParent,
					labelOfTurn
				}),
				// The layering protocol itself: the document's variables, the model
				// route, and the prompt/state a user can copy out.
				renderLayerPanel({
					t,
					config: layerCfg,
					onConfig: persistLayerCfg,
					bridge,
					run: layerRun,
					running,
					modelLinks,
					onRun: runModelJudge,
					onStop: stopLayerRun,
					onClear: () => {
						clearModelLinks();
						flash(t("layer.cleared"));
					},
					onCopy: copyLayerText,
					state: layer,
					summary: layerOps,
					selectedTurn,
					judgment: selectedJudgment
				}),
				// Selecting a card fills this panel with that turn's modules; selecting
				// a module row replaces it with that module's analysis.
				renderTurnModules({
					turnId: selectedTurn,
					branch: model.branch,
					t,
					selected,
					term,
					onSelect: setSelected,
					onTerm: setTerm,
					hasDetail: analysis !== null
				}),
				analysis === null
					? h(
						"div",
						{ className: "mm-empty" },
						selectedTurn === null ? t("detail.empty") : t("branch.selectModule")
					)
					: renderDetail({ analysis, t, onTerm: setTerm, onDraft: loadDraft })
			);

			return h(
				"div",
				{ className: "mm-scope mm-root", "data-session": sessionId },
				head,
				h("div", { className: "mm-body" }, h("div", { className: "mm-chart" }, chart, tree), detail)
			);
		}

		/**
		 * The single left-hand entry point of the map.
		 *
		 * It is not a turn and not a card you can select: the map's whole hierarchy
		 * hangs off it, so it answers "where does this conversation start" and
		 * nothing else. Its text is the first turn's question — the real beginning of
		 * the session — rather than a generic caption, and it is rendered as plain
		 * markup (no button, no click target) so it cannot be mistaken for a
		 * selectable turn. The bottom line shows how many branches hang off it, which
		 * is the one thing the removed "N branch roots" line used to say.
		 *
		 * @param args - placed box, locale seat, branch count, and the widen callback.
		 * @returns the anchor element.
		 */
		function renderAnchorCard(args) {
			const { box, t, turns, registerCard, onWiden, hidden } = args;
			const turn = box.node.turn;
			return h(
				"div",
				{
					key: turn.id,
					className: "mm-anchor",
					style: { left: `${box.x}px`, top: `${box.y}px`, width: `${CARD_W}px` },
					ref: registerCard(turn.id),
					"data-depth": box.depth,
					"data-session-title": "true"
				},
				h(
					"div",
					{ className: "mm-anchor__head" },
					h("span", { className: "mm-anchor__kicker" }, t("anchor.kicker")),
					h("span", { className: "mm-anchor__count" }, t("anchor.branches", { n: box.node.children.length }))
				),
				h("div", { className: "mm-anchor__text" }, turn.hasPrompt ? turn.promptText : t("block.noPrompt")),
				h("div", { className: "mm-anchor__foot" }, t("anchor.foot", { n: turns })),
				hidden > 0
					? h(
						"button",
						{ type: "button", className: "mm-btn mm-anchor__more", onClick: onWiden, title: t("branch.moreHint") },
						t("branch.more", { n: hidden })
					)
					: null
			);
		}

		/**
		 * Build one card of the horizontal tree.
		 *
		 * Everything here is absolutely positioned from the computed layout: the
		 * box's `left`/`top` come from {@link placeTree}, so nothing depends on
		 * measuring a rendered element to know where it is.
		 *
		 * @param args - placed box, locale seat, view state, and callbacks.
		 * @returns the card element.
		 */
		function renderTreeCard(args) {
			const {
				box,
				t,
				selectedTurn,
				selected,
				term,
				dimmedTurns,
				overrides,
				hidden,
				registerCard,
				onSelectTurn,
				onSelect,
				onTerm,
				onWiden
			} = args;
			const turn = box.node.turn;
			const isSelected = selectedTurn === turn.id;
			const holdsSelection = turn.modules.some((entry) => selected === `seq:${entry.seq}`);
			const pinned = overrides.has(turn.id);
			const dimmed = dimmedTurns !== null && dimmedTurns.has(turn.id);
			// A node whose parent is the anchor is entered directly from the title, so
			// calling it a "branch root" would contradict the single hierarchy the map
			// now draws. It is still a root of the similarity forest underneath, which
			// is why `model.branch.roots` keeps counting them for the branch panel.
			const fromAnchor = box.parentId === TITLE_NODE_ID;
			/*
			 * The badge names the OPERATION, not just the mechanism: the document's
			 * three operations are what the map claims, and each link kind is one of
			 * them — a wording match to an older question is 回溯, the structural
			 * continuation is 下推, a turn placed beside its predecessor is 换行新建,
			 * and a model judgment reports the operation it chose.
			 */
			const linkLabel = fromAnchor
				? t("branch.firstTag")
				: box.node.link.kind === "root"
					? t("branch.rootTag")
					: box.node.link.kind === "manual"
						? t("branch.manualTag")
						: box.node.link.kind === "model"
							? t("branch.modelTag", { op: t(`op.${layerOperationOf(box.node)}`) })
							: box.node.link.kind === "sibling"
								? t("branch.siblingTag")
								: box.node.link.kind === "previous"
									? t("branch.previousTag")
									: t("branch.autoTag", { score: box.node.link.score.toFixed(2) });

			return h(
				"div",
				{
					key: turn.id,
					className: `mm-card${fromAnchor ? " mm-card--first" : ""}${isSelected ? " mm-card--picked" : ""}${holdsSelection ? " mm-card--holds" : ""}${pinned ? " mm-card--pinned" : ""}${dimmed ? " mm-card--dim" : ""}`,
					style: { left: `${box.x}px`, top: `${box.y}px`, width: `${CARD_W}px` },
					ref: registerCard(turn.id),
					"data-depth": box.depth,
					"data-turn": turn.id
				},
				h(
					"button",
					{
						type: "button",
						className: "mm-card__face",
						onClick: () => onSelectTurn(isSelected ? null : turn.id),
						"aria-pressed": isSelected,
						title: t("branch.pickHint")
					},
					h(
						"span",
						{ className: "mm-card__head" },
						h("span", { className: "mm-card__no" }, turn.label),
						h("span", { className: `mm-card__link mm-card__link--${box.node.link.kind}` }, linkLabel)
					),
					h("span", { className: "mm-card__text" }, turn.hasPrompt ? turn.promptText : t("block.noPrompt")),
					h(
						"span",
						{ className: "mm-card__foot" },
						t("turn.nodes", { n: turn.modules.length }),
						box.node.children.length > 0 ? h("span", null, `· ${t("branch.continues", { n: box.node.children.length })}`) : null,
						flagsOf(turn, t).map((flag) => h("span", { className: "mm-card__flag", key: flag }, flag))
					)
				),
				hidden > 0
					? h(
						"button",
						{ type: "button", className: "mm-btn mm-card__more", onClick: onWiden, title: t("branch.moreHint") },
						t("branch.more", { n: hidden })
					)
					: null
			);
		}

		/**
		 * The selected turn's module rows, shown in the side panel.
		 *
		 * Module rows deliberately do NOT live inside the tree card: an expanded
		 * block would change the card's height and shove every connector below it.
		 * The tree stays the tree, and the rows get their own column.
		 *
		 * @param args - selected turn, branch forest, locale seat, and callbacks.
		 * @returns the panel section, or null when no turn is selected.
		 */
		function renderTurnModules(args) {
			const { turnId, branch, t, selected, term, onSelect, onTerm, hasDetail } = args;
			if (turnId === null || hasDetail) return null;
			const node = branch.nodes.get(turnId);
			if (node === undefined) return null;
			return h(
				"div",
				{ className: "mm-sec" },
				h(
					"div",
					{ className: "mm-sec__head" },
					t("modules.title", { turn: node.turn.label }),
					h("span", { className: "mm-sec__count" }, t("turn.nodes", { n: node.turn.modules.length }))
				),
				node.turn.answerText.length > 0
					? h("pre", { className: "mm-quote" }, node.turn.answerText)
					: h("div", { className: "mm-note" }, t("modules.noAnswer")),
				node.turn.modules.map((entry) => renderCard({
					entry,
					t,
					selected: selected === `seq:${entry.seq}`,
					term,
					onSelect,
					onTerm
				}))
			);
		}

				/**
		 * Turn status flags for a block header.
		 * @param turn - turn model.
		 * @param t - locale seat.
		 * @returns flag labels.
		 */
		function flagsOf(turn, t) {
			const flags = [];
			if (turn.running) flags.push(t("turn.pending"));
			if (turn.interrupted) flags.push(t("turn.interrupted"));
			if (turn.error) flags.push(t("turn.error"));
			return flags;
		}

				/**
		 * Branch controls for the selected turn.
		 *
		 * The matcher's own ranking is shown as an editable field rather than a
		 * verdict: the automatic link is a guess, so the top candidates are listed
		 * with their similarity and one click re-pins the turn to any of them, to no
		 * parent at all (a new branch), or back to the automatic answer.
		 *
		 * @param args - selected turn, branch forest, and edit callbacks.
		 * @returns the panel element, or null while no turn is selected.
		 */
		function renderBranchPanel(args) {
			const {
				turnId,
				branch,
				turns,
				t,
				pickerFor,
				pickerValue,
				overrides,
				onTogglePicker,
				onPickerValue,
				onSubmitPicker,
				onSetParent,
				onClearParent,
				labelOfTurn
			} = args;
			if (turnId === null) return null;
			const node = branch.nodes.get(turnId);
			if (node === undefined) return null;
			const parent = node.parent === null ? null : branch.nodes.get(node.parent);
			const pinned = overrides.has(turnId);
			/*
			 * The attribution sentence names the OPERATION and, where it applies, the
			 * rule that produced it. A model judgment reports its own operation, a
			 * capped continuation reports the document's level rule, and a wording match
			 * keeps its score — because "which of the three operations is this, and
			 * why" is the one thing this panel exists to answer.
			 */
			const parentLabel = parent === null ? "—" : parent.turn.label;
			const attribution = node.link.kind === "root"
				? t("branch.nowRoot")
				: node.link.kind === "manual"
					? t("branch.nowManual", { parent: parentLabel })
					: node.link.kind === "model"
						? t("branch.nowModel", { op: t(`op.${layerOperationOf(node)}`), parent: parentLabel })
						: node.link.kind === "sibling"
							? t("branch.nowSibling", { parent: parentLabel, depth: LINK_MAX_DEPTH })
							: node.link.kind === "previous"
								? t("branch.nowPrevious", { parent: parentLabel })
								: t("branch.nowAuto", { parent: parentLabel, score: node.link.score.toFixed(2) });

			return h(
				"div",
				{ className: "mm-sec mm-branch" },
				h("div", { className: "mm-sec__head" }, t("branch.title")),
				h("div", { className: "mm-note" }, attribution),
				h(
					"div",
					{ className: "mm-branch__actions" },
					h(
						"button",
						{ type: "button", className: "mm-btn", onClick: () => onTogglePicker(turnId) },
						pickerFor === turnId ? t("branch.pickClose") : t("branch.pickOpen")
					),
					h(
						"button",
						{
							type: "button",
							className: "mm-btn",
							onClick: () => onSetParent(turnId, null),
							disabled: pinned && node.parent === null
						},
						t("branch.makeRoot")
					),
					pinned
						? h(
							"button",
							{ type: "button", className: "mm-btn", onClick: () => onClearParent(turnId) },
							t("branch.makeAuto")
						)
						: null
				),
				pickerFor === turnId
					? h(
						"div",
						{ className: "mm-branch__picker" },
						h("div", { className: "mm-note" }, t("branch.pickHint")),
						h(
							"div",
							{ className: "mm-branch__pickerRow" },
							h("input", {
								className: "mm-input",
								type: "text",
								inputMode: "numeric",
								value: pickerValue,
								placeholder: t("branch.pickPlaceholder"),
								"aria-label": t("branch.pickPlaceholder"),
								onChange: (event) => onPickerValue(event.target.value),
								onKeyDown: (event) => {
									if (event.key === "Enter") onSubmitPicker();
									if (event.key === "Escape") onTogglePicker(turnId);
								}
							}),
							h("button", { type: "button", className: "mm-btn mm-btn--primary", onClick: onSubmitPicker }, t("branch.pickConfirm"))
						)
					)
					: null,
				node.candidates.length > 0
					? h(
						"div",
						{ className: "mm-sec" },
						h("div", { className: "mm-sec__head" }, t("branch.candidates")),
						h(
							"div",
							{ className: "mm-sec" },
							node.candidates.map((candidate) => h(
								"button",
								{
									type: "button",
									className: "mm-kw",
									key: `cand:${candidate.index}`,
									onClick: () => onSetParent(turnId, turns[candidate.index].id),
									title: t("branch.pinTo", { turn: turns[candidate.index].label })
								},
								h("span", { className: "mm-kw__term" }, turns[candidate.index].label),
								h(
									"span",
									{ className: "mm-kw__bar" },
									h("span", { className: "mm-kw__fill", style: { width: `${Math.round(candidate.score * 100)}%` } })
								),
								h("span", { className: "mm-kw__num" }, candidate.score.toFixed(2))
							))
						)
					)
					: h("div", { className: "mm-note" }, t("branch.noCandidates")),
				h(
					"div",
					{ className: "mm-note" },
					t("branch.childrenOf", { turn: labelOfTurn(turnId), n: node.children.length })
				)
			);
		}

		/**
		 * The 智能分层 panel: the document's variables, the two judges, and the exact
		 * prompt/state a user can copy out.
		 *
		 * It is deliberately one panel rather than a settings page: the operations the
		 * map is built from, the rules that produce them, the numbers that bound them
		 * (层级上限, 节点字数, 温度), and the artifacts of the protocol (系统提示词 /
		 * 用户模板 / 导图状态 / 片段) are all things a person checks WHILE looking at a
		 * map that looks wrong.
		 *
		 * @param args - locale seat, configuration and its writer, bridge status, run
		 * progress, model judgments, callbacks, the state, and the selection.
		 * @returns the panel element.
		 */
		function renderLayerPanel(args) {
			const {
				t,
				config,
				onConfig,
				bridge,
				run,
				running,
				modelLinks,
				onRun,
				onStop,
				onClear,
				onCopy,
				state,
				summary,
				selectedTurn,
				judgment
			} = args;
			const isModel = config.mode === "model";
			const bridgeReady = bridge !== null && bridge.ok === true && bridge.llm === true;
			const defaults = bridge !== null && typeof bridge.default === "object" && bridge.default !== null ? bridge.default : null;
			const routeLabel = config.provider.length > 0 && config.model.length > 0
				? `${config.provider} / ${config.model}`
				: defaults === null
					? t("layer.noRoute")
					: `${defaults.provider} / ${defaults.model}`;
			const node = selectedTurn === null ? null : (state.byId.get(selectedTurn) ?? null);
			const operation = judgment !== null && judgment !== undefined && judgment.operation !== null
				? judgment.operation
				: node?.operation ?? null;
			const fragment = node === null || operation === null
				? ""
				: layerFragmentMarkdown(
					operation,
					[judgment !== null && judgment !== undefined && judgment.label.length > 0 ? judgment.label : node.label],
					config
				);

			/**
			 * One labelled text/number field.
			 * @param key - config key.
			 * @param label - visible label.
			 * @param value - current value.
			 * @param options - numeric bounds and placeholder.
			 * @returns the field element.
			 */
			const field = (key, label, value, options = {}) => h(
				"label",
				{ className: "mm-field", key },
				h("span", { className: "mm-field__label" }, label),
				h("input", {
					className: "mm-input",
					type: options.numeric === true ? "number" : "text",
					value: String(value),
					min: options.min,
					max: options.max,
					step: options.step,
					placeholder: options.placeholder,
					"aria-label": label,
					onChange: (event) => onConfig({ [key]: options.numeric === true ? Number(event.target.value) : event.target.value })
				})
			);

			/**
			 * A row of mutually exclusive choices.
			 * @param key - config key.
			 * @param choices - value → label.
			 * @param current - active value.
			 * @returns the chip row.
			 */
			const choices = (key, values, current) => h(
				"div",
				{ className: "mm-chips", key: `choices:${key}` },
				values.map(([id, label]) => h(
					"button",
					{
						type: "button",
						className: `mm-chip${current === id ? " mm-chip--on" : ""}`,
						key: `${key}:${id}`,
						onClick: () => onConfig({ [key]: id })
					},
					label
				))
			);

			const progress = run === null
				? null
				: h(
					"div",
					{ className: "mm-note" },
					run.error.length > 0
						? t("layer.failed", { message: run.error })
						: run.cancelled === true
							? t("layer.stopped", { done: run.done, total: run.total })
							: run.running === true
								? t("layer.progress", { done: run.done, total: run.total, turn: run.at ?? "" })
								: t("layer.done", { done: run.done, total: run.total })
				);

			return h(
				"div",
				{ className: "mm-sec mm-layer" },
				h("div", { className: "mm-sec__head" }, t("layer.title")),
				h(
					"div",
					{ className: "mm-note" },
					t("layer.legend", {
						push: t("op.push"),
						sibling: t("op.sibling"),
						branch: t("op.branch")
					})
				),
				choices("mode", [["offline", t("layer.modeOffline")], ["model", t("layer.modeModel")]], config.mode),
				h("div", { className: "mm-note" }, t("layer.countsDetail", {
					push: summary.push,
					sibling: summary.sibling,
					branch: summary.branch,
					model: summary.model,
					manual: summary.manual
				})),
				isModel
					? h(
						"div",
						{ className: "mm-sec" },
						h("div", { className: "mm-note" }, bridge === null ? t("layer.bridgeUnknown") : bridgeReady ? t("layer.bridgeReady", { route: routeLabel }) : t("layer.bridgeMissing")),
						field("provider", t("layer.provider"), config.provider, { placeholder: defaults === null ? "" : defaults.provider }),
						field("model", t("layer.model"), config.model, { placeholder: defaults === null ? "" : defaults.model }),
						h(
							"div",
							{ className: "mm-branch__actions" },
							h(
								"button",
								{
									type: "button",
									className: "mm-btn mm-btn--primary",
									onClick: onRun,
									disabled: running || state.nodes.length === 0 || bridgeReady !== true
								},
								t("layer.run")
							),
							running
								? h("button", { type: "button", className: "mm-btn", onClick: onStop }, t("layer.stop"))
								: null,
							modelLinks.size > 0
								? h("button", { type: "button", className: "mm-btn", onClick: onClear }, t("layer.clear", { n: modelLinks.size }))
								: null
						),
						progress,
						h("div", { className: "mm-note" }, t("layer.limit", { n: config.turnLimit }))
					)
					: h("div", { className: "mm-note" }, t("layer.offlineNote", {
						depth: config.maxDepth > 0 ? config.maxDepth : t("layer.uncapped")
					})),
				section(
					t("layer.variables"),
					h(
						"div",
						{ className: "mm-sec" },
						field("maxDepth", t("layer.maxDepth"), config.maxDepth, { numeric: true, min: 0, max: 12, step: 1 }),
						field("nodeMaxChars", t("layer.nodeMaxChars"), config.nodeMaxChars, { numeric: true, min: 4, max: 60, step: 1 }),
						field("temperature", t("layer.temperature"), config.temperature, { numeric: true, min: 0.2, max: 0.5, step: 0.1 }),
						h("div", { className: "mm-note" }, t("layer.language")),
						choices("language", Object.entries(LAYER_LANGUAGES), config.language),
						h("div", { className: "mm-note" }, t("layer.outputFormat")),
						choices("outputFormat", Object.entries(LAYER_FORMATS), config.outputFormat)
					)
				),
				section(
					t("layer.protocol"),
					h(
						"div",
						{ className: "mm-sec" },
						h("div", { className: "mm-branch__actions" },
							h("button", { type: "button", className: "mm-btn", onClick: () => onCopy(buildLayerSystemPrompt(config), t("layer.copiedPrompt")) }, t("layer.copyPrompt")),
							h("button", { type: "button", className: "mm-btn", onClick: () => onCopy(LAYER_USER_TEMPLATE, t("layer.copiedTemplate")) }, t("layer.copyTemplate")),
							h("button", { type: "button", className: "mm-btn", onClick: () => onCopy(state.markdown, t("layer.copiedState")), disabled: state.nodes.length === 0 }, t("layer.copyState")),
							fragment.length > 0
								? h("button", { type: "button", className: "mm-btn", onClick: () => onCopy(fragment, t("layer.copiedFragment")) }, t("layer.copyFragment"))
								: null
						),
						h("div", { className: "mm-note" }, t("layer.variableHint")),
						h(
							"div",
							{ className: "mm-chips" },
							LAYER_VARIABLES.map((entry) => h("span", { className: "mm-chip", key: entry.name, title: entry.zh }, `{{${entry.name}}}`))
						)
					)
				),
				node === null
					? h("div", { className: "mm-note" }, t("layer.selectTurn"))
					: section(
						t("layer.selected", { turn: `#${node.number}` }),
						h(
							"div",
							{ className: "mm-sec" },
							h("div", { className: "mm-note" }, t("layer.selectedLine", {
								op: operation === null ? t("layer.noOperation") : t(`op.${operation}`),
								parent: node.parentId === null
									? t("layer.atTitle")
									: (state.byId.get(node.parentId)?.label ?? node.parentId),
								depth: node.depth,
								source: t(`layer.source.${judgment !== null && judgment !== undefined ? "model" : node.source}`)
							})),
							judgment !== null && judgment !== undefined && judgment.label.length > 0
								? h("pre", { className: "mm-quote" }, judgment.label)
								: null,
							h("pre", { className: "mm-quote mm-quote--dim" }, state.markdown)
						)
					)
			);
		}

		/**
		 * Render one module row inside the side panel.
		 * @param args - module, locale seat, selection state, and callbacks.
		 * @returns the row element.
		 */
		function renderCard(args) {
			const { entry, t, selected, term, onSelect, onTerm } = args;
			const variant = cardVariant(entry.kind);
			const chips = highlightedTerms(entry.text, term);
			const id = `seq:${entry.seq}`;
			return h(
				"div",
				{
					className: `mm-row mm-row--${variant}${selected ? " mm-row--selected" : ""}`,
					key: entry.key
				},
				h(
					"button",
					{
						type: "button",
						className: "mm-row__body",
						onClick: () => onSelect(id),
						title: t("card.expand")
					},
					h(
						"span",
						{ className: "mm-row__head" },
						h("span", { className: "mm-row__kind" }, t(`kind.${kindKey(entry.kind)}`)),
						h("span", { className: "mm-row__seq" }, t("detail.seq", { n: entry.seq })),
						entry.hint.length > 0 ? h("span", { className: "mm-row__seq" }, entry.hint) : null
					),
					h("span", { className: "mm-row__title" }, pickTitle(entry, t))
				),
				chips.length > 0
					? h(
						"span",
						{ className: "mm-chips" },
						chips.map((tag) => h(
							"button",
							{
								type: "button",
								className: "mm-chip",
								key: tag,
								onClick: () => onTerm(tag),
								title: t("kw.filter", { term: tag })
							},
							tag
						))
					)
					: null
			);
		}

		/**
		 * Terms of one module worth showing as chips. Resolved against the module's
		 * own text alone (one-document corpus), so a term only has to be long and
		 * non-trivial here, not repeated across turns.
		 * @param text - module text.
		 * @param term - active filter term.
		 * @returns up to four terms.
		 */
		function highlightedTerms(text, term) {
			const source = typeof text === "string" ? text : "";
			if (source.length === 0) return [];
			const own = termsOf(source);
			const seen = [];
			for (const value of own) {
				if (value.length < 2 || seen.includes(value)) continue;
				seen.push(value);
			}
			seen.sort((left, right) => right.length - left.length);
			if (term.length === 0) return seen.slice(0, 4);
			return seen.includes(term) ? [term, ...seen.filter((value) => value !== term).slice(0, 3)] : [];
		}

		/**
		 * CSS variant for a node kind.
		 * @param kind - raw node kind.
		 * @returns the variant suffix.
		 */
		function cardVariant(kind) {
			if (kind === "user" || kind === "steering") return "user";
			if (kind === "assistant-step") return "assistant";
			if (kind === "tool" || kind === "reasoning") return "tool";
			return "other";
		}

		/**
		 * Render the selected module's detail: prompt, answer, keywords, and the
		 * backward analysis with its suggested questions.
		 * @param args - analysis payload, locale seat, and callbacks.
		 * @returns the detail element tree.
		 */
		function renderDetail(args) {
			const { analysis, t, onTerm, onDraft } = args;
			const { hit, local, backward } = analysis;
			const module = hit.module;
			const turn = hit.turn;
			const sections = [];

			if (turn.promptText.length > 0) {
				sections.push(section(t("detail.prompt"), h("pre", { className: "mm-quote" }, turn.promptText)));
			}
			if (module.kind === "assistant-step" && module.text.length > 0) {
				sections.push(section(t("detail.answer"), h("pre", { className: "mm-quote" }, module.text)));
			}
			if (module.kind !== "assistant-step" && module.text.length > 0 && module.text !== turn.promptText) {
				sections.push(section(t("detail.context"), h("pre", { className: "mm-quote mm-quote--dim" }, module.text)));
			}
			if (Array.isArray(module.calls) && module.calls.length > 0) {
				sections.push(section(
					t("detail.tools"),
					h(
						"div",
						{ className: "mm-sec" },
						module.calls.slice(0, 8).map((call, index) => h(
							"div",
							{ className: "mm-code", key: `${call.name}:${index}` },
							call.summary
						))
					)
				));
			}

			sections.push(section(
				t("detail.keywords"),
				local.length === 0
					? h("div", { className: "mm-note" }, t("detail.noKeywords"))
					: h(
						"div",
						{ className: "mm-sec" },
						local.map((entry) => h(
							"button",
							{
								type: "button",
								className: "mm-kw",
								key: entry.term,
								onClick: () => onTerm(entry.term),
								title: t("kw.filter", { term: entry.term })
							},
							h("span", { className: "mm-kw__term" }, entry.term),
							h("span", { className: "mm-kw__bar" }, h("span", { className: "mm-kw__fill", style: { width: `${Math.round(entry.weight * 100)}%` } })),
							h("span", { className: "mm-kw__num" }, entry.weight.toFixed(2))
						))
					)
			));

			sections.push(section(
				t("detail.analysis"),
				h(
					"div",
					{ className: "mm-sec" },
					h("div", { className: "mm-note" }, t("detail.analysisHint")),
					h("div", { className: "mm-note" }, t("detail.earlier", { n: backward.turnCount })),
					backward.themes.length === 0
						? h("div", { className: "mm-note" }, t("detail.noKeywords"))
						: h(
							"div",
							{ className: "mm-sec" },
							backward.themes.slice(0, 12).map((entry) => h(
								"button",
								{
									type: "button",
									className: "mm-kw",
									key: entry.term,
									onClick: () => onTerm(entry.term),
									title: t("kw.filter", { term: entry.term })
								},
								h("span", { className: "mm-kw__term" }, entry.term),
								h("span", { className: "mm-kw__bar" }, h("span", { className: "mm-kw__fill", style: { width: `${Math.min(100, Math.round((entry.turns / Math.max(1, backward.turnCount)) * 100))}%` } })),
								h("span", { className: "mm-kw__num" }, t("kw.where", { turns: entry.turns, hits: entry.hits }))
							))
						),
					backward.emerging.length > 0
						? h(
							"div",
							{ className: "mm-chips" },
							backward.emerging.slice(0, 8).map((entry) => h(
								"button",
								{
									type: "button",
									className: "mm-chip",
									key: `e:${entry.term}`,
									onClick: () => onTerm(entry.term),
									title: t("kw.filter", { term: entry.term })
								},
								entry.term
							))
						)
						: null
				)
			));

			sections.push(section(
				t("detail.ideas"),
				backward.ideas.length === 0
					? h("div", { className: "mm-note" }, t("detail.noIdeas"))
					: h(
						"div",
						{ className: "mm-sec" },
						h("div", { className: "mm-note" }, t("detail.ideasActivate")),
						backward.ideas.map((idea, index) => h(
							"button",
							{
								type: "button",
								className: "mm-idea",
								key: `idea:${index}`,
								onClick: () => onDraft(idea)
							},
							h("span", { className: "mm-idea__text" }, idea),
							h("span", { className: "mm-idea__go" }, "↵")
						))
					)
			));

			return h(
				"div",
				{ className: "mm-sec" },
				h(
					"div",
					{ className: "mm-detail__head" },
					h("span", { className: "mm-detail__title" }, t(`kind.${kindKey(module.kind)}`)),
					h("span", { className: "mm-detail__meta" }, turn.label),
					h("span", { className: "mm-detail__meta" }, t("detail.tokens", { n: (module.text ?? "").length }))
				),
				...sections
			);
		}

		/**
		 * One labelled detail section.
		 * @param title - section heading.
		 * @param body - section body element.
		 * @returns the section element.
		 */
		function section(title, body) {
			return h(
				"div",
				{ className: "mm-sec", key: title },
				h("div", { className: "mm-sec__head" }, title),
				body
			);
		}
		//#endregion

		//#region lib/client/index.js
		/** Services required by the Mind-map plugin. */
		const inject = ["slots", "sessions", "uiSession", "uiConversation", "locale"];

		/**
		 * Client plugin body: register the mind-map Conversation view tab.
		 *
		 * The registration rides the slot service's effect wrapper, so plugin
		 * unload removes the tab (and its style tag) with the rest of the plugin.
		 *
		 * @param ctx - client root context.
		 */
		function apply(ctx) {
			installStyle();
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "@nydsg/dsh-mindmap: dictionaries");
			const t = ctx.locale.bind(NS);

			/**
			 * Read one session's Chat projection.
			 *
			 * Deliberately NOT a `uiSession.provide({ hooks: ["chat"] })`: the
			 * provide channel validates `hooks` names globally, and
			 * `@deepseek-ai/dsh-client-ui-chat` already owns the `chat` hook — a
			 * second declaration aborts the whole binding with `duplicate hook`.
			 * The view therefore reads the projection through the ordinary
			 * Conversation binding, which is the same snapshot under a name this
			 * plugin is allowed to use.
			 *
			 * @param binding - session assembly handle.
			 * @returns the hook source.
			 */
			const chatSourceFor = (() => {
				const cache = new WeakMap();
				return (binding) => {
					let source = cache.get(binding);
					if (source === undefined) {
						const target = ctx.uiConversation.binding(binding).target("chat");
						source = {
							getSnapshot: () => target.getSnapshot() ?? { order: [], nodes: { get: () => undefined } },
							subscribe: (listener) => target.subscribe(listener)
						};
						cache.set(binding, source);
					}
					return source;
				};
			})();

			ctx.slots.inject("conversation.view", () => ctx.slots.register(
				{
					name: "conversation.view",
					id: "mindmap",
					order: 20,
					locale: NS,
					label: () => t("view.mindmap"),
					inject: (sessionId) => {
						const binding = ctx.sessions.binding(sessionId);
						if (binding === undefined) throw new Error(`@nydsg/dsh-mindmap: unknown session "${sessionId}"`);
						const chat = chatSourceFor(binding);
						// Touch the projection so it activates even while the tab is closed.
						chat.getSnapshot();
						return {
							// Source names go under `hooks` under their RAW name: the
							// renderer's bindInjectSources runs each through
							// standardHookPropName, which mints the `useChat` prop. Writing
							// `useChat` here directly would pass the raw source object
							// through as a plain prop, and the view would call it as a
							// function.
							hooks: { chat },
							sessionId,
							writeDraft: (text) => {
								try {
									const scoped = ctx.sessions.scope(sessionId);
									if (scoped === undefined) return false;
									const conversation = scoped.get("conversation");
									if (conversation === undefined || conversation.input === undefined) return false;
									const shell = conversation.input.for(scoped);
									if (shell === undefined || shell.actions === undefined) return false;
									shell.actions.setDraft(text);
									return true;
								} catch (error) {
									ctx.logger?.warn?.(`@nydsg/dsh-mindmap: composer draft unavailable: ${String(error)}`);
									return false;
								}
							}
						};
					}
				},
				MindMapView
			));
		}
		//#endregion

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
