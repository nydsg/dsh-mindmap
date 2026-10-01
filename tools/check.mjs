/**
 * dsh-mindmap delivery gate.
 *
 * Three independent checks, all offline and deterministic:
 *
 *  1. Syntax — the client bundle must parse in a browser-shaped CommonJS
 *     context and its `apply`/`inject` faces must be exportable. The bundle is
 *     hand-authored plain JS with no build step, so this is the only thing
 *     standing between a typo and a plugin that silently never loads.
 *  2. Component CSS containment — every colour literal must live inside the
 *     `.mm-scope` token block; component rules may reference `var(--mm-*)` only.
 *     A hardcoded colour cannot follow the theme, so it is a defect, not style.
 *  3. Token integrity — every `--mm-*` a rule consumes must be declared by the
 *     token block. A missing declaration silently drops the whole property.
 *
 * Run: node tools/check.mjs
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import vm from "node:vm";
import { parseYaml, scalar, listItems, plainScalarIsLegal, REGISTRY_NAME } from "./yaml.mjs";

/**
 * Resolve a repo path next to this script.
 *
 * Local directory first, then one level up: the gate must read the bundle BESIDE
 * itself, because the mutation cases in test.mjs copy the tools into a throwaway
 * tree with a mutated bundle. A hardcoded fallback to the real repo would make
 * this gate silently inspect the unmutated file there — reporting green while the
 * mutation went unseen, and red on an unrelated file the mutation never touched.
 *
 * @param from - directory of this script.
 * @param relative - path inside the repo, e.g. `lib/client.js`.
 * @returns the resolved path.
 */
function repoPath(from, relative) {
	for (const candidate of [join(from, relative), join(from, "..", relative)]) {
		const path = resolve(candidate);
		if (existsSync(path)) return path;
	}
	throw new Error(`check gate: ${relative} not found near ${from}`);
}

const here = dirname(fileURLToPath(import.meta.url));
const clientPath = repoPath(here, join("lib", "client.js"));
const hostPath = repoPath(here, join("lib", "index.js"));
const source = readFileSync(clientPath, "utf8");
/**
 * Repository root, for the checks that walk the whole tree rather than one file.
 *
 * Derived from the located bundle instead of `import.meta.url`, so a mutation copy
 * (which has tools/ and lib/ in a throwaway tree) is walked rather than the real
 * repository — the same reason `repoPath` probes beside itself first.
 */
const REPO_ROOT = dirname(dirname(clientPath));

const problems = [];
const notes = [];

/** Record a failed assertion. */
function fail(message) {
	problems.push(message);
}

// ── 1. syntax + plugin face ────────────────────────────────────────────────

const registered = [];
const sandbox = {
	window: {
		__ModuleLoader__: {
			load(registration) {
				registered.push(registration);
			}
		}
	},
	document: undefined,
	Intl,
	console
};
sandbox.globalThis = sandbox;

let mod = null;
try {
	vm.createContext(sandbox);
	vm.runInContext(source, sandbox, { filename: "lib/client.js" });
} catch (error) {
	fail(`client bundle does not parse: ${error.message}`);
}

if (registered.length !== 1) {
	fail(`expected exactly one __ModuleLoader__.load registration, saw ${registered.length}`);
} else {
	const registration = registered[0];
	if (registration.id !== "@nydsg/dsh-mindmap") fail(`registration id is ${JSON.stringify(registration.id)}, expected "dsh-mindmap"`);
	const req = (specifier) => {
		if (specifier === "react") {
			// Minimal React stand-in: the factory only needs createElement and a
			// Component base at module scope; nothing renders during this check.
			return {
				createElement: () => null,
				Component: class {},
				useMemo: () => null,
				useState: () => [null, () => {}],
				useCallback: (fn) => fn,
				useEffect: () => {},
				useRef: () => ({ current: null })
			};
		}
		throw new Error(`unexpected external require: ${specifier}`);
	};
	try {
		mod = registration.factory(req);
	} catch (error) {
		fail(`factory threw during materialization: ${error.message}`);
	}
	if (mod !== null && mod !== undefined) {
		if (typeof mod.apply !== "function") fail("client bundle does not export apply");
		if (!Array.isArray(mod.inject)) fail("client bundle does not export an inject array");
		else {
			for (const name of ["slots", "sessions", "uiSession", "uiConversation", "locale"]) {
				if (!mod.inject.includes(name)) notes.push(`inject does not declare "${name}" (only a problem if it is actually consumed)`);
			}
		}
	}
}

{
	// The host half only needs to resolve and export apply; it is never executed
	// by this gate beyond a parse.
	const host = readFileSync(hostPath, "utf8");
	if (!/export\s*\{\s*apply\s*\}/.test(host)) fail("lib/index.js does not export apply");
}

// ── 1b. bundle manifest ────────────────────────────────────────────────────
//
// The manifest is what `dsh plugin add` reads to mount this package, and the
// profile's YAML parser is strict about the spec: a plain scalar may not start
// with `@`, because `@` is a reserved indicator. `id: @nydsg/dsh-mindmap`
// therefore aborts the WHOLE installation with `bad indentation of a mapping
// entry` and rolls the profile back — a manifest that no amount of green
// bundle-level testing would have noticed. Parsing it here is the only check
// that would have caught it.

{
	const manifestPath = repoPath(here, "cordis.patch.yml");
	const manifestText = readFileSync(manifestPath, "utf8");
	const parsed = parseYaml(manifestText);
	if (parsed.error !== null) {
		fail(`cordis.patch.yml is not valid YAML: ${parsed.error}`);
	} else {
		const entries = parsed.value;
		if (!Array.isArray(entries)) {
			fail("cordis.patch.yml root must be a list of patch entries; a bare mapping is not a patch layer");
		} else {
			// A loader row is any entry of any list inside a patch entry, which is
			// where both `insert:` and `- insert:` forms land. Collecting rows by
			// shape rather than by key path keeps the gate independent of how the
			// list happens to be spelled.
			const rows = [];
			const ids = [];
			for (const item of entries) {
				if (!Array.isArray(item)) {
					fail("cordis.patch.yml entries must be [name, patch] pairs");
					continue;
				}
				const key = item[0];
				const entry = item[1];
				// A patch entry is read as an entry list: `[[key, value], …]`.
				if (entry === null) {
					fail(`cordis.patch.yml entry ${key} is an empty patch`);
					continue;
				}
				if (!Array.isArray(entry)) {
					fail(`cordis.patch.yml entry ${key} must be a mapping of patch operations`);
					continue;
				}
				// Only the shape of an entry that self-mounts can break a profile.
				for (const operation of entry.map((pair) => pair[0])) {
					if (operation !== "insert" && operation !== "id" && operation !== "name" && operation !== "config" && operation !== "disabled") {
						notes.push(`cordis.patch.yml entry ${key} carries unrecognised key ${JSON.stringify(operation)}`);
					}
				}
				for (const [listKey, value] of entry) {
					if (listKey === "id" || listKey === "name" || listKey === "config" || listKey === "disabled") continue;
					if (!Array.isArray(value)) continue;
					for (const row of value) {
						if (row === null || !Array.isArray(row)) continue;
						const rowKeys = row.map((pair) => pair[0]);
						if (!rowKeys.includes("id") && !rowKeys.includes("name")) continue;
						rows.push({ key, row });
					}
				}
			}
			if (rows.length === 0) fail("cordis.patch.yml declares no loader row — nothing would mount");
			for (const { key, row } of rows) {
				const id = scalar(row, "id");
				const name = scalar(row, "name");
				if (typeof id !== "string" || id === "") fail(`cordis.patch.yml entry ${key}: loader row needs a string id`);
				else ids.push(id);
				if (typeof name !== "string" || name === "") fail(`cordis.patch.yml entry ${key}: loader row needs a string name`);
				else if (!REGISTRY_NAME.test(name)) fail(`cordis.patch.yml entry ${key}: name ${JSON.stringify(name)} is not a resolvable package name`);
				else if (typeof id === "string" && name !== id) notes.push(`loader row declares id ${JSON.stringify(id)} for package ${JSON.stringify(name)}`);
			}
			const seen = new Set();
			for (const id of ids) {
				if (seen.has(id)) {
					fail(`cordis.patch.yml inserts loader id ${JSON.stringify(id)} more than once — duplicate loader entry ids abort startup`);
				}
				seen.add(id);
			}
			const expected = JSON.parse(readFileSync(repoPath(here, "package.json"), "utf8")).name;
			if (ids.length !== 1 || ids[0] !== expected) {
				fail(`cordis.patch.yml must insert exactly one loader row for ${expected}; saw ${JSON.stringify(ids)}`);
			} else {
				notes.push(`manifest: one loader row for ${ids[0]}`);
			}
		}
	}
}

// ── 1c. line endings ───────────────────────────────────────────────────────
//
// Every text file in this repo must be LF. `.gitattributes` says so, but that only
// governs what git WRITES — a tool that rewrites a file in place with Windows line
// endings leaves a working copy that disagrees with the repository, and the damage
// is not cosmetic here: a gate that reads the bundle with a regex expecting `\n`
// suddenly finds `\r\n` and reports "could not locate the CSS template literal",
// which looks like a broken bundle rather than a broken checkout. That happened,
// twice, from scripted edits. So the property is gated rather than trusted.

{
	const offenders = [];
	const walk = (dir) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			if (entry.name === ".git" || entry.name === "node_modules") continue;
			const path = join(dir, entry.name);
			if (entry.isDirectory()) {
				walk(path);
				continue;
			}
			let buffer;
			try {
				buffer = readFileSync(path);
			} catch {
				continue;
			}
			if (buffer.includes(0)) continue; // binary: not our business
			for (let i = 1; i < buffer.length; i += 1) {
				if (buffer[i] === 0x0a && buffer[i - 1] === 0x0d) {
					offenders.push(path.slice(REPO_ROOT.length + 1));
					break;
				}
			}
		}
	};
	walk(REPO_ROOT);
	if (offenders.length > 0) {
		fail(`these files use CRLF line endings; every text file must be LF (rewrite them with LF, do not "fix" the gate): ${offenders.join(", ")}`);
	} else {
		notes.push("line endings: LF throughout");
	}
}

// ── 2 + 3. CSS extraction, colour containment, token integrity ─────────────

const cssMatch = source.match(/const CSS = `([\s\S]*?)`;\n/);
if (cssMatch === null) {
	fail("could not locate the CSS template literal");
} else {
	const css = cssMatch[1];

	// Token block boundaries: `.mm-scope {` up to its closing brace.
	const tokenBlockStart = css.indexOf(".mm-scope {");
	const tokenBlockEnd = css.indexOf("\n}", tokenBlockStart);
	if (tokenBlockStart < 0 || tokenBlockEnd < 0) fail("could not locate the .mm-scope token block");
	const tokenBlock = tokenBlockStart >= 0 && tokenBlockEnd > tokenBlockStart
		? css.slice(tokenBlockStart, tokenBlockEnd)
		: "";
	const componentCss = css.slice(0, tokenBlockStart) + css.slice(tokenBlockEnd + 2);

	const COLOUR_LITERAL = /(#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(|\b(?:color-mix|light-dark|oklch|lab|lch|color)\s*\()/g;

	// 2a. the token block is where literals are allowed — verify it has them.
	if (!COLOUR_LITERAL.test(tokenBlock)) fail("token block declares no fallback literals; expected alias fallbacks there");
	COLOUR_LITERAL.lastIndex = 0;

	// 2b. components must not contain literals (allow `transparent`/`currentColor`,
	// which are not colours in the theming sense).
	COLOUR_LITERAL.lastIndex = 0;
	const leaks = componentCss
		.split("\n")
		.map((line, index) => ({ line, index }))
		.filter(({ line }) => {
			COLOUR_LITERAL.lastIndex = 0;
			return COLOUR_LITERAL.test(line);
		});
	if (leaks.length > 0) {
		for (const { line, index } of leaks) fail(`component CSS hardcodes a colour: ${line.trim()} (line ${index + 1} of the CSS block)`);
	}

	// 3. token integrity.
	const declared = new Set();
	for (const match of tokenBlock.matchAll(/(--mm-[a-z0-9-]+)\s*:/g)) declared.add(match[1]);
	const consumed = new Set();
	for (const match of css.matchAll(/var\((--mm-[a-z0-9-]+)/g)) consumed.add(match[1]);
	for (const token of consumed) {
		if (!declared.has(token)) fail(`CSS consumes undeclared token ${token}`);
	}
	for (const token of declared) {
		if (!consumed.has(token)) notes.push(`token ${token} is declared but never used`);
	}
	notes.push(`tokens: ${declared.size} declared, ${consumed.size} consumed`);

	// Colour-carrying declarations must go through a token, except the two CSS
	// keywords that are not theme colours. A value may embed its token inside a
	// composite (a shadow list, a shorthand `outline`), so the test is "contains
	// no colour literal AND resolves through at least one var()".
	const COLOUR_PROPERTY = /^\s*(color|background|background-color|border-color|box-shadow|outline|outline-color|fill|stroke)\s*:\s*([^;]+);/;
	// Properties that begin with a colour-bearing name but carry no colour.
	const NOT_A_COLOUR = /^\s*background-(clip|image|size|position|repeat|attachment|origin|blend-mode)\s*:/;
	for (const line of componentCss.split("\n")) {
		if (NOT_A_COLOUR.test(line)) continue;
		const match = line.match(COLOUR_PROPERTY);
		if (match === null) continue;
		const value = match[2].trim();
		if (value === "none" || value === "transparent" || value === "inherit" || value === "currentColor") continue;
		if (!value.includes("var(")) {
			fail(`declaration "${line.trim()}" carries colour without a token`);
			continue;
		}
		COLOUR_LITERAL.lastIndex = 0;
		if (COLOUR_LITERAL.test(value)) fail(`declaration "${line.trim()}" mixes a colour literal with its token`);
	}
}

// ── report ────────────────────────────────────────────────────────────────

for (const note of notes) console.log(`note: ${note}`);
if (problems.length === 0) {
	console.log("check: PASS (0 problems)");
	process.exit(0);
}
console.log(`check: FAIL (${problems.length} problem(s))`);
for (const problem of problems) console.log(`  - ${problem}`);
process.exit(1);
