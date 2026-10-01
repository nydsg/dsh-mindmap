# Pull request

## What this changes

<!-- One or two sentences. If it fixes a bug, name the bug. -->

## Evidence

- [ ] `node tools/test.mjs` prints `test: PASS (all gates green, all mutations caught)`
- [ ] If this **fixes a bug**, `tools/test.mjs` has a new mutation case that
      reintroduces it and a gate that catches it
- [ ] If this **changes behaviour**, the assertions pin the *property*, not a
      result that happens to hold (see the README's last trap)
- [ ] If this **changes the docs**, `README.md` and `README.en.md` both changed
      (and `tools/TEST-REPORT.md` was regenerated with `node tools/make-report.mjs`
      if the gates' output changed)

## Design constraints

- [ ] No network request, no model call
- [ ] No build step, no new dependency, `lib/client.js` stays hand-authored
- [ ] The Chat and Trajectory tabs are untouched
- [ ] Nothing new is measured except card height — columns, rows and connectors
      stay arithmetic

## Screenshots

<!-- For anything visual. A before/after pair is ideal: there is no automated
     check for how the map looks. -->
