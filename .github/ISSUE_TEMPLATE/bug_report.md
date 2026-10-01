---
name: Bug report
about: Something renders wrong, or the map decides something it should not
title: ''
labels: bug
assignees: ''
---

## What happened

<!-- What you saw. Screenshots help a lot: this plugin's layout is visual, and a
     screenshot answers in one image what prose takes a paragraph to say. -->

## What you expected instead

<!-- For a branch decision, say which earlier question this turn should have
     attached to. -->

## Steps to reproduce

1.
2.

## The three facts that make a layout bug diagnosable

- **Question text of the turns involved** (the actual text, or a
  character-for-character equivalent — the matcher is lexical, so a paraphrase
  behaves differently):
- **What the plugin decided** — the branch badge on each card
  (`auto 0.62` / `pinned` / `起始分支`):
- **What you expected instead:**

## The console line

The view prints one line at startup that confirms which bundle the page actually
loaded. Open the browser console and paste it — it looks like:

```
[@nydsg/dsh-mindmap v1.1.0] {turns: 12, modules: 34, roots: 4, manual: 0, firstQuestion: "…"}
```

```

```

## Environment

- Plugin version (toolbar, or the console line above):
- DSH version:
- OS:
- Installed how: `dsh plugin add` / local patch layer / plugin market
