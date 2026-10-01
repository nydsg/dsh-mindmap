# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
