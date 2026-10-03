# @nydsg/dsh-mindmap

[![test](https://github.com/nydsg/dsh-mindmap/actions/workflows/test.yml/badge.svg)](https://github.com/nydsg/dsh-mindmap/actions/workflows/test.yml)
[![npm](https://img.shields.io/npm/v/@nydsg/dsh-mindmap)](https://www.npmjs.com/package/@nydsg/dsh-mindmap)
[![license](https://img.shields.io/npm/l/@nydsg/dsh-mindmap)](LICENSE)
[![dsh-plugin](https://img.shields.io/badge/dsh--plugin-yes-blue)](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)

**[中文](README.md) · English**

Renders a DSH conversation as one **horizontal hierarchy**: a single **title node** on the far left (its text is the **first question** of the session), then every turn opens **rightwards**, one level at a time (column = depth, row = tidy-tree slot). Each card shows **only your question**. The plugin compares each turn's question against every earlier one and continues the closest branch; when nothing is close enough, the turn starts a new branch hanging off the title. The whole map is **flat**: 1px outlines, solid fills, square corners, no shadows, no gradients, and orthogonal connectors.

Select a card and the side panel lists that turn's modules (reply / tool calls / injected context); click a row for its details. The same panel lets you **re-attach a turn by hand**.

**Everything is computed locally: no network requests, no model calls, no build step.**

> **Since 1.4.0 there is also an opt-in path: the MODEL JUDGE.** It hands the requirement document's system prompt (see [Smart layering](#smart-layering-push--sibling--branch)) plus the mind map's global state to **the model you already configured in DSH**, lets it decide whether a turn is a 下推 / 换行 / 回溯, and pins the result onto the same map. The host half exposes one **local HTTP bridge** (`/plugin-mindmap/*`) for that, and it is called only when you press "Run the model judge" — the default stays the offline wording judge, and nothing is sent unless you ask.

![the mind-map view](docs/screenshot.png)

## Install

```bash
dsh plugin --profile web add @nydsg/dsh-mindmap
```

Restart Harness and a third tab — **Map** — appears next to Chat and Trajectory. No existing surface is changed.

> That command goes through npm. If the package is not published yet (`npm view @nydsg/dsh-mindmap` finds nothing), mount it from source using the [local development install](#local-development-install) below.

Also available through the **DSH plugin market**, which is fed by the curated
[awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
list (once listed).

## What it does

| Capability | Detail |
|---|---|
| Map tab | A third session view beside Chat / Trajectory. Registers into the `conversation.view` slot and touches nothing else |
| Title node | One node in the leftmost column whose text is the **first question**. It is not a turn: it owns no modules, cannot be selected, and produces no connector of its own |
| Horizontal hierarchy | Column = depth, row = arrangement. A parent connects to its children with an orthogonal elbow. Card positions are **computed**, never measured from the DOM |
| Single entry point | Every branch root hangs off the title, so the map has exactly **one** starting point. `N first branches` at the bottom of the title says how many |
| Automatic branching | Each question is matched against every earlier question; above the threshold it continues the best one, otherwise it starts a new branch (scoring below) |
| Chains to the previous turn | When the wording matches no earlier question, the turn becomes a **child of the turn before it**: in a conversation the next question follows the last answer, which is structure rather than a guess. Labelled `chained`, kept distinct from a wording match |
| Cards show only questions | Number + branch badge + question text (up to 4 lines) + module count. Replies are not on the card |
| Manual branch control | Pin a card under any earlier turn, force it to a new branch, or hand it back to the matcher; one click clears every manual link |
| Similarity candidates | The panel lists the 5 closest earlier questions with their scores — click one to attach under it |
| Persistence | Manual links are stored per session in `localStorage` and survive a reload; **a hand-made link is never overwritten by the matcher** |
| Module panel | Selecting a card lists that turn's module rows; clicking a row shows its reply text, keyword-weight bars, backward analysis, and suggested follow-ups |
| Depth control | The toolbar limits how many **branch** levels are drawn (the title is not one of them). A folded subtree offers "N more continuations" and expands in place |
| Keyword filter | Matching cards stay normal, non-matching cards **dim instead of disappearing** (removing them would make a parent vanish and the structure would lie) |
| Operation badges | Every card names the document's **operation**: `[下推] chained` / `[换行] new side-by-side` / `[回溯] auto {score}`, and the toolbar tallies all three |
| Level cap | The document's **5 branch levels** is a hard rule: a turn that would go deeper is placed **beside** its predecessor (换行新建), so long sessions grow sideways instead of rightwards. Set 0 for uncapped |
| Layering panel | The side panel explains the three operations, exposes the variables (`{{MAX_DEPTH}}` and friends), the model route and temperature, and the progress/result of a model run |
| Copyable prompt | The document's **system prompt** and **user-input template** ship verbatim and can be copied in one click (the system prompt carries the run's effective configuration), along with the mind-map state and a single turn's fragment |
| Model judge (opt-in) | Judges turns one call at a time with your own model; judgments are stored per session, turning the switch off stops them shaping the tree, a hand pin always wins, and one button clears them |
| Outline export | Copy the whole map as a Markdown outline |
| Flat surface | 1px outlines, solid fills, square corners, no shadows, no gradients; connectors are 1px orthogonal elbows |
| Offline | By default all analysis happens in the browser. No network, no model calls |

## How a branch is decided

Two rules, and the **order** is the whole design:

1. **A wording match wins.** If this question shares enough **signal words** with an
   earlier turn's *question* (score = shared signal weight ÷ the smaller side's
   signal weight, threshold `0.50`), it attaches under that turn. This is the only
   evidence that a turn is *rejoining a specific older thread*.
2. **Otherwise it continues the previous turn.** In a conversation the next question
   follows the last answer. That is **structure**, not a guess, so it does not have
   to earn the link by similarity.
3. **The first turn** starts the map under the title.

Three kinds of link are labelled separately in the UI, because they are three
different claims: `自动匹配 {score}` (a wording match), `接上一轮` (a structural
continuation), `手动指定` (you set it). Since 1.4.0 those labels also carry the
document's **operation name** (`[回溯]` / `[下推]` / `[换行]`), because "which node does
this attach to" and "which operation is this" are two faces of one decision — see
[Smart layering](#smart-layering-push--sibling--branch).

### Why "continue the previous turn" cannot be a similarity test (the trap this project fell into)

The previous release treated rule 2 as a weak guess that needed **lexical evidence**:
first require a wording score of `0.40`, then require a "context resonance" of `0.65`,
and only call the turn a new branch when both fail.

**It almost never fired.** Measured on this machine's real sessions with
[`tools/measure-sessions.mjs`](tools/measure-sessions.mjs) — which decompresses the
multi-frame zstd logs under `~/.dsh/sessions` and keeps human questions only:

| Measure | Result on real follow-ups |
|---|---|
| Wording score reaching `0.40` | **0 / 9** |
| Best "resonance with the previous turn" | **0.33** |
| Follow-ups the old rule sent to their own branch | **9 / 9** |

The cause is that **a real follow-up is pronoun-like and short** ("是对的", "那接下来呢",
"I finished running it in the terminal"): it repeats almost none of the previous
reply's nouns. So:

- no **similarity threshold** can decide "does this continue the previous turn" on
  real data — a gate high enough to refuse a topic change is high enough to refuse
  real follow-ups too;
- similarity only earns its keep in rule 1, where **returning to an older topic**
  really does make the question say that topic's words again.

After the fix, the same data gives **9 of 9 follow-ups chained, 0 misjudged**.

> The cost, stated plainly: a question that genuinely changes the subject (say,
> "what's for dinner" in the middle of a technical thread) also becomes a child of the
> previous turn instead of starting its own tree. That is a deliberate trade —
> "open in conversation order" beats "cluster by topic" — and pinning a turn as a new
> branch corrects it at any time.

### How the wording score works

Every question has two kinds of words: **background words** shared by the whole
session (product names, "how", file names) and **signal words** belonging to only a
few questions (appearing ≤2 times in the session, or above that question's own median
IDF). **Score = shared signal weight ÷ the smaller side's signal weight**, threshold
`0.50`.

Why not cosine: measured on real cases (see [`tools/TEST-REPORT.md`](tools/TEST-REPORT.md)),
true links score 0.29–0.72 in cosine while **background-only** false matches score
0.16–0.20 — **no cosine threshold separates them**. With the signal ratio, true links
land at 0.44–1.00 and false matches at ≤0.28, a clean gap. **0.40 was that gap's
midpoint; since 1.4.1 it is deliberately raised to `0.50`** to make a 回溯 claim harder
to earn: 0.50 sits far from the false ceiling (0.28) and *above the bottom of the true
band*, so borderline pairs in 0.44–0.50 (measured example: `深色主题下卡片的对比度需要
满足 4.5:1 吗` continuing `思维导图的卡片配色能不能换成深色主题` = **0.4391**) are no
longer claimed as "returning to an older thread" and fall back to conversation order
instead. The trade: **fewer 回溯 links, each better evidenced** — and since those two
turns are adjacent, 下推 and 回溯 name the same parent anyway, so the drawing barely
moves while the claim becomes honest. `behaviour.mjs` pins the value directly
(`LINK_MIN_SCORE >= 0.5`) and `test.mjs` carries a mutation that lowers it back to 0.40
to prove the gate turns red.

The automatic result is a **guess**, so any turn can be changed by hand (attach it to
any earlier turn, force it to a new branch, or hand it back to the rule); a changed
turn is never re-derived. A parent must be a **strictly earlier** turn; the code
enforces that invariant, because otherwise the tree would contain a cycle and the
renderer would recurse forever.
### Why the leftmost node is always a title

Similarity answers "which earlier turn does this one continue", and the answer is a **forest**: several mutually dissimilar questions each become the root of their own tree. Drawn directly, that is several trees side by side, and a reader cannot tell where the conversation began — which is exactly the "no starting point" problem.

So the layout adds one **synthetic node** above the forest. It occupies column 0, every tree of the forest hangs off it, and the drawing therefore has exactly **one** node without a parent, opening rightwards level by level. That node:

- carries the text of the **first question** — the session's real beginning, not a generic caption;
- has empty `modules` and is **not a button and not selectable**: it is not a turn, and the side panel, the outline and every per-turn control key off the turn, so it is excluded by construction;
- **does not consume a depth level**: the toolbar counts branch levels, and the title is not one, so at limit 1 the title and the first level are still drawn;
- draws no connector of its own (there is nothing to its left), but **does** draw one to each first branch — otherwise those branches would merely be "listed after" it instead of "hanging off" it.

### Why the layout is computed, not measured

The first version had invisible connectors, and the root cause was a **measured layout**: card coordinates came from `getBoundingClientRect` after paint, so they were always one frame stale, and any missed measurement pass left the connector layer empty.

Now every position comes from arithmetic:

- **column** = depth × (card width + column gap), with extra room after column 0 so the entry point reads as separate from the tree it owns
- **row** = tidy-tree allocation: a leaf consumes the next row slot, and a parent is **centered on its own subtree's span**

The second point is the important one. Allocating rows by a pre-order walk puts a parent *above* all of its children, so every connector has to run back upwards — which is exactly what makes a left-to-right tree unreadable. Centering the parent is what makes the fan-out read as a fan. `behaviour.mjs` asserts both: a parent's center must fall inside its children's vertical band, and cards must not overlap within a column (overlap **across** columns is normal, since a parent is centered between its children).

Only a **card's height** is measured (how many lines a question wraps to cannot be predicted), and it affects row spacing alone — not columns, not parent/child relations — so a measurement one frame late cannot make connectors disappear.

Connectors are **orthogonal elbows** rather than beziers: right out of the parent, turn half-way across the gap, then horizontally into the child's left edge. When both nodes sit on the same row it degenerates to a single straight line, which is the honest drawing of "these two line up". A curve would add decoration and hide which row a branch turns on.

A card never contains the reply: `registration.mjs` pins that with a structural assertion — `renderTreeCard` must render `turn.promptText`, must not contain `turn.answerText`, and must not call `renderCard` (module rows belong to the side panel; an expanding card would move its own height and shove every connector below it).

## Smart layering: push / sibling / branch

The requirement document (`DSH-Mindmap 智能分层提示词`) asks for one judgment per
turn — how does this content relate to the nodes already on the map — resolved into
**three operations**, with each answer emitting **only the new or adjusted Markdown
nested-list fragment, marked with its operation type**. The plugin now has **two
judges** sharing that vocabulary: the offline wording judge is the default, the model
judge is opt-in.

| Document's operation | Structure | Offline wording judge (default) | Model judge (opt-in) |
|---|---|---|---|
| **下推 (push)** | Child of the previous node, one level deeper | The question names no earlier turn → chain to the previous turn | The model judges it a follow-up / explanation / refinement / continuation |
| **换行 (sibling)** | Same level as the previous node, side by side | Going deeper would exceed `{{MAX_DEPTH}}` (5) → place it beside its predecessor | The model judges it a new question raised by the last reply, or **cannot decide** |
| **回溯 (branch)** | Reopened from an older ancestor | The question shares signal words with an earlier turn (≥ `0.50`) → attach under that turn | The model judges it highly related to an older node rather than a continuation |

### Why the level cap becomes 换行

The document's 判断逻辑 bounds the hierarchy ("no more than 5 levels; if it gets too
deep, consider merging or splitting nodes") and its 配置建议 names **最大层级 = 5**. In
the offline judge that is a **hard rule**: a turn that would land on level 6 is
placed **beside its predecessor** instead (`LINK_MAX_DEPTH`, default 5) — the
document's 换行新建, and a **structural** rule, so it needs no similarity score to
qualify. Long sessions therefore stop marching right at level 5 and grow sideways.
Both exits exist: set **最大层级 to 0** in the panel to go back to "uncapped", and
**a hand pin is never capped** — the cap is a default, a pin is an instruction.

### Why the offline judge resolves "cannot decide" as 下推

The document's decision table ends with "cannot decide → be conservative → 换行新建".
**The offline judge deliberately does not do that.** This repository measured it (see
the section above): real follow-ups are pronoun-like and scored `0.00–0.33` on every
overlap measure, so "no wording evidence" is the **normal** state of a genuine
continuation. Reading that as "place it side by side" would put every real follow-up
next to its predecessor — exactly the mistake 1.2.0 shipped (9 of 9 real follow-ups
misjudged). The two judges therefore split the work by the evidence each can carry:
the offline judge continues the previous turn and says so in the panel, while the
model judge follows the document **literally** — a model can make that call; a wording
engine cannot.

### State, fragments, and the prompt

- **The global state is derived, never stored.** `layerState` renders the turns plus
  their resolved links into the document's `{{MINDMAP_STATE}}`: every node with its
  operation, level, and parent, plus the Markdown nested list. A stored state could
  disagree with the drawn tree; a derived one cannot.
- **No operation markers in the state, always one in a fragment.** The document's own
  历史节点 example is a clean nested list; the markers belong to the fragment a model
  returns.
- **No synthetic title line in the state.** The drawn title repeats the first question
  by design, but it is a rendering device, not a node; emitting it would show the model
  the same question once as a parent and once as a child — the "obvious wrong nesting"
  the document's 验收标准 forbids.
- **Both fragment transports are read**: the Markdown form (a `[下推]` / `[换行]` /
  `[回溯]` first line plus a nested list — English markers, code fences, and chatty
  preambles included) and the JSON form from the document's maintenance section
  (`operation` with `path` / `labels`). A reply that cannot be parsed is **reported**
  (`ok: false`, a reason, and the raw text), never assumed to be 下推.
- **The node name stays your question** (clipped to `{{NODE_MAX_CHARS}}`). A name the
  model invents is recorded, used in the state and fragment, and shown in the panel —
  but the card keeps your question, which is this plugin's standing promise.
- **The document's prompt ships verbatim** and is copyable from the panel, with the
  run's effective configuration appended, so what you copy is what was sent.

### How a model run works

One run = **one model call per turn, in order, each carrying the state up to the
previous turn** (the document's 状态维护 rule). The run has a **turn limit** (last 24
by default), can be **stopped** at any time (a late reply from a stopped run is
dropped, never half-applied), shows progress, and stores its judgments **per session**.
Switching the model judge off stops them shaping the tree while keeping them for an
instant switch back, a **hand pin always beats a model judgment**, and one button
clears them all.

### The model bridge: why an HTTP route

A client bundle cannot reach a model: it receives `require` only, gets no `llm`
service, and has no channel to its own host half. The call therefore lives in the
**host half** (`lib/index.js`), which does exactly one thing — forward one call to
`ctx.llm.stream` and hand the model's raw text back to the page:

| Route | Purpose |
|---|---|
| `GET /plugin-mindmap/info` | Reports whether the bridge **can** work (does this composition have `llm`), the provider routes, and the profile's configured default provider/model |
| `POST /plugin-mindmap/layer` | Takes `{system, user, provider, model, temperature, maxTokens, timeoutMs}` and answers `{ok, text, provider, model, usage}` |

Why not the official Remote channel: a client-side Remote needs a **generated Typert
schema shipped with the package**, and this repository deliberately has **no build
step**. Named routes on `ctx.webServer` need no codegen, no wire schema, and no client
service injection, and the page already has `fetch`. The cost is that it is a local
HTTP surface, so it is **narrow by construction**: two exact routes, JSON only, a
256 KiB body cap, a 2000-token cap, a temperature cap, a timeout, and **cancellation
when the page goes away** — and **a failed call must be answered as a failure** (`502`),
never as an empty string that looks like "judged, nothing to say".

### Configuration: the document's 配置建议, implemented

| Document's advice | In the plugin |
|---|---|
| Model temperature 0.2 – 0.5 | Editable, and **clamped into the band** (`1.5 → 0.5`, `0 → 0.2`); non-numeric falls back to 0.3 |
| Max levels 5 | `LINK_MAX_DEPTH = 5` drives 换行新建; set 0 for uncapped |
| Max node characters 15 | `{{NODE_MAX_CHARS}}`, used for the state, fragments, and node labels (clipped with an ellipsis) |
| Output format: Markdown nested list | The default; the JSON form (`operation` field kept) is parsed too |
| Operation marker: required | `layerFragmentMarkdown` emits it on the first line; a reply without one is **reported, not guessed** |
| State maintenance: per turn | The model run rebuilds the state before judging the next turn |
| Unknown → 换行新建 | Literal on the model path; the offline path chains instead (reasons above, and stated in the panel) |
| Language: Chinese | Chinese by default, English selectable (the node-naming language goes into the system prompt) |

## Local development install

If you want to change the plugin rather than just use it, mount the repository directory into a profile:

1. Put this directory at `%APPDATA%\dsh-desktop\harness\profiles\web\node_modules\@nydsg\dsh-mindmap`;
2. Add a line to the user patch layer of `profiles/web/cordis.patch.yml`:

```yaml
- insert:
    - id: '@nydsg/dsh-mindmap'
      name: '@nydsg/dsh-mindmap'
```

3. Restart DSH (menu: Restart Harness) — the client module graph and the plugin bundle routes are generated once at startup, and **hot reloading cannot conjure a bundle route for a new plugin**.

Copy `lib/` back over the profile directory and restart; there is no build step.
Note that the desktop install is a **copy**, not a symlink: after editing `lib/`, run `dsh plugin add` once more to sync it, then restart Harness.

> Why the development version uses the patch layer rather than `dsh plugin add`: the desktop generation maintenance only takes over market-installed plugins and rewrites `package.json`; the patch layer is the one it leaves alone. A real install should use `dsh plugin --profile web add @nydsg/dsh-mindmap`, and must **not** keep the hand-written row as well — two loader entries with the same id make startup fail.

## Development

No build step: `lib/client.js` is a hand-authored `window.__ModuleLoader__.load({id, factory})` lazy-CJS bundle that calls `React.createElement` directly and needs no JSX compilation.

```
node tools/test.mjs          # runs the gates, then replays each historical bug to prove a gate turns red (CI and prepack both use this)
node tools/showcase.mjs      # what the engine actually decides on given conversations + the tree geometry
node tools/make-report.mjs   # regenerates tools/TEST-REPORT.md from the two above
node tools/check.mjs         # syntax + plugin face + bundle manifest + CSS token integrity / no hardcoded colours
node tools/behaviour.mjs     # segmentation, keywords, branch scoring, the level cap, layout geometry, projection adapters
node tools/registration.mjs  # apply()/inject() contract + structural invariants of a view that REALLY renders
node tools/layering.mjs      # prompt assets, variable substitution, config clamping, the fragment protocol, the state, placement
node tools/host.mjs          # the host bridge: mounting, /info, /layer, refusals, clamping, cancellation, failure-as-failure
node tools/verify-pack.mjs   # pre-publish: manifest identity, required files, no developer-machine absolute paths
node tools/screenshot.mjs    # regenerates docs/screenshot.png (needs Edge or Chrome)
node tools/session-map.mjs   # draws a REAL session log with this plugin's own judgment (HTML + PNG + an operation report)
node tools/measure-sessions.mjs     # measures the matching rule on this machine's real sessions (decompresses the multi-frame zstd logs under ~/.dsh/sessions)
```

Everything is offline and deterministic, with no dependencies (only the screenshot
script needs a Chromium-based browser). `npm test` is `node tools/test.mjs`; the
`prepack` hook of `npm publish` runs it first.

> The image at the top of this README is **not a screen grab** but a rendered
> preview: it uses the plugin's **own stylesheet** (extracted from
> `lib/client.js`) and its **own layout arithmetic** (`layoutTree` / `placeTree` /
> `edgePath` run on the same sample conversation), so the card positions,
> connector paths and surface are what the plugin really draws. What is
> hand-written is the DOM skeleton around it (tab strip, toolbar, side panel) and
> the DSH theme token values. After a visual change, run `npm run screenshot`.

All five code gates (`check` / `behaviour` / `registration` / `layering` / `host`) must
report `PASS (0 problems)`, and `test.mjs` must additionally report `all mutations
caught`. `verify-pack.mjs` is a sixth gate, but it only serves publishing and is run
before a release.

**A gate that cannot go red is not a gate.** `test.mjs` reintroduces each historical bug into a throwaway copy and asserts the named gate turns red — including the `useChat` contract, a manual branch being overwritten by the matcher, pre-order row allocation, missing connectors, the score falling back to a raw cosine, the title being folded away by the depth limit, the title's connectors being skipped, the title text being replaced by a generic caption, an unquoted `@` in the manifest, a dropped level cap, a fragment rendered without its operation marker, every fragment read as 下推, an ignored seeded judgment, a seeded judgment allowed to point forward, a failed model call answered as a success, and an abandoned call that is never cancelled. A green suite on its own proves nothing. The current run is recorded in [`tools/TEST-REPORT.md`](tools/TEST-REPORT.md).

### Traps (do not repeat these)

**`@` in `cordis.patch.yml` must be quoted — unquoted, the plugin cannot be installed at all.**

```yaml
# Wrong: `@` is a YAML reserved indicator, so a plain scalar may not start with it.
#        js-yaml 4 rejects the entire file: bad indentation of a mapping entry (15:11)
- insert:
    - id: @nydsg/dsh-mindmap
      name: '@nydsg/dsh-mindmap'

# Right: quote both
- insert:
    - id: '@nydsg/dsh-mindmap'
      name: '@nydsg/dsh-mindmap'
```

The cost is that **the whole installation is rolled back** — `dsh plugin add` validates the manifest and restores `package.json`, `pnpm-lock.yaml` and `node_modules` when it fails — and at the time all three gates were green: `check.mjs` only parsed `lib/` and had never read the manifest. The manifest is the only input on the install path, so `check.mjs` now parses and validates it through `tools/yaml.mjs` (exactly one loader row, resolvable package name, no duplicate id), and two mutation cases (stripping the quotes, inserting the row twice) prove that gate bites.

**In the `inject()` face, sources must be declared under `hooks` under their raw names.**

```js
// Wrong: the renderer does not know this `useChat`, passes it through as an
//        ordinary prop, and the view gets a source object instead of a function
//        → useChat is not a function at runtime
return { useChat: chat, sessionId, writeDraft };

// Right: the renderer mints the useChat prop from `chat` via standardHookPropName
return { hooks: { chat }, sessionId, writeDraft };
```

The rule comes from `bindInjectSources` in `dsh-client-ui-renderer`: **with** a `hooks` key, each entry becomes a `use<Name>` prop through `standardHookPropName` (wrapped into a real Hook by `observableHook`); **without** it, the whole return value is passed through as props verbatim. `registration.mjs` now reproduces that semantics and asserts the shape, so a repeat turns red.

The more expensive lesson: the first `registration.mjs` used `inject()`'s return value as props directly, which **papered over the wrong contract on the plugin's behalf** and produced a false green. A gate has to reproduce the real framework's binding semantics, not bypass them.

**A hand-rolled React in a gate is weaker than the real one, in places you will not notice.**

The React stub in `registration.mjs` was unfaithful twice over: `createElement` recorded children in a **sibling** field named `children` (real React puts them in `props.children`) and **never invoked function components** (it only stored `type`). The consequence was that the view's error boundary — `MindMapBoundary`, which returns `props.children` — got `undefined`, returned `undefined`, and `MindMapBody` never ran at all, while the gate only asserted "something non-null was rendered". **A view that crashed on render would have stayed green.** Adding the 智能分层 panel exposed it: the assertion on the three operation names reported "the view rendered nothing".

The stub now puts children in `props.children` (a single child as itself, exactly as React does) as well as in `children`, the gate expands function components, and it asserts that **no crash panel** (`mm-crash`) appears in the result — that panel is precisely the "page is up, view is broken" failure. Same lesson as above: **a stub must reproduce the real semantics, or it only tests itself.**

**A mutation case can hang a gate instead of turning it red.**

The new "a closed connection must abort the model call" case, when mutated into "never abort", left the fake model waiting for an abort that never came, so `test.mjs` **hung** rather than failing. A hung gate proves nothing. The fix is a hard deadline inside the fake model: without cancellation it fails after 1.5s, so the gate turns red in 1.7s and names the assertion. **A gate's failure must be fast and specific; a timeout is not a failure.**

**`instanceof` fails across realms.** In branch resolution, `overrides instanceof Map` was always false inside the test sandbox (the gate's Map and the bundle's vm are different realms), so **every manual link was silently dropped** — automatic results looked fine while manual control did nothing at all. It is now duck-typed (anything with `get`/`has`/`forEach` counts as a Map). Avoid `instanceof` for any value crossing a realm boundary (vm, iframe, worker).

**Do not rebuild React in test scaffolding.** To assert "a collapsed card shows no reply" I once wrote a walker over the element tree, and it kept failing on hook dispatchers, class component instantiation and `props.children` folding — emulation details **unrelated to the property under test** — each time showing up as a misleading red that cost far more than it returned. Structural assertions against the render function are exact, stable, and point at the real cause. When you genuinely need to assert on a rendered tree, use real React (e.g. `react-dom/server`) rather than hand-rolling it.

**Do not write assertions about results instead of properties.** My first assertion for the matcher was "a pair sharing only background words must not link" — but that pair does not link under a **raw cosine** either (short sentences have low cosine by nature), so the assertion stayed green while the property that needed protecting — **separation** — was not protected at all: reverting the scoring to cosine kept every gate green. Rewriting it to assert a wide gap between the two score classes (background pair below the threshold, true link above it, difference `> 0.3`) made the mutation fail immediately. Pin the **discriminating property**, not a result that merely happened to hold at the time. 1.4.1 added the second layer: those three assertions had `0.4` hardcoded, so moving the threshold would have left them describing a rule the code no longer implemented — they now compare against `LINK_MIN_SCORE` itself, and the *value* is pinned by its own assertion (`>= 0.5`), so quietly loosening it goes red.

## Known limits

- **Chinese segmentation**: `Intl.Segmenter`'s `word` mode cuts most Chinese words down to single characters (`思维导图` → `思维|导|图`). The plugin does longest-run merging **inside the single-character runs the segmenter returns** (`导|图|插|件` → `导图插件`) but **does not cross** multi-character words the segmenter already produced (`思维`). So `思维导图` is reported as `思维` + `导图` rather than one word. That is deliberate: restoring it needs a dictionary, and forcing it with a sliding window invents words that do not exist (experiments produced `导图插件`). For the two uses here — keyword analysis and candidate questions — splitting into two words is usable.
- **The match score is not a cosine**; it is the shared-signal ratio over the smaller side (rules and measurements above).
- **Keyword threshold**: only words appearing ≥2 times in the session enter the keyword ranking; a word seen once appears only under "new topics".
- **Candidate questions are template-assembled**, not semantically generated. Genuine semantic judgment now has an opt-in entry point (the model judge), but the **candidate-question** column is still template-assembled: the default path deliberately calls no model, to stay instant and offline.
- **Paraphrases do not connect** ("how to install a plugin" vs "how is a plugin installed"): matching is **lexical**, and a paraphrase that shares no signal word lands on a different chain (`装` and `安装` segment to different tokens). Manual attachment exists for exactly this. The threshold (the gap's midpoint `0.40`, deliberately tightened to `0.50` in 1.4.1) and the `12`-turn lookback are **derived from the case data** (the score table in `TEST-REPORT.md`), but they still only cover the conversation shapes I constructed. A side effect of the tightening: **true links scoring 0.44–0.50 are no longer reported as 回溯** and fall back to conversation order (for adjacent turns the parent is usually the same, so the drawing barely moves while the claim gets harder).
- **A question that changes the subject still chains to the previous turn**: that is the deliberate trade described above — "open in conversation order" beats "cluster by topic". Asking "what's for dinner" mid-thread makes it a child of the previous turn rather than a new tree; pinning that turn as a new branch corrects it.
- **Long sessions now grow sideways at level 5**: since 1.4.0 the document's **5 branch levels** is a hard rule, so a chain stops descending at level 5 and places the next turn **beside** its predecessor (换行新建). Columns are capped while rows keep growing; set the limit to 0 for the old "N turns = N columns" shape. The toolbar's **branch levels** still folds drawn subtrees.
- **The model judge only touches the network when you press it**: the default offline judge sends no request. The model path needs a provider/model configured in the profile (otherwise the panel says so outright), and **the new host routes only appear after a Harness restart** — the client bundle composition and the loader row are built once at startup.
- **The model bridge is a local HTTP surface**: two exact routes, JSON only, with body/token/temperature caps and a timeout, under the plugin's own `/plugin-mindmap` prefix. It performs no authentication (the same trust level as the other local services) and returns nothing but the model's raw text.
- **A node name invented by the model does not replace your question on the card**: cards showing only your question is the standing promise; the model's name is used in the state, the fragment, and the side panel.
- **A model may return something unparsable**: the panel then shows "fragment parse failed + reason + raw text", the turn keeps its previous judgment, and nothing is forced into the tree; rerun or pin by hand.
- **The offline judge never looks further back than `LINK_MAX_AGE` (12 turns) for a 回溯, and never guesses semantics to produce a 换行** — those two are the model path's job.
- **Ties go to the more recent turn**: the metric really can produce **exactly equal** scores. In one measured case `#5` matched `#1` and `#2` at precisely `0.5642`, because all three share the same words (`dsh`/plugin/install/profile) and their distinguishing words (`web`/restart vs failure/troubleshoot) do not match `#5`'s `要重` — the metric has **no information** to separate them, so the nearer turn wins. That is not a bug but the honest limit of a lexical measure, which is why any turn can be re-parented by hand.
- **Very short follow-ups now always connect**: a question like "continue" or "yes" has one or two generic words and scores 0, so it chains to the previous turn by structure — which is exactly what the current rule guarantees. It can no longer be mistaken for a new branch (the old rule did that).
- **Branches proceed linearly by turn**: a new turn can only attach under an **earlier** turn, so no back-reference (a later question becoming the parent of an earlier one) can appear.
- **There is exactly one title, and it always uses the first question**: no second entry node and no "change the title" UI. If the first turn has no prompt text, the title shows "(no prompt text in this turn)".
- **Only card height is measured**; columns and rows are all computed, so a measurement one frame late only shifts row spacing briefly and can never make connectors vanish. A font-loading height change after measurement may shift row spacing temporarily.
- **Unverified**: this machine cannot take screenshots. **The flat look, the corner geometry of the elbows, and the spacing between the title card and the first column still need your eyes.** A **real model call has not been run end to end** either: the host bridge is driven against a fake `llm` service in `tools/host.mjs` (mounting, routing, refusals, clamping, cancellation, and failure-as-failure all have assertions), but "the model really returned a parsable fragment" is yours to confirm after a Harness restart. What has been machine-checked is syntax, token integrity, colour compliance, the arithmetic properties of matching and layout (including the title column and its connectors), the layering protocol, the host-bridge contract, and structural invariants. Mutation verification only proves the gates catch **those classes** of regression, not that they catch every regression.

## License

[MIT](LICENSE)
