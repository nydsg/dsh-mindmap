/**
 * Pack verification: assert that the published tarball contains exactly what the
 * plugin needs at runtime, and nothing that would confuse an installer.
 *
 * Why this is a gate and not a glance at `npm pack --dry-run`: publishing is
 * irreversible for a given version, and the two ways to get it wrong are both
 * silent — a missing file (the Loader cannot mount the plugin, so DSH fails to
 * boot for everyone who installed it) and a stray file (a scratch probe or a dev
 * path shipped to users). Both are checked here before publish.
 *
 * Run: node tools/verify-pack.mjs
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const notes = [];

const pkg = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));

/**
 * Read one repo-relative file, or null.
 * @param rel - path inside the repo.
 * @returns the text, or null when absent.
 */
function read(rel) {
	const path = join(REPO, rel);
	return existsSync(path) ? readFileSync(path, "utf8") : null;
}

// ── identity ──────────────────────────────────────────────────────────────

if (pkg.name !== "@nydsg/dsh-mindmap") problems.push(`package name is ${JSON.stringify(pkg.name)}`);
if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) problems.push(`version ${JSON.stringify(pkg.version)} is not a release semver`);
if (pkg.private === true) problems.push("package is marked private; npm will refuse to publish it");
if (pkg.license !== "MIT") problems.push(`license is ${JSON.stringify(pkg.license)}`);
if (!pkg.repository?.url?.includes("github.com/nydsg/dsh-mindmap")) problems.push("repository.url does not point at the public repo");
if (pkg.publishConfig?.access !== "public") problems.push("publishConfig.access must be \"public\" for a scoped package");
if (!pkg.keywords?.includes("dsh-plugin")) problems.push("keywords must include \"dsh-plugin\" — that is how the ecosystem finds plugins");

// ── the DSH declaration the host and the client scanner read ──────────────

if (pkg.dsh?.bundle?.patch !== "./cordis.patch.yml") problems.push("dsh.bundle.patch must point at ./cordis.patch.yml");
if (pkg.dsh?.client?.platform !== "web") problems.push("dsh.client.platform must be \"web\"");
if (pkg.exports?.["./client"] !== "./lib/client.js") problems.push("exports[\"./client\"] must point at the client bundle");

// ── files that MUST ship ──────────────────────────────────────────────────

const required = ["lib/index.js", "lib/client.js", "cordis.patch.yml", "README.md", "LICENSE", "package.json"];
for (const rel of required) {
	const path = join(REPO, rel);
	if (!existsSync(path)) {
		problems.push(`required file is missing: ${rel}`);
		continue;
	}
	if (statSync(path).size === 0) problems.push(`required file is empty: ${rel}`);
}
notes.push(`required files present: ${required.length}`);

// The published README must exist in the tarball, so `files` has to allow it.
// package.json is always packed by npm (along with README/LICENSE), so it is
// deliberately not required in `files` — requiring it here failed the gate on a
// correct manifest.
for (const rel of required) {
	if (rel === "package.json") continue;
	const top = rel.split("/")[0];
	if (top === "lib" && !pkg.files?.includes("lib")) problems.push("files[] must include \"lib\"");
	else if (top !== "lib" && !pkg.files?.includes(rel)) problems.push(`files[] must include ${JSON.stringify(rel)}`);
}

// ── the patch row must name THIS package ──────────────────────────────────

const patch = read("cordis.patch.yml") ?? "";
if (!patch.includes(`name: '${pkg.name}'`)) problems.push(`cordis.patch.yml must insert a row named exactly ${pkg.name} (the Loader resolves the host half by it, and the client scanner reads its package.json)`);
if (!patch.includes("insert:")) problems.push("cordis.patch.yml must contain an insert list");

// ── the client bundle must register under THIS package id ─────────────────

const bundle = read("lib/client.js") ?? "";
if (!bundle.includes(`id: "${pkg.name}",`)) problems.push(`lib/client.js must register with id "${pkg.name}"`);
if (!bundle.includes(`window.__ModuleLoader__.load(`)) problems.push("lib/client.js must be a __ModuleLoader__.load bundle");
if (!bundle.includes("exports.apply") || !bundle.includes("exports.inject")) problems.push("lib/client.js must export apply and inject");

// ── nothing environment-specific may ship ─────────────────────────────────

const DEV_PATH = /[A-Za-z]:[\\/](?:Codex-workspace|Users[\\/][^"']*AppData)/;
for (const rel of ["lib/client.js", "lib/index.js", "cordis.patch.yml"]) {
	const text = read(rel) ?? "";
	if (DEV_PATH.test(text)) problems.push(`${rel} contains an absolute developer path; it would ship to users`);
}

// ── the tools are development-only ────────────────────────────────────────
//
// `files` is an allow-list, so tools/ is excluded by construction. Assert it,
// because adding "tools" to `files` would publish the fixtures and probes.

if (pkg.files?.includes("tools")) problems.push("files[] must not include tools/ — those are development gates, not plugin runtime");
notes.push(`files[] = ${JSON.stringify(pkg.files)}`);

// ── report ────────────────────────────────────────────────────────────────

for (const note of notes) console.log(`note: ${note}`);
if (problems.length === 0) {
	console.log("pack: PASS (0 problems)");
	process.exit(0);
}
console.log(`pack: FAIL (${problems.length} problem(s))`);
for (const problem of problems) console.log(`  - ${problem}`);
process.exit(1);
