/**
 * dsh-mindmap behaviour gate.
 *
 * The keyword engine, the projection adapters, and the outline writer are pure
 * functions living inside a browser bundle, so nothing else exercises them
 * before they run against a real session. This gate extracts those regions from
 * `lib/client.js` verbatim (no copy to drift) and runs them in a VM with a
 * browser-shaped `Intl`, then asserts the behaviour the view depends on:
 *
 *  - CJK segmentation produces multi-character terms, not raw bigram noise
 *  - Latin inflection collapses (`cache` / `caches`)
 *  - stopwords never surface as keywords
 *  - turn TF-IDF ranks the repeated topical term above an incidental one
 *  - the backward analysis only sees turns BEFORE the selected one, and does
 *    not invent suggestions when there is no history
 *  - node normalization survives missing/garbage projection fields
 *
 * Run: node tools/behaviour.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "lib", "client.js"), "utf8");

/**
 * Slice one `#region` block out of the bundle by name.
 * @param name - region label, e.g. `lib/client/lexical.js`.
 * @returns the region body.
 */
function region(name) {
	const start = source.indexOf(`//#region ${name}`);
	if (start < 0) throw new Error(`region ${name} not found`);
	const end = source.indexOf("//#endregion", start);
	if (end < 0) throw new Error(`region ${name} is unterminated`);
	return source.slice(source.indexOf("\n", start) + 1, end);
}

const harness = `
${region("lib/client/lexical.js")}
${region("lib/client/branching.js")}
${region("lib/client/chat-data.js")}
${region("lib/client/layout.js")}
${region("lib/client/outline.js")}
return { segmentText, keywordsOf, termProfile, analyzeBackward, suggestQuestions, buildModel, outlineText, kindKey, STOPWORDS, cosineSimilarity, signalOverlap, questionProfiles, resolveLinks, overridesToRecord, overridesFromRecord, LINK_MIN_SCORE, layoutTree, placeTree, edgePath };
`;

/** A few stopwords that must never survive segmentation, sampled from the engine's own list. */
const STOPWORD_SAMPLE = ["的", "了", "是", "the", "and", "我们", "然后"];

const sandbox = { Intl, Math, JSON, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const problems = [];
const api = vm.runInContext(`(function () { ${harness} })()`, sandbox, { filename: "regions.js" });

/**
 * Assert a condition with a diagnostic.
 * @param condition - the assertion.
 * @param message - failure message.
 */
function ok(condition, message) {
	if (!condition) problems.push(message);
}

/**
 * Assert deep array equality.
 * @param actual - produced value.
 * @param expected - expected value.
 * @param message - failure label.
 */
function eq(actual, expected, message) {
	const a = JSON.stringify(actual);
	const b = JSON.stringify(expected);
	if (a !== b) problems.push(`${message}: got ${a}, expected ${b}`);
}

// ── segmentation ──────────────────────────────────────────────────────────

const zhTerms = api.segmentText("把思维导图插件装进 DSH 的 web profile，然后重启应用");
ok(zhTerms.every((term) => term.length >= 2), `segmentation emitted a <2-char term: ${JSON.stringify(zhTerms)}`);
ok(zhTerms.every((term) => !STOPWORD_SAMPLE.includes(term)), `a stopword survived: ${JSON.stringify(zhTerms)}`);
ok(STOPWORD_SAMPLE.every((word) => api.STOPWORDS.has(word)), "the stopword sample drifted from the engine's list");
ok(zhTerms.some((term) => term.includes("导图") || term.includes("插件")), `the topical morphemes are missing: ${JSON.stringify(zhTerms)}`);
ok(zhTerms.includes("dsh"), `latin token lost: ${JSON.stringify(zhTerms)}`);
// Terms must not overlap: a character must never be reported both alone and
// inside a merged term, which would double-count every keyword weight.
const zhSource = "把思维导图插件装进";
let cursor = 0;
for (const term of zhTerms) {
	if (!zhSource.includes(term)) continue;
	const at = zhSource.indexOf(term, cursor);
	ok(at >= 0, `term ${term} overlaps its neighbours: ${JSON.stringify(zhTerms)}`);
	if (at >= 0) cursor = at + term.length;
}

const latinTerms = api.segmentText("The caches are cached; caching cache entries");
ok(latinTerms.filter((term) => term === "cach").length >= 3, `latin stemming did not collapse inflections: ${JSON.stringify(latinTerms)}`);
ok(!latinTerms.includes("the"), "english stopword survived");

eq(api.segmentText(""), [], "empty text yields no terms");
eq(api.segmentText(null), [], "null text yields no terms");

// ── keyword weighting ─────────────────────────────────────────────────────

const turns = [
	"我们讨论思维导图插件的安装方式，思维导图要能点击展开",
	"思维导图插件的关键词分析怎么做，关键词要能向后推演",
	"顺便问一下天气"
];
const keywords = api.keywordsOf(turns);
ok(keywords.length > 0, "keywordsOf returned nothing");
const ranking = keywords.map((entry) => entry.term);
const rankOf = (needle) => ranking.findIndex((term) => term.includes(needle));
const topicRanks = ["导图", "插件", "安装", "分析", "推演"].map(rankOf).filter((index) => index >= 0);
ok(topicRanks.length > 0, `no topical term in the ranking: ${JSON.stringify(ranking)}`);
const weatherRank = rankOf("天气");
ok(weatherRank < 0 || Math.min(...topicRanks) < weatherRank, `an incidental term outranked the topic: ${JSON.stringify(ranking.slice(0, 8))}`);
ok(keywords.every((entry) => entry.weight > 0 && entry.weight <= 1), "weights must be normalised into (0, 1]");
ok(keywords.every((entry, index) => index === 0 || keywords[index - 1].weight >= entry.weight), "keywords must be sorted by descending weight");
ok(keywords.every((entry) => entry.count >= 2), "single-occurrence terms must not be reported as keywords");

// ── backward analysis scope ───────────────────────────────────────────────

const before = ["我们讨论思维导图插件的安装方式", "思维导图插件的关键词分析要做成向后推演"];
const forward = api.analyzeBackward(before, "顺便问一下天气");
ok(forward.turnCount === 2, `expected 2 preceding turns, got ${forward.turnCount}`);
const themeTerms = forward.themes.map((entry) => entry.term);
ok(themeTerms.some((term) => term.includes("导图") || term.includes("插件") || term.includes("安装")), `repeated theme not found: ${JSON.stringify(themeTerms.slice(0, 8))}`);
ok(!themeTerms.includes("天气"), "analysis leaked the CURRENT module's term into the earlier-module themes");
ok(forward.ideas.length > 0, "no suggested questions for a two-turn history");
ok(forward.ideas.length <= 3, `expected at most 3 suggestions, got ${forward.ideas.length}`);
ok(forward.ideas.every((idea) => typeof idea === "string" && idea.length > 0), "suggestions must be non-empty strings");
ok(forward.ideas.every((idea) => !/\{[abc]\}/.test(idea)), `a template placeholder leaked into a suggestion: ${JSON.stringify(forward.ideas)}`);

const noHistory = api.analyzeBackward([], "第一句话");
eq(noHistory.ideas, [], "no suggestions may be produced without history");
eq(noHistory.turnCount, 0, "empty scope must report zero turns");

const oneTurn = api.analyzeBackward(["只有一个话题"], "第二个问题");
eq(oneTurn.ideas, [], "a single preceding turn is not enough to extrapolate");

// ── projection adapters ───────────────────────────────────────────────────

const t = (key, params) => {
	if (params === undefined) return key;
	return `${key}(${Object.entries(params).map(([name, value]) => `${name}=${value}`).join(",")})`;
};

const snapshot = {
	order: ["a", "b", "c", "d"],
	nodes: {
		get(key) {
			const table = {
				a: {
					key: "a",
					kind: "user",
					anchorSeq: 1,
					location: { kind: "turn", turn: { turn: 1 } },
					data: { seq: 1, content: [{ type: "text", text: "帮我做一个思维导图插件，思维导图要能点击展开" }] }
				},
				b: {
					key: "b",
					kind: "assistant-step",
					anchorSeq: 2,
					location: { kind: "step", turn: { turn: 1 }, step: { step: 0 } },
					data: {
						seq: 2,
						blocks: [
							{ kind: "text", text: "先确认插件形态" },
							{ kind: "tool-call", name: "read", argumentsRaw: JSON.stringify({ file_path: "/tmp/a" }) }
						],
						usage: { inputTokens: 10, outputTokens: 5 }
					}
				},
				c: {
					key: "c",
					kind: "user",
					anchorSeq: 3,
					location: { kind: "turn", turn: { turn: 2 } },
					data: { seq: 3, content: [{ type: "text", text: "关键词要能向后推演" }] }
				},
				// Deliberately malformed: no location, no data.
				d: { key: "d", kind: "assistant-step" }
			};
			return table[key];
		}
	}
};

const built = api.buildModel(snapshot, t);
ok(built.total === 4, `expected 4 modules, got ${built.total}`);
ok(built.turns.length === 3, `expected 3 turn buckets (node "d" has no location and falls back to its index), got ${built.turns.length}`);
ok(built.turns[0].number === 1, `first turn number should be 1, got ${built.turns[0].number}`);
ok(built.turns[0].promptText.includes("思维导图"), "turn 1 must carry the user prompt text");
ok(built.turns[0].answerText.includes("先确认插件形态"), "turn 1 must carry the assistant answer text");
ok(built.turns[0].modules.length === 2, `turn 1 should hold 2 modules, got ${built.turns[0].modules.length}`);
const toolModule = built.turns[0].modules.find((entry) => entry.kind === "assistant-step");
ok(Array.isArray(toolModule.calls) && toolModule.calls.length === 1, "assistant tool calls must be extracted");
ok(toolModule.calls[0].summary.includes("/tmp/a"), `tool summary lost the path: ${toolModule.calls[0].summary}`);
ok(built.turns[0].running === true, "an assistant step without finalNode must read as running");
ok(built.nodeById.has("seq:1"), "node index must key modules by seq");
const malformed = built.nodeById.get("seq:3");
ok(malformed !== undefined, "a malformed node must still become a module");
ok(typeof malformed.module.title === "string" && malformed.module.title.length > 0, "a malformed node needs a non-empty title");
ok(built.keywords.length > 0, "the model must expose session keywords");
const outline = api.outlineText(built, t);
ok(typeof outline === "string" && outline.length > 0, "outline export must produce text");

const empty = api.buildModel(undefined, t);
eq(empty.turns, [], "an absent snapshot must yield an empty model");
eq(empty.total, 0, "an absent snapshot must report zero modules");

// ── branch linking ────────────────────────────────────────────────────────
//
// The whole point of the branch view: a follow-up question must attach to the
// earlier question it is actually about, and a question about something else must
// start its own branch. These assertions use clearly separable topics so a
// failure means the matcher is broken, not that the threshold is off by a hair.

{
	const turn = (number, prompt) => ({ id: `turn:${number}`, number, promptText: prompt, text: prompt });
	const branchTurns = [
		turn(1, "插件安装到 dsh 的 web profile 需要重启吗"),
		turn(2, "dsh 插件安装失败怎么排查 profile 配置"),
		turn(3, "晚饭吃什么比较好"),
		turn(4, "dsh 插件安装完了还是要重启 profile 吗")
	];
	const forest = api.resolveLinks(branchTurns, new Map());
	const node = (number) => forest.nodes.get(`turn:${number}`);

	ok(node(1).parent === null, "the first question must be a branch root");
	ok(node(2).parent === "turn:1", `turn 2 is about the same install topic and should continue turn 1, got ${node(2).parent}`);
	// Turn 2 links to turn 1 because of the QUESTION threshold, not because the
	// chain caught it — and the label is what tells those two apart. Asserting only
	// the parent would stay green if the threshold were dropped to zero, because the
	// chain would attach the same parent for a different reason. (It did: this
	// assertion is here because a mutation proved the gate blind without it.)
	ok(node(2).link.kind === "auto", `turn 2 must be reported as a wording match, got ${node(2).link.kind}`);
	ok(
		node(2).link.score >= api.LINK_MIN_SCORE,
		`a wording match must clear the threshold, got ${node(2).link.score}`
	);
	// Turn 3 changes subject and STILL follows turn 2. The rule is structural: the
	// next question follows the last answer, so a new subject does not by itself
	// start a new branch. An earlier release treated "continue the previous turn" as
	// a similarity claim that had to be earned, and ended up sending 8 of 9 real
	// follow-ups to their own branch. Only a wording match to an OLDER question
	// breaks the chain (turn 4 below), and a manual pin always can.
	ok(
		node(3).parent === "turn:2",
		`a new subject must still follow the previous turn unless it names an older one, got ${node(3).parent}`
	);
	ok(node(3).link.kind === "previous", "a structural continuation must be labelled as one, not as a wording match");
	ok(
		node(4).parent === "turn:1" || node(4).parent === "turn:2",
		`turn 4 revisits the install topic and should join that branch, got ${node(4).parent}`
	);
	ok(!forest.nodes.has(node(4).parent) === false, "a linked turn's parent must exist in the forest");
	ok(forest.roots.length === 1, `only the first turn may be a root, got ${forest.roots.length}`);
	ok(node(1).children.length >= 1, "a branch root must own at least one continuation");

	/*
	 * The scoring property, asserted as SEPARATION rather than as an outcome.
	 *
	 * Asserting only "the background-only pair does not link" is not enough: that
	 * pair also fails to link under a raw cosine, because a short question's cosine
	 * is low anyway. The property that actually separates a continuation from a
	 * coincidence is that shared-signal ratio is HIGH for a genuine continuation and
	 * LOW for a pair that merely reuses the session's vocabulary — so both sides are
	 * asserted here, around the threshold.
	 */
	{
		const backgroundOnly = [
			turn(1, "我要给 dsh 做一个插件"),
			turn(2, "这个 dsh 插件要加一个思维导图视图")
		];
		const genuine = [
			turn(1, "dsh 插件的客户端 bundle 要怎么写"),
			turn(2, "dsh 插件的客户端 bundle 怎么注册插槽")
		];
		const later = [
			turn(1, "我要做一个 DSH 插件"),
			turn(2, "这个 DSH 插件怎么做思维导图视图")
		];
		const scoreOf = (turns) => {
			const profiles = api.questionProfiles(turns);
			return api.signalOverlap(profiles[0], profiles[1]);
		};
		const genericScore = scoreOf(backgroundOnly);
		const genuineScore = scoreOf(genuine);
		const chainScore = scoreOf(later);

		ok(genericScore < 0.4, `background-only overlap must fall under the threshold, got ${genericScore.toFixed(3)}`);
		ok(genuineScore > 0.4, `a shared specific term must clear the threshold, got ${genuineScore.toFixed(3)}`);
		ok(chainScore > 0.4, `a chained follow-up must clear the threshold, got ${chainScore.toFixed(3)}`);
		// The gap is the whole point: no threshold on the raw cosine separates these,
		// which is why the score is a shared-signal ratio.
		ok(
			genuineScore - genericScore > 0.3,
			`the score must separate a continuation from a coincidence by a wide margin, got ${(genuineScore - genericScore).toFixed(3)}`
		);
		ok(
			api.signalOverlap(api.questionProfiles([turn(1, "晚饭吃什么比较好"), turn(2, "明天天气怎么样")])[0], api.questionProfiles([turn(1, "晚饭吃什么比较好"), turn(2, "明天天气怎么样")])[1]) === 0,
			"questions with no shared signal term must score exactly zero"
		);
		eq(api.signalOverlap({ distinctive: new Set(), signalVector: new Map() }, { distinctive: new Set(["a"]), signalVector: new Map([["a", 1]]) }), 0, "a question with no signal vocabulary must score zero");
	}
	ok(node(3).children.length === 0, "an unrelated question must own no continuations");
	ok(node(2).candidates.length > 0, "candidates must be exposed for the manual picker");
	ok(
		node(2).candidates.every((candidate, index, list) => index === 0 || list[index - 1].score >= candidate.score),
		"candidates must be ranked by descending similarity"
	);
	ok(node(2).candidates[0].score > 0 && node(2).candidates[0].score <= 1, "similarity must be a fraction");

	// A manual choice always wins over the guess, including rooting a turn that
	// the matcher would have linked, and it survives an unrelated model rebuild.
	const pinned = api.resolveLinks(branchTurns, new Map([["turn:2", null], ["turn:4", "turn:3"]]));
	ok(pinned.nodes.get("turn:2").parent === null, "a pinned branch root must not be re-linked by the matcher");
	ok(pinned.nodes.get("turn:2").link.kind === "manual", "a pinned root must be labelled manual, not mistaken for an unmatched turn");
	ok(pinned.nodes.get("turn:4").parent === "turn:3", "a pinned parent must win over the matcher's own choice");
	ok(pinned.nodes.get("turn:4").link.kind === "manual", "a pinned link must be labelled manual");
	// Pinning turn 2 as a root splits the chain: turn 1 and turn 2 are now both
	// roots, and turn 3 — which followed turn 2 structurally — still follows it.
	ok(pinned.roots.length >= 2, `pinning turn 2 as a root must add a root, got ${pinned.roots.length}`);

	// Round-tripping the persisted arrangement must not lose the "branch root"
	// distinction — a plain object cannot carry an explicit null-versus-absent.
	const record = api.overridesToRecord(new Map([["turn:2", null], ["turn:4", "turn:3"]]));
	const restored = api.overridesFromRecord(JSON.parse(JSON.stringify(record)));
	ok(restored.size === 2, `round-trip lost entries: ${JSON.stringify(record)}`);
	ok(restored.get("turn:2") === null, "round-trip must preserve an explicit branch root");
	ok(restored.get("turn:4") === "turn:3", "round-trip must preserve a pinned parent");
	eq(api.overridesFromRecord(null).size, 0, "a malformed stored record must degrade to no overrides");
	eq(api.overridesFromRecord("nonsense").size, 0, "a non-object stored record must degrade to no overrides");

	// Absolute similarity sanity: identical questions link, disjoint ones do not.
	const same = api.cosineSimilarity(
		new Map([["插件", 1], ["安装", 0.5]]),
		new Map([["插件", 1], ["安装", 0.5]])
	);
	ok(Math.abs(same - 1) < 1e-9, `identical vectors must score 1, got ${same}`);
	eq(api.cosineSimilarity(new Map([["a", 1]]), new Map([["b", 1]])), 0, "disjoint vectors must score 0");
	eq(api.cosineSimilarity(new Map(), new Map([["a", 1]])), 0, "an empty vector must score 0");

	// The model must expose the forest it will draw. Duck-typed on purpose: the
	// bundle runs in a VM realm, so its Map is a different `Map` than this file's.
	ok(built.branch !== undefined && typeof built.branch.nodes?.get === "function", "buildModel must expose the resolved branch forest");
	ok(Array.isArray(built.branch.roots), "the branch forest must expose its roots");
}

/*
 * The structural rule: a question follows the answer before it.
 *
 * This block exists because the previous release got exactly this wrong. It treated
 * "continue the previous turn" as a guess that had to be EARNED by lexical overlap,
 * and measured against the real sessions on this machine
 * (`tools/measure-sessions.mjs`) real follow-ups scored 0.00-0.33 on every overlap
 * measure — they are pronoun-like and short, and repeat almost none of the reply's
 * nouns. So the gate refused them and sent 8 of 9 real follow-ups to their own
 * branch. The assertions below are written at the level that failure lived on: the
 * SHAPE of the tree for a plain back-and-forth, with no clever vocabulary in it.
 */
{
	const plain = (number, prompt) => ({ id: `turn:${number}`, number, promptText: prompt, text: prompt });
	// Deliberately pronoun-like and topic-free, the way real follow-ups read.
	const conversation = [
		plain(1, "帮我把这个插件的清单文件修一下"),
		plain(2, "好的"),
		plain(3, "那接下来呢"),
		plain(4, "对，就这样")
	];
	const forest = api.resolveLinks(conversation, new Map());

	eq(forest.roots.length, 1, `a back-and-forth must produce exactly one root, got ${forest.roots.length}`);
	eq(forest.roots[0].turn.id, "turn:1", "the first turn must start the map");
	// The chain is the whole point: every later turn is a child of the one before it,
	// so the drawn tree is one column per turn rather than a row of unrelated roots.
	for (let number = 2; number <= 4; number += 1) {
		const node = forest.nodes.get(`turn:${number}`);
		eq(node.parent, `turn:${number - 1}`, `turn ${number} must continue turn ${number - 1}, not start a new branch`);
		eq(node.link.kind, "previous", `turn ${number} must be labelled as a continuation, not as a wording match`);
	}
	const depthOf = (id) => {
		let depth = 0;
		let walker = forest.nodes.get(id);
		while (walker !== undefined && walker.parent !== null) {
			depth += 1;
			walker = forest.nodes.get(walker.parent);
		}
		return depth;
	};
	eq(depthOf("turn:4"), 3, "four turns of back-and-forth must nest four deep, not sit side by side");

	// The first turn is the only one with no parent, and it is not labelled as a
	// continuation of anything.
	eq(forest.nodes.get("turn:1").parent, null, "the first turn must have no parent");
	eq(forest.nodes.get("turn:1").link.kind, "root", "the first turn must be labelled a branch root");

	// A one-turn session must not invent a parent.
	const single = api.resolveLinks([plain(1, "只有一个问题")], new Map());
	eq(single.nodes.get("turn:1").parent, null, "a single turn must be a root");

	/*
	 * The one way the chain breaks: an explicit WORDING match to an older question.
	 * That has to keep working, or returning to an earlier thread becomes impossible.
	 */
	const returning = [
		plain(1, "插件安装到 dsh 的 profile 需要重启吗"),
		plain(2, "思维导图的卡片配色能不能换成深色主题"),
		plain(3, "插件安装完了还是要重启 profile 吗")
	];
	const returningForest = api.resolveLinks(returning, new Map());
	eq(returningForest.nodes.get("turn:3").parent, "turn:1", "a turn that names an older question's words must rejoin that thread, not the previous turn");
	eq(returningForest.nodes.get("turn:3").link.kind, "auto", "a wording match must be labelled as one");

	// Manual overrides still beat both rules, including the structural default.
	const pinned = api.resolveLinks(conversation, new Map([["turn:4", null], ["turn:3", "turn:1"]]));
	eq(pinned.nodes.get("turn:4").parent, null, "pinning a turn as a branch root must beat the structural chain");
	eq(pinned.nodes.get("turn:4").link.kind, "manual", "a pinned root must stay labelled manual");
	eq(pinned.nodes.get("turn:3").parent, "turn:1", "pinning an explicit parent must beat the structural chain");

	// A turn with no module list and no reply must resolve without throwing: the
	// projection may always lose a field, and the gates' own fixtures carry no
	// modules at all.
	const sparse = api.resolveLinks([{ id: "turn:1", number: 1, promptText: "第一轮问题", text: "第一轮问题" }], new Map());
	eq(sparse.nodes.get("turn:1").parent, null, "a turn with no modules and no reply must resolve without throwing");
	eq(api.resolveLinks([], new Map()).roots.length, 0, "an empty session must resolve to an empty forest");
}
// ── horizontal layout geometry ────────────────────────────────────────────
//
// "The mind map has no lines drawn" is what prompted the horizontal rewrite, so
// the geometry is asserted instead of eyeballed: every non-root node must produce
// exactly one connector, columns must advance with depth, and a parent must sit
// vertically between its children so the fan-out reads as a fan.

{
	const turn = (number, prompt) => ({ id: `turn:${number}`, number, promptText: prompt, text: prompt });
	const forest = api.resolveLinks([
		turn(1, "插件安装到 dsh 的 web profile 需要重启吗"),
		turn(2, "dsh 插件安装失败怎么排查 profile 配置"),
		turn(3, "dsh 插件安装完了还是要重启 profile 吗"),
		turn(4, "晚饭吃什么比较好")
	], new Map());

	// The forest itself is unchanged: the matcher still decides the same branches.
	// What changed is the DRAWING, which hangs every root under one synthetic title
	// node — so the layout has one node more than the forest, and one row per turn
	// plus the title.
	const layout = api.layoutTree(forest, 6);
	eq(layout.nodes.length, forest.nodes.size + 1, "the drawn tree is every turn plus the title node");
	// The title is the only drawn node whose parent is not itself drawn — that is
	// what "entry point" means structurally, and it needs no exported id to find.
	const drawn = new Set(layout.nodes.map((entry) => entry.node.turn.id));
	const entries = layout.nodes.filter((entry) => !drawn.has(entry.parentId));
	eq(entries.length, 1, "the tree must have exactly one entry point");
	const anchor = entries[0];
	ok(anchor.depth === 0, "the entry point must sit in the leftmost column");
	eq(layout.columns, Math.max(...layout.nodes.map((entry) => entry.depth)) + 1, "the title must not add a phantom column");
	const anchorTurn1 = layout.nodes.find((entry) => entry.parentId === anchor.node.turn.id);
	ok(anchorTurn1 !== undefined, "the first turn's branch must be entered from the title");
	eq(anchor.node.children.length, forest.roots.length, "every branch root must hang off the title");
	ok(anchor.node.turn.promptText === forest.roots[0].turn.promptText, "the title must carry the first question");
	ok(anchor.node.turn.modules.length === 0, "the title node must own no modules — it is not a turn");
	ok(layout.columns >= 2, `a linked tree must span more than one column, got ${layout.columns}`);
	const depthOf = (id) => layout.nodes.find((entry) => entry.node.turn.id === id)?.depth;
	ok(anchor.depth === 0, "the title must sit in column 0, the leftmost column");
	ok(depthOf(forest.roots[0].turn.id) === 1, "the first branch must sit directly right of the title");
	const xs = layout.nodes.map((entry) => entry.x);
	ok(new Set(xs).size >= 3, `every column must have its own x position, got ${JSON.stringify(xs)}`);

	const placed = api.placeTree(layout, new Map());
	ok(placed.boxes.length === layout.nodes.length, "every laid-out node must be placed");
	// One connector per turn: the title itself has no parent, so it contributes
	// none, and every other node has exactly one — including the branch roots,
	// which now hang off the title instead of floating as unrelated entry points.
	eq(placed.edges.length, forest.nodes.size, "one connector per turn, none for the title");
	ok(placed.edges.length > 0, "a linked tree must produce connector geometry");
	ok(placed.width > 0 && placed.height > 0, "the canvas must have extents");
	const fromTitle = placed.edges.filter((edge) => edge.key.startsWith(`${anchor.node.turn.id}->`));
	eq(fromTitle.length, forest.roots.length, "every branch root must be connected to the title, not merely listed after it");
	const anchorBox = placed.boxes.find((box) => box.node.turn.id === anchor.node.turn.id);
	ok(anchorBox !== undefined, "the title must be placed like any other node");
	// Two adjacent columns differ by exactly one card width plus one gap, so the card
	// width is recoverable from the geometry itself instead of being duplicated here
	// as a literal that could silently disagree with the layout.
	const columnGap = 56;
	const pair = placed.boxes
		.map((box) => ({ box, next: placed.boxes.find((other) => other.depth === box.depth + 1) }))
		.find((candidate) => candidate.next !== undefined);
	const cardWidth = pair.next.x - pair.box.x - columnGap;
	ok(cardWidth > 0, `the column pitch must be wider than the gap, got card width ${cardWidth}`);
	// The title column is the one place with extra room before the first branch, so
	// the title's own right edge is what the outgoing connectors must start from.
	const titleRight = anchorBox.x + cardWidth;
	ok(
		fromTitle.every((edge) => edge.from.x === titleRight && edge.from.y === anchorBox.centerY),
		`every connector out of the title must leave from the title's own right edge (${titleRight}), got ${JSON.stringify(fromTitle.map((edge) => edge.from))}`
	);
	ok(
		!placed.edges.some((edge) => edge.key.endsWith(`->${anchor.node.turn.id}`)),
		"nothing may connect INTO the title — it is the entry point"
	);

	const byId = new Map(placed.boxes.map((box) => [box.node.turn.id, box]));
	for (const edge of placed.edges) {
		ok(edge.to.x > edge.from.x, `a connector must run rightwards, got ${JSON.stringify(edge)}`);
		const [parentId, childId] = edge.key.split("->");
		const child = byId.get(childId);
		const parent = byId.get(parentId);
		ok(child !== undefined && parent !== undefined, `connector ${edge.key} must reference laid-out nodes`);
		if (child === undefined || parent === undefined) continue;
		ok(child.parentId === parentId, `connector ${edge.key} must match the resolved parent`);
		// The parent's center must fall inside its children's vertical band, which is
		// what stops the connectors from crossing back over each other.
		const kids = placed.boxes.filter((candidate) => candidate.parentId === parentId);
		const top = Math.min(...kids.map((kid) => kid.centerY));
		const bottom = Math.max(...kids.map((kid) => kid.centerY));
		ok(
			parent.centerY >= top && parent.centerY <= bottom,
			`parent ${parentId} must sit between its children (top ${top}, parent ${parent.centerY}, bottom ${bottom})`
		);
	}

	// Within ONE column the rows must not collide. Comparing across columns would be
	// wrong: two cards in different columns may legitimately share a vertical band,
	// and a parent is centered on its children, so it always overlaps their band.
	const columns = new Map();
	for (const box of placed.boxes) {
		const list = columns.get(box.x) ?? [];
		list.push(box);
		columns.set(box.x, list);
	}
	for (const [x, list] of columns) {
		const ordered = [...list].sort((left, right) => left.y - right.y);
		for (let i = 1; i < ordered.length; i += 1) {
			ok(
				ordered[i].y >= ordered[i - 1].y + ordered[i - 1].height,
				`cards ${ordered[i - 1].node.turn.id} and ${ordered[i].node.turn.id} overlap in column x=${x}`
			);
		}
	}

	// The depth limit must FOLD rather than drop: the cut node reports how many it
	// hid, and those nodes are absent from the drawn set. It counts BRANCH levels,
	// so the title never consumes one of them: at limit 1 the title and the first
	// level are drawn, and the second level becomes a fold marker.
	const shallow = api.layoutTree(forest, 1);
	ok(shallow.nodes.length < layout.nodes.length, "a smaller depth limit must draw fewer nodes");
	eq(shallow.nodes.length, 1 + forest.roots.length, "at limit 1 the title and the first level are drawn");
	// At that limit the drawn set is only the title and the roots, so the markers
	// are the only connectors left to read — assert the geometry on the full layout.
	ok(layout.hiddenBelow.size === 0, "a limit deeper than the tree must fold nothing");
	ok(shallow.hiddenBelow.size > 0, "a folded subtree must be reported so the UI can offer to expand it");
	ok(!shallow.hiddenBelow.has(anchor.node.turn.id), "the title itself must never fold — it is not a nested branch");
	ok([...shallow.hiddenBelow.values()].every((count) => count > 0), "a folded marker must hide at least one node");
	ok(typeof api.edgePath(placed.edges[0].from, placed.edges[0].to) === "string", "edgePath must produce an SVG path string");
	eq(api.placeTree(api.layoutTree(api.resolveLinks([], new Map()), 6), new Map()).edges, [], "an empty forest must produce no connectors");
}

// The connector is an orthogonal elbow, so it must run right, then down or up,
// then right again — never backwards, and never off the straight line when the
// two nodes are level.
{
	const level = api.edgePath({ x: 10, y: 50 }, { x: 100, y: 50 });
	ok(!level.includes("Q"), "level nodes must connect with a single straight segment");
	ok(level.startsWith("M 10.0 50.0") && level.endsWith("L 100.0 50.0"), `unexpected straight path: ${level}`);
	const elbow = api.edgePath({ x: 10, y: 50 }, { x: 100, y: 150 });
	const xs = [...elbow.matchAll(/[MLQ] (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((match) => Number(match[1]));
	ok(xs.every((x) => x >= 10 && x <= 100), `an elbow must stay inside the span between the two nodes, got ${JSON.stringify(xs)}`);
	ok(xs.every((x, i) => i === 0 || x >= xs[i - 1]), `an elbow must never turn back leftwards, got ${JSON.stringify(xs)}`);
	const up = api.edgePath({ x: 10, y: 150 }, { x: 100, y: 50 });
	ok(up.includes("Q"), "an elbow that has to change rows must round its corners");
	ok(api.edgePath({ x: 10, y: 50 }, { x: 14, y: 54 }).length > 0, "a degenerate gap must still produce a path");
}

// ── report ────────────────────────────────────────────────────────────────

if (problems.length === 0) {
	console.log("behaviour: PASS (0 problems)");
	process.exit(0);
}
console.log(`behaviour: FAIL (${problems.length} problem(s))`);
for (const problem of problems) console.log(`  - ${problem}`);
process.exit(1);
