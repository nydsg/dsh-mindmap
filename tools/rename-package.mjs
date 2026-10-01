/**
 * One-shot: rename the package identity from `dsh-mindmap` to `@nydsg/dsh-mindmap`.
 *
 * The identity string appears in four kinds of place and each matters for a
 * different reason, so this rewrites them explicitly rather than doing a blanket
 * replace:
 *
 *  - package.json `name`                     — what npm publishes
 *  - cordis.patch.yml row `name`             — what the Loader resolves (the host half)
 *  - lib/client.js loader `id`               — what the browser module system registers
 *  - CSS tag id + data-plugin                — what HMR claims/retires on reload
 *  - gate assertions and log prefixes        — diagnostics that must name the real package
 *
 * The repository DIRECTORY stays `dsh-mindmap`; only the package identity changes.
 *
 * Run: node tools/rename-package.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const OLD = "dsh-mindmap";
const NEW = "@nydsg/dsh-mindmap";

/** Read a repo file. */
const read = (rel) => readFileSync(join(REPO, rel), "utf8");
/** Write a repo file, reporting nothing when unchanged. */
const write = (rel, text) => writeFileSync(join(REPO, rel), text, "utf8");

const edits = [];
/** Queue one exact-string replacement. */
function swap(rel, from, to, note) {
	const text = read(rel);
	if (!text.includes(from)) {
		edits.push({ rel, note, ok: false });
		return;
	}
	write(rel, text.replaceAll(from, to));
	edits.push({ rel, note, ok: true });
}

// package.json: the published name.
{
	const pkg = JSON.parse(read("package.json"));
	pkg.name = NEW;
	write("package.json", `${JSON.stringify(pkg, null, 2)}\n`);
	edits.push({ rel: "package.json", note: "name", ok: true });
}

// The Loader row: host half resolution + the client scan key.
swap("cordis.patch.yml", `name: '${OLD}'`, `name: '${NEW}'`, "patch row name");
swap("cordis.patch.yml", `- id: ${OLD}`, `- id: ${NEW}`, "patch row id");

// The browser-side identity, the module-loader registration id.
swap("lib/client.js", `id: "${OLD}",`, `id: "${NEW}",`, "loader id");
// HMR bookkeeping: the style tag this plugin owns and would retire on reload.
swap("lib/client.js", `const CSS_TAG_ID = "${OLD}/view.css";`, `const CSS_TAG_ID = "${NEW}/view.css";`, "css tag id");
swap("lib/client.js", `tag.dataset.plugin = "${OLD}";`, `tag.dataset.plugin = "${NEW}";`, "data-plugin");
// Diagnostics: a log prefix that names a package nobody can find is useless.
swap("lib/client.js", `"[${OLD}]`, `"[${NEW}]`, "log prefix (bracket)");
swap("lib/client.js", `"${OLD}: dictionaries"`, `"${NEW}: dictionaries"`, "effect label");
swap("lib/client.js", `\`${OLD}: unknown session`, `\`${NEW}: unknown session`, "error prefix");
swap("lib/client.js", `\`${OLD}: composer draft unavailable`, `\`${NEW}: composer draft unavailable`, "warn prefix");

// Gate assertions on the registration id.
swap("tools/check.mjs", `registration.id !== "${OLD}"`, `registration.id !== "${NEW}"`, "check gate id assert");
swap("tools/registration.mjs", `registration?.id === "${OLD}"`, `registration?.id === "${NEW}"`, "registration gate id assert");

console.log(`rename ${OLD} -> ${NEW}\n`);
for (const edit of edits) {
	console.log(`  ${edit.ok ? "ok  " : "MISS"} ${edit.rel}  (${edit.note})`);
}
const missed = edits.filter((edit) => !edit.ok);
console.log(missed.length === 0 ? "\nall edits applied" : `\n${missed.length} edit(s) missed their anchor`);
process.exit(missed.length === 0 ? 0 : 1);
