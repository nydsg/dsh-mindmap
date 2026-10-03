# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.1] — a 回溯 claim is harder to earn (threshold 0.40 → 0.50)

### Changed

- **`LINK_MIN_SCORE` rose from 0.40 to 0.50.** A turn is reported as 回溯分支
  (rejoining an older question) only when the shared-**signal** ratio clears a stricter
  bar. 0.40 was the midpoint of the measured gap; 0.50 sits well clear of the false class
  and *above the bottom of the genuine band*, so borderline pairs that used to be claimed
  as "I am returning to an earlier thread" fall back to the structural rule (按对话顺序下推)
  instead. Measured example of a pair that changes sides: `深色主题下卡片的对比度需要满足
  4.5:1 吗` continuing `思维导图的卡片配色能不能换成深色主题` scores **0.4391** — a real
  refinement of the immediately preceding question, and one where 下推 and 回溯 happen to
  name the same parent, so the tree barely moves while the *claim* gets more honest.
- **The trade, stated plainly**: the measured genuine band is 0.44–1.00, so pairs scoring
  0.44–0.50 are no longer linked as 回溯. Fewer, better-evidenced 回溯 links; more turns
  placed by conversation order. The false class tops out at 0.28, so the new threshold
  still keeps a wide margin from coincidence — and, unlike 0.30, it does not sit inside
  the noise band.

### Added

- **`tools/session-map.mjs` — draw a REAL conversation with the plugin's own judgment.**
  Every other tool here runs on fixtures; this one reads a session log under
  `~/.dsh/sessions` (multi-frame zstd, decompressed frame by frame), reconstructs each
  turn's question and reply, and runs the plugin's actual `resolveLinks` /
  `layerState` / `layoutTree` / `placeTree` / `edgePath` over them. It prints the three
  operations per turn with the score that decided them, prints the document's
  `{{MINDMAP_STATE}}`, and writes a standalone HTML page plus a PNG drawn from the
  plugin's own stylesheet and geometry. `node tools/session-map.mjs [sessionId|latest] [outDir] [--depth N]`.
  Two things it pins down that a text heuristic gets wrong: a real human turn is the
  record whose `data.source.kind === "user"`, while everything the harness splices in
  declares itself (`runtime-context`, `plugin:hindsight`, `tool-jobs`) — the
  `tool-jobs` notice in particular arrives where a question would and was being counted
  as a turn.
- **The threshold's VALUE is now pinned by `behaviour.mjs`** (`LINK_MIN_SCORE >= 0.5`),
  as a decided policy rather than a number nobody watches, and `test.mjs` grew a mutation
  case that lowers it back to 0.40 and proves the gate turns red. The three separation
  assertions around it now compare against `LINK_MIN_SCORE` itself instead of a hardcoded
  `0.4`, so they can no longer describe a rule the code stopped implementing.

## [1.4.0] — 智能分层: the document's three operations, and a model judge

Implements the requirement document *DSH-Mindmap 智能分层提示词*: the map is now
built from the document's three operations — **父类下推 (push) / 换行新建
(sibling) / 回溯分支 (branch)** — with the document's system prompt, user template,
variable set, and configuration landed as plugin assets, and an OPTIONAL model
judge behind a local host bridge. The offline lexical engine stays the default.

### Added — the layering protocol (offline)

- **The three operations are the map's vocabulary.** Every card's badge now names
  the operation rather than only the mechanism: a wording match to an older
  question is `[回溯]`, continuing the previous turn is `[下推]`, a turn placed
  beside its predecessor is `[换行]`, and a model judgment reports the operation it
  chose. `tools/layering.mjs` owns this surface.
- **The documented level cap (最大层级 = 5) drives a real third outcome.**
  `LINK_MAX_DEPTH` (from the document's 判断逻辑 / 配置建议) places a turn that
  would land deeper than the cap BESIDE its predecessor instead of below it —
  the document's 换行新建 — so a long conversation grows sideways at the cap
  instead of marching off to the right. `0` disables the cap and a hand pin is
  exempt from it (a pin is an instruction, the cap is a default).
- **The global state is derived, then rendered.** `layerState` turns the turns plus
  their resolved links into the document's `{{MINDMAP_STATE}}`: ordered nodes with
  operation, depth, and parent, plus the Markdown nested list. It is never stored,
  so it cannot disagree with the tree it describes. No synthetic title line is
  emitted — the drawn title repeats the first question by design, and handing the
  model the same question twice would be exactly the "obvious wrong nesting" the
  document's 验收标准 forbids.
- **The fragment protocol, both transports.** `parseLayerFragment` reads the
  document's Markdown form (`[下推] / [换行] / [回溯]`, Chinese or English marker,
  fenced or bare, chatty or clean) and its JSON alternative (`operation` with
  `path`/`labels`/`label`). An unparsable reply is REPORTED (`ok: false` with a
  reason and the raw text), never guessed at.
- **`layerFragmentMarkdown`** renders the document's output format: the operation
  marker on the first line, then the Markdown nested list, with node labels clipped
  to `{{NODE_MAX_CHARS}}`.

### Added — the prompt assets and configuration

- **The document's system prompt and user-input template, verbatim**, as
  `LAYER_SYSTEM_PROMPT` / `LAYER_USER_TEMPLATE`, with the documented variables
  (`MAX_DEPTH`, `NODE_MAX_CHARS`, `LANGUAGE`, `OUTPUT_FORMAT`, `MINDMAP_STATE`,
  `LAST_NODE`, `CURRENT_QUESTION`, `CURRENT_ANSWER`) substituted before a call. The
  「智能分层」 panel shows and copies all of it, and the effective configuration is
  appended to the system prompt so what was sent is auditable.
- **Configuration with the document's numbers as defaults and its stability band
  ENFORCED**: 层级上限 5 (0 = 不限), 节点字数 15, 输出语言 中文, 输出格式 Markdown 嵌套
  列表, and 模型温度 clamped into 0.2–0.5. Every field degrades to its default on
  bad input instead of poisoning the tree.

### Added — the optional model judge

- **A local host bridge (`lib/index.js`, two exact routes).** The client half cannot
  reach a model (a browser bundle gets no `llm` service and no host-call channel),
  so the host half owns one thing: `POST /plugin-mindmap/layer` streams a call
  through `ctx.llm.stream` and answers with the model's raw text;
  `GET /plugin-mindmap/info` reports whether a call is possible and which route it
  would take (the profile's own default model selection). No generated Typert
  schema and no build step, which is why this is a route and not a Remote.
- **Bounded by construction**: two exact paths, JSON only, a 256 KiB body cap, a
  2000-token cap, a temperature clamp, a timeout, and cancellation when the page
  goes away — and a failed call is answered as a failure (`502`) rather than as an
  empty success. `tools/host.mjs` drives all of it against a fake context.
- **A run judges turns in order and keeps the state current** (the document's 状态维护
  rule), bounded by a turn limit, cancellable, and visible as progress. Judgments are
  stored per session; turning the model judge off keeps them but stops them shaping
  the tree, and a hand pin always wins over a model judgment.
- **The offline judge keeps its measured rule.** Where the document says "无法判断归属
  → 换行新建", the offline engine still continues the previous turn — because this
  repo measured that real follow-ups are pronoun-like and scored 0.00–0.33 on every
  overlap measure (see 1.3.0 below). The document's rule is implemented literally on
  the model path, where a model can actually judge it.

### Fixed

- **A second gate blind spot, found while adding this: `registration.mjs` never
  rendered the view.** Its React stub recorded `type` without invoking function
  components and never put children into `props.children`, so `MindMapBoundary`
  returned `undefined` and every render assertion was vacuous — a body that crashed
  would have stayed green. The stub now models both, the gate expands function
  components, and it fails when the crash panel appears or when the layering surface
  (panel, operation tally, the three operation names) is missing.
- **A TDZ crash in the view**: the model-run callback listed `model.turns` in its
  dependency array above `model`'s own declaration, which throws on the first render.

## [1.3.0] — a question follows the answer before it

### Changed — the matching rule

- **A turn with no wording match now continues the turn immediately before it,
  instead of starting its own branch.** In a conversation the next question follows
  the last answer; that is structure, and it no longer has to be earned by scoring
  above a threshold. Three kinds of link are labelled separately, because they are
  three different claims: `自动匹配 {score}` (a wording match to an earlier
  question), `接上一轮` (a structural continuation), `手动指定`.
- **The two-step similarity rule from 1.2.0 is withdrawn.** It required a wording
  score of `0.40` and, failing that, a "context resonance" of `0.65` before a turn
  could be treated as continuing anything. Measured against this machine's real
  sessions by the new `tools/measure-sessions.mjs`:

  | Measure | Real follow-ups |
  |---|---|
  | Wording score reaching `0.40` | 0 / 9 |
  | Best resonance with the previous turn | 0.33 |
  | Follow-ups the old rule sent to their own branch | 9 / 9 |

  Real follow-ups are pronoun-like and short ("是对的", "我在终端执行完了") and repeat
  almost none of the previous reply's nouns, so **no similarity threshold can
  decide "does this continue the previous turn"**: a gate high enough to refuse a
  topic change refuses real follow-ups too. After the fix, the same data gives
  9 of 9 chained and 0 misjudged.

### Added

- **`tools/measure-sessions.mjs`** — measures the rule against the sessions actually
  on this machine. It decompresses the multi-frame zstd logs under
  `~/.dsh/sessions` (a single `zstdDecompressSync` call returns only the 199-byte
  session header of a multi-megabyte file), reconstructs each turn's question and
  reply from the `user/message` and `assistant/message` records, and filters out
  host-injected blocks, which arrive as user messages too and would otherwise look
  like perfect continuations of each other.

### Removed

- **The context signal** (`contextTextOf` / `contextVectors` / `contextResonance` /
  `contextCandidates`, `LINK_CONTEXT_MIN_SCORE`) and `tools/context-experiment.mjs`.
  Its only evidence was a fixture I wrote myself, and on real follow-ups it fired
  once in nine. Keeping an unvalidated mechanism because it looks sophisticated is
  the thing this project's own README warns against.

### Fixed

- **A gate blind spot, found by mutation.** The behaviour gate asserted where a
  wording match attaches but not that it *is* a wording match, so dropping
  `LINK_MIN_SCORE` to zero stayed green. It now asserts the link kind and the score
  as well. The one mutation that remains uncoverable — lowering the threshold — was
  deleted rather than papered over; the reason is recorded in `tools/test.mjs`.

## [1.2.0] — the next question can link on context, not only on wording

> **Superseded by 1.3.0.** The mechanism added here did not survive measurement and
> was removed; see 1.3.0. It is kept in the record because the way it failed is the
> useful part.

### Added

- **Context links.** A new turn can now attach to an earlier turn because that turn
  was already discussing what the new question asks about — its reply and its tool
  calls, not just its question. This is the case the plugin used to get wrong: a
  follow-up like "`--mm-line-strong` 在小字上够 4.5:1 吗" shares no wording with any
  question (the flag was introduced by a *reply*), so it used to start its own
  branch. It now links, labelled `语境续接` / `context 0.75` instead of being
  silently reported as a wording match.
- **`tools/context-experiment.mjs`** — the labelled-case harness that decided the
  new gate, kept in the repo so the number can be re-derived rather than trusted.
  It prints both scores, the winner under each, and a gate sweep.

### Changed

- **Two signals, a strict division of labour — not a blend.** The question signal
  decides whenever it can, because it is the one measured to separate cleanly at
  the question level. The context signal is consulted **only when the question
  signal is silent**. Adding them was rejected: the two scores answer different
  questions ("did this continue that question" vs "was this already discussed in
  that turn"), so a long reply would otherwise outvote an explicit question match.
- **The context gate (`0.65`) comes from a measured gap.** A genuine context
  continuation scores 0.75–0.78; the case that must be refused — a reply that
  merely *names* a term the next question asks about — reaches 0.50. The sweep
  shows 0.50–0.75 score identically on the current cases and 0.80 starts losing
  real links, so 0.65 is the midpoint of the gap rather than a fitted value.
- **Document frequency still counts QUESTIONS, never replies.** A term that also
  appears in some reply is not demoted for it; otherwise one chatty answer would
  redefine the session's background and reweight every other score. This is
  asserted directly, because no end-to-end case pins it.

### Fixed

- **The matcher threw on a turn with no module list.** `contextTextOf` called
  `turn.modules.filter`, which breaks any caller whose turns carry only text — the
  gates' own fixtures, and any projection that grows or loses a field. It now
  degrades to "no context from here", the same tolerance the rest of the plugin
  applies to projection data.

### Notes

- Both signals stay local: no network, no model calls. A lexical engine still
  cannot detect a paraphrase that shares **no** vocabulary at all ("怎么装插件" vs
  "插件如何安装"); that is unchanged and still needs a manual pin.

## [1.1.0] — one hierarchy entered from the left, and a flat surface

### Added

- **Left-hand title node** — the map now starts at a single node in the leftmost
  column whose text is the **first turn's question**, and every branch root hangs
  off it. The structure is therefore one tree entered from the left rather than
  several equal-weight starting points with no visible beginning. The title is
  not a turn: it owns no modules, cannot be selected, and contributes no
  connector of its own.
- **`chart.levels` readout** — the header reports how many columns are drawn,
  replacing the "N branch roots" line, which described a shape the map no longer
  draws.
- **Manifest gate** — `check.mjs` now parses `cordis.patch.yml` and validates the
  loader row (exactly one, matching the package name, resolvable, no duplicate
  id). Two mutation cases prove it bites.

### Changed

- **Flat surface** — cards are a 1px outline and a solid fill with square
  corners: no radius, no shadow, no gradient. The title is drawn with a stronger
  1px outline and no accent bar, so it reads as the start of the map rather than
  as one more branch.
- **Orthogonal connectors** — the parent → child connector is now a straight
  elbow (right, across the gap, then into the child's left edge) instead of a
  bezier. Two nodes on the same row connect with a single straight line.
- The first level below the title is marked as an entry branch (`起始分支`) rather
  than as a "branch root"; the similarity forest underneath is unchanged, so the
  branch panel and the manual controls keep working exactly as before.

### Fixed

- **`cordis.patch.yml` could not be parsed, and the plugin therefore could not be
  installed at all.** The loader row's `id` was written as an unquoted
  `@nydsg/dsh-mindmap`. `@` is a reserved indicator in YAML, so a plain scalar may
  not begin with it; js-yaml 4 rejects the whole file with `bad indentation of a
  mapping entry`, and `dsh plugin add` rolls the installation back. Both scalars
  are quoted now, and the new manifest gate would have caught it.

## [1.0.0] — first public release

The first release intended for other people to install. Everything below was
built and verified in a working DSH Desktop, and the plugin's own gates are
included so a change can be checked without a browser.

### Added

- **Mind-map view tab** — a third session view beside 对话 / 轨迹, registered
  into the `conversation.view` slot. It changes no existing surface.
- **Horizontal branch tree** — one card per turn, laid out left to right
  (column = branch depth, row = tidy-tree slot), with a bezier connector drawn
  from each parent card's right edge to its child's left edge.
- **Automatic branching** — each turn's question is matched against every earlier
  question and continues the best one above a threshold, or starts its own
  branch. Scoring is a shared-signal ratio over session-IDF weights, not a raw
  cosine; see the README for why a cosine threshold cannot separate the cases.
- **Manual branch control** — pin a card under any earlier turn, force it to a
  new branch, or hand it back to the matcher; per-session persistence in
  `localStorage`. A pinned card is never re-derived.
- **Card face shows only the question** — number, branch badge, question text,
  module count. Replies are not on the card.
- **Side panel** — the selected card's module rows (reply / tool calls /
  injected context), and for a selected row: the reply text, keyword weights,
  the backward analysis over earlier turns, and suggested follow-ups that load
  into the composer.
- **Depth control** — limit how many levels are drawn below each branch root;
  a folded subtree reports how many nodes it hides and expands in place.
- **Keyword filter** — non-matching cards dim rather than disappear, so the tree
  never lies about its own shape.
- **Outline export** — copy the whole map as Markdown.
- **Three offline gates** — `check` (syntax, plugin face, CSS token integrity,
  no hardcoded colours), `behaviour` (segmentation, keyword weighting, branch
  scoring and separation, layout geometry), `registration` (the `inject` face
  contract, structural invariants of the view).
- **Mutation verification** — `tools/test.mjs` reintroduces each historical bug
  into a throwaway copy and asserts the named gate turns red; a green suite that
  cannot fail proves nothing.

### Notes

- All analysis runs locally in the browser. No network requests, no model calls.
- The plugin is client-only: the host half is an empty `apply()`.
- No build step. `lib/client.js` is a hand-authored `window.__ModuleLoader__.load`
  lazy-CJS bundle using `React.createElement`.
