/**
 * A deliberately small YAML reader for the one document this package ships:
 * the bundle patch manifest (`cordis.patch.yml`).
 *
 * WHY THIS EXISTS
 * ---------------
 * `id: @nydsg/dsh-mindmap` is **invalid YAML**: `@` is a reserved indicator, so
 * it may not start a plain scalar, and js-yaml 4 — the parser the DSH profile
 * and `dsh plugin add` use — rejects the whole manifest with
 *
 *     bad indentation of a mapping entry
 *
 * which makes the plugin manager roll the entire installation back. The plugin
 * shipped in exactly that state while the delivery gates were all green,
 * because nothing ever parsed the manifest. The fix is a quoting change plus a
 * gate that would have failed, and a gate cannot depend on a YAML library: this
 * package has **zero dependencies** and the gates run offline inside throwaway
 * copies of the repo. Hence a reader implemented over the manifest subset
 * (block mappings, block sequences, comments, scalars, nested `config:`).
 *
 * What it models, and why each part is enough for the manifest:
 *  - `key: value` block mappings and `- item` block sequences, nested by
 *    indentation;
 *  - comments (`#`) are dropped **whole-line only when the line is not a
 *    sequence item**, and otherwise stripped from the end. Trailing comments
 *    are what once broke the check gate's own line regex (`- id: x  # note`),
 *    so the stripper has to be quote-aware;
 *  - scalars: single-quoted, double-quoted (with escapes), and plain. Plain
 *    scalars keep YAML's legality rule (see `PLAIN_ILLEGAL_START`), which is
 *    the property the historical bug violated.
 *
 * It is NOT a YAML implementation. Flow collections (`[...]`/`{...}`), block
 * scalars (`|`, `>`), anchors, aliases and tags are outside the subset: a
 * manifest that needs them needs a real parser, and this reader reports the gap
 * instead of guessing (`UnsupportedYaml`).
 *
 * The reader is also used by tools/test.mjs, which needs to rewrite a scalar in
 * a throwaway copy of the manifest (the mutation that proves the gate bites).
 * Writing is intentionally minimal: scalar values only, on the line that
 * already holds them, so the manifest's comments and layout survive untouched.
 *
 * Run-time wiring note: the two entries of a YAML mapping are represented as an
 * **array** rather than an object, so the parser never invents a key ordering or
 * a duplicate-key policy. `scalar()`/`listItems()` are the accessors, so no
 * caller has to know that.
 */

/**
 * A value the reader can produce.
 *
 * @typedef {string | number | boolean | null | YamlEntry[]} YamlValue
 */

/**
 * One mapping entry: `[key, value]`. An array, not an object, so duplicate keys
 * stay visible and no key ordering is implied.
 *
 * @typedef {[string, YamlValue]} YamlEntry
 */

/** A package name that can actually be resolved by an import or a loader. */
export const REGISTRY_NAME = /^(?:@[A-Za-z0-9][\w.-]*\/)?[A-Za-z0-9][\w.-]*$/;

/**
 * Characters YAML reserves: they may not begin a plain scalar. `@` and `` ` ``
 * are reserved outright in every version of the spec, and this is the rule the
 * historical `id: @nydsg/dsh-mindmap` bug violated.
 */
const PLAIN_ILLEGAL_START = /^[@`]/;

/**
 * Characters that end a plain scalar: `: ` or ` #` open another node.
 */
const PLAIN_END = /:\s| #/;

/** Reported when the document uses YAML this reader does not implement. */
export class UnsupportedYaml extends Error {
	/**
	 * @param line - 1-based line number of the construct.
	 * @param detail - what is unsupported.
	 */
	constructor(line, detail) {
		super(`line ${line}: ${detail} is outside the manifest subset this reader implements`);
		this.name = "UnsupportedYaml";
	}
}

/**
 * Strip the indentation of a line and report it.
 *
 * @param raw - one source line.
 * @returns its indent width and the text after it.
 */
function indentOf(raw) {
	const expanded = raw.replace(/\t/g, "    ");
	const match = expanded.match(/^( *)(.*)$/);
	return { indent: match[1].length, text: match[2] };
}

/**
 * Remove a trailing comment from a non-comment line, respecting quotes.
 *
 * A `#` only starts a comment when it opens a token — at the start of the text
 * or after whitespace — which is also why a `#` inside `dsh#1` stays put.
 *
 * @param text - line text without its indentation.
 * @returns the text with any trailing comment removed.
 */
function stripComment(text) {
	let quote = null;
	for (let i = 0; i < text.length; i += 1) {
		const ch = text[i];
		if (quote === "'") {
			// Inside single quotes only '' is special, and it does not end the quote.
			if (ch === "'") {
				if (text[i + 1] === "'") i += 1;
				else quote = null;
			}
			continue;
		}
		if (quote === '"') {
			if (ch === "\\") i += 1;
			else if (ch === '"') quote = null;
			continue;
		}
		if (ch === "'" || ch === '"') {
			quote = ch;
			continue;
		}
		if (ch === "#" && (i === 0 || /\s/.test(text[i - 1]))) return text.slice(0, i);
	}
	return text;
}

/**
 * Read one scalar the way YAML would, or report why it cannot be read.
 *
 * @param raw - the scalar text (already comment-stripped and trimmed).
 * @param line - 1-based line number, for diagnostics.
 * @returns the value, or `{ error }`.
 */
export function readScalar(raw, line) {
	const text = raw.trim();
	if (text === "") return { value: null };
	if (text.startsWith("'")) {
		if (!text.endsWith("'") || text.length < 2) return { error: `line ${line}: unterminated single-quoted scalar` };
		return { value: text.slice(1, -1).replace(/''/g, "'") };
	}
	if (text.startsWith('"')) {
		if (!text.endsWith('"') || text.length < 2) return { error: `line ${line}: unterminated double-quoted scalar` };
		const body = text.slice(1, -1);
		let out = "";
		for (let i = 0; i < body.length; i += 1) {
			if (body[i] !== "\\") {
				out += body[i];
				continue;
			}
			i += 1;
			const escape = body[i];
			if (escape === undefined) return { error: `line ${line}: dangling escape in double-quoted scalar` };
			const simple = { n: "\n", t: "\t", r: "\r", '"': '"', "\\": "\\", "/": "/", "0": "\0" };
			if (escape in simple) out += simple[escape];
			else return { error: `line ${line}: unsupported escape \\${escape} in double-quoted scalar` };
		}
		return { value: out };
	}
	if (text.startsWith("[") || text.startsWith("{")) throw new UnsupportedYaml(line, "a flow collection");
	if (text.startsWith("|") || text.startsWith(">")) throw new UnsupportedYaml(line, "a block scalar");
	if (text.startsWith("&") || text.startsWith("*") || text.startsWith("!")) throw new UnsupportedYaml(line, "an anchor, alias or tag");
	if (PLAIN_ILLEGAL_START.test(text)) return { error: `line ${line}: a plain scalar may not start with ${JSON.stringify(text[0])} — quote it` };
	if (/^null$/i.test(text) || text === "~") return { value: null };
	if (/^(true|yes|on)$/i.test(text)) return { value: true };
	if (/^(false|no|off)$/i.test(text)) return { value: false };
	if (/^-?\d+$/.test(text)) return { value: Number(text) };
	return { value: text };
}

/**
 * Whether a plain scalar token would be legal YAML.
 *
 * Exported because the gate states the rule in its own words and the test suite
 * asserts on the rule rather than on this implementation.
 *
 * @param token - candidate plain scalar.
 * @returns true when YAML would accept it unquoted.
 */
export function plainScalarIsLegal(token) {
	const text = String(token);
	if (text === "") return false;
	if (PLAIN_ILLEGAL_START.test(text)) return false;
	if (PLAIN_END.test(text)) return false;
	if (/^[-?:,\][{}#&*!|>'"%@`]/.test(text)) return false;
	return true;
}

/**
 * Bind a parsed node's value for use as a *value* (a mapping's member or a
 * sequence's item).
 *
 * A block sequence is a list of items and a block mapping is a list of entries;
 * both are already in the entry-list form callers read, so a sequence's value is
 * its items and a mapping's value is its entries. Neither is wrapped again —
 * wrapping a sequence here would make `insert:` read as one row whose key is
 * `"0"`, and every consumer would then have to know the difference.
 *
 * @param node - a parsed block node.
 * @returns the node's value.
 */
function bindValue(node) {
	return node.kind === "sequence" ? node.items : node.value;
}

/**
 * Bind a parsed node for use as the document root, where a bare sequence is the
 * patch list itself and is addressed by position.
 *
 * @param node - a parsed block node.
 * @returns the node's value as a keyed entry list.
 */
function bindDocument(node) {
	if (node.kind === "sequence") return node.items.map((item, i) => [String(i), item]);
	return node.value;
}

/**
 * Parse the node that begins at `tokens[start]` at exactly `indent`.
 *
 * @param tokens - tokenized lines.
 * @param start - index to begin at.
 * @param indent - indentation this node must sit at.
 * @returns the parsed node, the index after it, and any error.
 */
function parseNodeAt(tokens, start, indent) {
	const first = tokens[start];
	if (first.indent !== indent) return { error: `line ${first.line}: unexpected indentation (${first.indent} instead of ${indent})`, index: start };
	if (first.text === "-" || first.text.startsWith("- ")) return parseSequence(tokens, start, indent);
	return parseMapping(tokens, start, indent);
}

/**
 * Parse a block mapping at `indent`.
 *
 * @param tokens - tokenized lines.
 * @param start - index of the first token.
 * @param indent - the mapping's indentation.
 * @returns the parsed node, the index after it, and any error.
 */
function parseMapping(tokens, start, indent) {
	const value = [];
	let index = start;
	while (index < tokens.length) {
		const token = tokens[index];
		if (token.indent < indent) break;
		if (token.indent > indent) return { error: `line ${token.line}: unexpected indentation under a mapping at indent ${indent}`, index };
		if (token.text === "-" || token.text.startsWith("- ")) break;
		const split = token.text.match(/^([^:]+):(?:\s+(.*))?$/);
		if (split === null) return { error: `line ${token.line}: expected \`key: value\``, index };
		const key = readScalar(split[1], token.line);
		if (key.error !== undefined) return { error: key.error, index };
		const inline = split[2] === undefined ? "" : split[2];
		if (inline !== "") {
			const scalar = readScalar(inline, token.line);
			if (scalar.error !== undefined) return { error: scalar.error, index };
			value.push([String(key.value), scalar.value]);
			index += 1;
			continue;
		}
		index += 1;
		if (index < tokens.length && tokens[index].indent > indent) {
			const child = parseNodeAt(tokens, index, tokens[index].indent);
			if (child.error !== undefined) return { error: child.error, index: child.index };
			value.push([String(key.value), bindValue(child)]);
			index = child.index;
		} else {
			value.push([String(key.value), null]);
		}
	}
	return { kind: "mapping", value, index };
}

/**
 * Parse a block sequence at `indent`.
 *
 * `- key: value` starts a mapping whose first entry sits on the dash line; the
 * following keys are indented past the dash, which is the shape every loader
 * row has.
 *
 * @param tokens - tokenized lines.
 * @param start - index of the first `- ` token.
 * @param indent - the sequence's indentation.
 * @returns the parsed node, the index after it, and any error.
 */
function parseSequence(tokens, start, indent) {
	const items = [];
	let index = start;
	while (index < tokens.length) {
		const token = tokens[index];
		if (token.indent !== indent) break;
		if (!(token.text === "-" || token.text.startsWith("- "))) break;
		const rest = token.text === "-" ? "" : token.text.slice(2).trim();
		if (rest === "") {
			index += 1;
			if (index < tokens.length && tokens[index].indent > indent) {
				const child = parseNodeAt(tokens, index, tokens[index].indent);
				if (child.error !== undefined) return { error: child.error, index: child.index };
				items.push(bindValue(child));
				index = child.index;
			} else {
				items.push(null);
			}
			continue;
		}
		// The dash's content is a mapping or a scalar. When the content is a
		// mapping, its sibling keys sit at one indent past the dash's content
		// column, which is the indent of the next line — so the continuation
		// indent is read from that line rather than computed from the dash. (It
		// cannot be computed from the dash: YAML allows the first key of an item
		// to sit directly after `- `, while every following key must be indented,
		// and the `- ` column belongs to the parent, not to the item.)
		const inline = rest.match(/^(.+?):(?:\s+(.*))?$/);
		if (inline === null || /^["']/.test(rest)) {
			const scalar = readScalar(rest, token.line);
			if (scalar.error !== undefined) return { error: scalar.error, index };
			items.push(scalar.value);
			index += 1;
			continue;
		}
		const head = readScalar(inline[1], token.line);
		if (head.error !== undefined) return { error: head.error, index };
		const item = [];
		const headKey = String(head.value);
		if (inline[2] !== undefined && inline[2] !== "") {
			const scalar = readScalar(inline[2], token.line);
			if (scalar.error !== undefined) return { error: scalar.error, index };
			item.push([headKey, scalar.value]);
		} else {
			item.push([headKey, null]);
		}
		index += 1;
		// The item continues at a deeper indent. `- insert:` is followed by the
		// inserted list (`- `) and becomes that key's value; `- id: 'x'` is
		// followed by the item's remaining keys, which merge in beside it. A
		// continuation that starts with `- ` can only be the value of the dash's
		// key — YAML would not accept it as a sibling of that key — so the shape of
		// the FIRST continuation decides which of the two this is, and the merge
		// must preserve that continuation as a single value.
		if (index < tokens.length && tokens[index].indent > indent) {
			const deeper = tokens[index];
			const bareKey = inline[2] === undefined || inline[2] === "";
			if (bareKey) {
				const nested = parseNodeAt(tokens, index, deeper.indent);
				if (nested.error !== undefined) return { error: nested.error, index: nested.index };
				item[item.length - 1] = [headKey, bindValue(nested)];
				index = nested.index;
			}
			while (index < tokens.length && tokens[index].indent > indent) {
				const more = parseMapping(tokens, index, tokens[index].indent);
				if (more.error !== undefined) return { error: more.error, index: more.index };
				for (const entry of more.value) item.push(entry);
				index = more.index;
			}
		}
		items.push(item);
	}
	return { kind: "sequence", items, index };
}

/**
 * Tokenize a manifest into content lines, dropping blank lines and comments.
 *
 * @param text - the manifest source.
 * @returns tokens, each with 1-based line number, indent and text.
 */
function tokenize(text) {
	const tokens = [];
	const lines = text.split(/\r?\n/);
	for (let i = 0; i < lines.length; i += 1) {
		const { indent, text: body } = indentOf(lines[i]);
		const trimmed = body.trimEnd();
		if (trimmed === "") continue;
		// A whole-line comment carries no structure. A `#` inside an indented
		// document is still a comment when it opens the content.
		if (trimmed.startsWith("#")) continue;
		const withoutComment = stripComment(trimmed).trimEnd();
		if (withoutComment.trim() === "") continue;
		tokens.push({ line: i + 1, indent, text: withoutComment });
	}
	return tokens;
}

/**
 * Parse a manifest document.
 *
 * Never throws for bad *YAML*: it returns `{ error }` so a gate can report every
 * problem instead of dying on the first. It does throw `UnsupportedYaml` for
 * constructs outside the subset, because silently mis-reading those would be
 * worse than stopping.
 *
 * @param text - manifest source.
 * @returns the parsed value (or null when empty), and an error string when the document is invalid.
 */
export function parseYaml(text) {
	let tokens;
	try {
		tokens = tokenize(text);
	} catch (error) {
		return { value: null, error: String(error.message ?? error) };
	}
	if (tokens.length === 0) return { value: [], error: null };
	const rootIndent = Math.min(...tokens.map((token) => token.indent));
	const first = tokens.findIndex((token) => token.indent === rootIndent);
	if (first > 0) return { value: null, error: `line ${tokens[0].line}: indented document start` };
	try {
		const node = parseNodeAt(tokens, first, rootIndent);
		if (node.error !== undefined) return { value: null, error: node.error };
		if (node.index !== tokens.length) {
			return { value: null, error: `line ${tokens[node.index].line}: trailing content after the document root` };
		}
		// A block sequence and a block mapping both parse into a list of entries, so
		// callers read either shape with `scalar`/`listItems` without caring which
		// one the document used (a patch layer is a sequence in practice).
		return { value: bindDocument(node), error: null };
	} catch (error) {
		// A construct outside the subset is a failure to report like any other:
		// the gate must be able to say what it could not read, not crash on it.
		if (error instanceof UnsupportedYaml) return { value: null, error: error.message };
		throw error;
	}
}

/**
 * Read a value produced by `parseYaml` as a mapping entry, by key.
 *
 * @param node - a parsed value.
 * @param key - the key to look up.
 * @param fallback - returned when absent.
 * @returns the value, or the fallback.
 */
export function scalar(node, key, fallback = undefined) {
	if (!Array.isArray(node)) return fallback;
	for (const entry of node) {
		if (Array.isArray(entry) && entry[0] === key) return entry[1];
	}
	return fallback;
}

/**
 * Read a value produced by `parseYaml` as sequence items.
 *
 * @param node - a parsed value.
 * @returns the items, or an empty list.
 */
export function listItems(node) {
	return Array.isArray(node) ? node.map((entry) => (Array.isArray(entry) ? entry[1] : null)) : [];
}

/**
 * Quote a scalar for YAML.
 *
 * @param value - the value to write.
 * @param style - preferred style when quoting is needed.
 * @returns the scalar as it should appear in the document.
 */
export function quoteScalar(value, style = "single") {
	const text = String(value);
	if (plainScalarIsLegal(text) && !/^[-?:,\][{}#&*!|>'"%@`]/.test(text)) return text;
	if (style === "double") return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
	return `'${text.replace(/'/g, "''")}'`;
}

/**
 * Rewrite one scalar in a manifest, on the line that already holds it.
 *
 * This is a *mutation helper for the test suite*, not a YAML writer: it keeps
 * every other byte — comments, blank lines, key order — exactly as it was, so a
 * mutation case can reintroduce one historical bug without touching anything
 * else. Returns the input unchanged when the anchor is absent, which is how the
 * suite detects that a mutation no longer applies.
 *
 * @param text - manifest source.
 * @param key - mapping key on the target line.
 * @param to - replacement scalar text (written verbatim, so it can be deliberately illegal).
 * @param occurrence - which matching line to rewrite, 1-based.
 * @returns the rewritten document.
 */
export function rewriteScalar(text, key, to, occurrence = 1) {
	const lines = text.split(/\r?\n/);
	let seen = 0;
	for (let i = 0; i < lines.length; i += 1) {
		const { text: body } = indentOf(lines[i]);
		const stripped = stripComment(body).trimEnd();
		const match = stripped.match(new RegExp(`^(\\s*(?:-\\s+)?${key}\\s*:\\s*)(.*)$`));
		if (match === null) continue;
		seen += 1;
		if (seen !== occurrence) continue;
		// Keep whatever followed the scalar — a trailing comment — and the line's
		// original indentation.
		const trailing = body.slice(stripped.length);
		lines[i] = `${match[1]}${to}${trailing}`;
		return lines.join("\n");
	}
	return text;
}

/**
 * Rewrite a scalar on the nth line that *contains* an anchor, replacing the
 * first match of `pattern` — the escape hatch for mutations that target a value
 * rather than a key.
 *
 * @param text - manifest source.
 * @param pattern - regular expression matched against each line.
 * @param replacement - replacement for the first match on that line.
 * @returns the rewritten document.
 */
export function rewriteLine(text, pattern, replacement) {
	const lines = text.split(/\r?\n/);
	for (let i = 0; i < lines.length; i += 1) {
		if (!pattern.test(lines[i])) continue;
		lines[i] = lines[i].replace(pattern, replacement);
		return lines.join("\n");
	}
	return text;
}
