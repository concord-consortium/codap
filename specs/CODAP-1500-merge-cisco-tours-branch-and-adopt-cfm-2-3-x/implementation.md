# Implementation Plan: Merge cisco-tours and adopt CFM 2.3.x, with CODAP's tour on coachmarks

**Jira**: https://concord-consortium.atlassian.net/browse/CODAP-1500
**Requirements Spec**: [requirements.md](requirements.md)
**Status**: **In Development**

## Implementation Plan

The work is in two repos, in this order:

1. coachmarks, in a worktree at `~/projects/coachmarks.worktrees/CODAP-1500` on branch `CODAP-1500-codap-parity`, started from `origin/main` when implementation begins. Commits use coachmarks' style (`feat: ... [CODAP-1500]`) and must pass its `npm run check` pre-commit hook.
2. CODAP, on `CODAP-1500-merge-cisco-tours` on top of the spec commit. CODAP's dependency on coachmarks can only be committed once `0.0.1-pre.12` is on npm; until then the CODAP steps can be developed against a `yalc` build of the coachmarks branch (`npm run build && yalc publish` there, `yalc link @concord-consortium/coachmarks` here; `yalc link` leaves `package.json` alone, where `yalc add` would rewrite it), and the link is removed (`yalc remove --all`, then `npm ci`) before the dependency commit.

Requirement numbers refer to [requirements.md](requirements.md).

---

### coachmarks: leave modified arrow and Escape keys to the browser (R1)

**Summary**: The keyboard handler ignores keys pressed with a modifier, so Alt+Left stays the browser's Back and Shift+Arrow stays text selection.

**Files affected**:
- `src/use-keyboard-control.ts`: early return after the `defaultPrevented` check.
- `src/use-keyboard-control.test.ts`: new tests.

**Estimated diff size**: ~40 lines

```ts
const handler = (e: KeyboardEvent) => {
  if (e.defaultPrevented) return;
  // Modified keys belong to the browser or the focused widget (e.g. Alt+ArrowLeft is Back).
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  ...
```

Tests: extend `dispatch()` to take an init dict, then one test per modifier: `ArrowRight` with `altKey`, `ctrlKey`, `metaKey`, `shiftKey` does not call `onNext`, and `Escape` with `altKey` does not call `onClose`, while the unmodified key in the same test still does (so the test fails if the handler is simply detached).

---

### coachmarks: capture the pointer while dragging, and let touch drags move the popover (R2, R3)

**Summary**: `onPointerDown` captures the pointer on the popover so `pointermove` and `pointerup` keep arriving while the pointer is over an iframe; `touch-action: none` stops the browser treating a touch drag as a scroll.

**Files affected**:
- `src/use-popover-drag.ts`: `popoverEl.setPointerCapture?.(e.pointerId)` before the document listeners are attached. Captured events still bubble to `document`, so the existing listeners keep working. The optional call keeps jsdom, which lacks the method, working.
- `src/styles/base.css`: `touch-action: none;` in the `.coachmarks-popover--draggable` rule, beside `cursor: grab`.
- `src/use-popover-drag.test.ts`: a test that stubs `setPointerCapture` on the popover element and asserts it is called with the event's `pointerId`, and is not called for a pointerdown on a button inside the popover.

**Estimated diff size**: ~35 lines

R3 has no unit test (jsdom does not apply CSS to touch behavior); it is checked by hand in the demo on a touch device or in Chrome's device emulation, and recorded in the PR.

---

### coachmarks: keep focus in the popover when Previous returns to the first step (R4)

**Summary**: Previous is hidden on the first step, so reaching that step with focus on Previous (clicking it, or pressing ArrowLeft while it has focus) unmounts the focused button and drops focus to `<body>`. Under `initialFocus: "none"` nothing refocuses, so the popover moves focus to Next.

**Files affected**:
- `src/popover.tsx`: a ref on the Next button, a ref holding the step Previous was used on (set by the Previous button and the ArrowLeft handler when focus is in the popover), and an effect that runs when `activeIndex` moves off that step.
- `src/popover.test.tsx`: new test.

**Estimated diff size**: ~50 lines

```tsx
// Per engine, the tour (seqId) and step Previous was used on while focus was in the popover.
// Kept outside the component because a step of a different shape (anchored or viewport)
// remounts it.
const previousFromByStore = new WeakMap<Store<EngineLiveState>, { seqId: number; index: number }>();

// in PopoverContent:
const focusNone = (opts.initialFocus ?? "popover") === "none";
const nextBtnRef = useRef<HTMLButtonElement>(null);
const movePrevious = () => {
  if (activeIndex > 0 && popoverEl?.contains(document.activeElement)) {
    previousFromByStore.set(store, { seqId, index: activeIndex });
  } else {
    previousFromByStore.delete(store);
  }
  store.getSnapshot().movePrevious();
};
useEffect(() => {
  if (!isPrimary || !popoverEl) return;
  const from = previousFromByStore.get(store);
  previousFromByStore.delete(store);
  if (!from || from.seqId !== seqId || from.index === activeIndex) return;
  if (!focusNone) return;
  const active = document.activeElement;
  if (active === null || active === document.body) {
    const next = nextBtnRef.current;
    (next && !next.disabled ? next : popoverEl).focus({ preventScroll: true });
  }
}, [activeIndex, seqId, popoverEl, focusNone, store, isPrimary]);
```

The gate reads the consumer's option rather than the derived `initialFocus` (which `actionGated` forces to `"none"`). The record is made only when a move can happen (not on the first step), and the effect refocuses only when focus has dropped to `<body>`: a Previous that did not move (ArrowLeft on the first step, or a step still waiting for its target) would otherwise leave a record that pulled focus off the page on a later, unrelated step change.

The effect reads `activeIndex` in its body, so biome's `useExhaustiveDependencies` (part of `npm run check`, the pre-commit hook) accepts it without a suppression; a boolean flag with `activeIndex` only in the dependency list is rejected as an unnecessary dependency.

The Previous button's `onClick` and `useKeyboardControl`'s `onPrev` both become `movePrevious`; Next gets `ref={nextBtnRef}`.

Tests, each a two-step tour under `initialFocus: "none"` moved to step 2 (and each engine destroyed in `afterEach`, since a live engine's document keydown listener calls `preventDefault` and silences the next test's engine):
- focus Previous and click it: `document.activeElement` is the Next button;
- focus Previous and press ArrowLeft: the same (fails if `onPrev` bypasses `movePrevious`);
- with focus on `<body>`, press ArrowLeft: the tour is on step 1 and focus stays on `<body>` (fails if the step is recorded without checking where focus is);
- with `showButtons: ["previous", "close"]`, click Previous: focus is on the popover;
- with `disableButtons: ["next"]`, click Previous: focus is on the popover (a disabled button cannot take focus);
- on step 1 with focus on Next, press ArrowLeft, focus an input on the page, then `moveNext()`: the input keeps focus;
- on step 1 with focus on Next, press ArrowLeft, blur, then `moveNext()`: focus stays on `<body>` (fails without the first-step check);
- on a step whose `moveNext()` is waiting for a selector target, click Previous (held by the wait), focus an input, then add the target: the input keeps focus (fails without the `<body>` check);
- with a centered (viewport) first step and an anchored second, click Previous: focus is on Next (the popover remounts for the different shape, so the record must live outside it);
- the same with two-popover groups: focus is on Next, not the companion (only the primary, which has the buttons, reads the record);
- a Previous held by a pending step, then a new `drive()` on the same engine with focus on `<body>`: focus stays on `<body>` (the record belongs to the earlier tour's `seqId`).

A further test under the default `initialFocus` asserts the end state (the popover holds focus). It cannot isolate the `focusNone` gate, since the `initialFocus` effect runs after the new one and refocuses either way.

---

### coachmarks: announce steps through a live region under `initialFocus: "none"` (R5)

**Summary**: With focus left where it was, nothing tells a screen-reader user that a step appeared. The primary popover renders a polite live region that mounts empty and fills 100 ms later, unless the engine pulled focus into the popover at this step's start, in which case the dialog's own name and description already announced it.

**Files affected**:
- `src/popover.tsx`: the region, its text state, and a ref recording which step the iframe pull fired for.
- `src/styles/base.css`: a `.coachmarks-visually-hidden` rule.
- `src/popover.test.tsx`: new tests.

**Estimated diff size**: ~90 lines

Delete the `biome-ignore lint/correctness/useExhaustiveDependencies` comment on the `pullFocusFromIframe` effect: once its body reads `seqId` and `activeIndex`, biome reports the suppression as unused.

```tsx
const announceSteps = isPrimary && focusNone;
const stepKey = `${seqId}:${activeIndex}`;
const focusPulledForStep = useRef<string | null>(null);
// in the existing pullFocusFromIframe effect, after popoverEl.focus(...):
//   focusPulledForStep.current = `${seqId}:${activeIndex}`;

const announcedDescription =
  spec.popover?.description && (opts.parseMarkdown ?? true)
    ? markdownToPlainText(spec.popover.description)
    : spec.popover?.description;
const announcement = [spec.popover?.title, announcedDescription]
  .filter(Boolean)
  .join(" ");
const [liveText, setLiveText] = useState("");
useEffect(() => {
  if (!announceSteps) return;
  setLiveText("");
  const key = stepKey;
  // Screen readers ignore a live region that is already filled when it appears, so the
  // region mounts empty and receives the step text once it is in the accessibility tree.
  const timer = window.setTimeout(() => {
    if (focusPulledForStep.current !== key) setLiveText(announcement);
  }, 100);
  return () => window.clearTimeout(timer);
}, [announceSteps, announcement, stepKey]);
```

`markdownToPlainText`, added to `src/markdown.tsx` with a unit test, drops the bold delimiters `renderMarkdown` hides, so the region says what the popover shows.

Rendered as a sibling after `.coachmarks-popover-content` (not inside it, where it would break the `.coachmarks-popover-description:first-child` rule):

```tsx
{announceSteps && (
  <div
    className="coachmarks-visually-hidden"
    aria-live="polite"
    aria-atomic="true"
    data-testid="coachmarks-popover-live-region"
  >
    {liveText}
  </div>
)}
```

```css
.coachmarks-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

Tests (fake timers):
- under `initialFocus: "none"`, the region is empty at mount and holds "Title Description" after 100 ms; after `moveNext()` it empties and then holds step 2's text;
- a highlight (single step) is announced the same way;
- under the default `initialFocus` no element with the live-region testid renders;
- under `actionGated: true` with no `initialFocus` option, no region renders (gated tours unchanged, R9);
- with an iframe focused when the step starts, the region stays empty for that step, and the next step is announced;
- a step with a companion popover renders one region, on the primary;
- a `**bold**` description is announced without the asterisks.

---

### coachmarks: do not take a natively focusable target out of the Tab order (R6)

**Summary**: `destroy()` sets `tabindex="-1"` on any target without a `tabindex` attribute before focusing it, which turns a button into something Tab skips. It now does so only when the target is not already focusable.

**Files affected**:
- `src/engine.tsx`: in `destroy()`, focus the target first, and only if focus did not land on it, it has no `tabindex` attribute, and it is neither disabled nor hidden (`:disabled`, `isLaidOut`), set `tabindex="-1"` and focus it again; a disabled or hidden control would otherwise stay out of the Tab order once it came back. Checking where focus landed rather than `tabIndex` covers an `<a>` without `href`, which reports `tabIndex` 0 but cannot take focus.
- `src/engine.test.tsx`: the existing test "destroy() restores focus to step anchor when focus was inside the popover" asserts `tabindex="-1"` on its anchor, which `makeAnchorButton()` makes a `<button>`, so it encodes the bug and is updated to expect no `tabindex` attribute. A second test uses a `<div>` anchor (laid out the same way) and expects `tabindex="-1"` and focus on it, and a third does the same for an `<a>` without `href`. A fourth disables a `<button>` anchor before `destroy()` and expects no `tabindex`. A fifth hides a `<div>` anchor (no `offsetParent`) before `destroy()` and expects no `tabindex`.

**Estimated diff size**: ~40 lines

---

### coachmarks: export `isLaidOut` (R8)

**Summary**: CODAP filters tour steps by the same rule the engine uses to decide whether a step can be shown.

**Files affected**:
- `src/index.ts`: `export { isLaidOut } from "./is-laid-out";`
- `tests/smoke.test.ts`: assert the built package exports `isLaidOut` as a function.
- `README.md`: document it under the API reference.

**Estimated diff size**: ~15 lines

Run `npm run build` before committing: `npm run check`'s `tsc` type-checks `tests/smoke.test.ts` against the built `dist/index.d.ts`, which has no `isLaidOut` until it is rebuilt, so the pre-commit hook fails on a stale `dist`.

---

### coachmarks: bring the `codap` theme in line with CODAP's tour styles (R7)

**Summary**: `src/styles/codap.css` is rewritten to the values CODAP's `tour-styles.scss` produces today (CODAP's SCSS variables resolved from `v3/src/components/vars.scss`), so CODAP can delete its stylesheet.

**Files affected**:
- `src/styles/codap.css`
- `demo/theme-context.tsx`: the codap theme's `closeIcon` becomes CODAP's close-tile SVG (with `className="coachmarks-popover-close-icon"`), in place of a text glyph the rewritten theme no longer styles.
- `README.md`: the Theming section, if it describes the codap theme's look.

**Estimated diff size**: ~120 lines

Target values, with their CODAP source:

| Element | Property | Value | CODAP source |
|---|---|---|---|
| popover | background | `#f0f0f0` | `$tour-bg` |
| popover | text color | `#222` | `vars.$default-font-color` |
| popover | border | `1px solid #0081a9` | `vars.$tile-border-color` |
| popover | radius | `4px` | `vars.$border-radius-four-corners` |
| popover | shadow | `0 2px 10px rgba(0, 0, 0, 0.2)` | |
| popover | padding | `16px 32px 16px 16px` (on `.coachmarks-popover-content`; `.coachmarks-popover-title` and the first-child description get `padding-right: 0` because the 32px right padding already clears the close button) | |
| popover | font | `Montserrat, sans-serif` | |
| popover | max-width | `370px` (CODAP's popover is content-box with `max-width: 320px`; coachmarks' is border-box, so 320 plus the 48px of horizontal padding and the 2px border) | |
| arrow | fill and stroke | `--coachmarks-popover-bg: #f0f0f0`, `--coachmarks-popover-border: #0081a9` | |
| title | font | `"museo-sans", sans-serif`, 14px, 700, `#006c8e`, margin-bottom 8px | `vars.$icon-fill-dark` |
| description | font | 13px, 400, line-height 1.5, `#222` | |
| progress text | font | 12px, `#545454`, margin-top 8px, above the buttons | `vars.$charcoal-dark-1` |
| buttons row | layout | progress text on its own line, then the buttons left-aligned: `.coachmarks-popover-buttons { display: block; margin-top: 0 }`, `.coachmarks-popover-button-group { margin-left: 0; gap: 0 }` (base's `gap: 4px` on top of the buttons' 4px right margin would space them 8px apart; CODAP's are 4px) | CODAP stacks them |
| Previous, Next | style | Montserrat 12px 500, `#006c8e` background, white text, no border, radius 4px, padding `5px 12px`, margin-top 8px, margin-right 4px | |
| Previous, Next | hover | background `#01879E` | `vars.$teal-dark` |
| Previous, Next | disabled | opacity 0.5, default cursor | |
| Previous, Next | focus-visible | `2px solid #0957d0`, offset 2px, radius 4px | `vars.focus-outline($offset: 2px)` |
| close button | box | 24 by 24px, `top: 4px; right: 4px`, transparent, no border, radius 4px, flex-centered, padding 0 (replaces the theme's `all: unset` text-glyph styling) | |
| close button | focus-visible | `2px solid #0957d0`, offset -2px, radius 2px | `vars.focus-outline` |
| close button | hover | `.coachmarks-popover-close-btn:hover .coachmarks-popover-close-icon path[fill] { fill: #01879E }` | |
| close button | color | `#006c8e`, `#01879e` on hover, for an icon drawn in `currentColor` such as coachmarks' default (CODAP's SVG sets its own fill) | |
| outline ring | color | `--coachmarks-ring-color: #01879E`, width 2px | `$tour-ring-color` |
| focus color | variable | `--coachmarks-focus-color: #0957d0` | `vars.$focus-outline-color` |

The theme file's header contrast notes are updated to the new pairs (title `#006c8e` on `#f0f0f0`, white on `#006c8e`; the ring's 3:1 claim is dropped, since CODAP-1609 records that `#01879E` against CODAP's menu bar is 2.06:1, a design question out of scope here).

Check: with the demo's theme switcher on `codap`, a screenshot of the multi-step tour section is compared by eye with CODAP's current popover (the branch before the CODAP switch step), and the computed styles of the popover, title, description, progress text, a button and the close button, plus the horizontal space between Previous and Next (a per-element comparison cannot see it), are read in both through Playwright and compared property by property. The comparison is throwaway and its result goes in the PR description.

---

### coachmarks: document the changes and bump to `0.0.1-pre.12`; review, merge and publish (R9, R10)

**Summary**: README updates for R1, R4, R5 and R8 under the Accessibility and API reference sections; then the version bump in its own commit, following the repo's `chore: bump version to ...` convention.

**Files affected**:
- `README.md`
- `package.json`, `package-lock.json`: `"version": "0.0.1-pre.12"` (own commit)

**Estimated diff size**: ~30 lines

Then, outside the code:
1. `npm run check`, `npm test`, `npm run test:smoke` and `npm run demo:build` pass locally.
2. Push the branch and open a PR against coachmarks `main`. CI (check, build, tests, smoke, demo build) must pass. The reviewer is chosen then.
3. After approval, merge with a merge commit.
4. Doug publishes from the merged `main`: `npm publish --tag next` (the `prepare` script builds `dist`). `npm view @concord-consortium/coachmarks dist-tags` shows `next: '0.0.1-pre.12'`, with `latest` unchanged.

---

### CODAP: depend on coachmarks `0.0.1-pre.12` (R11, R21)

**Summary**: The dependency alone, so the lockfile change is reviewable on its own.

**Files affected**:
- `v3/package.json`: `"@concord-consortium/coachmarks": "0.0.1-pre.12"` (exact; `npm install --save-exact`).
- `v3/package-lock.json`

**Estimated diff size**: ~25 lines

No code imports it yet, so the build, lint and tests are unaffected.

---

### CODAP: draw tours and highlights with coachmarks (R11 to R14)

**Summary**: `tour-manager.ts` creates `createCoachmarksEngine` engines with CODAP's presentation options, owns teardown so engine callbacks fired by `destroy()` are ignored, filters targets with `isLaidOut`, and always gives steps a side. The in-repo engine stays on disk, unused, until the next step deletes it.

**Files affected**:
- `v3/src/lib/tour/tour-manager.ts`
- `v3/src/lib/tour/tour-types.ts`: CODAP's own popover and options types, built from coachmarks' `EngineOptions`.
- `v3/src/lib/tour/tour-manager.test.ts`, `v3/src/lib/tour/tour-sanitize.test.ts`: mock `@concord-consortium/coachmarks` instead of `./tour-engine`.
- `v3/package.json`: a `jest.moduleNameMapper` entry, `"^@concord-consortium/coachmarks/styles/": "identity-obj-proxy"`. The theme subpath has no `.css` extension, so the existing `\.(css|...)$` mapping misses it and Jest parses `dist/styles/codap.css` as JavaScript, failing every suite that imports `tour-manager.ts` (including `use-data-interactive-controller.test.ts`). Not a dependency change, so it stays in this commit (R21).

**Estimated diff size**: ~350 lines (about 120 in `tour-manager.ts`, the rest tests)

`tour-types.ts`:

```ts
import { EngineOptions } from "@concord-consortium/coachmarks"

export interface ITourPopover {
  title?: string
  description?: string
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
}

/** The engine options a tour configuration or a plugin may set. */
export type ITourOptions = Pick<EngineOptions,
  "showButtons" | "disableButtons" | "showProgress" | "allowKeyboardControl" | "allowClose" |
  "animate" | "smoothScroll" | "popoverOffset" | "progressText" | "nextBtnText" | "prevBtnText" |
  "doneBtnText">

export interface ITourStep {
  element: string | HTMLElement
  popover?: ITourPopover
  skip?: boolean
}

export interface ITourConfig {
  options?: ITourOptions
  steps: ITourStep[]
}

export const defaultTourOptions: ITourOptions = {
  showProgress: true,
  allowClose: true,
  allowKeyboardControl: true,
}
```

`index.ts` re-exports `ITourPopover` and `ITourOptions` alongside the existing types.

`tour-manager.ts`, the parts that change:

```ts
import {
  createCoachmarksEngine, CreateCoachmarksEngineArgs, EngineHandle, EngineStep, isLaidOut
} from "@concord-consortium/coachmarks"
// After the package import, so the theme's rules follow coachmarks' base.css in the bundle.
import "@concord-consortium/coachmarks/styles/codap"
import { createElement } from "react"
import CloseIcon from "../../assets/icons/close-tile-icon.svg"
import { t } from "../../utilities/translation/translate"

/** CODAP's look and wording for a tour or highlight. A plugin's own options are spread over these. */
function codapPresentation(kind: "tour" | "highlight"): CreateCoachmarksEngineArgs {
  return {
    initialFocus: "none",
    parseMarkdown: false,
    showAvatar: false,
    smoothScroll: false,
    ariaLabel: t("V3.Tour.stepRegion"),
    closeBtnAriaLabel: t("V3.Tour.close"),
    closeIcon: createElement(CloseIcon, { className: "coachmarks-popover-close-icon" }),
    prevBtnText: t("V3.Tour.previous"),
    nextBtnText: t("V3.Tour.next"),
    doneBtnText: t(kind === "tour" ? "V3.Tour.gotIt" : "V3.Tour.done"),
    // coachmarks fills {{current}} and {{total}}; CODAP's string uses %{current} and %{total}.
    progressText: t("V3.Tour.progress", { vars: { current: "{{current}}", total: "{{total}}" } }),
  }
}

/** coachmarks places a popover on top by default; CODAP's tours have always defaulted to the right. */
function withCodapSide(popover?: ITourPopover): ITourPopover {
  return { ...popover, side: popover?.side ?? "right" }
}

/** An element the engine can anchor a popover to: in the document and laid out. */
function isShowable(el: Element | null): el is HTMLElement {
  return !!el && isLaidOut(el as HTMLElement)
}
```

- `buildPopover` always returns a popover (`withCodapSide` of the title, description, side and align), since a step with no text still needs CODAP's side.
- A private `endActive()` clears `this.active` before destroying its engine, so the `onDeselected` and `onDestroyed` that coachmarks fires from `destroy()` find no current tour:

```ts
/** Ends the active tour or highlight. Callbacks the engine fires while tearing down are ignored. */
private endActive() {
  const active = this.active
  this.active = null
  active?.engineInstance.destroy()
}
```

  `cancelActive()` builds and sends its notification from `this.active` as today, then calls `endActive()`. `clearHighlight()` and `cleanupForTile()` call `endActive()` instead of destroying and nulling by hand.
- Each engine's callbacks check that their engine is still the active one before notifying: `const isCurrent = () => this.active?.engineInstance === engine`, where `engine` is the `const` the callbacks belong to (they only run after `createCoachmarksEngine` has returned). For tours, `onHighlightStarted`, `onDeselected` and `onDestroyed` return early unless `isCurrent()`; `onDeselected` also returns early unless `this.active.hasStartedStep` (coachmarks fires it for a step whose popover never got positioned, so whose `stepStarted` was never sent, when a move arrives first, as `startTour` and `tourMoveTo` in one batched request do), then sends `stepEnded` and sets `this.active.hasStartedStep = false`, so a cancel before the next step starts sends `cancelled` without step fields (coachmarks fires `onDeselected` and then `onCancelRequested`, with no `onHighlightStarted`, when the step it moves to has lost its target); `onDestroyed` sends `completed` and sets `this.active = null`. For highlights, `onDestroyed` does the same with `highlightCleared`. `onCancelRequested` calls `cancelActive()` only when `isCurrent()`.
- `highlight()`: `if (!isShowable(element)) return { success: true as const }`, then `createCoachmarksEngine({ ...codapPresentation("highlight"), allowClose: true, allowKeyboardControl: true, ...callbacks })` and `engine.highlight({ element, popover: this.buildPopover(values) })`.
- `startTour()`: steps whose target fails `isShowable` are skipped. The engine is created with `{ ...codapPresentation("tour"), ...defaultTourOptions, ...pluginOptions, ...callbacks }` (no `steps`), `this.active` is set, then `engine.drive(filteredSteps.map(s => s.engineStep))`. `pluginOptions` is the existing set of `values.x != null && { x }` spreads, so `smoothScroll` and the button labels from a plugin still win over CODAP's defaults.
- `runInternalTour()`: the same `isShowable` filter and `withCodapSide`, `{ ...codapPresentation("tour"), ...defaultTourOptions, ...config.options }`, and `drive(resolvedSteps)`.
- `import "./tour-styles.scss"` is removed; the old engine import goes.

Tests (`tour-manager.test.ts`):
- The mock becomes `jest.mock("@concord-consortium/coachmarks", () => ({ createCoachmarksEngine: (c: unknown) => mockEngine(c), isLaidOut: (el: unknown) => mockIsLaidOut(el) }))`, with `mockIsLaidOut` returning true by default. `mockEngine` gives each engine its own `destroy` that calls the shared `mockDestroy` and then that engine's `config.onDeselected?.()` and `config.onDestroyed?.()`, as coachmarks does, and its own `moveNext` that does the same on the last step. Tests that read `capturedConfig.steps` read `mockDrive.mock.calls[0][0]` instead.
- New or changed tests, each named for the mutation it catches:
  - Escape, the close button, `endTour` and replacement each produce exactly one notification after `stepStarted`, of type `cancelled`, with no `stepEnded` or `completed` (fails if `endActive` destroys before clearing `this.active`).
  - Replacing a highlight with a tour sends exactly one `highlightCleared` (same mutation, highlight path).
  - `cleanupForTile` sends nothing; the existing test now fails without the guard because the mock's `destroy` fires callbacks.
  - Completing a tour sends `stepEnded` for the last step and then `completed`, once each.
  - `onDeselected` followed by `onCancelRequested` (the next step's target gone) sends `stepEnded` for the step left and then `cancelled` with no `stepIndex` (fails if `onDeselected` leaves `hasStartedStep` set, which repeats the ended step's index in `cancelled`).
  - `onDeselected` fired before the first `onHighlightStarted`, then `onHighlightStarted` for the third step (what a batched `startTour` plus `tourMoveTo` produces), sends only `stepStarted` with `stepIndex` 2 (fails without the `hasStartedStep` check, which sends `stepEnded` 0 for a step that never started).
  - A step whose target fails `isLaidOut` is skipped: `visibleSteps` drops by one and `stepIndex` values still refer to the original array (fails if the filter is removed). A highlight of such a target creates no engine and sends nothing.
  - The engine receives `initialFocus: "none"`, `parseMarkdown: false`, `showAvatar: false`, `smoothScroll: false`, `doneBtnText` "Got it!" for a tour and "Done" for a highlight, and a `progressText` of `{{current}} of {{total}}`; a plugin's `smoothScroll: true` and `doneBtnText` override them.
  - The existing "does not include options that are not provided" test expects `smoothScroll`, `progressText`, `nextBtnText` and `prevBtnText` to be undefined, which CODAP's defaults now set; it keeps its assertions only for the options CODAP has no default for (`animate`, `popoverOffset`, `disableButtons`, `showButtons`).
  - A step with no `side`, and a step with no popover text, reach `drive` with `side: "right"`; a plugin's `side: "left"` is kept.
- `tour-sanitize.test.ts` and `tour-manager.test.ts` each mock `@concord-consortium/coachmarks` in place of `./tour-engine` and drop their `./tour-styles.scss` mock. Jest would not catch a leftover: the `.scss` mapping resolves the mocked path even after the deletion step removes the file. Its first-line comment ("tour-manager imports the tour-engine and styles") and `tour-manager.test.ts`'s `// --- tour-engine mock ---` heading are rewritten to name coachmarks.

---

### CODAP: delete the in-repo tour engine and its styles (R11)

**Summary**: Nothing imports `v3/src/lib/tour/tour-engine/` or `tour-styles.scss` after the previous step, so both go, with their tests. Their behaviors are covered by coachmarks' suite.

**Files affected**:
- delete `v3/src/lib/tour/tour-engine/` (engine, popover, outline ring, hooks, types and their tests)
- delete `v3/src/lib/tour/tour-styles.scss`

**Estimated diff size**: about 1,830 lines removed (22 files under `tour-engine/` plus the stylesheet), none added

Also in this step:
- `v3/src/test/setupTests.ts`: the `matchMedia` stub stays (coachmarks' `useReducedMotion` calls it whenever the real engine renders in Jest, as the R16 test does), and its comment names coachmarks instead of "tour-engine's use-reduced-motion hook".
- `v3/eslint.config.mjs`: delete the `// driver.js package name ...` comment and the `ignore: ["^driver\\.js"]` option on `import-x/no-unresolved` (leaving the rule at `"error"`). The branch removed the `driver.js` dependency but kept the exception.

Before deleting, confirm nothing else references them: `git grep -n "tour-engine\|tour-styles\|driver\.js" -- v3/src v3/cypress v3/eslint.config.mjs` returns nothing outside the deleted files. The `V3.Tour.*` strings and `close-tile-icon.svg` stay, since `tour-manager.ts` and the tile header use them. `mobx`, `mobx-react-lite`, `clsx` and `@floating-ui/react` stay in `package.json`; CODAP uses them elsewhere, and `@floating-ui/react` is a coachmarks peer dependency.

---

### CODAP: keep the tour popover out of UI notifications (R16)

**Summary**: Markers that are coachmarks' popover or lie under coachmarks' root element are dropped, so a tour popover produces no `appear` or `disappear`.

**Files affected**:
- `v3/src/data-interactive/ui-notifications/classify-node.ts`
- `v3/src/data-interactive/ui-notifications/classify-node.test.ts`
- `v3/src/data-interactive/ui-notifications/dom-observer.test.ts`
- `v3/doc/plugin-ui-notifications.md`: one sentence under Event types saying CODAP's tour popover is reported through tour notifications, not as `appear`/`disappear`.

**Estimated diff size**: ~70 lines

```ts
/**
 * coachmarks renders tours into its root element; tours have their own notifications
 * (tourUpdate, highlightUpdate). The popover is matched directly as well, because a removed
 * popover is reported detached from its portal node, with no ancestor to find.
 */
const kCoachmarksSelector = '[data-testid="coachmarks-root"], [data-testid="coachmarks-popover"]'

export function findMarkers(root: Element, includeRoles = true): Element[] {
  ...existing body...
  return dedupeMarkers(results).filter(el => !el.closest?.(kCoachmarksSelector))
}
```

`findMarkers` serves both `processAdded` and `processRemoved`. On teardown floating-ui's portal node leaves the root first and React then removes the popover from that detached node; a browser still reports that removal to the observer (transient observers), with the popover's only ancestor gone, so a root-only `closest` misses it and a `disappear` would leak. jsdom does not report that second removal, so a jsdom test of the full teardown cannot catch the leak.

Tests:
- `classify-node.test.ts`: build `coachmarks-root > div > [role="dialog"][data-testid="coachmarks-popover"]`, then detach the inner `div` from the root and the popover from the `div` (the order a browser reports); `findMarkers(popover)` returns `[]` (fails with a root-only selector), and `findMarkers(root)` before detaching returns `[]` too.
- `dom-observer.test.ts`: install the observer with a spy on `deliver`, then show a real coachmarks highlight on a button whose `offsetParent` and `getBoundingClientRect` are stubbed so `isLaidOut` passes (jsdom has no layout), let it render, destroy it, and expect no notice with testid `coachmarks-popover`. In the same test a `[role="dialog"]` element added outside the root still produces `appear`, so the test fails if markers stop being found at all. Using the real package pins the testids CODAP relies on to coachmarks' own markup.
- The browser removal path is covered end to end by the plugin-tour spec's scenario 9.

---

### CODAP: document the plugin-visible changes (R14, R15)

**Summary**: `v3/doc/plugin-tour-api.md` gains what a plugin author would notice.

**Files affected**:
- `v3/doc/plugin-tour-api.md`

**Estimated diff size**: ~40 lines

- Under `startTour` (step filtering) and `highlight`: a target that is in the page but not displayed (no layout box, e.g. `display: none`) is treated like a missing one: the step is skipped and counts toward `totalSteps` but not `visibleSteps`; a highlight shows nothing.
- Under Tour Notifications: the `stepStarted` row's "When" cell ("Step begins transitioning") says the step's popover is on screen, so it can arrive after the `startTour` response; a step the tour leaves before then (for example `tourMoveTo` batched with `startTour`) gets neither `stepStarted` nor `stepEnded`.
- The "When" cells for `highlightCleared` and `cancelled`, which say the target "is removed from the page", also cover a target that is hidden (no layout box) while its step is showing: coachmarks' target watcher checks `isLaidOut` on every DOM mutation, not only whether the target is connected.
- The `cancelled` row's notes ("Includes `stepIndex` and step fields") say the step fields are present only when the current step has received `stepStarted`. Two cases lack them: when the tour moves to a step whose target has been removed or hidden since the tour started, that step never starts, and `cancelled` follows the previous step's `stepEnded`; and a tour ended before its first popover is on screen (for example `endTour` batched with `startTour`) sends `cancelled` alone.
- A short "Popover behavior" subsection under Design Notes: the popover is a non-modal dialog named by the step title (or "Tour step"), with the title as a heading; CODAP does not move keyboard focus to it, except out of a plugin iframe (every step), so the arrow keys and Escape work; each step is announced to screen readers; scrolling to a target is instant when the user prefers reduced motion; testids are `coachmarks-popover`, `coachmarks-popover-next-btn` and so on.

---

### CODAP: one fixture plugin for Cypress, served by intercept (R17, R18)

**Summary**: A shared helper serves fixture plugins and iframe-phone through `cy.intercept`, and the fixture plugin gains the hooks the tour spec needs. Nothing is unskipped yet; the next two steps use it.

**Files affected**:
- `v3/cypress/fixtures/ui-notification-test-plugin.html` renamed to `v3/cypress/fixtures/test-plugin.html` (`git mv`), and:
  - loads iframe-phone from `/cypress-fixtures/iframe-phone.js` (served by the helper) instead of unpkg;
  - sets `window.__codapReady = true` in the callback of its first request, the `update interactiveFrame` handshake;
  - keeps `subscribeMonitor`, `updateMonitor`, `unsubscribeMonitor`, `getDeliveredNotices` and `resetDeliveredNotices` (callers take the monitor id from `subscribeMonitor`'s reply);
  - adds `window.codapRequest(request)`, which sends any request and resolves with the reply, and `window.getTourNotices()`, which returns the `values` of every `notify interactiveFrame` message received (where `tourUpdate` and `highlightUpdate` arrive), plus `resetTourNotices()`.
- `v3/cypress/support/helpers/test-plugin.ts` (new):

```ts
const kFixturePrefix = "/cypress-fixtures"

/** Visit CODAP with the test plugin loaded, and wait until CODAP has answered its first request. */
export function visitWithTestPlugin(params = "mouseSensor&noEntryModal&suppressUnsavedWarning") {
  cy.readFile("node_modules/iframe-phone/dist/iframe-phone.js").then(js => {
    cy.intercept({ method: "GET", pathname: `${kFixturePrefix}/iframe-phone.js` },
      { body: js, headers: { "content-type": "application/javascript" } })
  })
  // Match on pathname: CODAP reloads the plugin with ?lang=...&locale=... appended.
  cy.intercept({ method: "GET", pathname: `${kFixturePrefix}/test-plugin.html` },
    { fixture: "test-plugin.html", headers: { "content-type": "text/html" } })
  const pluginUrl = `${Cypress.config("baseUrl")}${kFixturePrefix}/test-plugin.html`
  cy.visit(`${Cypress.config("index")}?di=${pluginUrl}&${params}`)
  cy.get(".codap-web-view-iframe", { timeout: 30000 })
    .its("0.contentWindow.__codapReady", { timeout: 30000 }).should("equal", true)
}

/** The plugin iframe's window, looked up fresh each time (the iframe reloads once on startup). */
export function testPluginWindow(): Cypress.Chainable<any> {
  return cy.get(".codap-web-view-iframe").its("0.contentWindow")
}
```

- `v3/cypress/support/with-monitor.ts`: subscribes and unsubscribes through `testPluginWindow()`, keeping the id from the subscribe reply, rather than calling `subscribeMonitor` on the top window and reading an unset `__lastMonitorId`. `signatureOfMainDOM` reads `[data-testid="codap-app"]` instead of `#codap-app`, which no element has (CODAP's root is `#codap-app-id` holding `.codap-app`), and asserts the element exists rather than returning `""`, so the baseline and final signatures can differ.

**Estimated diff size**: ~120 lines

---

### CODAP: run the UI-notification specs (R18, R19)

**Summary**: Unskip both specs on the shared helper; the parity spec trades its wall-clock comparison for the DOM-signature check.

**Files affected**:
- `v3/cypress/e2e/ui-notifications.spec.ts`: `describe` instead of `describe.skip`; `visitWithTestPlugin()` in `beforeEach`; `subscribe` awaits the reply and asserts `success`; `getDelivered()` assertions become `testPluginWindow().should(w => { ... })` so they retry until the notice arrives. The File-menu scenario filters and matches on `cfm-menu-file`, the testid of CFM's File button: `file-menu-button` is only a class on it, in CFM 2.2.13 as in 2.3.2. The "right-click produces no click notice" scenario is deleted: `click-listener.ts` listens only for `click` and `dblclick`, and Cypress's `rightclick()` dispatches `contextmenu` with no `click`, so it passes whatever CODAP does. The header comment drops the skip explanation and names the fixture's new path.
- `v3/cypress/e2e/ui-notifications-parity.spec.ts`: `describe` instead of `describe.skip`; the File-menu test closes the menu with Escape and waits for `.menu-list-container` to be gone, since a second click on the File button is refused as covered by the open menu; the timing test is replaced by "Tables tool-shelf menu open/close with a broad monitor", which opens the menu, closes it with Escape inside `withBroadMonitor`, and so asserts the DOM signature is unchanged; the header comment is rewritten to match.

**Estimated diff size**: ~120 lines

Locally each spec passes three consecutive runs with `--config retries=0` before the commit.

---

### CODAP: replace the feature-tour spec with a plugin-tour spec (R17)

**Summary**: `feature-tour.spec.ts` (skipped, driving a removed Help-menu item and asserting driver.js classes) is replaced by `plugin-tour.spec.ts`, which drives tours and highlights through the test plugin and asserts both the popover and the plugin's notifications.

**Files affected**:
- delete `v3/cypress/e2e/feature-tour.spec.ts`
- `v3/cypress/e2e/plugin-tour.spec.ts` (new)
- `v3/cypress/support/elements/tour-popover.ts` (new): `getPopover()`, `getTitle()`, `getDescription()`, `getProgress()`, `getNextButton()`, `getPrevButton()`, `getCloseButton()` on the `coachmarks-popover*` testids.

**Estimated diff size**: ~220 lines

Scenarios (each starts with `visitWithTestPlugin()` and `resetTourNotices()`, and sends requests with `codapRequest({ action: "notify", resource: "interactiveFrame", values: { request: ..., ... } })`):
1. A two-step tour on `toolShelf.table` and `toolShelf.graph`: the popover shows step 1's title and "1 of 2"; the plugin received `stepStarted` with `stepIndex` 0; the outline ring (`[data-testid="coachmarks-outline-ring"]`) has border color `rgb(1, 135, 158)` (`#01879E`), which fails if coachmarks' `base.css` lands after the `codap` theme in CODAP's bundle.
2. Next, then "Got it!": `stepEnded` 0, `stepStarted` 1, `stepEnded` 1, `completed`, in that order and nothing after; the popover is gone.
3. ArrowRight and ArrowLeft typed on the body move to step 2 and back; Alt+ArrowRight does not move; after Next, the Previous button returns to step 1, sending `stepEnded` 1 and then `stepStarted` 0.
4. Escape after step 1 starts: the only notice after `stepStarted` is `cancelled` with `stepIndex` 0.
5. The close button: the same, `cancelled` only.
6. A highlight of `toolShelf.graph` with a title: `highlighted`; the button reads "Done"; clicking it sends one `highlightCleared`.
7. A four-step tour whose second step targets an element the test adds with `display: none` and whose third step names a `testId` that does not exist: `stepStarted` reports `totalSteps` 4 and `visibleSteps` 2, the `stepIndex` values are 0 and then 3, and the tour runs to `completed`.
8. Plain text: a description of `*x* [a](b)` shows exactly that text.
9. UI notifications ignore the popover: with a monitor subscribed to `appear` and `disappear`, starting a tour and ending it with `endTour` (not a click, which is reported by design, R16), then waiting until the popover is gone, delivers no notice whose target testid starts with `coachmarks-`.
10. With focus on the plugin iframe, starting a tour and moving with `tourPrevious` each put focus on `coachmarks-popover`; ArrowRight and Escape typed there move and cancel the tour (R15).

---

### CODAP: bring the branch to `main` (R20, R22, R23)

**Summary**: Not a commit; the delivery sequence once the steps above are in.

1. Before pushing, `git fetch` and check `git log HEAD..origin/main`. If `main` has moved, merge it in (`git merge origin/main`, never a rebase), resolving conflicts toward `main` while keeping this branch's additions, and rerun the checks.
2. `npm run build:tsc`, `npm run lint`, `npm test`, `npm run plugin-api:check` and the three Cypress specs above pass locally, plus `npm run build` (the production webpack build).
3. Push the branch with a plain `git push` (fast-forward; the branch is never force-pushed).
4. Rewrite PR #2726's description: what the branch brings to `main` (UI notifications, testids, the tour on coachmarks, CFM 2.3.2), how to review it (the merges' conflict resolutions; this story's commits on top), the coachmarks PR and version it depends on, what the re-enabled specs cover, and that CODAP-1607's work is done here. Remove the on-hold section and the sentence calling the in-repo engine the official release, and restate the "Tour popover" bullets under the review fixes: they describe the in-repo engine this branch deletes, so the engine fixes are credited to the coachmarks PR, and only the localized `V3.Tour.*` labels remain CODAP changes. The description is shown to Doug before it is posted.
5. CI passes, then the existing `run regression` label runs the full Cypress suite; fix anything it finds in new commits.
6. Mark the PR ready for review; Doug picks the reviewer. It merges with "Create a merge commit".

## Open Questions

### RESOLVED: Judgment call: one fixture plugin for both specs, or a separate tour fixture?
**Context**: The tour spec needs a plugin that can send tour requests and record `interactiveFrame` notifications; the UI-notification fixture already has the iframe-phone wiring.
**Options considered**:
- A) One fixture, renamed `test-plugin.html`, with both sets of hooks.
- B) A second fixture page for tours.

**Decision**: A. The handshake, the ready flag and the iframe-phone source are the parts that were wrong, and with two pages they would have to be kept right twice. The fixture stays small; its UI-notification functions are unchanged.

### RESOLVED: Judgment call: how does CODAP know that callbacks fired during `destroy()` are its own teardown?
**Context**: coachmarks fires `onDeselected` and `onDestroyed` from every `destroy()`.
**Options considered**:
- A) Clear `this.active` before calling `destroy()`, and have callbacks check that their engine is still the active one.
- B) A `tearingDown` flag set around each `destroy()` call.
- C) Ask coachmarks for a "silent destroy".

**Decision**: A. The identity check also covers a stale engine whose callbacks fire after a newer tour has replaced it, which a single flag would not; and it needs no library change, while C would put CODAP's notification semantics into coachmarks.

### RESOLVED: Judgment call: gate R4 and R5 on the consumer's `initialFocus` option, not on the popover's derived focus mode
**Context**: `popover.tsx` computes `initialFocus` as `"none"` for every intermediate step of an `actionGated` tour, whatever the consumer passed.
**Options considered**:
- A) Gate on `opts.initialFocus === "none"`.
- B) Gate on the derived value.

**Decision**: A. Gating on the derived value would add a live region and refocusing to Hazbot's gated tours, which R9 says stay as they are.

### RESOLVED: Low confidence: will the `codap` theme match closely enough by values alone?
**Context**: coachmarks' markup differs from CODAP's in small ways (a content wrapper, the title as an `<h2>`, progress text inside the buttons row), so copying values may still leave layout differences.
**Decision**: The theme step resets the `<h2>`'s margins and font through the title rule, restacks the buttons row, and is checked by a computed-style comparison and a screenshot against CODAP's current popover (the check in that step), not by values alone.

## Self-Review

Roles: Commit Reviewer, Test Writer, Senior Engineer, Release Operator. The coachmarks steps for R1, R4, R5 and R6 were built as throwaway code in a scratch copy of coachmarks `main` (not the checkout), with the tests the steps describe: all passed, and each test failed when its change was reverted (R1, R4, R5's iframe suppression, R5's gated-tour exclusion, R6). Findings with one defensible correction were fixed in place.

### Test Writer

#### RESOLVED: An existing coachmarks test asserts the `tabindex` bug
In the scratch build, R6 failed exactly one of coachmarks' 212 existing tests: "destroy() restores focus to step anchor when focus was inside the popover", which uses a `<button>` anchor and expects `tabindex="-1"` on it. The R6 step listed only new tests; it now updates that test as well.

### Senior Engineer

#### RESOLVED: R5's code read `popoverContent` before it is declared
In `popover.tsx`, `const popoverContent = spec.popover` is declared after the hooks, next to the render, so the live-region hook as written would throw a `ReferenceError` at render. The step now reads `spec.popover` directly, as the scratch build did.

### Release Operator

#### RESOLVED: `yalc add` would rewrite CODAP's `package.json`
The plan suggested `yalc add` for developing CODAP against the unpublished coachmarks branch. `yalc add` replaces the dependency with a `file:.yalc/...` entry, which could slip into the dependency commit. The plan now uses `yalc link`, which only symlinks, and removes it before the dependency commit.

### Commit Reviewer

#### RESOLVED: The deletion step's size was a guess
Measured: `tour-engine/` holds 22 files, and with `tour-styles.scss` they total 1,831 lines. The estimate now says so. Each CODAP step compiles on its own: the switch step stops importing the old engine but leaves it in place (its own tests still find `tour-styles.scss`), and the deletion step removes only files nothing imports.


### Build Engineer (self-review round 1)

#### RESOLVED: Jest cannot load the theme import, so every suite that imports `tour-manager.ts` would fail
`import "@concord-consortium/coachmarks/styles/codap"` resolves through the package's exports to `dist/styles/codap.css`, but the request has no `.css` extension, so CODAP's `\.(css|...)$` mapping never applies and Jest parses the stylesheet as JavaScript. `jest.mock("@concord-consortium/coachmarks")` does not cover the subpath. Verified with `0.0.1-pre.11` installed: a test importing the subpath beside a mocked package failed with `SyntaxError` on `@charset "UTF-8"`, and passed with a `^@concord-consortium/coachmarks/styles/` to `identity-obj-proxy` mapping. `use-data-interactive-controller.test.ts` imports `tour-manager.ts` too. The switch step now adds that mapping to `v3/package.json`.

#### RESOLVED: Importing the theme before the package lets `base.css` override it
The switch step imported `styles/codap` above the package. A production webpack build of exactly those two imports (CODAP's `css-loader` and `MiniCssExtractPlugin`) emitted `codap.css` first and `base.css` after it, so base's `:root` values (`--coachmarks-ring-color: #444444`, `--coachmarks-focus-color: #0066cc`) won; with the order swapped the theme's values came last. The coachmarks demo loads the theme after the engine, so the theme step's demo comparison cannot catch this. The import order is swapped with a comment saying why, and plugin-tour scenario 1 asserts the ring color.

### Senior Engineer (self-review round 1)

#### RESOLVED: The R16 filter misses the popover's `disappear` in a real browser
On teardown floating-ui's portal node is removed from `coachmarks-root` first and React then removes the popover from the detached portal node. Recorded with a MutationObserver around a real coachmarks `destroy()` in jsdom (portal removed from the root, then the root from `body`), and in headless Chrome with the same removal order on plain DOM: Chrome also reports the popover leaving the detached portal, and `popover.closest(root)` is false there, so `processRemoved` would emit `disappear` for `coachmarks-popover`. jsdom never reports that removal, so the planned jsdom test passed with the root-only filter and even with no filter. The selector now also matches `[data-testid="coachmarks-popover"]` (`closest` includes the element itself), a `classify-node.test.ts` case on a detached popover fails with the root-only selector and passes with the new one (checked), and scenario 9 subscribes to `disappear` as well and ends the tour with `endTour`, since button clicks are reported by design.

### Commit Reviewer (self-review round 1)

#### RESOLVED: The deletion step's "nothing else references them" check was false, and the branch leaves a `driver.js` exception behind
`git grep "tour-engine\|tour-styles"` also hits `v3/src/test/setupTests.ts`, whose `matchMedia` stub comment credits "tour-engine's use-reduced-motion hook"; the stub is still needed because coachmarks' `useReducedMotion` calls `matchMedia`. `v3/eslint.config.mjs` still ignores `^driver\.js` in `import-x/no-unresolved`, though the branch dropped the `driver.js` dependency (`main` still has both). The deletion step now rewrites that comment, removes the ESLint exception, and greps for `driver\.js` too.

### Test Writer (self-review round 2)

#### RESOLVED: The parity spec's DOM-signature check compares two empty strings
`signatureOfMainDOM` in `with-monitor.ts` reads `#codap-app` and returns `""` when it is missing; no element has that id (`index.html` has `#codap-app-id`, `app.tsx` renders `.codap-app` with testid `codap-app`), so R19's check passed by construction. A throwaway Cypress spec on the plan's intercept harness threw on `#codap-app`; with `[data-testid="codap-app"]` the signature changed while the Tables menu was open and matched the baseline after Escape, three runs of three with retries off. The fixture step now reads that root and asserts it exists.

#### RESOLVED: Two test files' comments would still name the deleted engine
`tour-sanitize.test.ts` opens with "tour-manager imports the tour-engine and styles; mock them" and `tour-manager.test.ts` heads its mock `// --- tour-engine mock ---`. The switch step changes both mocks but left the comments; it now rewrites them.

### Cypress/CI Operator (self-review round 2)

#### RESOLVED: Both File-menu scenarios fail against CFM's menu, harness fixed or not
On the throwaway harness, `ui-notifications.spec.ts`'s File-menu scenario timed out: the notices name the button `cfm-menu-file`, and `file-menu-button` is only a class (also in CFM 2.2.13, checked in its packed `menu-bar-view.js`). Filtering on `cfm-menu-file` passed three of three. The parity File-menu test's second click failed as covered by the open menu; closing with Escape passed three of three with the signature unchanged. The UI-notification step now makes both changes.

### Plugin Author (self-review round 2)

#### RESOLVED: The docs would still say only a removed target ends a tour or highlight
`plugin-tour-api.md` says `highlightCleared` and `cancelled` follow when the target "is removed from the page". coachmarks' `useTargetWatcher` observes attributes as well as children and cancels when `isLaidOut` fails; a scratch vitest on coachmarks `main` hid a highlighted target with `display: none` and got `onCancelRequested`. CODAP's watcher checks only `isConnected`. The docs step now updates both cells, and R14 names highlights too.

### WCAG Accessibility Expert (self-review round 2)

#### RESOLVED: R4 dropped focus when ArrowLeft, not a click, took Previous back to the first step
R4 covers focus on Previous however the move happens, but the step set its flag only in the Previous click handler (CODAP's engine has the same gap). In a scratch build of the step, pressing ArrowLeft with focus on Previous left focus on `<body>`. The flag is now set by one `movePrevious` used by the button and `onPrev`, and only when focus is in the popover; the two added tests each fail under the corresponding mutation (checked), and the full coachmarks suite passes with the change.

### CODAP Visual Parity Reviewer (self-review round 2)

#### RESOLVED: The theme would space Previous and Next 8px apart instead of 4px
base.css gives `.coachmarks-popover-button-group` `display: flex; gap: 4px`, and the R7 table adds CODAP's 4px right margin to each button without resetting the gap. Rendered in Chrome (Cypress) with base.css plus the table's rules, the space between the buttons was 8px against 4px for CODAP's markup and styles. The table now sets `gap: 0`, and the step's comparison measures that space, which per-element computed styles cannot show.

### Commit Reviewer (self-review round 3)

#### RESOLVED: R4's effect fails coachmarks' pre-commit check, and R5 leaves a dead suppression
The R4 effect listed `activeIndex` only as a trigger; on a scratch copy of coachmarks `main`, `biome check` (inside `npm run check`, the lefthook pre-commit hook) failed with `useExhaustiveDependencies` "more dependencies than necessary". The step now records the step Previous was used on and compares it with `activeIndex` in the body: biome passes, the full suite passes (215 tests), and the click and ArrowLeft tests each fail under their mutation (checked). R5's edit makes the pull-focus effect's `biome-ignore` unused (biome warns); the step now deletes it.

#### RESOLVED: R8's commit fails the pre-commit `tsc` until `dist` is rebuilt
`tsconfig.json` includes `tests/`, and the smoke test imports the package itself, which resolves to the built `dist/index.d.ts`. With the export and smoke assertion added to a scratch copy, `tsc --noEmit` failed with TS2305 (no exported `isLaidOut`) and passed after `npm run build`. The step now says to build before committing.

### Test Writer (self-review round 3)

#### RESOLVED: `tour-manager.test.ts` would keep mocking the deleted `tour-styles.scss`
The switch step dropped that mock only from `tour-sanitize.test.ts`. A throwaway Jest test mocking a nonexistent `./no-such-styles.scss` passed, since the `.scss` mapping resolves it, so the leftover would never fail, and the deletion step's `git grep tour-styles` would hit it. Both files now drop the mock.

#### RESOLVED: No plugin-tour scenario presses the Previous button
R17 names Previous, but scenario 3 used only ArrowLeft, and the Jest tests drive a mocked engine. Scenario 3 now clicks Previous and checks the notifications.

### Plugin Author (self-review round 3)

#### RESOLVED: `cancelled` would name a step that already received `stepEnded`
In a scratch vitest on coachmarks `main`, `moveNext()` to a step whose target had been removed after `drive()` produced `onDeselected` then `onCancelRequested`, with no `onHighlightStarted`. The plan's `cancelActive()` would still see `hasStartedStep` and send `cancelled` with the step just ended (CODAP's engine today sends `stepStarted` for the new step, then `cancelled` for it). `onDeselected` now clears `hasStartedStep`, a Jest test covers it, R12 states the sequence, and the docs step notes it.

### Plugin Request Timing Reviewer (self-review round 4)

#### RESOLVED: A tour moved before its first popover is positioned would send `stepEnded` for a step that never started
`processRequest` runs a batched request's actions with only microtasks between them, and coachmarks fires `onHighlightStarted` only after the popover is positioned, so `[startTour, tourMoveTo 2]` reaches `moveTo` with step 0 entered but not started. In headless Chrome against coachmarks `main`, `drive()` then `moveTo(2)` after microtasks fired `onDeselected` then `onHighlightStarted` for step 2 only; the plan's `onDeselected` would send `stepEnded` 0 with no `stepStarted` 0. `onDeselected` now requires `hasStartedStep`, with a Jest test, an R12 clause and a docs note.

### Build Engineer (self-review round 5)

#### RESOLVED: An existing `tour-manager.test.ts` case fails once CODAP passes its presentation defaults
A throwaway build of the switch step (coachmarks `0.0.1-pre.11` installed without saving, the step's `tour-types.ts` and `tour-manager.ts`, its mock and Jest mapping) passed `build:tsc` and lint, and 107 of 108 tests across the tour and `use-data-interactive-controller` suites; the one failure was "does not include options that are not provided", which expects `smoothScroll` and the label options to be undefined. The switch step now rewrites it.

### Cypress/CI Operator (self-review round 5)

#### RESOLVED: The right-click UI-notification scenario cannot fail
`click-listener.ts` listens only for `click` and `dblclick`, and a throwaway Cypress spec showed `rightclick()` dispatching `contextmenu` and no `click`, so the scenario passes whatever CODAP does. The unskip step deletes it.

### Technical Writer (self-review round 5)

#### RESOLVED: Two tour-notification table cells would keep the old timing and step-field rules
`plugin-tour-api.md` says `stepStarted` fires when a step "begins transitioning" and `cancelled` always "includes `stepIndex` and step fields"; after the switch `stepStarted` waits for the positioned popover, and `cancelActive` adds step fields only under `hasStartedStep`, so a tour ended before its first popover appears sends none. The docs step now edits both cells.

### Release Engineer (self-review round 5)

#### RESOLVED: The PR description's "Tour popover" bullets describe the engine the branch deletes
PR #2726's body lists six tour-popover fixes under the review fixes and calls the in-repo engine the official release. The delivery step said only to remove the on-hold section; it now drops that sentence and restates the bullets, keeping only the localized labels as CODAP's.
