# Add opt-in plugin API notifications for UI changes and interactions

**Jira**: https://concord-consortium.atlassian.net/browse/CODAP-1232

**Status**: **Closed**

## Overview

Add a new opt-in plugin API that delivers notifications to plugins when UI elements in the CODAP app appear, disappear, or are activated (clicked or activated via Enter/Space). Notifications are only generated when at least one plugin has an active subscription, keeping the system performant.

The driving use case is tutorial plugins: a plugin author builds a guided tour that (1) highlights an element telling the user what to interact with (rendered via floating-ui in CODAP-1231), (2) listens for a UI notification via this API to detect that the user completed the step, (3) advances to the next step and highlights the next target. See also CODAP-1227, CODAP-1228, CODAP-1229, CODAP-1230 for the other half of that feature set.

The underlying observation machinery — a single document-wide `MutationObserver`, delegated event listeners, dnd-kit drag hooks, scoped dialog observers, and MobX reactions for layout state — is only attached when one or more plugins are subscribed and is torn down when the last subscription ends. Plugins narrow what they receive through an optional target filter (exact `tourKey`/`testId` strings or simple `prefix.*` globs). Workspace mutations are mitigated with edge-triggered debouncing (one event when activity starts, one trailing event after activity settles) and a hard per-monitor rate cap.

## Requirements

### Subscription API (plugin → CODAP)

- New resource **`uiNotificationMonitor`** follows the `logMessageMonitor` pattern. Plugins opt in via `notify uiNotificationMonitor` with a filter describing which event types and which targets they care about; CODAP responds with a monitor `{ id, clientId }`.
  - **Update**: `update uiNotificationMonitor[{id}]` with a new filter replaces the monitor's filter in place. The monitor's `id` and `clientId` remain the same. Any pending debounce timers for that monitor are cancelled before the new filter takes effect. If the new filter fails syntax validation, the update is rejected with an error and the monitor's existing filter is preserved; the monitor's `id`, `clientId`, and pending debounce timers are unaffected.
  - **Unregister**: `delete uiNotificationMonitor[{id}]` tears the monitor down and cancels any pending debounce timers.
  - **Unknown id handling**: `update` / `delete` requests for a missing or unknown monitor id return the standard error shape `{ success: false, values: { error: "<human-readable message>" } }`.
- **Filter shape**:
  - **Event types (subscription only)**: `appear`, `disappear`, `click`, `dblclick`, `dragStart`, `dragEnd`, `layoutChange`, `dialogChange`. Subscription `eventTypes` exclude `rateLimited` because it is delivered automatically. Keyboard activations (Enter/Space on focused elements) are delivered as `click` events carrying `via: "keyboard" | "pointer"` rather than a separate event type. `dblclick` is a separate type because plugins often want to treat it distinctly from `click`.
  - **Optional target filter** — an array of patterns, each either an exact `tourKey`/`testId` string or a glob with a trailing `*` (e.g. `toolShelf.*`). When omitted, every event of the requested types is delivered.
    - **Glob semantics**: trailing `*` means **prefix match**. `*` appearing anywhere other than the final position is syntactically invalid. Matching is case-sensitive; dots and hyphens are literal characters, not delimiters.
    - **Match surface**: filter patterns are tested only against `target.tourKey` and `target.testId`. `componentId`, `label`, and `tag` are delivery metadata and are **not** filter keys.
- Plugins may register multiple monitors; each receives its own notice stream with its own `id`. The manager does not dedup.
- **Error response shape**: failed subscribe/update/delete responses follow the existing `{ success: false, values: { error: "..." } }` pattern from `di-results.ts`. No new error shape is introduced.
- **Plugin ownership**: each monitor's internal record includes the `ownerTileId` of the subscribing plugin (captured from the iframe-phone request context). Notice delivery calls `broadcastMessage(notice, callback, ownerTileId)` so only the owning plugin's iframe receives the notice.
- **Monitor identification**:
  - `id`: manager-generated monotonically-increasing integer unique within the page's lifetime.
  - `clientId`: plugin-supplied opaque string, echoed verbatim on every delivered notice. Absent from notices if omitted at subscribe time.
- **Filter validation**: manager validates filter syntax on subscribe (rejects malformed globs, unknown event types, empty `eventTypes` or `targets` arrays, and `rateLimited` in `eventTypes`). Target strings are **not** validated against currently-mounted elements — tour authors develop against the documented target catalog and test interactively.
- **Lifetime and persistence**:
  - Monitors live in the manager's in-memory state, scoped to the host page's lifetime.
  - All CODAP plugins are document-scoped — a plugin's monitors die with the plugin iframe on document switch or reload.
  - Plugins must re-subscribe on iframe reload (same model as `logMessageMonitor`).
- **Filter semantics**: a notice is delivered when **(`eventType` is in `eventTypes`) AND (target matches at least one pattern in `targets`)**. If `targets` is omitted, the second condition is vacuously true. `rateLimited` notices bypass both `eventTypes` and `targets` matching. Within each array, matches are OR'd; across the two fields, the conditions are AND'd.

### Notifications (CODAP → plugin)

Notifications are delivered as `notify uiNotificationNotice` using the standard `{ action, resource, values }` shape and `broadcastMessage` routing.

Notice `values` includes:

- `eventType`: `appear` | `disappear` | `click` | `dblclick` | `dragStart` | `dragEnd` | `layoutChange` | `dialogChange` | `rateLimited`
- `region`: `"header"` | `"workspace"` | `"overlay"` — classification assigned by the manager. Present on every delivered notice except `rateLimited`.
- `target`: includes whichever of `tourKey` and `{ componentId, testId }` are resolvable — both when both are available.
  - `target.componentId` is always present for `workspace`, absent for `header`, and present for `overlay` only when the recent-click heuristic upgraded classification to `workspace`.
- `via` (click only): `"keyboard"` | `"pointer"`.
- `key` (click only, when `via === "keyboard"`): `"Enter"` or `" "`.
- `target.disabled` (optional, boolean): `true` when native `disabled` or `aria-disabled="true"`. Present on `appear`, `disappear`, `click`, `dblclick`.
- `target.tag` (optional): uppercased HTML tag name.
- `target.interactionKind` (optional): resolved in order as native ARIA `role` → `data-role` → omitted. Distinct from `target.tag` — `tag` is syntactic HTML, `interactionKind` is semantic role.
- `target.label` (click/dblclick only, optional): resolved in order as `aria-label` → `aria-labelledby` target's `textContent.trim()` → own `textContent.trim()` if 2+ chars with alphanumeric → omitted. Icon-only glyphs skip to omission rather than producing misleading single-character labels. Locale-dependent — prefer state-sensitive testid splits for locale-independent advancement triggers.
- `dragId` (dragStart/dragEnd only): `{ source, over? }` raw dnd-kit identifiers.
- `monitor`: `{ id, clientId }` for plugin correlation.

### Coverage

- **Single shared `MutationObserver`** rooted on `document.body` with `{ childList: true, subtree: true, attributes: true, attributeFilter: ['aria-expanded', 'aria-hidden', 'aria-disabled', 'disabled', 'style'] }`, attached only while at least one monitor is registered.
- **`appear`/`disappear` events are driven primarily by `aria-expanded` changes** on menu triggers, not by `childList` additions of menu nodes. Every header menu opener (CFM File/Help/Settings/Language, Chakra tool-shelf Tables/Plugins/Tiles) toggles `aria-expanded` on its trigger; the menu container itself is typically pre-rendered or added once and not removed on close. Rule: when `aria-expanded` changes on an element with `aria-haspopup`, emit `appear`/`disappear` with the **trigger** as target.
- **`childList` additions and removals** remain the primary signal for:
  - **Chakra Modal** (added/removed on open/close).
  - **CFM dialogs** (added/removed on open/close).
  - `[role="menuitem"]` children (added on first open).
- **Classification ladder** (assigns `region` and `componentId`):
  1. `.free-tile-component` ancestor → `region: "workspace"`, `componentId = closestTile.id`.
  2. `.menu-bar` or `.tool-shelf` ancestor → `region: "header"`.
  3. `aria-labelledby` on node or any ancestor and referenced element exists → resolve trigger via `getElementById`, re-apply rules 1-2 to it. Authoritative for React Aria menus (CFM File menu and inspector menus).
  4. CFM dialog markers → `region: "header"`.
  5. Chakra-portaled markers → `region: "overlay"`. Recently-clicked-trigger heuristic (500ms window) upgrades to workspace/header when the click was inside `.free-tile-component` / `.menu-bar` / `.tool-shelf`.
  6. Everything else ignored.
- **Click + keyboard activation** tracked via delegated capture-phase listeners on `document` for `click`, `dblclick`, and `keydown` (Enter/Space). Keyboard activation is de-duplicated from the synthetic click via a per-target suppress flag and delivered as a single `click` with `via: "keyboard"`.

### Layout changes (`layoutChange`)

MST-sourced (not DOM-derived), to avoid class/style mutation churn. Notice values include `setting`, `value`, `previousValue`, `componentId` (when tile-scoped), and `region`.

- **App-global (`region: "header"`)**:
  - `setting: "toolbarPosition"`, `value: "Top" | "Left"` — from `persistentState.toolbarPosition`.
- **Tile-scoped (`region: "workspace"`)**:
  - `setting: "tileMinimized"`, `value: true | false` — from `FreeTileLayout.isMinimized`.
  - `setting: "tileSize"`, `value: { width, height }` — debounced; fires at resize-end.
  - `setting: "tilePosition"`, `value: { x, y }` — debounced; fires at drag-end.
  - `setting: "tileAdded"` / `setting: "tileRemoved"` — from `FreeTileRow.tiles` membership, not debounced. Pre-existing tiles at first-subscriber attach are not reported. Overlaps with existing `componentChangeNotice` stream.

**Out of scope for `layoutChange`**: window-resize, intra-drag continuous events, case-table ↔ case-card toggle (that's a tile swap, not a settings flip — use `componentChangeNotice` instead).

### Dialog internal state changes (`dialogChange`)

When a dialog enters the DOM (classification rule 4 or 5), a **scoped `MutationObserver`** is attached to that dialog's subtree with `attributeFilter: ['disabled', 'aria-disabled', 'aria-expanded', 'aria-selected', 'aria-checked', 'value', 'aria-pressed', 'data-testid']`, `attributeOldValue: true`, plus `childList` + `characterData` on `[data-testid]` subtrees. Non-testid churn is dropped.

Notice values include `dialogTarget` (same identifier the dialog's `appear` notice carried), `control: { testId, tag }`, `change` (one of `{ kind: "label", before, after }` / `{ kind: "attribute", name, before, after }` / `{ kind: "value", before, after }`), and `region` (inherited from the dialog's region at open time).

**Filter matching for `dialogChange`**: patterns match against **either** `dialogTarget.testId` OR `control.testId` (OR logic).

**Scoped observer lifecycle**: created when the dialog is detected; destroyed when the dialog element is removed, when the shared observer tears down, or on page unload. Tracked in `Map<Element, MutationObserver>` indexed by dialog element. Not torn down when the last `dialogChange`-specific subscriber unregisters — scoped observers watch small dialog subtrees and their lifetime is bounded by the dialog's DOM presence.

**Locale caveat**: `change.kind: "label"` before/after values are raw textContent and locale-dependent. Prefer `change.kind: "attribute"` for locale-independent advancement triggers.

### Drag events

`dragStart` and `dragEnd` are sourced from the existing `@dnd-kit` integration (`CodapDndContext`) rather than HTML5 drag events. The manager hooks `onDragStart`/`onDragEnd`/`onDragCancel`:

- `dragStart` carries the source target.
- `dragEnd` carries source + drop target (when available) + `cancelled` boolean. `cancelled: true` fires for both dnd-kit `onDragEnd` with `over: null` (released outside any drop zone) and `onDragCancel` (Escape or programmatic cancel).
- dnd-kit IDs (e.g. `case-table-{collectionIndex}-ATTR{attrId}` for sources, `graph-{graphIndex}-{role}-drop` for targets) are forwarded verbatim as `dragId`.
- Drag events are not debounced.

Mutation observation is invisible to drag operations: a real drag fired 534 mutations in measurement, all rejected by the fast path (0 spurious notices).

### Tutorial-plugin requirements

Requirements derived from the downstream stories (CODAP-1227/1228/1229/1230):

- **Non-consumption of events**: the notification manager is strictly observational. Delegated listeners attach with `capture: true`; they **never** call `preventDefault()`, `stopPropagation()`, or `stopImmediatePropagation()`. Adding/removing monitors produces no observable change in CODAP's own event handling.
- **Sub-menu sequencing**: within a batch, `appear` for container markers fires before `appear` for descendant menuitems, so plugins can filter for the parent and re-query the DOM for the exact child.
- **State derivation from combined notices**: `click` carries control identity but not post-click state. Plugins derive state by combining `click` with subsequent `appear`/`disappear`/`layoutChange`/`dialogChange` and by issuing follow-up data-interactive requests (`get component[{id}]`, etc.) using the notice's `componentId`.
- **Authoring discoverability**: the canonical target vocabulary is the tour registry ([tour-elements.ts](v3/src/lib/tour/tour-elements.ts)) plus the Phase 0 `data-testid` namespace (CODAP-1236). No separate discovery API is added.
- **Composability with data-interactive handlers**: `componentId` is the same identifier accepted by `get component[{id}]`, enabling plugins to fetch rich tile state without any new API surface.
- **Keyboard-parity for `dblclick`-gated tutorial steps**: `dblclick` is pointer-only. Tutorial authors must accept Enter/Space on focus (delivered as `click via: "keyboard"`) as an equivalent advance trigger. This API does not synthesize `dblclick` for keyboard activation.

### Performance / lifecycle

- Observation machinery is lazily created on first-subscriber and torn down on last-unregister. With zero subscribers, no measurable runtime cost beyond the handler registration.
- **Narrow `attributeFilter`**: limited to `['aria-expanded', 'aria-hidden', 'aria-disabled', 'disabled', 'style']`. `transform` and `class` are excluded — they are the biggest contributors to animation noise and carry no semantic open/close signal.
- **Fast-path reject** before any classification work: mutations are dropped unless they match (a) `aria-expanded` on `aria-haspopup` elements, (b) a known menu/modal/palette marker class (`.chakra-menu__menu-list`, `.chakra-modal__content`, `.menu-list-container`, `.inspector-menu-list`, `.inspector-menu-popover`, `.codap-inspector-palette`, `.axis-legend-menu`, `.index-menu-list`, `.tool-shelf-menu-list`, CFM dialog markers, axis/attribute menu markers), or (c) `[role="menu"]` / `[role="menuitem"]` / `[role="dialog"]`. SVG descendants of tiles are rejected wholesale.
- **Skip descendant walk on tile-root additions**: when the added node is itself a `.free-tile-component`, skip the descendant-walk `querySelector` — pre-mounted menus inside the tile are not user-visible `appear` events.
- **Hidden-subtree suppression**: mutations whose target or any ancestor carries `aria-hidden="true"` are rejected before classification. `aria-hidden` flips themselves do not emit notices — they update the suppression state for subsequent mutations.
- **Redundant-marker dedup**: when the descendant walk finds multiple markers in the same subtree, role-only container markers (`role="menu"`/`role="dialog"` without a CODAP-known class) are dropped if a class-based marker is in the same ancestor/descendant chain.
- **Per-element short-window dedup**: a 500ms sliding window (`Map<Element, { event, ts }>`) suppresses double observation of the same DOM element via two paths (descendant walk of newly-attached container + subsequent childList mutation).
- **Error isolation**: shared observer callback, scoped `dialogChange` callbacks, click/dblclick/keydown listeners, `CodapDndContext.onDragStart`/`onDragEnd` hooks, and debounce timer callbacks each run inside try/catch. A thrown exception during classification, filter evaluation, or delivery for one monitor must not prevent processing of remaining mutations or monitors.
- **Hard per-monitor rate cap**: 50 notices/sec/monitor, sliding 1-second window. Notices exceeding the cap are dropped; a single `rateLimited` notice is emitted at most once per window. Shape:

  ```
  {
    eventType: "rateLimited",
    monitor: { id, clientId? },
    droppedCount: <integer>,
    windowMs: 1000
  }
  ```

  `rateLimited` carries no `region`/`target` and bypasses `eventTypes`/`targets` filtering. All delivered notice types count toward a single global per-monitor counter; `rateLimited` itself is exempt.
- **Edge-triggered debouncing with conditional trailing**: when activity begins, fire one notification immediately ("leading edge"); suppress further notifications for that target until activity has been quiet for the debounce window (100ms default), then — **only if additional matching mutations occurred after the leading** — fire one "trailing" notification. A one-shot mutation delivers exactly one notice; a multi-mutation burst delivers exactly two. Click events are not debounced.
- **Delivery ordering**: per-monitor FIFO. The manager iterates monitors in ascending `id` order (= subscription order). Cross-monitor ordering is implementation-defined and plugins must not rely on it. Within a single monitor, `appear` precedes `disappear` when both fire for the same target in the same batch.
- **Snapshot iteration**: the delivery loop iterates a snapshot of the monitor list taken at batch start. Unregisters that happen during delivery take effect for the next batch.
- **Event-type ordering within a user action** (within a single monitor):
  1. `click` / `dblclick` / `dragStart` / `dragEnd` first (DOM events happen before MST commits).
  2. `layoutChange` next (MobX reactions fire after MST action commits).
  3. `appear` / `disappear` / `dialogChange` in natural MutationObserver callback arrival order.
- **Unregister cancels pending delivery**: trailing debounce timers scheduled for that monitor are cancelled before unregister returns. Cancellation is per-monitor.
- **Filter evaluation scaling**: O(N·M) where N = active monitors, M = patterns per monitor. Bounded by plugin iframe count (~10) and filter complexity, this is ~100 string comparisons worst-case per delivered mutation. Plugins need not optimize filter shapes.

### Acceptance criteria

Tests map 1:1 where possible.

**Subscription lifecycle**:
- Zero monitors → `MutationObserver.observe()` never called, no document-level listeners attached.
- First-subscriber attaches observer + listeners exactly once; second/third do not re-attach.
- Last-unsubscribe disconnects observer + listeners and clears all debounce timers.
- Rapid subscribe → unregister → subscribe cycles do not leak observers, listeners, or timers.
- Plugin iframe close mid-notice: no unhandled exceptions; pending timers reconciled silently.
- Cross-document navigation: old plugin's monitor is torn down with its iframe; new plugin subscribes cleanly; observer detaches during the gap, re-attaches against the now-mounted new document.
- Unsubscribe during in-flight debounce: trailing notice does not fire for the unsubscribed monitor; other active monitors continue to receive their own trailings.
- Successful filter update: filter swapped, `id`/`clientId` preserved, pending debounce timers cancelled, new filter takes effect on subsequent mutations.
- Invalid filter update: error returned; existing filter, pending timers, identifiers all untouched.

**Non-consumption**:
- Menu open, drag, tile creation, undo/redo, keyboard activation, dialog open/close all behave identically with or without monitors.
- Cypress regression-parity suite (curated UI e2e tests run once with no monitor and once with a broad monitor) reports identical results.

**Notification correctness** (validated against Mammals):
- File menu open/close → `appear`/`disappear` (region: `header`).
- Tool-shelf menus (Tables/Plugins/Tiles/Guide) open → `appear` for menu + each menuitem.
- Axis attribute button click → `click` (region: `workspace`, `componentId`) followed by `appear` for the menu (also `workspace` via recent-click upgrade).
- Inspector trigger click → `click` followed by `appear` for menu and menuitems (all `workspace` with the same `componentId`).
- Drag attribute to graph axis → `dragStart` + `dragEnd` with source target, drop target, and dnd-kit IDs.
- Focus + Enter/Space → exactly one `click` notice with `via: "keyboard"` and `key: "Enter"` or `" "`; browser-synthesized pointer click is de-duplicated.
- Event-type ordering: `click` before `layoutChange` before `disappear` for a tile-minimize flow.
- Double-click on `codap-attribute-button-{n}` → `dblclick` + `appear` on `column-name-input`; Escape/blur → `disappear`. Same pattern for tile title (`title-text-input`).
- Right-click, scroll, hover, focus-change, visibility-change → zero notices.
- CFM disabled menu item → `appear` carries `target.disabled: true`; enabled siblings omit it.
- `target.interactionKind` resolved in order: ARIA `role` → `data-role` → omitted. Validated against `data-role="axis-drag-rect"` and a `role="button"` tool-shelf trigger.
- CFM Share "Enable sharing" → exactly one `dialogChange` notice with `control.testId: "cfm-dialog-share-update-button"`, `change.kind: "attribute"`, `change.name: "data-testid"`, before/after reflecting the CFM-15 stateful testid flip.

**Performance**:
- Fast-path reject rate ≥ 95% across any non-idle 1-second window in typical usage.
- A single tile resize/minimize/un-minimize delivers ≤ 2 notices per target (leading + trailing).
- Time-to-open a representative menu with one broad monitor active is within 5% of baseline.
- Rate-cap exceeded → single `rateLimited` notice per window with `droppedCount` and `windowMs`, no `region`/`target`.

**State / layout**:
- Toolbar Position change → exactly one `layoutChange` (`setting: "toolbarPosition"`).
- Tile minimize/restore → exactly one `layoutChange` per transition (`setting: "tileMinimized"`).
- Tile resize/move → ≤ 2 `layoutChange` notices per drag (leading + trailing).

## Technical Notes

### Files added

- `src/data-interactive/handlers/ui-notification-monitor-handler.ts` — registers the resource, mirrors `log-message-monitor-handler.ts`.
- `src/data-interactive/ui-notifications/` — new folder housing manager, types, filter-matching, classify-node, click-listener, label-resolution, dom-observer, dialog-change-observer, drag-adapter, layout-change-reactions, debounce-and-rate-cap, install.
- `cypress/fixtures/ui-notification-test-plugin.html` — minimal iframe-phone plugin fixture exposing `window.subscribeMonitor` / `updateMonitor` / `unsubscribeMonitor` / `getDeliveredNotices`.
- `cypress/support/with-monitor.ts` — helper that wraps a test in "subscribe broad monitor → run → unsubscribe → assert no divergence". A **broad monitor** is `{ eventTypes: [all eight subscribable types], targets: undefined }`.
- `cypress/e2e/ui-notifications.spec.ts` — canonical e2e spec + plugin-developer example.
- `cypress/e2e/ui-notifications-parity.spec.ts` — runs a curated set of ~8–10 canonical UI scenarios through `withBroadMonitor` and asserts no divergence and within-5% time-to-open.
- `v3/docs/plugin-api/ui-notifications.md` — plugin-author documentation covering API shape, event types, target catalog, rate cap, and caveats.

### Reuse

- `DocumentContentModel.broadcastMessage` for delivery — already handles the dead-iframe case (silently drops notices to closed plugins), so the manager does not need to track plugin lifecycle separately.
- The `logMessageMonitor` lifecycle as the template for subscription semantics and return shapes.
- `tourElements` registry for header element identity.

### Composability with existing data-interactive handlers

The `componentId` field (`GRPH44`, `TABL40`, `WEBV41`, …) is the same identifier the existing data-interactive component handler accepts. Plugins receiving a UI notification can immediately issue follow-up requests (`get component[{id}]`, `get dataContext[...]`, etc.) without any new API surface. No new data-interactive handlers are required.

Tour authors writing step-advance conditions can reference a tile by `componentId` in both the CODAP-1232 filter (UI event) and the existing `dataContextChangeNotice` / `component` resource (data/state event) without juggling two identifier spaces.

### DOM behavior reference

Key findings validated on codap3.concord.org via Playwright (2026-04-14):

- Tile root: `<div class="free-tile-component" id={tileId}>` — `closest` walk + `.id` returns the canonical tile id.
- Tool-shelf top menus (Table/Plugins/Tiles/Guide) render **inline** under `.tool-shelf` (testids `tool-shelf-*-menu-list`); they do not portal.
- CFM "File" menu dropdown is **React Aria Components** mounted at body level as `.cfm-menu > .menu-list-container[aria-labelledby={triggerId}]`. Same pattern for inspector menus (`.inspector-menu-popover > .inspector-menu-list`).
- CFM dialogs (Open/Save/Confirm/Alert) mount as `BODY > DIV.modal > DIV.modal-content > SECTION.modal-dialog-container[role="dialog"]`. `aria-labelledby` points to the dialog title (not a trigger), so the static CFM-dialog-marker rule is required.
- Chakra Menus (`.axis-legend-menu`) and Modals (`.chakra-modal__content`) mount inside `.chakra-portal`. Neither carries `aria-labelledby` to the trigger — recently-clicked-trigger heuristic is required.
- Menu open/close is **not reliably observable via `childList` alone**. Both Chakra `Menu` and CFM React Aria menus pre-render their container and toggle visibility via CSS. `aria-expanded="false" ↔ "true"` on the trigger is the authoritative signal.
- Inspector palettes (`.codap-inspector-palette`) render **inline** in the tile (not portaled); caught via `childList` and classified as `workspace` via rule 1.
- dnd-kit identifiers are stable and semantic: `case-table-{collectionIndex}-ATTR{attrId}` for sources, `graph-{graphIndex}-{role}-drop` for drops.
- Tile-close cascade: closing a tile fires `disappear` for every marker-matching element inside the tile. The tile itself is not reported as `disappear` because `.free-tile-component` is deliberately not in the marker allow-list — tile lifecycle is represented in CODAP's existing notification streams.
- Cascade close: opening any one menu automatically closes other open menus across the app. The observer correctly captures these as `disappear` events for each previously-open trigger.
- Initial-mount over-reporting was a probe artifact, not a production concern. The production manager attaches on first-subscribe (after React hydration, document load, plugin iframe load, and iframe-phone handshake), so the observer starts cleanly with no churn to suppress.

### Constraints

- Must not depend on React render cycles for observation (manager runs outside React). The existing `useMutationObserver` hook is component-scoped and not appropriate.
- Plugin notification messages must round-trip through `iframe-phone` unchanged in shape from existing notifications so plugins can handle them with their existing dispatcher code.

### Phase 0 dependency (completed via CODAP-1236)

The v3-side testid sweep shipped in [CODAP-1236](CODAP-1236-add-missing-data-testids.md). CODAP-1232 builds on it. Naming conventions CODAP-1232 relies on:

- **No `codap-` prefix on inner testids.** Only tile-root containers carry `codap-{tile-type}` (e.g. `codap-graph`). Inner testids extend their family's existing prefix (`axis-…`, `inspector-…`, `tool-shelf-…`, `attribute-…`).
- **No `{tileId}` suffix on inner testids.** Plugins resolve tile identity from CODAP-1232's `componentId` payload.
- **Index-based disambiguators** for repeating elements (`codap-attribute-button-{attrIndex}`, `legend-key-{index}`, `attribute-header-menu-{attrIndex}`).
- **Fixed-semantic indices by role** for axis drag rects (`{zoneIndex}` 0/1/2 = lower/mid/upper).
- **`data-role="axis-drag-rect"`** — surfaced on the notice as `target.interactionKind`, orthogonal to region classification.
- **Axis attribute menu `aria-labelledby`** — the Chakra-portaled `MenuList` at `axis-attr-menu-{placeTestId}` now carries `aria-labelledby` back to its trigger. Classification rule 3 covers the axis menu; the recent-click heuristic does not need to fire for it.

### CFM-15 sequencing

The CFM testid work shipped on the CFM-15 branch of `@concord-consortium/cloud-file-manager` ([PR #423](https://github.com/concord-consortium/cloud-file-manager/pull/423)). During development, v3's `package.json` pinned the CFM dep to the CFM-15 branch via git ref; before the final CODAP-1232 PR, it flipped to the released version number.

## Out of Scope

- Pointer events other than click and dnd-kit drag start/end (no hover, mousedown, mouseup, mid-drag move events, etc.).
- Native HTML5 drag-and-drop events. Drag notifications are sourced from CODAP's `@dnd-kit` integration only.
- Touch-specific gesture notifications.
- Notifications for non-UI state changes (covered by other notification resources).
- A general-purpose "any DOM event" subscription API.
- **Focus-change and arrow-key navigation.** Moving keyboard focus between menu items (arrow keys within an open menu) does not produce notices — focus is not activation. Tutorial plugins advance on Enter/Space activation, not focus alone.

## Not Yet Implemented

- **Audit CODAP for `dblclick`-only interactions lacking a keyboard equivalent.** Ensures tutorial plugins (and screen-reader users) can activate every dblclick-gated feature via Enter on focus. Confirm coverage for attribute rename, case cell edit, tile title rename, and any other dblclick-activatable controls. *(Explicitly deferred in requirements Follow-on work.)*
- **Fix CFM `aria-expanded` transitions upstream** in the same CFM PR as the dialog-testid and stateful-button-testid work — independent accessibility bug. *(Deferred in WCAG review resolution.)*
- **Fix missing `aria-labelledby` on `.axis-legend-menu`** in `axis-or-legend-attribute-menu.tsx`. *(Deferred in WCAG review resolution — partially addressed by the CODAP-1236 axis-attr-menu `aria-labelledby` landing, but the legend-specific case remains.)*

