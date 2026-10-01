/**
 * Measure the context signal on the sessions actually on this machine.
 *
 * The synthetic cases in the gates were built by me, so they can only confirm that
 * the RULE does what I designed. They cannot tell me whether the rule fires at all
 * on real Chinese follow-ups — which is exactly the complaint to answer ("it did
 * not work"). This script reads the local session logs, reconstructs each turn's
 * question and reply, and prints the two scores for every consecutive pair.
 *
 * Run: node tools/measure-sessions.mjs
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { zstdDecompressSync } from "node:zlib";
import vm from "node:vm";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = readFileSync(join(REPO, "lib", "client.js"), "utf8");

/** Slice one `//#region` block out of the bundle. */
function regionOf(name) {
	const start = SOURCE.indexOf(`//#region ${name}`);
	const end = SOURCE.indexOf(`//#endregion`, start);
	return SOURCE.slice(SOURCE.indexOf("\n", start) + 1, end);
}

const sandbox = { Intl, Math, JSON, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const api = vm.runInContext(
	`(function () {
		${regionOf("lib/client/lexical.js")}
		${regionOf("lib/client/branching.js")}
		return { questionProfiles, signalOverlap, linkCandidates, resolveLinks, LINK_MIN_SCORE, LINK_MAX_AGE };
	})()`,
	sandbox
);

// ── read the local session logs ────────────────────────────────────────────

const SESSIONS = join(homedir(), ".dsh", "sessions");

/**
 * Every `session.v4.jsonl.zstd` under the sessions root, newest first.
 * @returns file paths.
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
			else if (entry.name.endsWith(".jsonl.zstd")) found.push(path);
		}
	};
	walk(SESSIONS, 0);
	return found
		.map((path) => ({ path, mtime: statSync(path).mtimeMs }))
		.sort((left, right) => right.mtime - left.mtime)
		.map((entry) => entry.path);
}

/**
 * Decompress one session log into its records.
 *
 * The on-disk format is a **sequence of zstd frames**, one per append — a single
 * `zstdDecompressSync` call returns only the first frame (199 bytes: the session
 * header) even though the file is megabytes. Each frame is therefore located by
 * its magic number and decompressed on its own, then the JSONL lines are joined.
 *
 * @param path - session file.
 * @returns parsed records, skipping the ones that do not parse.
 */
function records(path) {
	let buffer;
	try {
		buffer = readFileSync(path);
	} catch {
		return [];
	}
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
			/* a frame still being written cannot be read; skip it */
		}
	}
	const out = [];
	for (const line of chunks.join("").split("\n")) {
		if (line.length === 0) continue;
		try {
			out.push(JSON.parse(line));
		} catch {
			/* a truncated tail line is normal for a live session */
		}
	}
	return out;
}

/**
 * Whether a user message is a real human question rather than an injected block.
 *
 * DSH splices host-side content into the conversation (runtime context snapshots,
 * skill catalogs, knowledge-base refreshes) and those arrive as `user/message`
 * records too. They are long, they repeat verbatim, and they are NOT what a person
 * typed — leaving them in would both dominate the statistics and make two identical
 * injections look like a perfect continuation of each other.
 *
 * @param text - the message text.
 * @returns true when it looks like something a human typed.
 */
function isHumanQuestion(text) {
	const trimmed = text.trim();
	if (trimmed.length === 0 || trimmed.length > 1200) return false;
	if (trimmed.startsWith("<")) return false;
	if (/^Current runtime context/i.test(trimmed)) return false;
	if (/^The approval policy changed/i.test(trimmed)) return false;
	return true;
}

/**
 * Pull `[question, reply]` pairs out of one session's records.
 *
 * The shapes are this DSH build's own, read defensively: a `user/message` carries
 * the question in `data.content[].text`, and the `assistant/message` records that
 * follow carry the reply in `data.message.content[]` where `type === "text"`
 * (reasoning and tool calls are deliberately excluded — the context signal is
 * about what the turn DISCUSSED, and a tool's arguments are not a discussion).
 *
 * @param list - parsed records.
 * @returns turns in order.
 */
function turnsOf(list) {
	/** Concatenate every `text` part of a content list. */
	const textsIn = (content) => {
		if (!Array.isArray(content)) return "";
		return content
			.filter((part) => part !== null && typeof part === "object" && part.type === "text" && typeof part.text === "string")
			.map((part) => part.text.trim())
			.filter((text) => text.length > 0)
			.join("\n");
	};
	const turns = [];
	let current = null;
	for (const record of list) {
		if (record?.type === "user/message") {
			const question = textsIn(record.data?.content);
			if (!isHumanQuestion(question)) continue;
			current = { prompt: question, reply: "", turn: record.data?.turn ?? turns.length + 1 };
			turns.push(current);
		} else if (record?.type === "assistant/message" && current !== null) {
			const reply = textsIn(record.data?.message?.content);
			if (reply.length === 0) continue;
			current.reply = current.reply.length === 0 ? reply : `${current.reply}\n${reply}`;
		}
	}
	return turns.filter((turn) => turn.prompt.length > 0);
}

// ── score every consecutive pair ───────────────────────────────────────────
// ── score every consecutive pair ───────────────────────────────────────────

const files = sessionFiles().slice(0, 12);
console.log(`sessions found: ${sessionFiles().length} (reading ${files.length})\n`);

const pairs = [];
for (const file of files) {
	const turns = turnsOf(records(file));
	if (turns.length < 2) continue;
	const models = turns.map((turn, index) => ({
		id: `turn:${index + 1}`,
		number: index + 1,
		promptText: turn.prompt,
		answerText: turn.reply,
		text: turn.prompt,
		modules: []
	}));
	const profiles = api.questionProfiles(models);
	for (let index = 1; index < models.length; index += 1) {
		const best = api.linkCandidates(index, profiles)[0];
		pairs.push({
			index,
			prompt: models[index].promptText,
			replyLength: models[index - 1].answerText.length,
			question: best === undefined ? 0 : best.score,
			questionTurn: best === undefined ? -1 : best.index + 1,
			questionLinked: best !== undefined && best.score >= api.LINK_MIN_SCORE
		});
	}
}

if (pairs.length === 0) {
	console.log("no session with at least two question/reply pairs was readable");
	process.exit(0);
}

console.log(`${"═".repeat(100)}`);
console.log("REAL FOLLOW-UPS (the turn that came right after a reply)");
console.log(`${"═".repeat(100)}`);
console.log(`  ${"#".padEnd(4)}${"提问词面".padEnd(10)}${"词面接到".padEnd(12)}  提问`);
let questionHits = 0;
for (const pair of pairs) {
	if (pair.questionLinked) questionHits += 1;
	console.log(
		`  ${String(pair.index + 1).padEnd(4)}`
		+ `${pair.question.toFixed(2).padEnd(10)}${(pair.questionLinked ? `#${pair.questionTurn}` : "—").padEnd(12)}  `
		+ `${pair.prompt.replace(/\s+/g, " ").slice(0, 56)}`
	);
}

const sorted = pairs.map((pair) => pair.question).sort((a, b) => a - b);
console.log(`\n  真实追问总数 ${pairs.length}`);
console.log(`  提问词面达到 ${api.LINK_MIN_SCORE} 的：${questionHits}（${Math.round((questionHits / pairs.length) * 100)}%）`);
console.log(`  提问词面 中位数 ${sorted[Math.floor(sorted.length / 2)].toFixed(2)}   最大 ${sorted[sorted.length - 1].toFixed(2)}`);

/*
 * THE DECISION THIS SCRIPT FORCED.
 *
 * The number above is the whole argument. On real follow-ups the wording signal
 * almost never fires, because a real follow-up is pronoun-like and short — it
 * repeats none of the reply's nouns. So a rule that requires lexical evidence
 * before it will treat a question as "continuing" refuses nearly every real
 * follow-up and draws a row of unrelated roots instead of a conversation.
 *
 * The shipped rule therefore chains: a wording match to an OLDER question is the
 * exception, and following the previous turn is the default. The comparison below
 * shows what each rule produces on the same real data.
 */
console.log(`\n  ── 两条规则的落地结果（同一批真实轮次） ──`);
for (const file of files) {
	const turns = turnsOf(records(file));
	if (turns.length < 2) continue;
	const models = turns.map((turn, index) => ({
		id: `turn:${index + 1}`,
		number: index + 1,
		promptText: turn.prompt,
		answerText: turn.reply,
		text: turn.prompt,
		modules: []
	}));
	const profiles = api.questionProfiles(models);
	// Old rule: a wording match, else a new branch.
	const oldForest = { roots: 0, chained: 0, worded: 0, total: 0 };
	// Shipped rule: a wording match, else chain to the previous turn.
	const newForest = { roots: 0, chained: 0, worded: 0, total: 0 };
	for (let index = 1; index < models.length; index += 1) {
		const best = api.linkCandidates(index, profiles)[0];
		const worded = best !== undefined && best.score >= api.LINK_MIN_SCORE;
		newForest.total += 1;
		oldForest.total += 1;
		if (worded) {
			newForest.worded += 1;
			oldForest.worded += 1;
		} else {
			oldForest.roots += 1;
			newForest.chained += 1;
		}
	}
	console.log(
		`    ${file.split(/[\\/]/).slice(-2)[0].slice(0, 28).padEnd(30)}`
		+ `旧规则: 接非上一轮 ${oldForest.worded} / 新分支 ${oldForest.roots}`
		+ `    新规则: 接非上一轮 ${newForest.worded} / 接上一轮 ${newForest.chained}`
	);
}
