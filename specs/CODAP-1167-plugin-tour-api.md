# Plugin Tour API

**Jira**: https://concord-consortium.atlassian.net/browse/CODAP-1167

**Status**: **Closed**

## Overview

Extend CODAP's plugin API so that data-interactive plugins can highlight individual UI elements, run and programmatically navigate multi-step guided tours, and receive real-time notifications on tour progress and cancellation — all powered by the driver.js infrastructure added in CODAP-1189.

## Requirements

### Tour/Highlight Control

- Plugins can highlight a single CODAP UI element with an optional popover via `{ action: "notify", resource: "interactiveFrame", values: { request: "highlight", ... } }`
- Plugins can clear/dismiss an active highlight via `{ request: "clearHighlight" }`
- Plugins can start a multi-step tour via `{ request: "startTour", steps: [...] }` — response includes a CODAP-generated `tourId`
- Plugins can programmatically end/cancel an active tour via `{ request: "endTour" }`
- Plugins can advance (`tourNext`), retreat (`tourPrevious`), jump to a step (`tourMoveTo`), and refresh overlay position (`tourRefresh`)
- Tour steps support targeting by `tourKey` (stable registry key), `testId`, `selector`, or `component` (tile root). Priority: `tourKey` > `testId` > `selector` > `component`-only
- All targeting modes support optional `component` scoping to a specific tile
- Missing elements are silently skipped; invalid `tourKey` values are silently skipped
- Only one tour/highlight active at a time — new replaces old, with `cancelled` notification to previous owner
- All control actions are idempotent — safe to call at any time
- Plugin iframe disconnect triggers automatic cleanup of owned tours/highlights

### Tour Element Discovery

- Plugins can query the `tourElements` registry via `{ action: "get", resource: "tourElements" }`
- Returns all available `tourKey` values with their default `selector`, `title`, and `description`

### Tour Step Configuration

- Per-step popover options: `title`, `description`, `side`, `align`
- Tour-level overlay options: `overlayColor`, `overlayOpacity`, `stagePadding`, `stageRadius`
- Tour-level navigation options: `showButtons`, `showProgress`, `allowKeyboardControl`, `allowClose`, `disableActiveInteraction`, `disableButtons`
- Tour-level presentation options: `animate`, `smoothScroll`, `popoverOffset`
- Tour-level label customization: `progressText`, `nextBtnText`, `prevBtnText`, `doneBtnText`
- Per-step overrides supported (matching driver.js hierarchy)
- Plain text only for popover content (HTML deferred)

### Tour Step Identity

- Each step may include an optional plugin-provided `id` string, echoed in notifications

### Highlight Notifications

- Envelope: `{ action: "notify", resource: "interactiveFrame", values: { operation: "highlightUpdate", type, id?, tourKey?|testId?|selector? } }`
- `highlighted` when shown; `highlightCleared` on user dismissal or replacement
- Programmatic `clearHighlight` does not generate a notification

### Tour Progress Notifications

- Envelope: `{ action: "notify", resource: "interactiveFrame", values: { operation: "tourUpdate", tourId, type, stepIndex?, totalSteps?, visibleSteps?, id?, tourKey?|testId?|selector? } }`
- `stepStarted` on step transition; `stepEnded` when user moves past a step
- `completed` when tour reaches the end; `cancelled` on user dismissal or replacement
- On cancellation, only `cancelled` is emitted — no `stepEnded` for the interrupted step
- `stepIndex` and `totalSteps` use original array indices; `visibleSteps` is the filtered count
- All tour notifications include `tourId`
- Implicit subscription — starting a tour subscribes the plugin automatically

### API Response

- All requests return `DIHandlerFnResult`-pattern success/error results
- `startTour` response includes CODAP-generated `tourId`
- `endTour` accepts optional `tourId` for safety

## Technical Notes

- Tour manager is a singleton class that owns the driver.js instance and coordinates all tour/highlight state
- Notifications delivered via existing `broadcastMessage` / `rpcEndpoint.call()` pattern (same as `localeChanged`)
- Tour requests routed through `interactiveFrame` notify handler (no new resource parser changes needed)
- `tourElements` is a standalone read-only resource handler
- driver.js overlay z-index set to 10000/10001 to stay above all CODAP tiles
- Elements resolved at `startTour` call time — plugins should wait for component creation before starting tours

## Out of Scope

- Plugin-side implementation (tutorial plugin changes are CODAP-1166)
- Tour state persistence (remembering which tours a user has completed)
- Automatic tour launch triggers
- Localization of tour text (plugins provide their own text)
- Highlighting elements inside plugin iframes (cross-origin DOM limitation)
- Automatic step advancement based on user actions (plugins implement via `tourNext`)
- HTML in popover content (deferred)
