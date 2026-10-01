# Security Policy

## Scope

`@nydsg/dsh-mindmap` is a **client-only** plugin: the host half (`lib/index.js`)
is an empty `apply()`, and everything the user sees lives in `lib/client.js`,
which runs inside the DSH web client.

Two properties are load-bearing and are treated as security-relevant:

- **It makes no network requests.** No `fetch`, no `XMLHttpRequest`, no
  WebSocket, no remote script or font. All analysis — segmentation, keyword
  weighting, branch scoring — runs on the text already in the browser.
- **It does not use `innerHTML`, `dangerouslySetInnerHTML`, `eval`, or
  `new Function`.** Conversation text reaches the DOM as React text children, so
  a question containing markup is displayed, never executed.

If you find a way to break either of those, that is a vulnerability, not a bug.

## What is in scope

- Any way a conversation's text could reach an executable context (script
  injection through a question, a tool call payload, or a file name).
- Any network egress from the plugin.
- Any path that could write outside its own `localStorage` keys
  (`dsh.mindmap.links.<sessionId>`) or read another session's arrangement.
- A crafted input that makes the view crash in a way the error boundary does not
  contain — the boundary exists so a render-time throw cannot blank the view.

## What is out of scope

- Content of the conversations themselves.
- Vulnerabilities in DSH, in the profile's other plugins, or in the plugin
  manager. Report those upstream.
- The keyword/branch analysis being *wrong* about your conversation. It is a
  documented heuristic with a published threshold, not a security boundary.
- Denial of service by pasting an extremely large session. The view is
  intentionally client-side and bounded by what the browser can render.

## Reporting

Open a [private security advisory](https://github.com/nydsg/dsh-mindmap/security/advisories/new)
if you can, or email the maintainer (the address is in the commits). Please
include the plugin version, what you did, and what happened.

There is no bounty. This is a small plugin with a zero-dependency design, so
fixes tend to be quick — expect an acknowledgment within a few days.

## Supported versions

Fixes land on the latest published minor and are released as a patch. Older
versions are not maintained.
