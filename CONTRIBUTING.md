# Contributing

Thanks for looking. This is a small plugin with an unusual constraint that shapes
everything else: **there is no build step and no dependencies.** `lib/client.js`
is the artifact — hand-authored JavaScript that the DSH client module loader
evaluates directly. Read the [README](README.md) before your first change; the
"Traps" section documents four bugs that cost real time and are easy to
reintroduce.

## Before you open a pull request

Run the whole suite. It is offline, deterministic, and takes a few seconds:

```bash
node tools/test.mjs
```

It must print:

```
test: PASS (all gates green, all mutations caught)
```

Two separate things have to hold, and the second is the one that is easy to get
wrong:

1. **Every gate is green.** `check` (syntax, plugin face, bundle manifest, CSS
   token integrity), `behaviour` (segmentation, scoring, layout geometry),
   `registration` (`apply`/`inject` contract and structural invariants),
   `verify-pack` (pre-publish identity and contents).
2. **Every mutation is caught.** `test.mjs` reintroduces each historical bug into
   a throwaway copy and asserts that the named gate turns red. If you fix a bug
   that no gate would have caught, **add the mutation case for it** — a bug that
   shipped once and is not pinned by a failing mutation will ship again.

## Changing behaviour

- **Add a mutation case for anything you fix.** A green gate proves nothing on
  its own; `tools/test.mjs` is the evidence that the gate can fail.
- **Assert the property, not the result.** An assertion that happens to hold under
  both the correct and the buggy implementation is worthless. The README's last
  trap describes a real instance of this.
- **Keep the bundle hand-authorable.** No JSX, no TypeScript, no bundler, no
  runtime dependency. `React.createElement` is aliased to `h`.
- **All analysis stays local.** No network requests, no model calls, no
  `fetch`. The plugin's value proposition includes working offline.
- **Do not touch existing surfaces.** The view registers into the
  `conversation.view` slot and must not change the Chat or Trajectory tabs.
- **Only card height may be measured.** Columns, rows and connectors come from
  arithmetic; a measured layout is what once produced a tree with no visible
  lines at all.

## Documentation

`README.md` is the source of truth and `README.en.md` mirrors it. If you change
one, change the other in the same pull request. `tools/TEST-REPORT.md` is
generated — run `node tools/make-report.mjs` instead of editing it.

Regression tests for a documented trap belong in the gate that owns the trap, and
the trap itself belongs in the README's trap list.

## Commit messages

Conventional-commit-style prefixes are welcome (`feat:`, `fix:`, `docs:`,
`test:`, `chore:`) but not enforced. What matters is that the message says *why*
the change exists, not just what moved.

## Reporting a bug

Use the bug report template. The three facts that make a layout bug diagnosable
are: the question text of the turns involved, what the plugin decided (the branch
badge on each card), and what you expected instead. The browser console prints
one line at startup (`[@nydsg/dsh-mindmap vX.Y.Z] {...}`) that confirms which
bundle version the page actually loaded — please include it.

## License

By contributing you agree that your contribution is licensed under the
[MIT License](LICENSE).
