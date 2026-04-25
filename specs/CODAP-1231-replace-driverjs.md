# Replace driver.js with floating-ui in tour plugin API

**Jira**: https://concord-consortium.atlassian.net/browse/CODAP-1231

**Status**: **Closed**

## Overview

Replace `driver.js` with `floating-ui` in CODAP's tour/highlight system and drop the darkened overlay entirely — tours become non-blocking popovers that point at a target while the rest of CODAP stays fully interactive. The public plugin API stays identical (same operations, notifications, `tourElements` resource) except for six overlay-related fields (`overlayColor`, `overlayOpacity`, `stagePadding`, `stageRadius`, `disableActiveInteraction`, `overlayClickBehavior`) that no longer have meaning under the pointer model. The feature-tour source and tests are preserved for possible future reinstatement but remain unreachable from the production UI.

The driving design choice is therefore not just "swap one library for another" — it is "drop the overlay/spotlight model and reframe tours as non-blocking pointers." `floating-ui` is the right primitive for that because it provides positioning without imposing any chrome. CODAP-1227 (click-through) and CODAP-1228 (open subelements) are subsumed by the overlay removal; CODAP-1230 (advance on user action) is unblocked.

## Requirements

### Public plugin API — preserved (with overlay-related fields removed)

The example tour plugin and the runnable examples in `v3/doc/plugin-tour-api.md` continue to work, except for examples that exercise overlay-only fields.

- All nine `interactiveFrame` notify operations continue to work with the same request shapes: `highlight`, `clearHighlight`, `startTour`, `endTour`, `tourNext`, `tourPrevious`, `tourMoveTo`, `tourRefresh` (plus the `tourElements` resource GET).
- The following request fields on `HighlightRequestValues` and `TourRequestValues` continue to be honored:
  - **Navigation**: `showButtons`, `disableButtons`, `showProgress`, `allowKeyboardControl`, `allowClose`.
  - **Presentation**: `animate`, `smoothScroll`, `popoverOffset`.
  - **Labels**: `progressText`, `nextBtnText`, `prevBtnText`, `doneBtnText`.
  - **Targeting / step identity** (per step): `tourKey`, `testId`, `selector`, `component`, `popover.{title,description,side,align}`, `id`.
- Notification envelopes continue to match the CODAP-1167 spec:
  - Highlight: `{ operation: "highlightUpdate", type: "highlighted" | "highlightCleared", id?, tourKey?|testId?|selector?, component? }`
  - Tour: `{ operation: "tourUpdate", tourId, type: "stepStarted" | "stepEnded" | "completed" | "cancelled", stepIndex?, totalSteps?, visibleSteps?, id?, tourKey?|testId?|selector?, component? }`
  - When the request supplied `component` (either as the sole target or as a scope alongside `tourKey`/`testId`/`selector`), the notification echoes it back so plugins can hand the same id to other component-scoped APIs.
- Cancellation semantics unchanged: only `cancelled` is emitted on user dismissal or replacement — no `stepEnded` for the interrupted step.
- Step filtering semantics unchanged: steps whose target element is missing at `startTour` time are silently skipped; `stepIndex` reports the original pre-filter index; `visibleSteps` reports the filtered count.
- **Progress text templating**: `{{current}}` is the 1-based *filtered* (visible) step number; `{{total}}` is the filtered step count (`visibleSteps`). Notifications continue to carry the original pre-filter `stepIndex` separately.
- Targeting priority unchanged: `tourKey` > `testId` > `selector` > `component`-only.
- Idempotency unchanged. New highlight/tour cancels the previous one with the appropriate notification to the previous owner.
- Plugin disconnect cleanup unchanged.
- One tour/highlight active at a time.

### Removed API surface

The following request fields are removed from `HighlightRequestValues`, `TourRequestValues`, and `TourStepInput`. The TypeScript types no longer declare them; the public docs no longer list them; the sanitizer no longer carries them through. If a plugin still sends them in a request, the sanitizer drops them silently.

- `overlayColor`
- `overlayOpacity`
- `stagePadding`
- `stageRadius`
- `disableActiveInteraction`
- `overlayClickBehavior`

`v3/doc/plugin-tour-api.md` is updated to remove these fields from the options table, drop the "Highlight without dimming" example, and remove any prose that recommends or describes the overlay.

`disableActiveInteraction` previously enabled a "watch, don't click yet" authoring pattern. That pattern is not supported under the pointer model — the target is always interactive while a tour is active. Authors who want a forced linear flow can advance the tour programmatically via CODAP-1230 (auto-advance on user action) once that ships.

### Internal `tourManager` interface

- `tourManager` keeps its existing public method signatures: `highlight`, `clearHighlight`, `startTour`, `endTour`, `tourNext`, `tourPrevious`, `tourMoveTo`, `tourRefresh`, `runInternalTour`, `cleanupForTile`, `cancelActive`, plus the `isActive` / `activeTourId` / `activeType` getters.
- `HighlightRequestValues`, `TourRequestValues`, and `TourStepInput` shapes lose the six removed fields.
- `ITourConfig` and `defaultTourOptions` are simplified — `overlayClickBehavior` is removed.

### Visual behavior — pointer model

- **No overlay.** Nothing dims, masks, or covers any portion of the CODAP UI. The user can interact with every part of the application while a tour is active.
- **Popover** with title, description, navigation buttons, progress text, and close button remains visible and styled to match the current look.
- **Arrow** points at the target element from the appropriate side. Configured with `padding: 4` on the `arrow` middleware so it stays clear of the popover's rounded corners.
- **Default placement**: when `step.popover.side` is unspecified, the popover defaults to `right` (not floating-ui's library default `bottom`). `flip()` middleware automatically flips to `left` when the target is too close to the right viewport edge.
- Popover `side` and `align` placement honored, with automatic `flip` and `shift`.
- **Popover border**: 1px solid border in `vars.$tile-border-color`, traced continuously around the popover and out along the arrow tip. `FloatingArrow` is configured with `fill`, `stroke`, and `strokeWidth={1}` as **props** so floating-ui's built-in border-cover logic activates.
- **Draggable popover**: the popover is draggable from any non-interactive area of its surface. `pointerdown` on a `button`, `input`, `select`, `textarea`, or `a` is ignored. Cursor is `grab` when idle and `grabbing` while dragging. Drag is clamped to viewport with 8px padding. The arrow re-orients to the popover side closest to the target. Drag state resets on step change.
- Popover re-positions automatically on scroll, resize, and layout change via `floating-ui`'s `autoUpdate`.
- **Target removal mid-tour**: if the current step's target element is removed from the DOM, the tour emits `cancelled` (or `highlightCleared` for a single highlight) and tears down. No `stepEnded` is emitted for the interrupted step.
- **Target outline ring**: 2px solid outline around the target's bounding rect, offset 2px outside the element's edge. Color: `vars.$teal-dark`. Border-radius: 4px fixed. Rendered via `FloatingPortal` with `pointer-events: none`. z-index: 10000 (one below the popover, above CODAP's tile/menu layers). Carries `aria-hidden="true"`. Always on while a tour/highlight is active.
- **Ring contrast**: ≥ 3:1 against expected target backgrounds (WCAG 2.1 AA non-text UI).
- **Ring over overlapping UI**: with a Chakra menu or tooltip open over the target, the ring renders above the menu/tooltip and the popover renders above the ring.
- Popover z-index: 10001.
- When `animate` is true, popover slides between target positions on step transitions and fades on appear/dismiss.
- Before positioning, `element.scrollIntoView({ behavior: smoothScroll ? "smooth" : "auto", block: "nearest", inline: "nearest" })` is called. `"nearest"` respects nested scroll containers.
- **Dismiss paths** when `allowClose` is true: close button on the popover, and `Escape` key (when `allowKeyboardControl` is true). Click-outside-popover does **not** dismiss.
- **Highlight dismiss notification**: a single-step highlight emits `highlightCleared` on **every** dismiss path — close button, `Escape`, and the Done button. Tours, by contrast, distinguish `completed` from `cancelled`.
- **Keyboard control** when `allowKeyboardControl` is true: `ArrowLeft` / `ArrowRight` navigates between steps, `Escape` closes. Listener ignores keystrokes destined for input fields, contenteditable regions, and focused CODAP application controls *outside* the popover; keystrokes on the popover itself are always handled.
- **Accessibility (popover semantics)**: `role="region"` with `aria-label="Tour step"`. Title, description, and progress text sit inside `aria-live="polite" aria-atomic="true"`. Focus does **not** move to the popover on step start. Popover buttons are in document tab order. Close control carries `aria-label="Close"`. On dismiss, focus moves only if it was inside the popover at dismissal time: target → pre-tour anchor → no-op fallback chain.
- **Reduced motion**: when `prefers-reduced-motion: reduce`, both the slide and the fade are disabled. Popover toggles a `codap-tour-popover--reduced-motion` modifier class driven from JS (because Jest + jsdom doesn't evaluate `@media` queries).
- **Popover sizing**: maximum width matching driver.js's ~300px default with natural wrap on long text.

### CSS class names and selectors

- The popover root carries `codap-tour-popover`.
- Inner element class names renamed from driver.js-style `driver-popover-*` to `codap-tour-popover-*`:
  - `driver-popover-title` → `codap-tour-popover-title`
  - `driver-popover-description` → `codap-tour-popover-description`
  - `driver-popover-next-btn` → `codap-tour-popover-next-btn`
  - `driver-popover-prev-btn` → `codap-tour-popover-prev-btn`
  - `driver-popover-close-btn` → `codap-tour-popover-close-btn`
  - `driver-popover-progress-text` → `codap-tour-popover-progress-text`
  - `driver-popover-arrow-side-{top,bottom,left,right}` → `codap-tour-popover-arrow-side-{top,bottom,left,right}`
- The popover root carries a `codap-tour-popover--dragging` modifier class while a drag gesture is in progress.
- These class names are not part of the public plugin API. Plugin-facing CSS hooks remain anchored on `codap-tour-popover` (root).

### Tests

- Existing tests in `tour-manager.test.ts`, `tour-sanitize.test.ts`, and `feature-tour-config.test.ts` continue to pass for behavior still in scope. Assertions tied to the six removed fields are deleted.
- New tests for new internal helpers (popover positioning, arrow alignment, keyboard handler, scroll-into-view logic, drag handler).
- Drag-related tests, step-transition repositioning test (locks in imperative `refs.setReference` pattern).
- Cypress `feature-tour.spec.ts` is **not** updated (stays `describe.skip`-ed).
- Manual verification: run the existing example tour plugin against a local dev build.
- Regression traps for: dismiss paths (escape, close button, Done on highlight), document-body click does not cancel, target unmount mid-tour, outline ring presence/tracking, reduced-motion modifier class, single `cancelled` per dismissal, ARIA role/labels, progress-text templating with filtered steps.

### Dependencies

- `driver.js` removed from `v3/package.json` and `v3/package-lock.json`.
- `@floating-ui/react@0.27.17` was already installed; no new direct dependency.

## Technical Notes

### What floating-ui does not provide out of the box

`floating-ui` is a positioning primitive only. The surface CODAP must build:

1. Popover chrome — title/description, next/previous/close buttons, progress text, arrow.
2. Step navigation state machine — `activeIndex`, lifecycle callbacks (`onHighlightStarted` / `onDeselected` / `onDestroyed` / `onCancelRequested`).
3. Keyboard handling — `ArrowLeft` / `ArrowRight` / `Escape` via a scoped document listener.
4. Scroll-into-view — `element.scrollIntoView({ behavior, block: "nearest", inline: "nearest" })` before positioning.
5. Animation — CSS transitions on `transform` / `opacity` for fade-in/out and slide-between-steps.
6. Progress text templating — `{{current}}` and `{{total}}` interpolation.
7. `moveTo` / `moveNext` / `movePrevious` / `refresh` imperative methods.

### Architecture sketch

- A new `tour-engine` module under `v3/src/lib/tour/tour-engine/` provides the replacement for driver.js's `Driver` object: `highlight`, `drive`, `moveNext`, `movePrevious`, `moveTo`, `refresh`, `destroy`, plus lifecycle callbacks. `tour-manager.ts` changes only at the seam where it calls `driver(...)`.
- The engine renders a React tree into a detached root attached to `<body>`. `@floating-ui/react`'s `useFloating` / `FloatingPortal` / `FloatingArrow` provide positioning and arrow.
- A separate `OutlineRing` Portal-rendered component subscribes to the same reference and matches the target's rect. `pointer-events: none`.
- The detached React tree does **not** inherit CODAP's Chakra / i18n / MST providers. Components must be self-contained.

## Out of Scope

- Any change to public API operations or notification envelopes (beyond removing the six fields).
- CODAP-1230 (advance-on-user-action) — unblocked but not implemented here.
- Reintroducing any form of overlay, dimming, "spotlight," or modal blocker.
- Tour state persistence, automatic tour launch triggers, localization of tour text, cross-iframe highlighting, HTML in popovers (all already out of scope per CODAP-1167).

CODAP-1227 and CODAP-1228 are subsumed by removing the overlay; their tickets remain separate but the work is delivered by CODAP-1231.

## Decisions

### Which floating-ui package(s) should we depend on?
**Context**: `@floating-ui/react@0.27.17` was already installed for use elsewhere in the codebase. The React flavor gives us `useFloating`, `FloatingPortal`, `FloatingArrow`, etc.
**Options considered**:
- A) `@floating-ui/react` only — declarative React tree.
- B) `@floating-ui/dom` only — vanilla JS, closer to driver.js's imperative feel.
- C) Both packages.

**Decision**: A. The rest of CODAP is React/Chakra/Portal-based and `@floating-ui/react` is already used elsewhere. Reusing the existing dependency keeps the engine idiomatic and lets us lean on `FloatingPortal` / `FloatingArrow` / interaction hooks instead of hand-rolling them.

---

### Keep driver.js CSS class names or rename to `codap-tour-*`?
**Context**: After the swap, we control the DOM and can name classes whatever we want. Concerns: external selectors anchored on `.driver-popover-*` vs. `driver-*` names being misleading once driver.js is gone.
**Options considered**:
- A) Rename everything to `codap-tour-*`.
- B) Keep `driver-*` names verbatim.
- C) Apply both class sets simultaneously.

**Decision**: A. The public plugin API and `plugin-tour-api.md` don't promise any class names, so this isn't an API break. Keeping `driver-*` after driver.js is removed would confuse future readers; a dual-name shim is the kind of backwards-compatibility hack we avoid. We own the in-repo callers and will update both.

---

### Overlay implementation — SVG mask, CSS clip-path, or 4-div shim?
**Context**: Originally posed when an overlay was still in scope.

**Decision**: Moot — there is no overlay. The pointer model (popover + arrow only, no dimming) supersedes this question. Overlay-related fields are removed from the API; overlay-click-to-close is replaced by the close button + Escape.

---

### Should we re-enable `feature-tour.spec.ts` as part of this PR?
**Context**: The Cypress spec is `describe.skip`-ed and its driver.js selectors will break. The Feature Tour itself has been removed from the Help menu in production.
**Options considered**:
- A) Re-enable in this PR with updated selectors.
- B) Defer to a follow-on PR.
- C) Delete and rewrite as engine unit tests.
- D) Leave the spec as-is.

**Decision**: D. The Feature Tour isn't reachable from the UI, so there's nothing for it to cover today; when it (or a successor) is reinstated, whoever rewires it will update these selectors as part of that work. Updating selectors now just for a skipped spec adds churn for no coverage benefit.

---

### Popover animation between steps
**Context**: With the overlay gone, "animation" reduces to popover behavior on appear, dismiss, and step transitions.
**Options considered**:
- A) Cross-fade + slide between targets.
- B) Slide between targets without fade.
- C) Snap with optional fade in/out only.

**Decision**: B. Step transitions use a CSS `transition` on `transform` (~200ms, ease-out) so the popover smoothly translates between targets. Initial appear and final dismiss use a short opacity fade (~150ms). When `animate: false`, both are disabled.

---

### Visual indication of the target element
**Context**: Without an overlay, the only thing pointing at the target is the popover's arrow. On a busy CODAP screen the user may need a moment to see what the arrow points at.
**Options considered**:
- A) Nothing extra — arrow only.
- B) Subtle outline ring around the target.
- C) Configurable per step.

**Decision**: B. CODAP's audience (middle-school-and-up students) benefits from an unambiguous "this is the thing" cue. The ring is a 2px outline in `vars.$teal-dark`, rendered as a non-blocking absolutely-positioned element (`pointer-events: none`, Portal-rendered) that tracks the target's bounding rect via `autoUpdate`. No new API surface; always on while a tour/highlight is active.

---

### How does "target removed from DOM" signal reach `tour-manager.cancelActive()`?
**Context**: `useTargetWatcher` (a React hook inside the popover) detects DOM removal; the notification emission lives in `cancelActive()`.
**Options considered**:
- A) Add `onCancelRequested` to `EngineCallbacks`.
- B) Engine auto-destroys with a `reason` field.
- C) Imperative `engine.signalTargetRemoved()` method.

**Decision**: A. Keeps `cancelActive()` as the single chokepoint for cancel emission; no new code paths fork the existing notification flow.

---

### React root lifecycle — per-call vs. persistent singleton?
**Context**: Every `createTourEngine()` call needs a DOM container and React root.
**Options considered**:
- A) Per-call — `createTourEngine()` creates and `engine.destroy()` unmounts.
- B) Persistent singleton.

**Decision**: A. The `createRoot` cost is negligible (not a hot path); matching driver.js's 1:1 instance semantics keeps the tour-manager seam a true drop-in. Singleton optimization buys nothing measurable.

---

### MobX observable vs. plain store + `useSyncExternalStore`?
**Context**: The engine needs a reactive bridge between imperative methods and the React tree.
**Options considered**:
- A) MobX `observable` + `mobx-react-lite` `observer`.
- B) Plain store + `useSyncExternalStore`.

**Decision**: A. Every CODAP contributor already reads MobX `observer`/`observable` fluently; consistency outweighs the ~20 LOC savings.

---

### How do popover click handlers reach engine imperative methods?
**Context**: Next/Prev/Close `onClick` need a path to `moveNext` / `movePrevious` / `cancel`.
**Options considered**:
- A) Store action methods on the MobX observable itself.
- B) React context provider.
- C) Prop drilling from `TourRoot`.

**Decision**: A. The observable is already the single engine↔React channel; method fields next to data fields is the standard MobX-store shape.

---

### Reference handling — `elements.reference` option vs. imperative `setReference`
**Context**: The popover needs to track `state.currentStep.element` across step transitions. The obvious `useFloating({ elements: { reference: step.element }})` form silently breaks on step change because `useFloatingRootContext` runs `useState(elementsProp.reference)` which captures only the first step's element.

**Decision**: Use `refs.setReference(step.element)` inside `useEffect([step.element])` instead. Routes through `position.refs.setReference()`, which actually updates the stored reference and re-runs the position pipeline. Worth a comment in the code explaining *why* the obvious form is wrong.

---

### Drag middleware deepEqual gotcha
**Context**: While dragging, a custom `dragOverride` middleware sets the popover's x/y. But `@floating-ui/react-dom`'s `deepEqual` treats two functions as equal when their `.toString()` matches. The drag fn's source is constant across closures, so the middleware would never update past the first move.

**Decision**: Encode the drag position into the middleware's `name` (`dragOverride-${x}-${y}`) so the array's structural identity changes each move and `deepEqual` returns false. Also, while dragging, drop the `flip()` and `shift()` middleware (the user has chosen position manually) and use `strategy: "fixed"` so floating-ui's x/y are viewport coords matching the drag hook's coordinate system.

---

### Highlight Done button must emit `highlightCleared`
**Context**: A single-step highlight's "Done" button advances past the last step, taking the engine's natural-completion branch (`onDestroyed` → `destroy()`), not the cancellation branch (`onCancelRequested`). Without an `onDestroyed` handler in `highlight()`, Done emits no notification and `manager.active` stays stale.

**Decision**: Wire `onDestroyed` in `highlight()` to emit the same `highlightCleared` notification as `cancelActive()` does for the cancel paths. The two callbacks are mutually exclusive in the engine, so there's no double-notify risk. Highlights collapse all three dismiss paths into a single notification because plugins typically observe `highlightCleared` as a single "user is done" signal.

---

### Default popover side
**Context**: Floating-ui's default placement is `bottom`. CODAP toolbar buttons drop menus downward, so `bottom`-placed popovers obscure those menus.

**Decision**: Default to `right` when `step.popover.side` is unspecified. `flip()` middleware automatically flips to `left` when the target is too close to the right viewport edge.

---

### `refresh()` no-op — observable toggle collapses inside `runInAction`
**Context**: Setting `state.currentStep = null` then back to the previous value inside one `runInAction` produces no observable change (MobX batches and only notifies on net effect).

**Decision**: Add a `refreshTick: number` field to `EngineLiveState`; `refresh()` increments it inside `runInAction`. The popover's `useEffect(() => update(), [state.refreshTick])` calls `useFloating.update()` when the tick changes.

---

### Focus on dismiss
**Context**: If a user has Tab'd to a popover button (Next / Previous / Close) and triggers unmount, browsers reset focus to `<body>` — the user loses their place.

**Decision**: Capture `document.activeElement` as a pre-tour focus anchor when the engine is first entered. On `destroy()`, walk the chain: (1) if focus is inside popover and target is connected → focus target (apply `tabindex="-1"` if needed); (2) else if pre-tour anchor still connected → focus anchor; (3) else → no-op. Detect "focus inside popover" by walking up from `document.activeElement.closest(".codap-tour-popover")`, not searching from the engine's container (popovers render via `FloatingPortal`, outside the engine's container).

---

### Keyboard handler ignore-list and `defaultPrevented` short-circuit
**Context**: A user pressing keys inside a Chakra menu / select / listbox / dialog should not have those keystrokes hijacked by the tour handler.

**Decision**: (1) Carve out popover-internal focus from the ignore-list so popover-button focus still handles arrow/escape. (2) Maintain a `WIDGET_ROLES` set covering menu, menuitem, listbox, option, slider, spinbutton, dialog, alertdialog, combobox, etc. — focus inside any element with one of these roles disables the tour's shortcuts. (3) Check `e.defaultPrevented` at the top of the handler so widget-underneath handlers (Chakra menu Escape, modal's own Escape) don't get double-processed.

---

### `useTargetWatcher` observation scope — `document.body` vs. ancestor
**Context**: Initial design observed `target.parentElement` to keep the mutation scope narrow. But when a parent unmounts (tile close), the parent's own childList is unchanged — target is still a child of the now-detached parent. MutationObservers on detached scopes don't fire, and `target.isConnected` flips to `false` undetected.

**Decision**: Observe `document.body` with a cheap `target.isConnected` check in the callback. The callback body is a single ref read, effectively free even at thousands of mutations per second.

---

### `OutlineRing` positioning — not `useFloating`
**Context**: `useFloating` produces a `transform` for the ring's placement. Writing `transform` imperatively in a `size.apply` middleware would be overwritten by the next React commit's `...floatingStyles` spread. `useFloating` is also the wrong primitive — the ring isn't "floating element relative to a reference," it's "match the reference's rect exactly."

**Decision**: Don't use `useFloating` for the ring. Subscribe to target rect changes via `autoUpdate` (used purely for its scroll/resize/layout subscription, ignoring its positioning output) and write width/height/top/left to React state from `target.getBoundingClientRect()`. Add a shallow numeric equality guard to skip re-renders when the rect is unchanged.

---

### Reduced-motion implementation — JS-driven modifier class, not pure `@media`
**Context**: A pure `@media (prefers-reduced-motion: reduce)` SCSS block would be cleaner, but Jest + jsdom doesn't evaluate `@media` queries — the regression-trap test couldn't validate the behavior.

**Decision**: Drive the reduced-motion decision from JS — a `useReducedMotion()` hook subscribes to `window.matchMedia` and toggles a `codap-tour-popover--reduced-motion` modifier class. The stylesheet zeroes the transition on that class. Tests verify the modifier class is present when matchMedia is mocked to match. Requires `window.matchMedia` to be polyfilled in the Jest setup.

---

### `aria-live` region needs `aria-atomic="true"`
**Context**: With the default `aria-atomic="false"`, screen readers announce only the diff on each step transition — fragmenting the title/description/progress update into multiple disjointed announcements.

**Decision**: Set `aria-atomic="true"` so SRs re-announce the entire live region as one coherent unit on any change.

---

### Close button accessible name
**Context**: An icon-only close button with no `aria-label` is announced as "button" with no purpose hint.

**Decision**: Close control carries `aria-label="Close"`. The popover renders the same `close-tile-icon.svg` as the tile title-bar close button (with hover-color shift on the SVG fill, no background tint) so the dismiss control reads as a peer of CODAP's other component-close affordances.

---

### Adjacent CODAP bugfixes uncovered while validating the example plugin

While running the demo tour plugin's reactive-workflow example end-to-end, two pre-existing CODAP bugs surfaced that prevented `highlight({ component: <id> })` from working. Neither is part of the original CODAP-1231 scope, but both ship with this branch because the requirements committed to "the example tour plugin works unchanged" as the manual-verification acceptance criterion.

**Bug 1 — case-table create notifies the wrong tile id.** `handleCreateNewCaseTable` in [`v3/src/components/case-table/case-table-tool-shelf-button.tsx`](v3/src/components/case-table/case-table-tool-shelf-button.tsx) created two tile models: an "orphan" tile via `createDefaultTileOfType` (used only as a `providerId` for `gDataBroker.addDataSet`) and the real workspace tile created inside `createTableOrCardForDataset`. The `notify` callback fired `createTileNotification(tile)` with the orphan tile's id. Plugins reflecting that id back via `{ component: <id> }` would resolve the orphan from `tileMap` but `document.getElementById(orphan.id)` returned null. **Fix**: after `createTableOrCardForDataset`, look up the real tile via `sharedMetadata.caseTableTileId` and notify with that.

**Bug 2 — plugin component create handler skipped the create notification entirely.** [`v3/src/data-interactive/handlers/component-handler.ts`](v3/src/data-interactive/handlers/component-handler.ts) had `notify: createTileNotification(tile)` evaluated *immediately* when the options object literal was constructed — at which point `tile` was still `undefined`. `createTileNotification(undefined)` short-circuits to `return undefined`, so plugin-created components fired no notification at all. **Fix**: wrap in `() => createTileNotification(tile)` so it runs after `applyModelChange`'s actionFn assigns `tile`. Other call sites in the codebase (`tool-shelf.tsx`, the case-table button after Bug 1's fix) already used this form.

A regression test in `tour-manager.test.ts` (`silently skips when component resolves to a tile model not rendered in the DOM`) locks in that `tour-manager.highlight()` is a clean no-op when the bug shape resurfaces — model exists in tileMap but `document.getElementById` returns null. The fix path is verified end-to-end via the Example3 reactive-workflow demo.
