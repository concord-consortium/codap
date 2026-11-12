# Merge cisco-tours and adopt CFM 2.3.x, with CODAP's tour on coachmarks

**Jira**: https://concord-consortium.atlassian.net/browse/CODAP-1500

**Status**: **Closed**

## Overview

Land the long-lived `cisco-tours` work (plugin UI notifications, testid coverage, the floating-ui tour) and CFM 2.3.x on CODAP's `main`, with CODAP's plugin tour drawn by the shared `@concord-consortium/coachmarks` library instead of CODAP's own copy of the same engine. The CODAP fixes coachmarks lacked moved into coachmarks first and shipped as the pre-release `0.0.1-pre.12`; plugins see the same tour API and notifications as before, and the skipped tour and UI-notification Cypress specs run again.

## Requirements

### coachmarks (its own PR and pre-release, made first)

- **R1.** ArrowLeft, ArrowRight and Escape pressed with Alt, Ctrl, Meta or Shift do nothing in the engine, so the browser and the focused widget keep them.
- **R2.** A popover drag keeps receiving pointer events while the pointer passes over an iframe, and releasing over an iframe ends the drag. *(The pointer is captured once the drag moves, at the first move on the page or when the pointer leaves the popover, not on pointerdown, so a click inside the popover keeps its target; ending a drag by a step change releases the capture.)*
- **R3.** A touch drag on a draggable popover moves it rather than scrolling the page (`touch-action: none` in `base.css`, beside `cursor: grab`). *(Checked by computed style only; a touch drag on a real device was not tried.)*
- **R4.** Under `initialFocus: "none"`, when Previous returns to the first step (where Previous is hidden) and focus was on Previous, focus moves to Next, or to the popover if Next is not shown or disabled, instead of dropping to `<body>`. *(The record of the Previous press is kept per engine and per tour outside the popover component, so it survives a remount when the step changes shape; it counts focus in any of the tour's popovers, including a companion; only the primary popover acts on it; focus moves only from `<body>`; and a Previous the engine ignores while waiting for a step's target is not recorded.)*
- **R5.** Under `initialFocus: "none"`, each step's title and description are announced through a polite live region inside the popover. The region mounts empty and receives the text after the popover is in the accessibility tree, so the first step and single highlights are announced too. If the engine moves focus into the popover when a step starts (pulling it out of an iframe), the dialog's own name and description announce that step and the live region does not repeat it. Under the other `initialFocus` modes no live region is rendered. *(Bold markdown is announced as plain text, and the suppression applies only to the visit whose start pulled focus.)*
- **R6.** Ending a tour or highlight while focus is in the popover moves focus to the step's target without taking a focusable target out of the Tab order. Only a target that cannot take focus as it is (a plain `<div>`, or an `<a>` without `href`) receives `tabindex="-1"`; a disabled, not laid out or `visibility: hidden` control is left as it is. *(Decided by where focus lands after the first `focus()` call, not by tag name.)*
- **R7.** The `codap` theme (`styles/codap.css`) matches CODAP's tour styles from `v3/src/lib/tour/tour-styles.scss`: popover background, border color, radius, shadow and padding, title, description and progress fonts and colors, button colors, the outline-ring color, the focus-outline color and offset on the buttons, and the close button's size, position and hover color for an SVG `closeIcon` like CODAP's. The one exception is the Previous and Next hover background: CODAP's `#01879e` gives their white 12px text 4.23:1, below WCAG AA's 4.5:1, so the theme uses `#007e98` (4.73:1), which keeps the lighter-on-hover look.
- **R8.** The package exports its `isLaidOut(el)` check, so a consumer can filter steps by the engine's own rule.
- **R9.** Apart from R1 to R8, existing coachmarks behavior is unchanged: the hazbot theme, the demo sections and the default `initialFocus: "popover"` mode behave as before. The existing suite, `npm run check` and the smoke test pass, with new tests for R1 to R6.
- **R10.** The changes land on coachmarks `main` through a reviewed PR, and are published to npm as `0.0.1-pre.12` under the `next` dist-tag before CODAP depends on them. *(Published from the reviewed PR branch before the PR merged, once the automated reviews were resolved, at Doug's call; the plan had been to publish from the merged `main`.)*

### CODAP

- **R11.** Plugin tours, plugin highlights and internal tours (`runInternalTour`) are drawn by `@concord-consortium/coachmarks` with its `codap` theme. `v3/src/lib/tour/tour-engine/` and `tour-styles.scss` are removed, and CODAP depends on coachmarks at exactly `0.0.1-pre.12`.
- **R12.** The plugin tour API is unchanged for plugins: the same requests, options and responses, and the same notification sequences as documented in `v3/doc/plugin-tour-api.md`. In particular:
  - a cancelled tour (close button, Escape, target removed, `endTour`, or replaced by another tour or highlight) sends `cancelled` and neither `stepEnded` nor `completed`;
  - a completed tour sends `stepEnded` for the last step and then `completed`, once;
  - a tour that moves to a step whose target has been removed or hidden since the tour started sends `stepEnded` for the step it left and then `cancelled` with no step fields, since the new step never starts;
  - `stepEnded` is sent only for a step that received `stepStarted`;
  - a highlight that is dismissed, completed or replaced sends `highlightCleared` once, and `clearHighlight` from the owning plugin sends none;
  - when the owning plugin disconnects, its tour or highlight ends with no notification.
- **R13.** CODAP keeps its presentation defaults by passing them to coachmarks: popover on the `right` when the step sets no `side`; `smoothScroll` false unless set; popover label "Tour step", button labels, progress text and the close button's label from `V3.Tour.*`; "Got it!" as a tour's last-step label and "Done" for a highlight unless `doneBtnText` is set; CODAP's close-tile icon; no avatar; `initialFocus: "none"`. Descriptions take coachmarks' default markdown, which is bold only: `**bold**` and `__bold__` show as bold, and all other text and every title show as written.
- **R14.** A target that is in the document but not laid out (coachmarks' `isLaidOut`) is treated like a missing target when the tour or highlight starts: a tour step is filtered out (counted in `totalSteps`, not `visibleSteps`) and the tour runs on; a highlight shows nothing and sends no notification. A target that loses its layout after its step started cancels the tour or clears the highlight.
- **R15.** These coachmarks behaviors are accepted and documented for plugin authors: the popover is a non-modal dialog named by its title, with the title as a heading; scrolling respects `prefers-reduced-motion`; focus is pulled out of a plugin iframe on every step; `stepStarted` is sent once the popover is positioned; popover testids are `coachmarks-*`.
- **R16.** The tour popover is not reported by `uiNotificationMonitor` as an `appear` or `disappear` marker; tours and highlights are reported only through `tourUpdate` and `highlightUpdate`. Clicks on the popover's buttons are still reported as `click` notices.
- **R17.** The tour Cypress spec runs in the regression suite. It drives tours and highlights through a fixture plugin using the plugin tour API and checks the step text, Next, Previous, the arrow keys, Escape, the close button and the notifications.
- **R18.** The UI-notifications functional spec runs in the regression suite: its fixture plugin is served for every load (including CODAP's locale reload), iframe-phone comes from CODAP's `node_modules`, tests wait until CODAP has answered the fixture's first request, and the helpers call into the plugin iframe and retry their assertions.
- **R19.** The UI-notifications parity spec has no wall-clock assertion. It checks that CODAP's UI behaves the same with a broad monitor subscribed (a DOM signature over CODAP's app root) and unsubscribes the monitor it subscribed.
- **R20.** CODAP stays on CFM `~2.3.2`. Nothing in CODAP references CFM's pre-2.3 testids, and the full regression suite passes on CFM 2.3.2.

### Delivery

- **R21.** Dependency and lockfile changes are commits of their own, separate from code changes. *(The CFM bump came in with the merge of `main` that predates this spec, so only the coachmarks dependency has its own commit.)*
- **R22.** No commit on `CODAP-1500-merge-cisco-tours` that predates this spec is rewritten. The branch reaches `main` through PR #2726 with a merge commit; if `main` moves first it is merged in again, and nothing is force-pushed.
- **R23.** Before review, PR #2726's description is rewritten to describe the branch as it then stands, replacing the on-hold note, and CI plus the `run regression` suite pass.

## Technical Notes

- **coachmarks surface CODAP uses.** `createCoachmarksEngine(args)` returns `{ drive, highlight, moveNext, movePrevious, moveTo, refresh, destroy, dismissPopover }`. CODAP's options type is a `Pick` of coachmarks' `EngineOptions`. Peer dependencies are React 18 and `@floating-ui/react` ^0.27. The theme import, `@concord-consortium/coachmarks/styles/codap`, must come after the package import: both stylesheets set the same `:root` variables and webpack orders CSS by import order.
- **Progress text.** CODAP renders `V3.Tour.progress` with the literal placeholders `{{current}}` and `{{total}}` as its variables, producing a template coachmarks fills.
- **Teardown.** coachmarks fires `onDeselected` and `onDestroyed` from every `destroy()`. `tour-manager.ts` clears `this.active` before destroying and every callback checks that its engine is still the active one, which also silences a stale engine's late callbacks.
- **Jest.** CODAP maps `^@concord-consortium/coachmarks/styles/` to `identity-obj-proxy`, since the extensionless theme import escapes the `.css` mapping. `isLaidOut` is always false in jsdom, so tour tests mock it with the engine.
- **UI notifications.** `classify-node.ts` treats `[role="dialog"]` as a marker. `findMarkers` drops anything under `[data-testid="coachmarks-root"]` or `[data-testid="coachmarks-popover"]`; the second selector is needed because in Chrome the popover is removed from an already-detached portal node, where `closest(root)` is false.
- **Cypress fixtures.** `cypress/fixtures/test-plugin.html` is served by `cy.intercept` matched on pathname, since CODAP reloads a plugin with `?lang=&locale=` appended, and loads iframe-phone from CODAP's `node_modules`. Readiness is a flag the fixture sets when CODAP answers its first request. The parity spec's DOM signature reads `[data-testid="codap-app"]`, and the File-menu scenarios use CFM's testid `cfm-menu-file`.
- **Related stories.** CODAP-1607 (runnable UI-notification specs) is covered by R18 and R19. CODAP-1608's tour items and CODAP-1609's tour-popover items now apply to coachmarks; this story fixes CODAP-1609's leftover `tabindex` (R6) and the button hover contrast (R7).

## Out of Scope

- CODAP-1605 (keyboard activation of React Aria controls in UI notifications), CODAP-1606 (dialog reporting and rate accounting), CODAP-1610 (testid convention gaps).
- CODAP-1608's work: re-resolving remounted targets, popover overflow at high zoom, and localizing the tour-key registry text.
- CODAP-1609's remaining items: a keyboard-shortcut hint, linking the popover to its target, returning focus to where it was before the tour, forced-colors styling of the close icon, preventing an undismissable popover, and the ring's contrast value, which needs design input.
- Restoring a built-in "Feature Tour" in the Help menu. `runFeatureTour()` and `feature-tour-config.ts` stay as they are.
- Promoting coachmarks to `latest` or to a non-prerelease version, and any change to Hazbot or wildfire-model.
- CFM changes. 2.3.2 is already published under `latest`.
- Reinstating the driver.js overlay options (`overlayColor`, `overlayOpacity`, `stagePadding`, `stageRadius`, `disableActiveInteraction`), which CODAP-1231 removed.

## Decisions

### Requirements

#### Where does the CODAP look live, in coachmarks' `codap` theme or in a CODAP stylesheet that overrides it?
**Context**: coachmarks' `codap` theme no longer matched CODAP's tour styles.
**Options considered**:
- A) Fix the `codap` theme in coachmarks to match CODAP.
- B) Keep the theme and add CODAP-side overrides.

**Decision**: A. The theme exists to be CODAP's look; a second stylesheet overriding most of it would make two sources of truth for the same values, the drift that put this PR on hold.

---

#### Should the live region be an option, or tied to `initialFocus: "none"`?
**Context**: Kirk Swenson suggested rendering it only under `initialFocus: "none"`, or behind an option.
**Options considered**:
- A) Render it only under `initialFocus: "none"`.
- B) A new `announceSteps` option.

**Decision**: A. The region is needed exactly when focus does not move into the dialog; in the other modes it would announce each step twice. Adding an option later is non-breaking.

---

#### How does the tour Cypress spec start a tour now that the Help menu item is gone?
**Options considered**:
- A) Drive tours and highlights through a fixture plugin using the plugin tour API.
- B) Restore the Help menu item.
- C) Add a test-only hook that calls `runFeatureTour()`.

**Decision**: A. The plugin API is the tour's only shipped entry point, so the spec tests what users get, including the notification contract. B is a product change nobody asked for; C tests a path no user can reach.

---

#### Should a step whose target is not laid out be skipped at tour start?
**Context**: coachmarks cancels the tour on reaching such a step; CODAP showed it, pointing at a zero-size box.
**Options considered**:
- A) Skip not-laid-out targets at start, like missing ones.
- B) Let coachmarks cancel the tour when it reaches such a step.

**Decision**: A. Unresolvable steps were already filtered with the tour running on, and `visibleSteps` exists to tell the plugin; B would end tours that target conditional UI partway through. CODAP filters with coachmarks' exported `isLaidOut` so both apply one rule.

---

#### Should the tour popover be visible to `uiNotificationMonitor`?
**Context**: coachmarks' popover is `role="dialog"`, which `classify-node.ts` treats as a marker; CODAP's `role="region"` popover never triggered one.
**Options considered**:
- A) Exclude coachmarks' elements from markers, reporting tours only through `tourUpdate` and `highlightUpdate`.
- B) Report it and document the notices.

**Decision**: A. The popover would be reported as a dialog appearing in region `header` whenever the plugin's own tour started, which is misleading and duplicates `tourUpdate`; A keeps the behavior the UI-notifications API was reviewed with (CODAP-1232).

---

#### Does this story replace CODAP-1607?
**Options considered**:
- A) Do the work here and close CODAP-1607 as done by CODAP-1500 when the PR merges.
- B) Leave the UI-notification specs to CODAP-1607.

**Decision**: A. Doug put re-enabling the skipped specs in this story's scope, and only a running end-to-end spec shows the UI-notifications API works on `main`.

---

#### Should tour descriptions render bold markdown?
**Context**: The plugin API documented title and description as plain text; coachmarks parses bold by default.
**Options considered**:
- A) Pass `parseMarkdown: false` and keep plain text.
- B) Take coachmarks' default: bold only, in descriptions only.

**Decision**: B, at Doug's call. A GitHub code search found no plugin outside Concord's own demos using the tour API, and the demos' text has no `**` or `__`. Titles are never parsed and HTML is always escaped.

---

#### Should the `codap` theme keep CODAP's button hover color?
**Context**: CodeRabbit's review of the coachmarks PR measured white on `#01879e` at 4.23:1, below WCAG AA.
**Options considered**:
- A) Keep `#01879e` for exact parity.
- B) Use `#007e98` (4.73:1), still lighter than the buttons' `#006c8e`.

**Decision**: B. The tour is used in classrooms and the difference is visible only on hover; the ring's contrast stays a design question.

---

### Requirements self-review

- **A disconnecting plugin would be sent `completed`.** coachmarks' `destroy()` fires `onDestroyed`, which the tour callback turned into `completed`. R12 now covers disconnects, and the Jest mock engine fires coachmarks' teardown callbacks so the case can fail.
- **The live region would repeat a step the dialog had just announced.** Focus pulled from an iframe onto the labeled dialog already announces the step, so R5 suppresses the region for that step.
- **R12 did not cover moving to a step whose target has gone.** coachmarks never starts such a step, so the sequence is `stepEnded` for the step left, then `cancelled` with no step fields.

### Implementation

#### One fixture plugin for both specs, or a separate tour fixture?
**Options considered**:
- A) One fixture, `test-plugin.html`, with both sets of hooks.
- B) A second fixture page for tours.

**Decision**: A. The handshake, the ready flag and the iframe-phone source were the parts that had been wrong; with two pages they would have to be kept right twice.

---

#### How does CODAP know that callbacks fired during `destroy()` are its own teardown?
**Options considered**:
- A) Clear `this.active` before `destroy()` and have callbacks check their engine is still active.
- B) A `tearingDown` flag around each `destroy()`.
- C) A "silent destroy" in coachmarks.

**Decision**: A. The identity check also covers a stale engine's late callbacks, which a single flag would not, and it puts no CODAP notification semantics into coachmarks.

---

#### Gate R4 and R5 on the consumer's `initialFocus` option or on the popover's derived focus mode?
**Context**: `popover.tsx` derives `"none"` for every intermediate step of an `actionGated` tour.
**Decision**: The consumer's option. Gating on the derived value would add a live region and refocusing to Hazbot's gated tours, which R9 keeps unchanged.

---

#### Will the `codap` theme match by values alone?
**Decision**: No; coachmarks' markup differs (a content wrapper, an `<h2>` title, progress inside the buttons row). The theme resets the title's margins and font, restacks the buttons row, sets `gap: 0` so the buttons sit 4px apart, uses `max-width: 370px` for the border-box popover, and was checked by a computed-style comparison and screenshots against CODAP's popover.

---

### Implementation self-review

- **`yalc add` would rewrite CODAP's `package.json`.** Development used `yalc link`, removed before the dependency commit.
- **Jest could not load the extensionless theme import.** A `moduleNameMapper` entry maps it to `identity-obj-proxy`.
- **Importing the theme before the package let `base.css` override it.** The theme import comes second, and the plugin-tour spec asserts the ring color.
- **The R16 filter missed the popover's `disappear` in a real browser.** The selector also matches the popover itself, since Chrome removes it from a detached portal node.
- **The parity spec's DOM signature compared two empty strings** (it read a nonexistent `#codap-app`); it now reads `[data-testid="codap-app"]` and asserts it exists.
- **Both File-menu scenarios targeted a class, not CFM's testid**; they use `cfm-menu-file` and close the menu with Escape.
- **R4 missed ArrowLeft.** One `movePrevious` serves the button and the keyboard.
- **`cancelled` could name a step that already received `stepEnded`, and a batched `[startTour, tourMoveTo]` could send `stepEnded` for a step that never started.** `onDeselected` acts only when the step has started and clears that flag.
- **The right-click UI-notification scenario could not fail** (CODAP listens only for `click` and `dblclick`); it was deleted.
- **The docs kept the old `stepStarted` timing, step-field rule and "removed from the page" wording**; `plugin-tour-api.md` now describes the coachmarks behavior.
