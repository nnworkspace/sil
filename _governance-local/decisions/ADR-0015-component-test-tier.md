# ADR-0015: jsdom + Testing Library for the component test tier

| Field | Value |
|:---|:---|
| Status | Accepted |
| Date | 2026-07-28 |
| Deciders | Repository owner (nnworkspace) |
| Supersedes | none |
| Superseded by | none |

> Status values: `Proposed` → `Accepted` → (later) `Superseded` or `Deprecated`. Once a record is `Accepted`, only the status line of this table may change. Everything below is frozen at acceptance. To change the decision, write a new ADR that supersedes this one.

## Context and problem statement

The test suite has exactly one tier (#183): pure functions run in Vitest's `node` environment. It cannot render a component, so every guarantee that lives in the UI is verified by hand in a browser and then protected by nothing.

#195 forced the issue. Its guarantees are behavioural, and one of them is destructive: **deleting a look photo must ask first**. Before #195 that deletion fired on the click, with no confirmation and no undo, on a control sitting directly on top of the photo. The fix was verified manually in Chrome — proving it worked once, on one machine, on one day. A future refactor that drops the confirmation would pass CI and silently destroy photos. #197 adds the same shape of guarantee for wear records, and every dialog after it will too.

The owner's standing rule — *"always ask for confirmation when I want to delete anything"* — is therefore currently enforced by memory rather than by the suite.

Adding a DOM environment and a rendering library is a stack choice, and this repository records those deliberately (ADR-0006 exists solely to record choosing Zod), so it is written down rather than added quietly.

## Decision drivers

- **The regressions worth catching are destructive**, not cosmetic: a missing confirmation loses data.
- **The app's dialogs are Base UI** (`@base-ui/react`, the successor to Radix). Whatever environment is chosen must run them, including their focus management and portalling.
- **The existing L1 tier is fast** (~300 ms for 96 tests) and is run constantly. Adding a DOM must not slow it down.
- **Small, single-maintainer repository.** The stack should be the one with the most documentation and the fewest surprises, not the cleverest.
- **Tests should assert behaviour, not implementation** — consistent with how the L1 tests are written (named after the rule they defend, ADR-0014).

## Considered options

1. **jsdom + Testing Library** (`@testing-library/react`, `user-event`, `jest-dom`): the long-standing default; the most complete DOM implementation available in Node.
2. **happy-dom + Testing Library**: a lighter, substantially faster DOM implementation with a smaller API surface.
3. **Playwright component testing** (real browser): highest fidelity — a genuine engine, real layout, real gestures.
4. **Do nothing; keep verifying in the browser by hand.**

## Decision

**jsdom with Testing Library**, wired as a second Vitest project so the two tiers keep separate environments and `pnpm test` still runs both.

jsdom over happy-dom because fidelity matters more here than speed: the components under test are Base UI dialogs, which lean on focus trapping, portals and pointer-event details, and jsdom is the environment those libraries are themselves tested against. happy-dom's speed advantage is measured in hundreds of milliseconds on a suite this size — irrelevant next to a weekend spent chasing a divergence between the test environment and a real browser.

Playwright is rejected *for this tier*, not on merit. It would test the same behaviours far more faithfully, but it needs browser binaries, is an order of magnitude slower, and is the natural home of a future end-to-end tier that exercises real flows against a real database. Buying it now to assert "the confirmation dialog appeared" is the wrong price.

Testing Library because it asserts through the accessibility tree — `getByRole("button", { name: "Remove photo" })` — which is the same surface a keyboard or screen-reader user meets. Tests written that way break when the behaviour breaks, not when a class name changes.

## Consequences

**Positive**

- Destructive-action guarantees become executable: *deleting asks first* can be asserted, so it cannot regress unnoticed.
- Component tests are written against roles and accessible names, so they double as a check that controls remain reachable without a mouse.
- The two projects keep the L1 tier's speed intact; `pnpm test` remains one command.

**Negative / accepted trade-offs**

- **Five dev dependencies** (`jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `@testing-library/jest-dom`) and a setup file the repository must now maintain.
- **jsdom is not a browser.** It has no layout engine: every element reports zero width and height, and there is no real hit-testing. A test can prove a handler ran; it cannot prove a control was visible or reachable by a finger.
- **Gesture and layout behaviour stays manually verified.** The photo viewer's pinch, wheel and drag depend on measured geometry, which jsdom reports as zeroes. Asserting on them would be theatre. This is a stated limit of the tier, not an oversight.
- Browser APIs the components use but jsdom lacks (`ResizeObserver`, `matchMedia`, `visualViewport`) must be stubbed in setup — a small, permanent maintenance surface, and a place where the test environment can drift from reality.
- Server actions, `next/image` and `next/navigation` must be mocked, so these tests say nothing about whether an action actually writes correctly. That remains the job of the query tier and of manual verification.

**Re-evaluation triggers**

- A bug reaches the owner that a component test *should* have caught but could not, because jsdom lacks layout or hit-testing — the signal to add an end-to-end tier (Playwright) rather than to stretch this one.
- The component tier's runtime grows to the point where `pnpm test` is no longer run casually.
- Stubbing jsdom gaps becomes a recurring cost, or a stub is found to have hidden a real defect — reconsider happy-dom or a real browser.

## Notes

- Implements #198; the guarantees it first protects come from #195 and #197.
- The tiering language ("L1", "L2") comes from #183. This adds the component tier above L1.
- Test naming follows ADR-0014: a test is named after the rule it defends (`VAL-LOOK-13`), so a failure points at the behaviour rather than at an anonymous case.
