# Merge cisco-tours and adopt CFM 2.3.x, with CODAP's tour on coachmarks

**Jira**: https://concord-consortium.atlassian.net/browse/CODAP-1500
**Repo**: https://github.com/concord-consortium/codap (and https://github.com/concord-consortium/coachmarks)
**Implementation Spec**: [implementation.md](implementation.md)
**Status**: **In Development**

## Overview

Land the long-lived `cisco-tours` work (plugin UI notifications, testid coverage, the floating-ui tour) and CFM 2.3.x on CODAP's `main`, with CODAP's plugin tour drawn by the shared `@concord-consortium/coachmarks` library instead of CODAP's own copy of the same engine.

## Project Owner Overview

The CISCO tour work has been parked on a side branch since May because it was too risky to merge during the 3.0 and 3.1 releases. Every week it waits, `main` drifts further from it. This story brings it into `main`: the opt-in plugin UI-notifications API, the testids it relies on, CFM 2.3.x, and a rebuilt plugin tour that no longer uses driver.js.

The rebuilt tour was copied into the coachmarks library in May so that Hazbot, CODAP and future apps could share one implementation, and the two copies have drifted since. Doug Martin decided that CODAP's copy never lands on `main`: the CODAP fixes that coachmarks lacks move into coachmarks first, a coachmarks pre-release is published, and CODAP's tour is switched onto it. Plugins see the same tour API and the same notifications as before. The skipped end-to-end tests for tours and UI notifications run again, so the merged code is checked on every regression run.

## Background

**Where the branch stands.** `CODAP-1500-merge-cisco-tours` holds three pieces of work, each reviewed and merged into `cisco-tours` in May: CODAP-1232 (the `uiNotificationMonitor` plugin API), CODAP-1231 (a floating-ui tour engine replacing driver.js) and CODAP-1236 (testid coverage, enforced by the `codap/require-testid` lint rule). On top of them sit Kirk Swenson's merge of `cisco-tours` with `main`, the fixes from his review of the merged code, and a second merge bringing the branch up to current `main`. Draft PR #2726 targets `main`. The build, lint and Jest suite pass on the branch. Kirk's review filed follow-ups CODAP-1605 to CODAP-1610.

**Why it was put on hold.** At grooming on 2026-10-20 the PR was held because its tour engine (`v3/src/lib/tour/tour-engine/`) duplicates coachmarks. Kirk's Jira comment and the linked Google Doc ("CODAP's tour engine and coachmarks: port now or later?") list what the switch involves. This spec checks that list against both repos as they stand:

| CODAP fix since the extraction | In coachmarks? | Checked at |
|---|---|---|
| Arrow and Escape keys pressed with Alt, Ctrl, Meta or Shift are left to the browser | No | coachmarks `src/use-keyboard-control.ts` |
| Pointer capture while dragging, so a release over a plugin iframe ends the drag | No | coachmarks `src/use-popover-drag.ts` |
| `touch-action: none` on the popover, so touch drags move it | No | coachmarks `src/styles/base.css` |
| Focus stays in the popover when Previous returns to the first step | No (only matters under `initialFocus: "none"`) | coachmarks `src/popover.tsx` |
| A live region announces each step, mounting empty and filling after mount | No | coachmarks `src/popover.tsx` |
| Ending a tour leaves `tabindex="-1"` on the target | Bug in both | coachmarks `src/engine.tsx` `destroy()`; CODAP `tour-engine.tsx` `destroy()` |
| Drag listeners removed when the step changes | Fixed in coachmarks only | coachmarks `use-popover-drag.ts` reset effect |

Kirk's two open questions are answered by the code as it stands:

- **Bold in descriptions.** The plugin API documented title and description as plain text. No plugin outside Concord's own demos uses the tour API (a GitHub code search found none), and the demos' text has no `**` or `__`, so CODAP takes coachmarks' default: `**bold**` and `__bold__` in a description render as bold, and everything else (other markdown, HTML) shows as written. coachmarks supports only bold, and titles are never parsed.
- **Testids.** The `codap-tour-popover-*` testids exist only on this unreleased branch. Outside `v3/src/lib/tour/` nothing in `src`, `cypress` or `doc` references them, and `codap/require-testid` lints only CODAP's own JSX, not markup coachmarks renders. CODAP can take coachmarks' `coachmarks-*` testids, so coachmarks needs no testid option.

**What else differs between the two engines** (from reading coachmarks `src/engine.tsx` and `src/popover.tsx` against CODAP's `tour-manager.ts`):

- coachmarks `destroy()` fires `onDeselected` and then `onDestroyed` on every teardown, including the `destroy()` that CODAP's `cancelActive()` calls. CODAP's engine fires neither on `destroy()`, and `tour-manager.ts` sends `completed` from `onDestroyed`. Wired as-is, a cancelled tour would also send `stepEnded` and `completed`, and a replaced highlight would send `highlightCleared` twice. `plugin-tour-api.md` promises that `stepEnded` is not sent for an interrupted step.
- coachmarks fires `onHighlightStarted` after the popover has mounted and been positioned, not synchronously inside `drive()`. `stepStarted` therefore arrives a frame later than today.
- coachmarks cancels the tour (via `onCancelRequested`) when a step's target is connected but has no layout box (for example `display: none`), checked over one animation frame. CODAP shows such a step today. Moving to a step whose target is gone fires `onDeselected` and then `onCancelRequested`, and the step never starts; CODAP's engine starts it and then cancels.
- Defaults differ: coachmarks places a popover on `top` (CODAP: `right`), scrolls smoothly (CODAP: `smoothScroll` defaults to false, as `plugin-tour-api.md` documents), labels the popover "Help" (CODAP: "Tour step"), says "Done" on the last step (CODAP: "Got it!" for a tour, "Done" for a highlight), and parses markdown.
- coachmarks renders the popover as `role="dialog" aria-modal="false"`, labeled by the step title when there is one, with the title as an `<h2>`. CODAP renders `role="region"` labeled "Tour step". coachmarks also scrolls without animation under `prefers-reduced-motion`, and pulls focus out of a plugin iframe on every step rather than only the first.
- coachmarks' `codap` theme (`src/styles/codap.css`) was ported from an earlier `tour-styles.scss` and no longer matches it: the border (`#cdcdcd` against CODAP's `#0081a9`), text (`#333` against `#222`), progress text (`#666` against `#545454`), button hover (`#005a76` against `#01879E`), outline ring (`#006c8e` against `#01879E`), focus outline (`#006c8e` against `#0957d0`), content padding and the close button all differ.

**CFM.** The branch depends on `@concord-consortium/cloud-file-manager` `~2.3.2`; `main` is on `~2.2.13`. npm already publishes 2.3.2 under both `latest` and `next` (checked with `npm view`), so the story's dist-tag acceptance item is met without CFM work. The rest of the CFM acceptance is that CODAP's tests pass on 2.3.x, which the regression suite checks.

**Skipped end-to-end coverage.**

- `cypress/e2e/feature-tour.spec.ts` is `context.skip` because `main` removed the Help menu's "Feature Tour" item, which its tests click. It also still asserts driver.js classes (`.driver-popover`). `runFeatureTour()` has no caller in the app.
- `cypress/e2e/ui-notifications.spec.ts` and `ui-notifications-parity.spec.ts` are `describe.skip`. CODAP-1607 (Kirk) records why they cannot run even unskipped: the fixture `cypress/fixtures/ui-notification-test-plugin.html` is not served (the dev server serves only `dist`), the fixture loads iframe-phone from unpkg with no version, `cypress/support/with-monitor.ts` calls `subscribeMonitor` on the top window instead of the plugin iframe and reads a `__lastMonitorId` nothing sets, and the parity spec's only real assertion is a 5% wall-clock comparison. Two more faults surface once the harness works: the File-menu scenario filters on the testid `file-menu-button`, which is only a class on CFM's File button (its testid is `cfm-menu-file`), and `with-monitor.ts` takes its DOM signature from `#codap-app`, which does not exist, so the parity comparison is `""` against `""`. `v2-v3-redirect.spec.ts` already serves a fixture page through `cy.intercept`, and `node_modules/iframe-phone/dist/iframe-phone.js` is available locally.

## Requirements

### coachmarks (its own PR and pre-release, made first)

- **R1.** ArrowLeft, ArrowRight and Escape pressed with Alt, Ctrl, Meta or Shift do nothing in the engine, so the browser and the focused widget keep them.
- **R2.** A popover drag keeps receiving pointer events while the pointer passes over an iframe, and releasing over an iframe ends the drag.
- **R3.** A touch drag on a draggable popover moves it rather than scrolling the page (`touch-action: none` in `base.css`, beside `cursor: grab`).
- **R4.** Under `initialFocus: "none"`, when Previous returns to the first step (where Previous is hidden) and focus was on Previous, focus moves to Next, or to the popover if Next is not shown, instead of dropping to `<body>`.
- **R5.** Under `initialFocus: "none"`, each step's title and description are announced through a polite live region inside the popover. The region mounts empty and receives the text after the popover is in the accessibility tree, so the first step and single highlights are announced too. If the engine moves focus into the popover when a step starts (pulling it out of an iframe), the dialog's own name and description announce that step and the live region does not repeat it. Under the other `initialFocus` modes, where focus moving into the dialog announces it, no live region is rendered.
- **R6.** Ending a tour or highlight while focus is in the popover moves focus to the step's target without taking a focusable target (a button, link or form control) out of the Tab order. Only a target that cannot take focus as it is (a plain `<div>`, or an `<a>` without `href`) receives `tabindex="-1"` so it can; a disabled or hidden control is left as it is.
- **R7.** The `codap` theme (`styles/codap.css`) matches CODAP's current tour styles in `v3/src/lib/tour/tour-styles.scss`: popover background, border color, radius, shadow and padding, title, description and progress fonts and colors, button colors including hover, the outline-ring color, the focus-outline color and offset on the buttons, and the close button's size, position and hover color for an SVG `closeIcon` like CODAP's. The one exception is the Previous and Next hover background: CODAP's `#01879e` gives their white 12px text 4.23:1, below WCAG AA's 4.5:1, so the theme uses `#007e98` (4.73:1), which keeps the lighter-on-hover look. CODAP's tour shows this color from the switch on.
- **R8.** The package exports its `isLaidOut(el)` check (the one the engine uses to decide whether a step's anchor can be shown), so a consumer can filter steps by the same rule.
- **R9.** Apart from R1 to R8, which apply in every mode, existing coachmarks behavior is unchanged: the hazbot theme, the demo sections and the default `initialFocus: "popover"` mode render and behave as before. The existing suite, `npm run check` and the smoke test pass, with new tests for R1 to R6.
- **R10.** The changes land on coachmarks `main` through a reviewed PR, and are published to npm as `0.0.1-pre.12` under the `next` dist-tag before CODAP depends on them.

### CODAP

- **R11.** Plugin tours, plugin highlights and internal tours (`runInternalTour`) are drawn by `@concord-consortium/coachmarks` with its `codap` theme. `v3/src/lib/tour/tour-engine/` and `tour-styles.scss` are removed, and CODAP depends on coachmarks at exactly `0.0.1-pre.12`.
- **R12.** The plugin tour API is unchanged for plugins: the same requests, options and responses, and the same notification sequences as documented in `v3/doc/plugin-tour-api.md`. In particular:
  - a cancelled tour (close button, Escape, target removed, `endTour`, or replaced by another tour or highlight) sends `cancelled` and neither `stepEnded` nor `completed`;
  - a completed tour sends `stepEnded` for the last step and then `completed`, once;
  - a tour that moves to a step whose target has been removed or hidden since the tour started sends `stepEnded` for the step it left and then `cancelled` with no step fields, since the new step never starts;
  - `stepEnded` is sent only for a step that received `stepStarted`: a step the tour leaves before its popover is on screen (for example `startTour` and `tourMoveTo` in one batched request) gets neither;
  - a highlight that is dismissed, completed or replaced sends `highlightCleared` once, and `clearHighlight` from the owning plugin sends none;
  - when the owning plugin disconnects (its tile closes, its page reloads, or the document is replaced), its tour or highlight ends with no notification.
- **R13.** CODAP keeps its current presentation defaults by passing them to coachmarks: popover on the `right` when the step does not set `side`; `smoothScroll` false unless the plugin sets it; popover label "Tour step", button labels, progress text and the close button's label from the `V3.Tour.*` strings; "Got it!" as the last-step label for a tour and "Done" for a highlight unless the plugin sets `doneBtnText`; CODAP's close-tile icon; no avatar; focus not moved on step start (`initialFocus: "none"`). Unlike before, descriptions take coachmarks' default markdown, which is bold only: `**bold**` and `__bold__` show as bold, and all other text and every title show as written.
- **R14.** A target that is in the document but has no layout box (by coachmarks' `isLaidOut`, R8) is treated like a missing target when the tour or highlight starts. A tour step with such a target is filtered out, counts toward `totalSteps` but not `visibleSteps`, and does not cancel the tour; a highlight of such a target shows nothing and sends no notification. A target that loses its layout box after its step has started cancels the tour or clears the highlight, as a removed target does today.
- **R15.** These coachmarks behaviors are accepted as improvements and documented where plugin authors would notice them: the popover is a non-modal dialog named by its title, with the title as a heading; scrolling to a target respects `prefers-reduced-motion`; focus is pulled out of a plugin iframe on every step; `stepStarted` is sent once the step's popover is positioned; popover testids are `coachmarks-*`.
- **R16.** The tour popover is not reported by `uiNotificationMonitor` as an `appear` or `disappear` marker: nothing under coachmarks' root element produces those notices, so tours and highlights are reported only through `tourUpdate` and `highlightUpdate`, as before the switch. Clicks on the popover's buttons are still reported as `click` notices, as they are today.
- **R17.** The tour Cypress spec runs in the regression suite, not skipped. It drives tours and highlights through a fixture plugin using the plugin tour API and checks: the popover shows the step text; Next, Previous, the arrow keys, Escape and the close button behave as R12 and R13 describe; and the plugin receives the documented notifications.
- **R18.** The UI-notifications functional spec runs in the regression suite, not skipped, and passes: its fixture plugin is served to the dev server for every load (including CODAP's locale reload, which appends a query string), iframe-phone comes from CODAP's own `node_modules` rather than unpkg, tests wait until CODAP has answered the fixture's first request, and the helpers call into the plugin iframe and retry their assertions until notices arrive.
- **R19.** The UI-notifications parity spec runs without a wall-clock assertion. It checks instead that CODAP's own UI behaves the same with a broad monitor subscribed (the DOM-signature comparison in `with-monitor.ts`, taken over CODAP's app root), and unsubscribes the monitor it subscribed.
- **R20.** CODAP stays on CFM `~2.3.2`. Nothing in CODAP's tests or code references CFM's pre-2.3 testids, and the full regression suite passes on CFM 2.3.2.

### Delivery

- **R21.** Dependency and lockfile changes are commits of their own, separate from code changes.
- **R22.** No commit on `CODAP-1500-merge-cisco-tours` that predates this spec (Kirk's work, the merges with `main` and their follow-ups) is rewritten. The branch reaches `main` through PR #2726, merged with a merge commit (not squash or rebase). If `main` moves before the merge, it is merged into the branch again (a merge, not a rebase), and nothing is force-pushed.
- **R23.** Before review, PR #2726's description is rewritten to describe the branch as it then stands (the coachmarks switch, the re-enabled specs, CFM), replacing the on-hold note, and CI plus the `run regression` suite pass.

## Technical Notes

- **coachmarks surface CODAP uses.** `createCoachmarksEngine(args)` returns `{ drive(steps), highlight(step), moveNext, movePrevious, moveTo, refresh, destroy, dismissPopover }`. Steps are `{ element, popover: { title, description, side, align } }`. Options CODAP passes: `showButtons`, `disableButtons`, `showProgress`, `allowKeyboardControl`, `allowClose`, `animate`, `smoothScroll`, `popoverOffset`, `progressText`, `nextBtnText`, `prevBtnText`, `doneBtnText`, `closeIcon`, `ariaLabel`, `closeBtnAriaLabel`, `initialFocus`, `showAvatar`. Peer dependencies are React 18 and `@floating-ui/react` ^0.27, both already in CODAP (`^0.27.19`). The package root import pulls in `base.css`; the theme is a separate import, `@concord-consortium/coachmarks/styles/codap`, which must come after the package import: both stylesheets set the same `:root` variables, and webpack orders CSS by import order.
- **Progress text.** coachmarks substitutes `{{current}}` and `{{total}}`; CODAP's `V3.Tour.progress` string is `%{current} of %{total}`. CODAP renders its localized string with the literal placeholders `{{current}}` and `{{total}}` as the variables to produce a template coachmarks can fill.
- **Notification wiring.** `tour-manager.ts` maps engine callbacks to plugin notifications. Because coachmarks fires `onDeselected` and `onDestroyed` from `destroy()`, the manager has to know when it is the one tearing down (cancel, replace, `clearHighlight`, plugin disconnect) and ignore those callbacks then, rather than relying on the engine to stay silent.
- **Jest.** CODAP's Jest maps `.css` to `identity-obj-proxy` and resolves coachmarks' CommonJS build (`dist/index.cjs`, which requires `./styles/base.css`). The theme import, `@concord-consortium/coachmarks/styles/codap`, has no extension, so it needs a `moduleNameMapper` entry of its own. `tour-manager.test.ts` and `tour-sanitize.test.ts` mock `./tour-engine` today and will mock `@concord-consortium/coachmarks` instead. The tests under `tour-engine/` go away with the engine; their behaviors are covered by coachmarks' own suite.
- **UI notifications.** `classify-node.ts` treats `[role="dialog"]` as an appear/disappear marker. coachmarks' popover is `role="dialog"`, where CODAP's was `role="region"`, so the switch makes the tour popover visible to `uiNotificationMonitor` unless CODAP excludes it.
- **Cypress fixtures.** Fixture pages can be served with `cy.intercept` returning `cy.fixture` contents (the pattern in `v2-v3-redirect.spec.ts`), and iframe-phone the same way from `node_modules/iframe-phone/dist/iframe-phone.js`. CI's Cypress job runs against `npm start` (the dev server), as local runs do.
- **Why the UI-notification spec looked flaky.** A throwaway spec (served as above) showed the cause. CODAP loads a plugin, then reloads it with `?lang=en&locale=en-US` appended (`web-view.tsx` adds locale parameters when `needsLocaleReload` flips). An intercept whose URL glob has no query part misses the reload, so the reloaded iframe gets a 404 page without the fixture's functions, and a readiness check that only looks for `subscribeMonitor` can pass on the first page just before it is replaced. Intercepting by `pathname`, waiting for a flag the fixture sets when CODAP replies to its first request, and selecting `.codap-web-view-iframe` (not the first `iframe`) made the same click scenario pass four runs out of four with retries off. The existing helpers also read delivered notices once with no retry, although delivery is asynchronous; retrying assertions (`.should(callback)`) fix that.
- **Verified with coachmarks `0.0.1-pre.11` installed temporarily.** CODAP's Jest loads the real engine (CSS mapped to `identity-obj-proxy`); a production webpack build bundles the package and its `styles/codap` stylesheet; `tsc` accepts the imports. In jsdom, `destroy()` after a cancel fired `onDeselected` then `onDestroyed`; `onHighlightStarted` fired after `drive()` had returned; a target with no layout box produced `onCancelRequested` instead of a step; `t("V3.Tour.progress", { vars: { current: "{{current}}", total: "{{total}}" } })` returned `{{current}} of {{total}}`; and the UI-notification DOM observer reported the popover as `appear`, region `header`, testid `coachmarks-popover`.
- **Merge commits on `main`.** The repository allows merge commits, and `main`'s first-parent history is made of "Merge pull request" commits.
- **Related stories.** CODAP-1607 (make the UI-notification Cypress specs runnable) is covered entirely by R18 and R19. CODAP-1608's tour items (target re-resolution, popover overflow) and CODAP-1609's tour-popover items now apply to coachmarks. Of CODAP-1609's items, this story fixes the leftover `tabindex` (R6); the move to coachmarks names the popover by its title, makes the title a heading, and honors reduced motion for scrolling (R15).

## Out of Scope

- CODAP-1605 (keyboard activation of React Aria controls in UI notifications), CODAP-1606 (dialog reporting and rate accounting), CODAP-1610 (testid convention gaps).
- CODAP-1608's work: re-resolving remounted targets, popover overflow at high zoom, and localizing the tour-key registry text.
- CODAP-1609's remaining items: a keyboard-shortcut hint, linking the popover to its target, returning focus to where it was before the tour, forced-colors styling of the close icon, preventing an undismissable popover, and the ring's contrast value, which needs design input. The Previous and Next hover contrast is fixed under R7.
- Restoring a built-in "Feature Tour" in the Help menu. `runFeatureTour()` and `feature-tour-config.ts` stay as they are.
- Promoting coachmarks to `latest` or to a non-prerelease version, and any change to Hazbot or wildfire-model.
- CFM changes. 2.3.2 is already published under `latest`.
- Reinstating the driver.js overlay options (`overlayColor`, `overlayOpacity`, `stagePadding`, `stageRadius`, `disableActiveInteraction`). CODAP-1231 removed them on `cisco-tours`; the API ignores them.

## Open Questions

### RESOLVED: Judgment call: where does the CODAP look live, in coachmarks' `codap` theme or in a CODAP stylesheet that overrides it?
**Context**: coachmarks' `codap` theme no longer matches CODAP's tour styles (Background). CODAP could import the theme and override the differences from its own SCSS, or the theme could be corrected.
**Options considered**:
- A) Fix the `codap` theme in coachmarks to match CODAP (R7).
- B) Keep the theme as is and add CODAP-side overrides.

**Decision**: A. The theme exists to be CODAP's look, and a second stylesheet overriding most of it would make two sources of truth for the same values, the drift that put this PR on hold. CODAP may still set CSS variables for values it computes from its own SCSS tokens if the implementation finds that cleaner.

### RESOLVED: Judgment call: should the live region (R5) be an option, or tied to `initialFocus: "none"`?
**Context**: Kirk suggested rendering it only under `initialFocus: "none"`, or behind an option.
**Options considered**:
- A) Render it only under `initialFocus: "none"`.
- B) A new `announceSteps` option.

**Decision**: A. The region is needed exactly when focus does not move into the dialog, which is what `"none"` means; in the other modes focus entering the dialog announces it, and a live region as well would announce the step twice. No consumer needs the other combinations, and adding an option later is non-breaking.

### RESOLVED: Judgment call: how does the tour Cypress spec start a tour now that the Help menu item is gone?
**Context**: `feature-tour.spec.ts` clicks Help > Feature Tour, which `main` removed, and asserts driver.js classes.
**Options considered**:
- A) Rewrite it to drive tours and highlights through a fixture plugin, using the plugin tour API.
- B) Restore the Help menu item.
- C) Add a test-only hook that calls `runFeatureTour()`.

**Decision**: A. The plugin API is the tour's only shipped entry point, so the spec tests what users get, including the notification contract (R12). B is a product change nobody asked for; C tests a path no user can reach. The fixture plugin is shared with the UI-notifications spec's serving approach (R18).

### RESOLVED: Low confidence: should a step whose target has no layout box be skipped at tour start (R14)?
**Context**: coachmarks cancels the tour when a step's target is connected but has no layout box. CODAP today shows such a step, with the popover pointing at a zero-size box. R14 proposes skipping it at start, like a missing target, which keeps a tour with a hidden step running. A target that loses its layout mid-tour still cancels, as a removed target does today.
**Options considered**:
- A) Skip not-laid-out targets at start, like missing ones (R14 as written).
- B) Let coachmarks cancel the tour when it reaches such a step, and document it.

**Decision**: A. Today an unresolvable step is filtered and the tour runs on, and `visibleSteps` exists to tell the plugin so; under B the same plugin tour would instead end with `cancelled` partway through, a regression for plugins that target conditional UI by `testId` or `selector`. The registry's own keys all name top-level controls that are always laid out, so this only affects plugin-supplied targets. Filtering uses coachmarks' exported `isLaidOut` (R8) so CODAP and the engine apply one rule. In jsdom `isLaidOut` is always false (no `offsetParent`), so CODAP's Jest tests mock the check along with the engine.

### RESOLVED: Low confidence: should the tour popover be visible to `uiNotificationMonitor` (R16)?
**Context**: coachmarks' popover is `role="dialog"`, which `classify-node.ts` treats as an appear/disappear marker. After the switch, a plugin monitoring `appear` would be told when a tour popover appears, which CODAP's `role="region"` popover never triggered. Clicks on the popover's buttons are reported either way, since they are real DOM clicks.
**Options considered**:
- A) Exclude the coachmarks root from UI-notification markers, so tours are reported only through `tourUpdate` and `highlightUpdate`, as today.
- B) Report it, and document that the tour popover produces `appear` and `disappear` notices with testid `coachmarks-popover`.

**Decision**: A. Read through `dom-observer.ts` and `classify-node.ts`: the popover would match the `[role="dialog"]` marker once when it mounts and once when it unmounts (it persists across steps), and `classifyNode` would put it in region `header`, because its `aria-labelledby` points at its own title and the walk falls through to the fallback. A plugin would be told a dialog appeared in the header when its own tour started, which is misleading and duplicates `tourUpdate`. The UI-notifications API was reviewed (CODAP-1232) with a tour popover that produced no markers, so A keeps its reviewed behavior, and the exclusion is one selector check in `findMarkers`.

### RESOLVED: Low confidence: does this story replace CODAP-1607?
**Context**: R18 and R19 do all of CODAP-1607's work. If they land here, CODAP-1607 has nothing left. Closing or linking it is a Jira change outside this spec.
**Options considered**:
- A) Do the work here (R18, R19) and close CODAP-1607 as done by CODAP-1500 when the PR merges.
- B) Leave the UI-notification specs to CODAP-1607 and re-enable only the tour spec here.

**Decision**: A. Doug put re-enabling the skipped feature-tour and UI-notification Cypress specs in this story's scope, and the story's acceptance asks that the UI-notifications API work on `main`, which only a running end-to-end spec shows. Closing CODAP-1607 as done by this story is a Jira step for when the PR merges.

## Self-Review

Roles: Senior Engineer, QA Engineer, Product Manager (plugin authors as users), WCAG Accessibility Expert, Release Engineer. Each finding below was checked against the code before it was recorded; findings with one defensible correction were fixed in place.

### Senior Engineer

#### RESOLVED: A disconnecting plugin would be sent `completed`
`cleanupForTile` (called from `use-data-interactive-controller.ts` on handshake and on unmount) destroys the engine and must send nothing; `tour-manager.test.ts` asserts "does not send notification, plugin is gone". coachmarks' `destroy()` fires `onDestroyed`, which the tour's callback turns into `completed`. R12 did not list this path. Added it to R12. The existing test cannot catch the regression, because its mock engine never fires callbacks from `destroy()`; the implementation spec has to give the mock coachmarks' teardown behavior.

### WCAG Accessibility Expert

#### RESOLVED: The live region would repeat a step the dialog has just announced
Plugin tours start from a plugin iframe, and coachmarks pulls focus from an iframe into the popover on every step entry (`popover.tsx`, the `pullFocusFromIframe` effect keyed on `activeIndex`). Focus landing on a `role="dialog"` labeled by the title and described by the description announces both, and R5's live region would then say the same text again. Steps reached after focus is already inside the popover (the user pressed Next) are not announced by the dialog, so the region is still needed for those. R5 now says the region stays silent for a step whose start pulled focus into the popover.

### Product Manager

#### RESOLVED: R9 said existing behavior is unchanged while R1 changes it for every consumer
R1 (modifier keys) and R6 (`tabindex`) apply to Hazbot's tours as well, so "otherwise unchanged" read as a contradiction. R9 now scopes the claim to everything apart from R1 to R8.

### Release Engineer

#### RESOLVED: R22 tied the no-rewrite rule to "the current head", which moves
The branch head moves as soon as this spec is committed, so "at or below the current head" was ambiguous about which commits are protected. R22 now names them: everything on the branch that predates this spec.


### Plugin Author (self-review round 3)

#### RESOLVED: R12 did not cover a tour reaching a step whose target has gone
coachmarks does not start such a step (checked in a scratch vitest: `onDeselected` then `onCancelRequested`, no `onHighlightStarted`), so the sequence differs from today's `stepStarted` then `cancelled` for the new step, and `cancelled` cannot name a step that never started. R12 now states the sequence; the implementation sends `cancelled` without step fields.
