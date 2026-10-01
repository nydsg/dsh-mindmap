---
name: Feature request
about: Suggest a capability for the mind-map view
title: ''
labels: enhancement
assignees: ''
---

## The problem

<!-- What you are trying to do and what gets in the way. A use case beats a
     feature description. -->

## What you have in mind

<!-- Optional. If it involves the layout or the branch decision, say which one:
     the layout is arithmetic-only by design and the matcher is lexical-only by
     design, so both have real constraints worth knowing before we start. -->

## Constraints worth checking

- [ ] This can be done **without a network request or model call** (the plugin is
      offline by design; a capability that needs an LLM is a different plugin).
- [ ] This can be done **without a build step** (`lib/client.js` stays
      hand-authored, no JSX, no dependencies).
- [ ] This does **not change the Chat or Trajectory tabs**.
