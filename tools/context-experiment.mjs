/**
 * Offline measurement of the CONTEXT link signal, before any of it is wired into
 * the live matcher.
 *
 * WHY MEASURE FIRST
 * -----------------
 * The current matcher compares a new question against earlier QUESTIONS only. The
 * proposal is to also use what the earlier turn was ABOUT — its reply and its
 * tool calls — so a follow-up that reuses the reply's vocabulary links even when
 * it shares almost nothing with the earlier question. That is exactly the case
 * the plugin documents as a limitation ("a paraphrase does not connect").
 *
 * The danger is equally plain: a reply is long, and it is written in the
 * session's background vocabulary. Feed it into a similarity score naively and
 * everything connects to everything. So this script measures both directions on
 * labelled cases and prints the score table. Nothing here ships; it exists to
 * answer one question with numbers: **is there a threshold that separates a
 * context continuation from a question that merely shares background words?**
 *
 * Run: node tools/context-experiment.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = readFileSync(join(REPO, "lib", "client.js"), "utf8");

/**
 * Extract one `//#region name` block.
 * @param name - region name.
 * @returns the region body.
 */
function regionOf(name) {
	const start = SOURCE.indexOf(`//#region ${name}`);
	const end = SOURCE.indexOf("//#endregion", start);
	return SOURCE.slice(sourceIndexOfNewline(start), end);
}
/** Index just after the first newline at or after `start`. */
function sourceIndexOfNewline(start) {
	return SOURCE.indexOf("\n", start) + 1;
}

const sandbox = { Intl, Math, JSON, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const api = vm.runInContext(
	`(function () {
		${regionOf("lib/client/lexical.js")}
		${regionOf("lib/client/branching.js")}
		return { termsOf, questionProfiles, signalOverlap, linkCandidates, resolveLinks, LINK_MIN_SCORE, LINK_MAX_AGE };
	})()`,
	sandbox
);

// ── the proposed signal, implemented here so nothing ships before it is judged ──

/**
 * Everything an earlier turn was about: its question, its reply, and its tools.
 *
 * The question is included deliberately — the context signal must be able to say
 * "this continues that turn because it shares the turn's own question too", so
 * that it degrades to the current behaviour on turns with no reply.
 *
 * @param turn - turn model.
 * @returns the context text.
 */
function contextText(turn) {
	const toolNames = turn.modules
		.filter((entry) => entry.kind === "tool")
		.map((entry) => entry.title)
		.filter((title) => typeof title === "string" && title.length > 0);
	return [turn.promptText, turn.answerText ?? "", toolNames.join(" ")].filter((part) => part.length > 0).join("\n");
}

/**
 * Per-turn CONTEXT documents, in the session's own IDF space.
 *
 * The documents are built from the same term lists the question profiles use, so
 * a term carries the same weight on both sides and the two scores are
 * comparable. Document frequency still comes from the QUESTIONS, so "background"
 * keeps meaning "shared by the session's questions" rather than "mentioned in
 * some long reply".
 *
 * @param turns - turn models in order.
 * @returns one weighted term map per turn.
 */
function contextVectors(turns) {
	const questionDocuments = turns.map((turn) => new Set(api.termsOf(turn.promptText.length > 0 ? turn.promptText : turn.text)));
	const documentFrequency = new Map();
	for (const document of questionDocuments) {
		for (const term of document) documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
	}
	const total = Math.max(1, turns.length);
	return turns.map((turn) => {
		const counts = new Map();
		for (const term of api.termsOf(contextText(turn))) counts.set(term, (counts.get(term) ?? 0) + 1);
		const vector = new Map();
		for (const [term, count] of counts) {
			const df = documentFrequency.get(term) ?? 1;
			const idf = Math.max(0.08, Math.log(1 + total / (1 + df)));
			vector.set(term, (1 + Math.log(count)) * idf);
		}
		return vector;
	});
}

/**
 * How much of the new question's QUESTION-SIGNAL vocabulary the earlier turn's
 * CONTEXT accounts for.
 *
 * This is the proposed new signal, and its shape is the whole argument:
 *
 *  - the numerator counts only terms that are signal in the NEW QUESTION — a
 *    question's own distinctive vocabulary, weighted by the session IDF. So a
 *    term the session uses everywhere contributes almost nothing;
 *  - the denominator is that question's total signal weight, so the score answers
 *    "what share of what I am asking about was already on the table in that
 *    turn", not "how long was that reply";
 *  - a term that appears in the reply but not in the question is INVISIBLE here.
 *    That is what stops a long reply from connecting to everything: a reply can
 *    only raise a score by covering terms the question actually asked with.
 *
 * @param questionProfile - the new question's profile.
 * @param contextVector - the earlier turn's weighted context vector.
 * @returns ratio in [0, 1]; 0 when the question has no signal vocabulary.
 */
function contextResonance(questionProfile, contextVector) {
	let total = 0;
	let shared = 0;
	for (const term of questionProfile.distinctive) {
		const weight = questionProfile.signalVector.get(term) ?? 0;
		total += weight;
		if (contextVector.has(term)) shared += weight;
	}
	if (total === 0) return 0;
	return shared / total;
}

// ── labelled cases ─────────────────────────────────────────────────────────
//
// Every case is a whole conversation plus, for each turn after the first, the
// turn it genuinely continues (or null for a new branch). `note` says what the
// case exists to prove.

const CASES = [
	{
		name: "context continuation — the follow-up's words come from the reply",
		note: "turn 2 asks a new thing; turn 3's vocabulary comes from turn 2's REPLY, not its question",
		expected: ["root", "root", "turn:2"],
		turns: [
			{ prompt: "我在调 DSH 插件的深色主题", answer: "深色主题要改令牌层，别改组件里的颜色。" },
			{ prompt: "那卡片描边的对比度要调到多少", answer: "正文按 4.5:1，12px 的小字也要 4.5:1。描边可以用 --mm-line-strong，视觉上更清楚。" },
			{ prompt: "--mm-line-strong 在小字上够 4.5:1 吗", answer: "描边不是文字，不适用那个门槛。" }
		]
	},
	{
		name: "question continuation — the current rule already handles it",
		note: "control case: the new rule must not break what already works",
		expected: ["root", "turn:1", "turn:2"],
		turns: [
			{ prompt: "我要给 DSH 写一个插件", answer: "先搭目录结构。" },
			{ prompt: "这个 DSH 插件怎么做思维导图视图", answer: "注册 conversation.view 页签。" },
			{ prompt: "思维导图视图的分支连线怎么画", answer: "用算术算坐标。" }
		]
	},
	{
		name: "unrelated question after a long reply — must NOT link",
		note: "the reply is long and full of session background; a new unrelated question must stay a root",
		expected: ["root", "root"],
		turns: [
			{ prompt: "插件安装到 dsh 的 profile 需要重启吗", answer: "需要重启 Harness，客户端模块图在启动时生成一次。profile 的 package.json 要加进 bundles。" },
			{ prompt: "晚饭吃什么比较好", answer: "随便。" }
		]
	},
	{
		name: "background-only overlap — must NOT link",
		note: "both questions are about 'DSH 插件' but ask different things; the session background must not decide it",
		expected: ["root", "root", "root"],
		turns: [
			{ prompt: "dsh 插件的清单文件怎么写", answer: "用 cordis.patch.yml。" },
			{ prompt: "dsh 插件的日志在哪里看", answer: "在 profile 的 .plugin-manager/logs。" },
			{ prompt: "dsh 插件怎么卸载干净", answer: "用 plugin remove。" }
		]
	},
	{
		name: "passing mention in the reply — must NOT link",
		note: "the reply NAMES the term the next question asks about, in passing, while the thread is something else",
		expected: ["root", "root"],
		turns: [
			{ prompt: "帮我看看这个报错栈", answer: "这是权限问题。顺带一提，重新打包不会影响 profile 的锁定文件。" },
			{ prompt: "profile 的锁定文件要不要一起提交", answer: "要。" }
		]
	},
	{
		name: "paraphrase of the reply — must NOT link on words alone",
		note: "honest limit: no shared vocabulary at all, so neither signal may claim a link",
		expected: ["root", "root"],
		turns: [
			{ prompt: "怎么装插件", answer: "用 plugin add。" },
			{ prompt: "插件如何安装", answer: "同上。" }
		]
	},
	{
		name: "interleaved topics — the older thread must be picked up again",
		note: "turns alternate between install and styling; turn 5 returns to the install thread",
		expected: ["root", "turn:1", "root", "turn:3", "turn:1"],
		turns: [
			{ prompt: "插件安装到 dsh 的 web profile 需要重启吗", answer: "要重启。" },
			{ prompt: "dsh 插件安装失败怎么排查 profile 配置", answer: "看 .plugin-manager 的 pnpm.log。" },
			{ prompt: "思维导图的卡片配色能不能换成深色主题", answer: "改令牌。" },
			{ prompt: "深色主题下卡片的对比度需要满足 4.5:1 吗", answer: "正文要，描边不用。" },
			{ prompt: "dsh 插件安装完了还是要重启 profile 吗", answer: "要。" }
		]
	}
];

// ── run both matchers ──────────────────────────────────────────────────────

/** Build a turn model the matcher understands. */
function model(turn, index) {
	return {
		id: `turn:${index + 1}`,
		number: index + 1,
		promptText: turn.prompt,
		answerText: turn.answer ?? "",
		text: `${turn.prompt}\n${turn.answer ?? ""}`,
		modules: (turn.tools ?? []).map((title, i) => ({ kind: "tool", title, seq: i }))
	};
}

/**
 * The proposed decision, as one function of two scores.
 *
 * Division of labour, not a blend: the question signal decides whenever it CAN,
 * because it is the one that has been measured to separate cleanly (a paraphrase
 * shares no questions-vocabulary, so it can never be a false positive at the
 * question level). Context only speaks when the question signal is silent — that
 * is the case it was built for, and the case the plugin currently gets wrong.
 *
 * A weighted blend was rejected: the two scores answer different questions ("did
 * this question continue that question" vs "was this question already on the
 * table in that turn"), so adding them would let a long reply outvote an explicit
 * question match.
 *
 * @param questionScore - best question-signal score.
 * @param questionIndex - its turn index.
 * @param contextScore - best context-resonance score.
 * @param contextIndex - its turn index.
 * @param gate - the context gate under test.
 * @returns the chosen link.
 */
function decide(questionScore, questionIndex, contextScore, contextIndex, gate) {
	if (questionScore >= api.LINK_MIN_SCORE) {
		return { index: questionIndex, kind: "auto", score: questionScore };
	}
	if (contextScore >= gate) {
		return { index: contextIndex, kind: "context", score: contextScore };
	}
	return { index: -1, kind: "root", score: 0 };
}

const rows = [];
const GATE = 0.65;

for (const testCase of CASES) {
	const turns = testCase.turns.map(model);
	const profiles = api.questionProfiles(turns);
	const contexts = contextVectors(turns);
	console.log(`\n── ${testCase.name}`);
	console.log(`   ${testCase.note}`);
	for (let index = 1; index < turns.length; index += 1) {
		const best = api.linkCandidates(index, profiles)[0];
		const currentScore = best === undefined ? 0 : best.score;
		const currentIndex = best === undefined ? -1 : best.index;

		const from = Math.max(0, index - api.LINK_MAX_AGE);
		let contextBest = { index: -1, score: 0 };
		for (let earlier = index - 1; earlier >= from; earlier -= 1) {
			const score = contextResonance(profiles[index], contexts[earlier]);
			if (score > contextBest.score) contextBest = { index: earlier, score };
		}

		const picked = decide(currentScore, currentIndex, contextBest.score, contextBest.index, GATE);
		const link = picked.index < 0 ? "root" : `turn:${picked.index + 1}`;
		const currentLink = currentScore >= api.LINK_MIN_SCORE ? `turn:${currentIndex + 1}` : "root";
		const expected = testCase.expected[index];
		rows.push({
			expected,
			currentLink,
			link,
			okCurrent: currentLink === expected,
			okNew: link === expected,
			questionScore: currentScore,
			contextScore: contextBest.score,
			kind: picked.kind
		});
		console.log(
			`   #${index + 1}  期望 ${String(expected).padEnd(7)}`
			+ `  现状 ${String(currentLink).padEnd(7)} ${currentLink === expected ? "ok " : "MISS"}`
			+ `  新 ${String(link).padEnd(7)} ${link === expected ? "ok " : "MISS"}`
			+ `  (提问 ${currentScore.toFixed(2)} / 语境 ${contextBest.score.toFixed(2)} → ${picked.kind})`
		);
	}
}

const total = rows.length;
const currentCorrect = rows.filter((row) => row.okCurrent).length;
const newCorrect = rows.filter((row) => row.okNew).length;

// ── the score table the threshold has to come from ─────────────────────────

console.log(`\n${"═".repeat(78)}`);
console.log("SCORE TABLE");
console.log("═".repeat(78));
const trueLinks = rows.filter((row) => row.expected !== "root");
const newRoots = rows.filter((row) => row.expected === "root");
const spread = (label, list, key) => {
	if (list.length === 0) {
		console.log(`  ${label.padEnd(30)} (none)`);
		return;
	}
	const values = list.map((row) => row[key]).sort((a, b) => a - b);
	console.log(`  ${label.padEnd(30)} n=${String(values.length).padStart(2)}  min ${values[0].toFixed(2)}  max ${values[values.length - 1].toFixed(2)}`);
};
spread("真实连接 · 提问信号", trueLinks, "questionScore");
spread("真实连接 · 语境共鸣", trueLinks, "contextScore");
spread("应当新分支 · 提问信号", newRoots, "questionScore");
spread("应当新分支 · 语境共鸣", newRoots, "contextScore");

// The gate must be derived: sweep it and count. A gate that is only "reasonable"
// is the mistake this project already made once with a similarity floor.
console.log("\n  语境闸门扫描（只在提问信号沉默时生效）：");
console.log("     gate   新分支误连   真连接漏连   总正确");
for (const gate of [0.0, 0.4, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.9]) {
	let falseLinks = 0;
	let missed = 0;
	let correct = 0;
	for (const row of rows) {
		const pickContext = row.questionScore < api.LINK_MIN_SCORE && row.contextScore >= gate;
		const link = row.questionScore >= api.LINK_MIN_SCORE
			? row.currentLink
			: pickContext ? row.link : "root";
		const ok = link === row.expected;
		if (ok) correct += 1;
		else if (row.expected === "root") falseLinks += 1;
		else missed += 1;
	}
	const marker = gate === GATE ? "   <- 选用" : "";
	console.log(`     ${gate.toFixed(2)}   ${String(falseLinks).padStart(6)}     ${String(missed).padStart(6)}     ${String(correct).padStart(3)}/${total}${marker}`);
}

console.log(`\n  现状命中 ${currentCorrect}/${total}   新规则命中 ${newCorrect}/${total}`);
console.log(`  语境共鸣：真连接最低 ${Math.min(...trueLinks.map((row) => row.contextScore)).toFixed(2)}，新分支最高 ${Math.max(0, ...newRoots.map((row) => row.contextScore)).toFixed(2)}`);
console.log("\n  新增的 context 连接：");
for (const row of rows.filter((entry) => entry.kind === "context")) {
	console.log(`    ${row.link}  ← 语境共鸣 ${row.contextScore.toFixed(2)}（提问信号只有 ${row.questionScore.toFixed(2)}）  期望 ${row.expected}  ${row.okNew ? "ok" : "MISS"}`);
}
const wrongContext = rows.filter((row) => row.kind === "context" && !row.okNew);
console.log(wrongContext.length === 0
	? "  → 没有一条语境连接是错的"
	: `  → 有 ${wrongContext.length} 条语境连接是错的，闸门还不够高`);
