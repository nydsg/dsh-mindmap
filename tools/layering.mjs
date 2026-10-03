/**
 * dsh-mindmap layering gate.
 *
 * The requirement document specifies a judgment protocol, not just a feature: a
 * system prompt and a user template with `{{VARIABLE}}` placeholders, three
 * operations (父类下推 / 换行新建 / 回溯分支), one Markdown nested-list fragment per
 * turn with an operation marker, and a global state every judgment is based on.
 *
 * Everything that implements that protocol is pure — prompt assembly, config
 * normalization, the fragment parser, the state renderer, the placement decision,
 * and the offline judge's operation mapping — so this gate extracts those regions
 * from `lib/client.js` verbatim (no copy to drift) and runs them in a VM. It does
 * NOT test the browser, the host bridge, or the model: `registration.mjs` owns the
 * view and `host.mjs` owns the transport.
 *
 * Run: node tools/layering.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "lib", "client.js"), "utf8");

/**
 * Slice one `#region` block out of the bundle by name.
 * @param name - region label, e.g. `lib/client/layering.js`.
 * @returns the region body.
 */
function region(name) {
	const start = source.indexOf(`//#region ${name}`);
	if (start < 0) throw new Error(`region ${name} not found`);
	const end = source.indexOf("//#endregion", start);
	if (end < 0) throw new Error(`region ${name} is unterminated`);
	return source.slice(source.indexOf("\n", start) + 1, end);
}

const sandbox = { Intl, Math, JSON, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const api = vm.runInContext(
	`(function () {
		${region("lib/client/lexical.js")}
		${region("lib/client/branching.js")}
		${region("lib/client/prompt.js")}
		${region("lib/client/layering.js")}
		return {
			LAYER_SYSTEM_PROMPT, LAYER_USER_TEMPLATE, LAYER_CONFIG_BLOCK, LAYER_VARIABLES,
			LAYER_OPERATIONS, LAYER_TAGS, LAYER_DEFAULTS, LAYER_LANGUAGES, LAYER_FORMATS,
			LAYER_OP_LABEL, LAYER_CONFIG_KEY, LAYER_RUN_ROUTE, LAYER_INFO_ROUTE,
			fillLayerTemplate, buildLayerSystemPrompt, buildLayerUserPrompt, buildLayerRequest,
			layerConfig, layerNumber, layerNodeLabel, layerOperationOfLink, layerOperationOf,
			layerState, layerStateMarkdown, parseLayerFragment, parseLayerList, applyLayerFragment,
			layerFragmentMarkdown, layerSummary, stripLayerFence, layerLinksToRecord,
			layerLinksFromRecord, layerMatchLabel, layerNormalizeLabel,
			resolveLinks, LINK_MAX_DEPTH
		};
	})()`,
	sandbox,
	{ filename: "layering-regions.js" }
);

const problems = [];
const notes = [];
const ok = (condition, message) => {
	if (!condition) problems.push(message);
};

/**
 * Assert deep equality through JSON.
 * @param actual - produced value.
 * @param expected - expected value.
 * @param message - failure label.
 */
function eq(actual, expected, message) {
	const a = JSON.stringify(actual);
	const b = JSON.stringify(expected);
	if (a !== b) problems.push(`${message}: got ${a}, expected ${b}`);
}

/** A turn model shaped the way the projection adapter produces one. */
const turn = (number, prompt, answer = "") => ({
	id: `turn:${number}`,
	number,
	promptText: prompt,
	answerText: answer,
	text: `${prompt}\n${answer}`.trim(),
	modules: []
});

// ── the document's prompt assets ──────────────────────────────────────────

{
	const prompt = api.LAYER_SYSTEM_PROMPT;
	ok(typeof prompt === "string" && prompt.length > 500, "the system prompt must carry the document's text, not a stub");
	for (const clause of [
		"# DSH-Mindmap 智能分层提示词",
		"## 角色定位",
		"DSH-Mindmap 思维导图构建引擎",
		"## 核心目标",
		"父类下推",
		"换行新建",
		"回溯分支",
		"## 判断逻辑",
		"语义相似度",
		"对话流向",
		"上下文连贯性",
		"层级深度",
		"不确定原则",
		"## 输出格式",
		"Markdown 嵌套列表",
		"[下推]",
		"[换行]",
		"[回溯]",
		"## 约束与偏好",
		"## 启动指令"
	]) {
		ok(prompt.includes(clause), `the system prompt must keep the document's clause ${JSON.stringify(clause)}`);
	}
	// The document's own placeholders must survive into the asset.
	ok(prompt.includes("{{MAX_DEPTH}}"), "the system prompt must keep {{MAX_DEPTH}} for substitution");
	ok(prompt.includes("{{NODE_MAX_CHARS}}"), "the system prompt must keep {{NODE_MAX_CHARS}} for substitution");

	const template = api.LAYER_USER_TEMPLATE;
	for (const name of ["MINDMAP_STATE", "LAST_NODE", "LAST_QUESTION", "LAST_ANSWER", "CURRENT_QUESTION", "CURRENT_ANSWER"]) {
		ok(template.includes(`{{${name}}}`), `the user template must carry {{${name}}}`);
	}
	ok(template.includes("父类下推") && template.includes("换行新建") && template.includes("回溯分支"), "the user template must ask for the three operations by name");

	// The documented variable table is exposed for the panel and for copying.
	eq(
		api.LAYER_VARIABLES.map((entry) => entry.name),
		["MAX_DEPTH", "NODE_MAX_CHARS", "LANGUAGE", "OUTPUT_FORMAT", "MINDMAP_STATE", "LAST_NODE", "CURRENT_QUESTION", "CURRENT_ANSWER"],
		"the documented variable list must be exposed in order"
	);
}

// ── substitution ──────────────────────────────────────────────────────────

{
	const config = api.layerConfig(undefined);
	const system = api.buildLayerSystemPrompt(config);
	ok(!/\{\{[A-Z_]+\}\}/.test(system), `substitution must leave no placeholder behind: ${system.match(/\{\{[A-Z_]+\}\}/)?.[0]}`);
	ok(system.includes("MAX_DEPTH") && system.includes("5"), "the system prompt must state the effective max depth");
	ok(system.includes("15"), "the system prompt must state the effective node character budget");
	ok(system.includes("中文"), "the system prompt must state the output language");
	ok(system.includes("Markdown 嵌套列表"), "the system prompt must state the output format");
	// The document's own prompt body is preserved, with only the variables filled.
	ok(system.startsWith(api.LAYER_SYSTEM_PROMPT.slice(0, 200).replace("{{MAX_DEPTH}}", "5")), "the filled prompt must still begin with the document's text");

	const user = api.buildLayerUserPrompt({
		state: "- 如何学习编程？\n  - 选择语言",
		lastNode: "选择语言",
		lastQuestion: "先学什么语言？",
		lastAnswer: "建议从 Python 开始",
		currentQuestion: "Python 有哪些 Web 框架？",
		currentAnswer: "Django 与 Flask"
	});
	ok(!/\{\{[A-Z_]+\}\}/.test(user), "the user prompt must leave no placeholder behind");
	for (const needle of ["如何学习编程？", "选择语言", "先学什么语言？", "建议从 Python 开始", "Python 有哪些 Web 框架？", "Django 与 Flask"]) {
		ok(user.includes(needle), `the user prompt must carry ${JSON.stringify(needle)}`);
	}
	// A missing field degrades to a readable marker rather than "undefined".
	const sparse = api.buildLayerUserPrompt({});
	ok(!sparse.includes("undefined"), "an absent context field must not render as undefined");
	ok(sparse.includes("（无）") || sparse.includes("（空）"), "an absent context field must be marked explicitly");

	// The transport-neutral request is one value, so the view and the gate agree.
	const request = api.buildLayerRequest(api.layerConfig({ provider: "deepseek-official", model: "deepseek-v4-pro", temperature: 0.4 }), { state: "- 甲" });
	ok(request.provider === "deepseek-official" && request.model === "deepseek-v4-pro", "the request must carry the configured route");
	ok(request.temperature === 0.4, "the request must carry the configured temperature");
	ok(typeof request.system === "string" && typeof request.user === "string", "the request must carry both prompts");

	// An unknown placeholder survives rather than blanking a value out silently.
	eq(api.fillLayerTemplate("a {{KNOWN}} b {{UNKNOWN}}", { KNOWN: "x" }), "a x b {{UNKNOWN}}", "an unknown placeholder must be left standing");
	eq(api.fillLayerTemplate(null, {}), "", "a non-string template must degrade to empty");
}

// ── configuration ─────────────────────────────────────────────────────────

{
	const defaults = api.layerConfig(undefined);
	eq(defaults.maxDepth, 5, "the document's default max depth is 5");
	eq(defaults.nodeMaxChars, 15, "the document's default node budget is 15");
	eq(defaults.language, "zh", "the default language is Chinese");
	eq(defaults.outputFormat, "markdown", "the default output format is a Markdown nested list");
	eq(defaults.mode, "offline", "the default judge is the offline one — the plugin must work with no model");
	ok(defaults.temperature >= 0.2 && defaults.temperature <= 0.5, `the default temperature must sit in the document's band, got ${defaults.temperature}`);

	// The document's stability band is ENFORCED, not merely recommended.
	eq(api.layerConfig({ temperature: 1.5 }).temperature, 0.5, "a temperature above the band must be clamped down");
	eq(api.layerConfig({ temperature: 0 }).temperature, 0.2, "a temperature below the band must be clamped up");
	eq(api.layerConfig({ temperature: "abc" }).temperature, api.LAYER_DEFAULTS.temperature, "a non-numeric temperature must fall back to the default");
	eq(api.layerConfig({ maxDepth: -4 }).maxDepth, 0, "a negative depth limit must become the documented 'uncapped' value");
	eq(api.layerConfig({ maxDepth: 99 }).maxDepth, 12, "an absurd depth limit must be bounded");
	eq(api.layerConfig({ nodeMaxChars: 1 }).nodeMaxChars, 4, "a node budget below the readable floor must be raised");
	eq(api.layerConfig({ nodeMaxChars: 999 }).nodeMaxChars, 60, "an unbounded node budget must be capped");
	eq(api.layerConfig({ language: "klingon" }).language, "zh", "an unknown language must fall back to Chinese");
	eq(api.layerConfig({ outputFormat: "yaml" }).outputFormat, "markdown", "an unknown output format must fall back to Markdown");
	eq(api.layerConfig({ mode: "magic" }).mode, "offline", "an unknown judge must fall back to the offline one");
	eq(api.layerConfig("nonsense").maxDepth, 5, "a non-object config must fall back to the defaults");
	eq(api.layerConfig(null).nodeMaxChars, 15, "a null config must fall back to the defaults");
}

// ── node labels ───────────────────────────────────────────────────────────

{
	eq(api.layerNodeLabel("  多   空格\n换行  ", 15), "多 空格 换行", "a label must collapse whitespace");
	ok(api.layerNodeLabel("这是一个非常长的提问标题需要被裁剪掉", 8).length <= 8, "a label must respect the character budget");
	ok(api.layerNodeLabel("这是一个非常长的提问标题需要被裁剪掉", 8).endsWith("…"), "a clipped label must be marked as clipped");
	eq(api.layerNodeLabel("", 15), "", "an empty label stays empty");
	eq(api.layerNodeLabel(null, 15), "", "a null label stays empty");
	eq(api.layerNodeLabel("正好十五个字的提问标题内容", 15), "正好十五个字的提问标题内容", "a label inside the budget is untouched");
}

// ── the three operations ──────────────────────────────────────────────────

{
	eq(api.LAYER_OPERATIONS.map((entry) => entry.id), ["push", "sibling", "branch"], "the operations must be the document's three, in order");
	eq(api.LAYER_OPERATIONS.map((entry) => entry.tag), ["[下推]", "[换行]", "[回溯]"], "each operation must carry its document marker");
	// Link kind → operation. The offline judge's vocabulary maps onto the document's.
	eq(api.layerOperationOfLink("previous"), "push", "continuing the previous turn is 父类下推");
	eq(api.layerOperationOfLink("auto"), "branch", "naming an older question is 回溯分支");
	eq(api.layerOperationOfLink("sibling"), "sibling", "standing beside the previous turn is 换行新建");
	eq(api.layerOperationOfLink("root"), "sibling", "a new branch root is 换行新建");
	eq(api.layerOperationOfLink("title"), "sibling", "the title column carries no judgment of its own");
	eq(api.layerOperationOfLink("unknown"), null, "an unknown kind carries no operation");
	// A link that records its own operation wins over the kind.
	eq(api.layerOperationOf("x"), null, "a valueless node has no operation");
	eq(api.layerOperationOf({ link: { kind: "model", operation: "sibling" } }), "sibling", "a judged link must report its own operation");
	eq(api.layerOperationOf({ link: { kind: "previous" } }), "push", "a link without an operation falls back to its kind");
}

// ── the fragment protocol ─────────────────────────────────────────────────

{
	const pushed = api.parseLayerFragment("[下推]\n- Web 框架\n  - Django\n  - Flask");
	ok(pushed.ok === true, "a documented Markdown fragment must parse");
	eq(pushed.operation, "push", "the marker must decide the operation");
	eq(pushed.rootLabel, "Web 框架", "the fragment's root is the new node's label");
	eq(pushed.childLabel, "Django", "the first child is available for a 回溯 fragment");
	eq(pushed.path, ["Web 框架", "Django"], "the deepest-first chain is the path");
	eq(pushed.leaves, ["Web 框架", "Django", "Flask"], "every named node is reported");

	const backtrack = api.parseLayerFragment("```markdown\n[回溯]\n- Python\n  - 爬虫\n    - requests\n    - BeautifulSoup\n```");
	ok(backtrack.ok === true, "a fenced fragment must parse");
	eq(backtrack.operation, "branch", "回溯 must map to the branch operation");
	eq(backtrack.rootLabel, "Python", "a 回溯 fragment names the ancestor as its root");
	eq(backtrack.childLabel, "爬虫", "the node under the ancestor is the new node");
	ok(backtrack.raw.includes("```"), "the raw reply must be preserved for the panel");

	// Prose before the marker must not become the fragment.
	const chatty = api.parseLayerFragment("判断：与 Python 直接相关。\n操作：父类下推\n[下推]\n- Web 框架");
	eq(chatty.operation, "push", "a chatty reply must still yield the operation");
	eq(chatty.rootLabel, "Web 框架", "the list after the marker is the fragment, not the prose");
	// The earliest marker wins, so a quoted instruction list cannot decide the answer.
	const quoting = api.parseLayerFragment("可选操作：[换行]、[回溯]。\n我的判断：\n[回溯]\n- 爬虫");
	eq(quoting.operation, "sibling", "the earliest marker wins — a quoted list is not the answer");

	// English and JSON transports, both offered by the document's maintenance section.
	eq(api.parseLayerFragment("[sibling]\n- JavaScript\n  - Node.js").operation, "sibling", "an English marker must be accepted");
	eq(api.parseLayerFragment("换行新建\n- JavaScript").operation, "sibling", "the Chinese operation name must be accepted");
	const json = api.parseLayerFragment('{"operation":"push","path":["Web 框架","Django"]}');
	ok(json.ok === true, "the JSON transport must parse");
	eq(json.operation, "push", "the JSON operation field must decide the operation");
	eq(json.path, ["Web 框架", "Django"], "the JSON path must become the label chain");
	eq(api.parseLayerFragment('[{"operation":"branch","labels":["Python","爬虫"]}]').operation, "branch", "a JSON array of judgments must parse");
	const jsonFenced = api.parseLayerFragment("```json\n{\"operation\":\"sibling\",\"label\":\"JavaScript\"}\n```");
	eq(jsonFenced.operation, "sibling", "a fenced JSON reply must parse");

	// Indentation: four spaces is ONE level, not two.
	const wide = api.parseLayerFragment("[下推]\n- 根\n    - 子");
	eq(wide.path, ["根", "子"], "four-space indentation must be one level, not two");
	eq(api.parseLayerList("- 甲\n\t- 乙").length, 1, "a tab-indented child must nest under its parent");
	eq(api.parseLayerList("- 甲")[0].children.length, 0, "a single item has no children");

	// Failure is reported, never thrown.
	const nonsense = api.parseLayerFragment("我不太确定该怎么放。");
	ok(nonsense.ok === false && nonsense.operation === null, "an unparsable reply must be reported, not guessed");
	ok(typeof nonsense.reason === "string" && nonsense.reason.length > 0, "an unparsable reply must say why");
	const noMarker = api.parseLayerFragment("- Web 框架\n  - Django");
	ok(noMarker.ok === false, "a fragment without an operation marker is not a decision");
	eq(noMarker.operation, null, "a fragment without a marker has no operation");
	eq(noMarker.rootLabel, "Web 框架", "the labels are still reported so the panel can show them");
	eq(noMarker.reason, "no-operation", "the reason must name the missing marker");
	eq(api.parseLayerFragment("").reason, "empty", "an empty reply must be reported as empty");
	eq(api.parseLayerFragment(null).ok, false, "a null reply must be reported, not thrown");
	eq(api.stripLayerFence("```\n[下推]\n- 甲\n```"), "[下推]\n- 甲", "a fence must be stripped");
}

// ── the fragment renderer ─────────────────────────────────────────────────

{
	eq(api.layerFragmentMarkdown("push", ["Web 框架", "Django"], api.layerConfig(undefined)), "[下推]\n- Web 框架\n  - Django", "a rendered fragment must carry the marker and nest");
	eq(api.layerFragmentMarkdown("branch", ["Python"], api.layerConfig(undefined)), "[回溯]\n- Python", "a rendered 回溯 fragment carries its own marker");
	eq(api.layerFragmentMarkdown(null, ["甲"], api.layerConfig(undefined)), "- 甲", "a fragment with no operation carries no marker");
	ok(api.layerFragmentMarkdown("push", ["一个非常长的节点标题需要被裁剪掉"], api.layerConfig(undefined)).split("\n")[1].length <= 17, "a rendered fragment must respect the node budget");
}

// ── the global state ──────────────────────────────────────────────────────

{
	const turns = [
		turn(1, "如何学习编程？"),
		turn(2, "先学什么语言？"),
		turn(3, "Python 怎么入门？")
	];
	const config = api.layerConfig(undefined);
	const branch = api.resolveLinks(turns, new Map());
	const state = api.layerState(turns, branch, config);
	eq(state.nodes.length, 3, "every turn must appear in the state");
	eq(state.byId.get("turn:1").depth, 1, "the first turn starts at level 1");
	eq(state.byId.get("turn:3").depth, 3, "a chain deepens one level per turn");
	eq(state.byId.get("turn:3").parentId, "turn:2", "the state must record the resolved parent");
	eq(state.byId.get("turn:2").operation, "push", "a chained turn is the document's 父类下推");
	eq(state.counts.push, 2, "the two chained turns count as 父类下推");
	// The document's own multi-turn example labels the FIRST turn [换行]: a node with
	// no predecessor starts the map, which is 换行新建 with nothing to stand beside.
	eq(state.counts.sibling, 1, "the first turn is the document's 换行新建 — it starts the map");
	// The document's 历史节点 example has no markers in the state itself.
	ok(!state.markdown.includes("[下推]"), "the state must not carry operation markers — those belong to the fragment");
	eq(state.markdown.split("\n")[0], "- 如何学习编程？", "the state's first line is the map's root label");
	eq(state.markdown.split("\n")[1], "  - 先学什么语言？", "a child is indented one unit");
	eq(state.markdown.split("\n")[2], "    - Python 怎么入门？", "a grandchild is indented two units");

	// A 回溯 link really does hang the turn under an older node.
	const revisit = [
		turn(1, "插件安装到 dsh 的 profile 需要重启吗"),
		turn(2, "思维导图的卡片配色能不能换成深色主题"),
		turn(3, "插件安装完了还是要重启 profile 吗")
	];
	const revisitState = api.layerState(revisit, api.resolveLinks(revisit, new Map()), config);
	eq(revisitState.byId.get("turn:3").parentId, "turn:1", "a wording match must rejoin the older turn in the state");
	eq(revisitState.byId.get("turn:3").operation, "branch", "rejoining an older turn is 回溯分支");
	eq(revisitState.counts.branch, 1, "the branch count must reflect the 回溯");
	eq(revisitState.byId.get("turn:2").parentId, "turn:1", "a subject change alone does not start a branch: the second turn chains to the first");
	ok(/(^|\n)  - 插件安装完了/.test(revisitState.markdown), "the rejoined turn must be nested one level under the older one");

	// Labels honour the configured budget.
	const tight = api.layerState([turn(1, "这是一个很长的提问标题需要被裁剪")], api.resolveLinks([turn(1, "这是一个很长的提问标题需要被裁剪")], new Map()), api.layerConfig({ nodeMaxChars: 6 }));
	ok(tight.nodes[0].label.length <= 6, `the state's labels must respect the budget, got ${JSON.stringify(tight.nodes[0].label)}`);

	// An empty session is an empty state, not a crash.
	const empty = api.layerState([], api.resolveLinks([], new Map()), config);
	eq(empty.nodes.length, 0, "an empty session must produce an empty state");
	eq(empty.markdown, "", "an empty session must produce no Markdown");
	eq(api.layerSummary(empty).total, 0, "an empty state must summarise to zero");
}

// ── placement ─────────────────────────────────────────────────────────────

{
	const turns = [
		turn(1, "如何学习编程？", "先想清楚目标。"),
		turn(2, "先学什么语言？", "从 Python 开始。"),
		turn(3, "Python 有哪些 Web 框架？", "Django 与 Flask。")
	];
	const config = api.layerConfig(undefined);
	const state = api.layerState(turns.slice(0, 2), api.resolveLinks(turns.slice(0, 2), new Map()), config);

	const pushed = api.applyLayerFragment(state, api.parseLayerFragment("[下推]\n- Web 框架"), { previousId: "turn:2", index: 2 });
	eq(pushed.parentId, "turn:2", "父类下推 attaches under the previous turn");
	eq(pushed.label, "Web 框架", "父类下推 takes the fragment's root as the new node");

	const sibling = api.applyLayerFragment(state, api.parseLayerFragment("[换行]\n- JavaScript"), { previousId: "turn:2", index: 2 });
	eq(sibling.parentId, "turn:1", "换行新建 takes the previous turn's parent, so it stands beside it");

	const firstSibling = api.applyLayerFragment(state, api.parseLayerFragment("[换行]\n- 新话题"), { previousId: "turn:1", index: 1 });
	eq(firstSibling.parentId, null, "a sibling of a branch root is itself a branch root");

	const branch = api.applyLayerFragment(state, api.parseLayerFragment("[回溯]\n- 如何学习编程？\n  - 学习路线"), { previousId: "turn:2", index: 2 });
	eq(branch.matched, "turn:1", "回溯 must find the ancestor the fragment named");
	eq(branch.parentId, "turn:1", "回溯 attaches under the named ancestor");
	eq(branch.label, "学习路线", "回溯 takes the node under the repeated ancestor");

	const unmatched = api.applyLayerFragment(state, api.parseLayerFragment("[回溯]\n- 完全没提过的话题"), { previousId: "turn:2", index: 2 });
	eq(unmatched.matched, null, "an unidentifiable ancestor must be reported as unmatched");
	eq(unmatched.parentId, "turn:2", "an unmatched 回溯 falls back to the previous turn rather than inventing a branch");
	eq(unmatched.reason, "branch-unmatched", "the fallback must name its reason");

	const orphan = api.applyLayerFragment(api.layerState([], api.resolveLinks([], new Map()), config), api.parseLayerFragment("[下推]\n- 第一步"), { previousId: null, index: 0 });
	eq(orphan.parentId, null, "the first turn has no previous turn, so it starts the map");

	const refused = api.applyLayerFragment(state, api.parseLayerFragment("我判断不出来"), { previousId: "turn:2", index: 2 });
	eq(refused.ok, false, "an unparsable reply must not place anything");
	eq(refused.parentId, null, "an unparsable reply must not invent a parent");

	// The lookup itself: normalized equality, then containment, then shared terms.
	const lookup = [
		turn(1, "插件安装到 dsh 的 profile 需要重启吗"),
		turn(2, "思维导图的卡片配色怎么改")
	];
	const lookupState = api.layerState(lookup, api.resolveLinks(lookup, new Map()), config);
	eq(api.layerMatchLabel(lookupState, "插件安装到dsh的profile需要重启吗")?.id, "turn:1", "a punctuation-only difference must still match");
	eq(api.layerMatchLabel(lookupState, "思维导图的卡片配色怎么改")?.id, "turn:2", "an exact label must match");
	eq(api.layerMatchLabel(lookupState, "完全无关的另一个话题"), null, "an unrelated label must not match");
	eq(api.layerNormalizeLabel("  A B·C  "), "abc", "normalization must drop spaces and punctuation");
}

// ── the offline judge: operations, the documented depth cap, and seeding ───

{
	const chain = (count) => Array.from({ length: count }, (_, index) => turn(index + 1, `第 ${index + 1} 个追问`));
	const config = api.layerConfig(undefined);

	// The document's 最大层级 is part of the OFFLINE judge too: past the cap a turn is
	// placed beside its predecessor (换行新建) instead of deeper.
	const capped = api.resolveLinks(chain(9), new Map(), { maxDepth: 5 });
	let deepest = 0;
	for (const node of capped.nodes.values()) deepest = Math.max(deepest, node.depth);
	ok(deepest <= 5, `the offline judge must respect the documented level cap, got depth ${deepest}`);
	const kinds = [...capped.nodes.values()].map((node) => node.link.kind);
	ok(kinds.includes("sibling"), `a turn past the cap must be labelled 换行新建, got ${JSON.stringify(kinds)}`);
	eq(capped.nodes.get("turn:6").parent, "turn:4", "the sixth turn stands beside the fifth, under its parent");
	eq(capped.nodes.get("turn:6").link.operation, "sibling", "a capped placement must record the 换行 operation");
	eq(api.layerState(chain(9), capped, config).counts.sibling >= 4, true, "the capped turns must count as 换行新建");

	// Uncapped is still available, and is the documented way to switch the rule off.
	const uncapped = api.resolveLinks(chain(9), new Map(), { maxDepth: 0 });
	let free = 0;
	for (const node of uncapped.nodes.values()) free = Math.max(free, node.depth);
	eq(free, 9, "a depth limit of 0 must keep the plain chain");
	eq(api.LINK_MAX_DEPTH, 5, "the default cap must be the document's 5 levels");

	// A hand pin is an instruction, not a default: the cap must not rewrite it.
	const pinned = api.resolveLinks(chain(9), new Map([["turn:9", "turn:8"]]), { maxDepth: 5 });
	eq(pinned.nodes.get("turn:9").parent, "turn:8", "a hand-pinned parent must survive the depth cap");
	eq(pinned.nodes.get("turn:9").link.kind, "manual", "a hand pin stays labelled manual");

	// Seeded JUDGMENTS (the model path) outrank the wording matcher, and an
	// impossible one is refused rather than trusted into a cycle. These fixtures
	// share no signal vocabulary, so the fallback the refusal lands on is the
	// structural one and the assertion cannot pass for the wrong reason.
	const distinct = ["先聊聊插件安装", "换个话题说配色", "再讲一件部署的事", "最后收个尾"].map((text, index) => turn(index + 1, text));
	const judged = api.resolveLinks(distinct, new Map(), {
		seed: new Map([["turn:4", { parent: "turn:1", operation: "branch" }]])
	});
	eq(judged.nodes.get("turn:4").parent, "turn:1", "a seeded judgment must decide the parent");
	eq(judged.nodes.get("turn:4").link.kind, "model", "a seeded judgment must be labelled as a judgment, not as a wording match");
	eq(judged.nodes.get("turn:4").link.operation, "branch", "a seeded judgment must keep its operation");
	eq(api.layerState(distinct, judged, config).byId.get("turn:4").source, "model", "the state must attribute a seeded parent to the model");
	// A manual pin still beats it.
	const over = api.resolveLinks(distinct, new Map([["turn:4", null]]), { seed: new Map([["turn:4", { parent: "turn:1", operation: "branch" }]]) });
	eq(over.nodes.get("turn:4").parent, null, "a hand pin must beat a model judgment");
	const cyclic = api.resolveLinks(distinct, new Map(), { seed: new Map([["turn:2", { parent: "turn:4", operation: "push" }]]) });
	eq(cyclic.nodes.get("turn:2").parent, "turn:1", "a seeded parent that is not strictly earlier must be refused");
	eq(cyclic.nodes.get("turn:2").link.kind, "previous", "a refused judgment must fall back to the structural rule");
	const selfSeed = api.resolveLinks(distinct, new Map(), { seed: new Map([["turn:3", { parent: "turn:3", operation: "push" }]]) });
	eq(selfSeed.nodes.get("turn:3").parent, "turn:2", "a seeded parent naming the turn itself must be refused");

	// A session that already fits inside the cap is untouched by it.
	const short = api.resolveLinks(chain(5), new Map(), { maxDepth: 5 });
	eq([...short.nodes.values()].filter((node) => node.link.kind === "sibling").length, 0, "a chain inside the cap must produce no 换行");
}

// ── stored judgments ──────────────────────────────────────────────────────

{
	const links = new Map([
		["turn:2", { parent: "turn:1", operation: "push", label: "选择语言", reason: "markdown" }],
		["turn:3", { parent: null, operation: "sibling", label: "JavaScript", reason: "json" }]
	]);
	const record = api.layerLinksToRecord(links);
	eq(Object.keys(record).length, 2, "every judgment must be stored");
	const restored = api.layerLinksFromRecord(JSON.parse(JSON.stringify(record)));
	eq(restored.size, 2, "a stored judgment set must round-trip");
	eq(restored.get("turn:2").parent, "turn:1", "a stored parent must round-trip");
	eq(restored.get("turn:3").parent, null, "a stored branch root must stay an explicit null");
	eq(restored.get("turn:3").operation, "sibling", "a stored operation must round-trip");
	// Drift must degrade, not throw.
	eq(api.layerLinksFromRecord(null).size, 0, "a null record must degrade to no judgments");
	eq(api.layerLinksFromRecord([1, 2]).size, 0, "an array record must degrade to no judgments");
	eq(api.layerLinksFromRecord({ "turn:1": "nonsense" }).size, 0, "a non-object judgment must be dropped");
	eq(api.layerLinksFromRecord({ "turn:1": { parent: "turn:9", operation: "teleport" } }).get("turn:1").operation, null, "an unknown operation must degrade to null");

	// The two routes the view calls must match the host half's registration.
	ok(api.LAYER_RUN_ROUTE.startsWith("/plugin-mindmap/"), "the run route must live under the plugin's own prefix");
	ok(api.LAYER_INFO_ROUTE.startsWith("/plugin-mindmap/"), "the info route must live under the plugin's own prefix");
	ok(api.LAYER_CONFIG_KEY.startsWith("dsh.mindmap."), "the stored configuration key must be plugin-scoped");
	eq(api.LAYER_LANGUAGES.zh, "中文", "the language table must name Chinese");
	eq(api.LAYER_FORMATS.markdown, "Markdown 嵌套列表", "the format table must name the documented format");
	eq(Object.keys(api.LAYER_OP_LABEL).length, 3, "exactly three operations may carry a human label");
}

notes.push(`layering regions: prompt / layering / branching / lexical`);
notes.push(`assertions cover the prompt assets, substitution, config clamping, the fragment protocol, the state, placement, and the offline judge`);

if (problems.length === 0) {
	console.log("layering: PASS (0 problems)");
	process.exit(0);
}
console.log(`layering: FAIL (${problems.length} problem(s))`);
for (const problem of problems) console.log(`  - ${problem}`);
process.exit(1);
