/**
 * dsh-mindmap test runner AND test-case showcase.
 *
 * Two jobs, one command:
 *
 *  1. Run the three gates (check / behaviour / registration) and report.
 *  2. Demonstrate what the gates actually protect, by printing the real engine
 *     output for shaped conversations: which question each turn linked to and with
 *     what similarity, and the computed tree geometry (columns, rows, connectors).
 *
 * It then runs three MUTATION cases: it breaks one behaviour at a time in a
 * throwaway copy of the bundle and asserts that a gate turns red. A green suite
 * proves nothing about a gate unless the gate can fail; these cases are the
 * evidence that it can, and each one names the bug it reintroduces.
 *
 * Run: node tools/test.mjs
 */

import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { rewriteScalar } from "./yaml.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const NODE = process.execPath;
const GATES = ["check.mjs", "behaviour.mjs", "registration.mjs"];

const pass = [];
const fail = [];

/** Run one gate script against a given repo copy. */
function runGate(name, repo = REPO) {
	const result = spawnSync(NODE, [join(repo, "tools", name)], { encoding: "utf8" });
	const text = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
	return {
		ok: result.status === 0,
		text,
		problems: text.split("\n").filter((line) => line.trim().startsWith("- ")).map((line) => line.trim().slice(2))
	};
}

// ── 1. the gates ──────────────────────────────────────────────────────────

console.log("═".repeat(74));
console.log("1. GATES");
console.log("═".repeat(74));
for (const gate of GATES) {
	const result = runGate(gate);
	console.log(`\n  ${result.ok ? "PASS" : "FAIL"}  ${gate}`);
	for (const line of result.text.split("\n").filter((line) => line.startsWith("note:") || line.startsWith("-") || line.includes("PASS") || line.includes("FAIL"))) {
		console.log(`        ${line}`);
	}
	if (result.ok) pass.push(`gate ${gate}`);
	else fail.push(`gate ${gate}: ${result.problems.join("; ")}`);
}

// ── 2. what the engine produces ───────────────────────────────────────────
//
// Load the pure regions once so the runner can drive them directly. This is the
// same extraction the behaviour gate uses, so the numbers printed here are the
// numbers the assertions ran against — not a re-implementation.

const source = readFileSync(join(REPO, "lib", "client.js"), "utf8");
const regionOf = (name) => {
	const start = source.indexOf(`//#region ${name}`);
	const end = source.indexOf("//#endregion", start);
	return source.slice(source.indexOf("\n", start) + 1, end);
};

const { createContext, runInContext } = await import("node:vm");
const sandbox = { Intl, Math, JSON, console };
sandbox.globalThis = sandbox;
createContext(sandbox);
const api = runInContext(
	`(function () {
		${regionOf("lib/client/lexical.js")}
		${regionOf("lib/client/branching.js")}
		${regionOf("lib/client/layout.js")}
		return { resolveLinks, cosineSimilarity, overridesToRecord, layoutTree, placeTree, edgePath, segmentText };
	})()`,
	sandbox,
	{ filename: "pure-regions.js" }
);

const turn = (number, prompt) => ({ id: `turn:${number}`, number, promptText: prompt, text: prompt });

/**
 * Render a forest as an indented tree with the computed column/row geometry.
 * @param forest - resolved branch forest.
 * @param placed - placed geometry, or null to print structure only.
 * @returns report lines.
 */
function printTree(forest, placed) {
	const lines = [];
	const boxOf = (id) => (placed === null ? undefined : placed.byId.get(id));
	const walk = (node, depth) => {
		const box = boxOf(node.turn.id);
		const link = node.link.kind === "root"
			? "root"
			: `${node.link.kind} ${node.link.score.toFixed(2)}`;
		const geometry = box === undefined
			? ""
			: `   col ${box.depth}  y ${String(Math.round(box.y)).padStart(4)}  h ${Math.round(box.height)}`;
		lines.push(`  ${"│  ".repeat(depth)}${depth > 0 ? "├─ " : ""}#${node.turn.number} [${link}]${geometry}`);
		lines.push(`  ${"│  ".repeat(depth)}${depth > 0 ? "│  " : ""}   ${node.turn.promptText.slice(0, 46)}`);
		for (const child of node.children) walk(child, depth + 1);
	};
	for (const root of forest.roots) walk(root, 0);
	return lines;
}

/**
 * Run one showcase conversation through link resolution and layout.
 * @param title - case heading.
 * @param turns - turn models in order.
 * @param overrides - manual parent choices.
 */
function showcase(title, turns, overrides = new Map()) {
	const forest = api.resolveLinks(turns, overrides);
	const layout = api.layoutTree(forest, 6);
	const placed = api.placeTree(layout, new Map());
	console.log(`\n── ${title} ${"─".repeat(Math.max(0, 68 - title.length))}`);
	console.log(`   ${turns.length} turns · ${forest.roots.length} branch root(s) · ${layout.columns} column(s) · ${placed.edges.length} connector(s)`);
	console.log(`   canvas ${Math.round(placed.width)}×${Math.round(placed.height)}px`);
	console.log("");
	for (const line of printTree(forest, placed)) console.log(line);
	console.log("");
	for (const edge of placed.edges) {
		const [from, to] = edge.key.split("->").map((id) => id.replace("turn:", ""));
		console.log(
			`   connector ${from.padStart(2)} → ${to.padStart(2)}  `
			+ `(${Math.round(edge.from.x)},${Math.round(edge.from.y)}) → (${Math.round(edge.to.x)},${Math.round(edge.to.y)})  [${edge.kind}]`
		);
	}
	if (overrides.size > 0) console.log(`\n   manual overrides applied: ${JSON.stringify(api.overridesToRecord(overrides))}`);
	return placed;
}

console.log(`\n${"═".repeat(74)}`);
console.log("2. SHOWCASE — what the engine produces");
console.log("═".repeat(74));

// Two topics that interleave: the matcher must rejoin the install thread, and
// keep the styling thread separate even though it came later.
showcase("interleaved topics (install / styling)", [
	turn(1, "插件安装到 dsh 的 web profile 需要重启吗"),
	turn(2, "dsh 插件安装失败怎么排查 profile 配置"),
	turn(3, "思维导图的卡片配色能不能换成深色主题"),
	turn(4, "深色主题下卡片的对比度需要满足 4.5:1 吗"),
	turn(5, "dsh 插件安装完了还是要重启 profile 吗")
]);

showcase("single chain (every turn continues the last)", [
	turn(1, "我要做一个 DSH 插件"),
	turn(2, "这个 DSH 插件怎么做思维导图视图"),
	turn(3, "思维导图视图的分支连线怎么画")
]);

showcase("manual override: pin #3 under #1 and force #2 to a new branch", [
	turn(1, "插件安装到 dsh 的 web profile 需要重启吗"),
	turn(2, "dsh 插件安装失败怎么排查 profile 配置"),
	turn(3, "dsh 插件安装完了还是要重启 profile 吗")
], new Map([["turn:3", "turn:1"], ["turn:2", null]]));

// ── 3. the gates can fail ─────────────────────────────────────────────────
//
// Each case reintroduces ONE historical bug into a throwaway copy and asserts a
// gate turns red. Without this, a green suite is unfalsifiable.

console.log(`\n${"═".repeat(74)}`);
console.log("3. MUTATION — break one behaviour, prove a gate catches it");
console.log("═".repeat(74));

/**
 * Copy the repo, apply a textual mutation, run the gates.
 *
 * The mutation is expressed as a map of repo-relative file to its mutated text,
 * so a case can break the bundle, the manifest, or both. A case that changes
 * nothing is reported as an anchor miss rather than silently passing: the suite
 * must notice when it stops testing what it claims to test.
 *
 * @param name - mutation name.
 * @param mutate - ({ "lib/client.js": text, "cordis.patch.yml": text }) => the same-keys map, mutated.
 * @param expectGate - gate expected to fail.
 */
function mutation(name, mutate, expectGate) {
	const dir = mkdtempSync(join(tmpdir(), "mm-mut-"));
	mkdirSync(join(dir, "lib"), { recursive: true });
	mkdirSync(join(dir, "tools"), { recursive: true });
	// Everything the gates read, gathered first so a case can name any of it.
	const inputs = {};
	for (const file of ["lib/client.js", "lib/index.js", "cordis.patch.yml", "package.json"]) {
		inputs[file] = readFileSync(join(REPO, file), "utf8");
	}
	const mutated = mutate({ ...inputs });
	const changed = Object.keys(inputs).some((file) => mutated[file] !== inputs[file]);
	if (!changed) {
		console.log(`\n  ~  ${name}\n       SKIPPED: the anchor text was not found (the mutation no longer applies)`);
		fail.push(`mutation ${name}: anchor missing`);
		return;
	}
	for (const file of Object.keys(inputs)) {
		mkdirSync(dirname(join(dir, file)), { recursive: true });
		writeFileSync(join(dir, file), mutated[file], "utf8");
	}
	// The manifest reader is part of the gate surface: the copy needs it or the
	// check gate would fail on a missing import, not on the mutation.
	for (const gate of [...GATES, "yaml.mjs"]) {
		writeFileSync(join(dir, "tools", gate), readFileSync(join(REPO, "tools", gate), "utf8"), "utf8");
	}
	const result = runGate(expectGate, dir);
	const others = GATES.filter((gate) => gate !== expectGate).map((gate) => {
		const outcome = runGate(gate, dir);
		return `${gate}:${outcome.ok ? "pass" : "fail"}`;
	});
	// The target gate must fail. Other gates may also fail — a mutation can break
	// several properties at once — but that must never be the ONLY thing that
	// happened, because then the gate named beside the mutation proved nothing.
	for (const entry of others) {
		if (entry.endsWith(":fail")) console.log(`       note: ${entry} also detected this change`);
	}
	if (result.ok) fail.push(`mutation ${name}: ${expectGate} did not catch it`);
	if (process.env.MM_TEST_DEBUG === "1") {
		for (const gate of GATES) {
			const outcome = runGate(gate, dir);
			console.log(`       [debug] ${gate} status=${outcome.ok ? 0 : 1} output=${JSON.stringify(outcome.text.slice(0, 400))}`);
		}
	}
	console.log(`\n  ${result.ok ? "✗" : "✓"}  ${name}`);
	console.log(`       expected ${expectGate} to FAIL → ${result.ok ? "it passed (gate is blind to this bug!)" : "it failed"}`);
	for (const problem of result.problems.slice(0, 4)) console.log(`         - ${problem}`);
	console.log(`       other gates: ${others.join("  ")}`);
	if (!result.ok) pass.push(`mutation ${name}`);
	rmSync(dir, { recursive: true, force: true });
}

mutation(
	"revert the inject face: pass the raw source as `useChat` instead of declaring it under `hooks`",
	(files) => ({ ...files, "lib/client.js": files["lib/client.js"].replace("hooks: { chat },", "useChat: chat,") }),
	"registration.mjs"
);

mutation(
	"let a pinned branch root be re-linked by the matcher (the manual-vs-auto bug)",
	(files) => ({
		...files,
		"lib/client.js": files["lib/client.js"].replace(
			"\t\t\t\t\tkind = \"manual\";\n\t\t\t\t} else {",
			"\t\t\t\t\tkind = \"root\";\n\t\t\t\t} else {"
		)
	}),
	"behaviour.mjs"
);

mutation(
	"assign rows by a pre-order walk instead of centering a parent on its children",
	(files) => ({
		...files,
		"lib/client.js": files["lib/client.js"].replace(
			"\t\t\t\t\tconst centers = children.map((child) => place(child));\n\t\t\t\t\tcenterY = (centers[0] + centers[centers.length - 1]) / 2;",
			"\t\t\t\t\tchildren.forEach((child) => place(child));\n\t\t\t\t\tcenterY = cursor + height / 2;\n\t\t\t\t\tcursor += height + NODE_GAP;"
		)
	}),
	"behaviour.mjs"
);

mutation(
	"allow a connector to be omitted (draw no line for a linked node)",
	(files) => ({
		...files,
		"lib/client.js": files["lib/client.js"].replace(
			"\t\t\t\tif (parent === undefined) continue;\n\t\t\t\tedges.push({",
			"\t\t\t\tif (parent === undefined) continue;\n\t\t\t\tif (box.depth > 0) continue;\n\t\t\t\tedges.push({"
		)
	}),
	"behaviour.mjs"
);

mutation(
	"collapse the shared-signal ratio to a raw cosine (the matcher's original scoring)",
	(files) => ({
		...files,
		"lib/client.js": files["lib/client.js"].replace(
			"\t\t\tif (smallerWeight === 0) return 0;\n\t\t\treturn shared / smallerWeight;",
			"\t\t\tif (smallerWeight === 0) return 0;\n\t\t\tvoid smallerWeight;\n\t\t\treturn shared;"
		)
	}),
	"behaviour.mjs"
);

mutation(
	"drop the context signal (the follow-up that reuses the reply's words goes back to being a new branch)",
	(files) => ({
		...files,
		"lib/client.js": files["lib/client.js"].replace(
			"\t\t\t\t\t\tconst byContext = contextCandidates(index, profiles, contexts)[0];\n\t\t\t\t\t\tif (byContext !== undefined && byContext.score >= LINK_CONTEXT_MIN_SCORE) {",
			"\t\t\t\t\t\tconst byContext = contextCandidates(index, profiles, contexts)[0];\n\t\t\t\t\t\tif (false && byContext !== undefined && byContext.score >= LINK_CONTEXT_MIN_SCORE) {"
		)
	}),
	"behaviour.mjs"
);

mutation(
	"open the context gate all the way (a reply that merely mentions a term starts linking)",
	(files) => ({
		...files,
		"lib/client.js": files["lib/client.js"].replace(
			"\t\tconst LINK_CONTEXT_MIN_SCORE = 0.65;",
			"\t\tconst LINK_CONTEXT_MIN_SCORE = 0;"
		)
	}),
	"behaviour.mjs"
);

mutation(
	"let the context signal outrank a question match instead of only filling in for it",
	(files) => ({
		...files,
		"lib/client.js": files["lib/client.js"].replace(
			"\t\t\t\t\tconst best = candidates[index][0];\n\t\t\t\t\tif (best !== undefined && best.score >= LINK_MIN_SCORE) {",
			"\t\t\t\t\tconst best = candidates[index][0];\n\t\t\t\t\tif (false && best !== undefined && best.score >= LINK_MIN_SCORE) {"
		)
	}),
	"behaviour.mjs"
);

mutation(
	"build the context vector from the replies instead of the questions (one long reply redefines the background)",
	(files) => ({
		...files,
		"lib/client.js": files["lib/client.js"].replace(
			"\t\t\tconst questionDocuments = turns.map((turn) => new Set(termsOf(turn.promptText.length > 0 ? turn.promptText : turn.text)));\n\t\t\tconst documentFrequency = new Map();\n\t\t\tfor (const document of questionDocuments) {",
			"\t\t\tconst questionDocuments = turns.map((turn) => new Set(termsOf(contextTextOf(turn))));\n\t\t\tconst documentFrequency = new Map();\n\t\t\tfor (const document of questionDocuments) {"
		)
	}),
	"behaviour.mjs"
);

mutation(
	"let the depth limit fold the title node itself (the whole map collapsed into one card)",
	(files) => ({
		...files,
		"lib/client.js": files["lib/client.js"].replace(
			"\t\t\t\tconst isTitle = node.turn.id === TITLE_NODE_ID;\n\t\t\t\tconst levels = depth - 1;\n\t\t\t\tif (!isTitle && levels + 1 >= depthLimit) {",
			"\t\t\t\tconst levels = node.parent === null ? -1 : depth - 1;\n\t\t\t\tif (levels + 1 >= depthLimit) {"
		)
	}),
	"behaviour.mjs"
);

mutation(
	"skip the title's outgoing connectors (the branch roots end up floating)",
	(files) => ({
		...files,
		"lib/client.js": files["lib/client.js"].replace(
			"\t\t\t\tif (box.parentId === TITLE_NODE_ID) {",
			"\t\t\t\tif (box.parentId === TITLE_NODE_ID) {\n\t\t\t\t\tcontinue;\n\t\t\t\t}\n\t\t\t\tif (false) {"
		)
	}),
	"behaviour.mjs"
);

mutation(
	"substitute the anchor text with a generic caption instead of the first question",
	(files) => ({
		...files,
		"lib/client.js": files["lib/client.js"].replace(
			"\t\t\t\t\tpromptText: first.promptText,",
			"\t\t\t\t\tpromptText: \"\","
		)
	}),
	"behaviour.mjs"
);

// The manifest bug that shipped: an unquoted `@`-leading scalar is illegal YAML,
// so the profile's parser rejects the file and `dsh plugin add` rolls back the
// whole installation while every bundle-level gate stays green.
mutation(
	"unquote the loader row's package scalars (the manifest that aborted installation)",
	(files) => ({
		...files,
		"cordis.patch.yml": rewriteScalar(
			rewriteScalar(files["cordis.patch.yml"], "id", "@nydsg/dsh-mindmap"),
			"name",
			"@nydsg/dsh-mindmap"
		)
	}),
	"check.mjs"
);

// The other way a self-mounting manifest kills a profile: two loader rows with
// the same id are a startup failure, not a duplicate that silently wins.
mutation(
	"insert the loader row twice under the same id (duplicate loader entry id)",
	(files) => ({
		...files,
		"cordis.patch.yml": `${files["cordis.patch.yml"]}\n- insert:\n    - id: '@nydsg/dsh-mindmap'\n      name: '@nydsg/dsh-mindmap'\n`
	}),
	"check.mjs"
);

// ── 4. report ─────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(74)}`);
console.log("SUMMARY");
console.log("═".repeat(74));
console.log(`  ${pass.length} passed, ${fail.length} failed`);
for (const entry of fail) console.log(`  FAIL ${entry}`);
console.log(fail.length === 0 ? "\ntest: PASS (all gates green, all mutations caught)\n" : "\ntest: FAIL\n");
process.exit(fail.length === 0 ? 0 : 1);
