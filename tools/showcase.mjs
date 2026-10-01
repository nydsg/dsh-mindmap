/**
 * dsh-mindmap test-case showcase.
 *
 * Runs the real engine (the same regions the gates assert against) over shaped
 * conversations and prints what it decided: which earlier question each turn
 * linked to, the similarity that decided it, and the computed tree geometry.
 *
 * A second section draws an ASCII diagram of each tree from the SAME numbers the
 * view uses to position cards, so the structure can be seen without a browser.
 *
 * Run: node tools/showcase.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(REPO, "lib", "client.js"), "utf8");
const regionOf = (name) => {
	const start = source.indexOf(`//#region ${name}`);
	const end = source.indexOf("//#endregion", start);
	if (start < 0 || end < 0) throw new Error(`region ${name} not found`);
	return source.slice(source.indexOf("\n", start) + 1, end);
};

const sandbox = { Intl, Math, JSON, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const api = vm.runInContext(
	`(function () {
		${regionOf("lib/client/lexical.js")}
		${regionOf("lib/client/branching.js")}
		${regionOf("lib/client/layout.js")}
		return { resolveLinks, layoutTree, placeTree, edgePath, overridesToRecord, segmentText };
	})()`,
	sandbox,
	{ filename: "showcase-regions.js" }
);

const turn = (number, prompt, answer = "") => ({
	id: `turn:${number}`,
	number,
	promptText: prompt,
	answerText: answer,
	text: [prompt, answer].filter((part) => part.length > 0).join("\n"),
	modules: []
});

const CASES = [
	{
		title: "A. Two topics that interleave",
		why: "A later turn returns to the FIRST topic. It must rejoin that branch, not continue the turn immediately before it.",
		turns: [
			turn(1, "插件安装到 dsh 的 web profile 需要重启吗"),
			turn(2, "dsh 插件安装失败怎么排查 profile 配置"),
			turn(3, "思维导图的卡片配色能不能换成深色主题"),
			turn(4, "深色主题下卡片的对比度需要满足 4.5:1 吗"),
			turn(5, "dsh 插件安装完了还是要重启 profile 吗")
		]
	},
	{
		title: "B. Four levels deep",
		why: "A single thread that keeps narrowing. Each turn must attach to the previous one, producing one column per level.",
		turns: [
			turn(1, "我要给 dsh 做一个插件"),
			turn(2, "这个 dsh 插件要加一个思维导图视图"),
			turn(3, "思维导图视图里分支连线怎么画"),
			turn(4, "分支连线的曲线控制点怎么算")
		]
	},
	{
		title: "C. Wide fan-out from one question",
		why: "One question answered by five follow-ups. All five must land in the same column and share one parent.",
		turns: [
			turn(1, "dsh 插件的客户端 bundle 要怎么写"),
			turn(2, "dsh 插件的客户端 bundle 怎么注册插槽"),
			turn(3, "dsh 插件的客户端 bundle 怎么读会话投影"),
			turn(4, "dsh 插件的客户端 bundle 怎么写回输入框"),
			turn(5, "dsh 插件的客户端 bundle 怎么持久化状态"),
			turn(6, "dsh 插件的客户端 bundle 怎么做主题适配")
		]
	},
	{
		title: "D. Manual override wins",
		why: "The matcher would link #3 to #2; pinning it to #1 and forcing #2 to a new branch must survive.",
		turns: [
			turn(1, "插件安装到 dsh 的 web profile 需要重启吗"),
			turn(2, "dsh 插件安装失败怎么排查 profile 配置"),
			turn(3, "dsh 插件安装完了还是要重启 profile 吗")
		],
		overrides: new Map([["turn:3", "turn:1"], ["turn:2", null]])
	},
	{
		title: "E. Nothing matches",
		why: "Five unrelated questions. Every one must become its own branch root.",
		turns: [
			turn(1, "晚饭吃什么比较好"),
			turn(2, "明天天气怎么样"),
			turn(3, "推荐一部科幻电影"),
			turn(4, "怎么练习长跑"),
			turn(5, "咖啡因每天摄入上限是多少")
		]
	},
	{
		// The case the context signal exists for. #3's question shares no signal
		// vocabulary with #2's QUESTION — "--mm-line-strong" was introduced by #2's
		// REPLY — so the wording matcher alone calls it a new branch.
		title: "F. The follow-up names what the reply introduced",
		why: "No shared wording with any question, but #3 asks about a term only #2's reply introduced. It must link to #2 as a CONTEXT link.",
		turns: [
			turn(1, "我在调 DSH 插件的深色主题", "深色主题要改令牌层，别改组件里的颜色。"),
			turn(2, "那卡片描边的对比度要调到多少", "正文按 4.5:1，12px 的小字也要 4.5:1。描边可以用 --mm-line-strong，视觉上更清楚。"),
			turn(3, "--mm-line-strong 在小字上够 4.5:1 吗", "描边不是文字，不适用那个门槛。")
		]
	},
	{
		// The refusal the context gate has to make. A reply that merely NAMES the
		// term in passing must not pull the next question under it.
		title: "G. A passing mention is not a thread",
		why: "The reply mentions the next question's subject in passing while the thread is something else. #2 must stay a branch root.",
		turns: [
			turn(1, "帮我看看这个报错栈", "这是权限问题。顺带一提，重新打包不会影响 profile 的锁定文件。"),
			turn(2, "profile 的锁定文件要不要一起提交", "要。")
		]
	}
];

/**
 * Draw the tree as ASCII, using the same column/row numbers the view uses.
 * @param forest - resolved branch forest.
 * @param placed - placed geometry.
 * @returns diagram lines.
 */
function diagram(forest, placed) {
	const lines = [];
	const walk = (node, prefix, isLast) => {
		const box = placed.byId.get(node.turn.id);
		const tag = node.link.kind === "root" ? "root" : `${node.link.kind} ${node.link.score.toFixed(2)}`;
		const label = `#${node.turn.number} [${tag}] col${box.depth}`;
		lines.push(`${prefix}${prefix === "" ? "" : isLast ? "└─ " : "├─ "}${label}`);
		const textPrefix = `${prefix}${prefix === "" ? "   " : isLast ? "   " : "│  "}`;
		lines.push(`${textPrefix}${node.turn.promptText.slice(0, 40)}`);
		node.children.forEach((child, index) => {
			walk(child, textPrefix, index === node.children.length - 1);
		});
	};
	forest.roots.forEach((root, index) => walk(root, "", index === forest.roots.length - 1));
	return lines;
}

for (const testCase of CASES) {
	const forest = api.resolveLinks(testCase.turns, testCase.overrides ?? new Map());
	const layout = api.layoutTree(forest, 6);
	const placed = api.placeTree(layout, new Map());

	console.log("\n" + "─".repeat(74));
	console.log(testCase.title);
	console.log("─".repeat(74));
	console.log(`why: ${testCase.why}`);
	console.log(`result: ${testCase.turns.length} turns → ${forest.roots.length} branch root(s), ${layout.columns} column(s), ${placed.edges.length} connector(s), canvas ${Math.round(placed.width)}×${Math.round(placed.height)}px`);
	if (testCase.overrides !== undefined) {
		console.log(`manual: ${JSON.stringify(api.overridesToRecord(testCase.overrides))}`);
	}
	console.log("");
	for (const line of diagram(forest, placed)) console.log(`   ${line}`);
	console.log("");
	console.log("   connectors (parent right edge → child left edge):");
	for (const edge of placed.edges) {
		const [from, to] = edge.key.split("->").map((id) => id.replace("turn:", ""));
		console.log(`     #${from} → #${to}   (${Math.round(edge.from.x)},${Math.round(edge.from.y)}) → (${Math.round(edge.to.x)},${Math.round(edge.to.y)})   [${edge.kind}]`);
	}
	const columns = new Map();
	for (const box of placed.boxes) columns.set(box.depth, (columns.get(box.depth) ?? 0) + 1);
	console.log("");
	console.log(`   column occupancy: ${[...columns.entries()].sort((a, b) => a[0] - b[0]).map(([depth, count]) => `col${depth}=${count}`).join("  ")}`);
}

console.log("\n" + "─".repeat(74));
console.log("F. Segmentation / keyword engine (the inputs to matching)");
console.log("─".repeat(74));
const probe = "插件安装到 dsh 的 web profile 需要重启吗";
console.log(`   text : ${probe}`);
console.log(`   terms: ${JSON.stringify(api.segmentText(probe))}`);
console.log(`   note : 2-char minimum, stopwords dropped, no invented compounds`);
