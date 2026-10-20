# UI Notifications (`uiNotificationMonitor`) — Plugin API

Opt-in API that delivers notifications to plugins when UI elements in CODAP
appear, disappear, or are activated (clicked, or Enter/Space activated). Designed
for the tutorial-plugin use case: a plugin highlights a control, listens for the
matching notice, then advances.

Canonical end-to-end example: [`cypress/e2e/ui-notifications.spec.ts`](../../cypress/e2e/ui-notifications.spec.ts).

Jira: [CODAP-1232](https://concord-consortium.atlassian.net/browse/CODAP-1232).

## API shape

All messages use the data-interactive envelope `{ action, resource, values }`.

**Subscribe** (plugin → CODAP):

```
{
  "action": "notify",
  "resource": "uiNotificationMonitor",
  "values": {
    "eventTypes": ["click", "appear"],   // optional; omit for all
    "targets":    ["menuBar.*"],          // optional; omit for all targets
    "clientId":   "my-client"             // optional opaque string echoed on notices
  }
}
```

Response: `{ success: true, values: { id, clientId? } }`. `id` is a manager-assigned
monotonically-increasing integer. Use it to update or delete the monitor.

**Update** the filter (same id/clientId, pending trailing-debounce timers cancelled):

```
{ "action": "update", "resource": "uiNotificationMonitor[1]", "values": { "eventTypes": ["click"] } }
```

An update with a syntactically invalid filter returns an error and leaves the
existing monitor untouched.

**Unsubscribe**:

```
{ "action": "delete", "resource": "uiNotificationMonitor[1]" }
```

All error responses use the standard data-interactive shape:
`{ success: false, values: { error: "<message>" } }`.

### Filter syntax

- `eventTypes`: array of subscribable event types (see below). Empty array is a
  syntax error. `rateLimited` is not subscribable.
- `targets`: array of testid/tourKey patterns. Exact string, or a prefix glob
  with a trailing `*` (e.g. `"axis-legend-*"`). `*` anywhere other than the
  final position is a syntax error. Matching is case-sensitive; dots and
  hyphens are literal. Empty array is a syntax error.
- **Match surface.** Patterns are tested only against `target.tourKey` and
  `target.testId`. `componentId`, `label`, and `tag` are delivery metadata, not
  filter keys. For `dialogChange`, patterns match against either
  `dialogTarget.testId` or `control.testId`.
- **Semantics.** A notice is delivered when `eventType` is in the monitor's
  `eventTypes` (or `eventTypes` is omitted) AND `target` matches at least one
  pattern in `targets` (or `targets` is omitted). Within each array, OR; across
  fields, AND. Use multiple monitors for OR-across-fields.

## Event types

All delivered as `notify uiNotificationNotice`.

- **`appear` / `disappear`** — element became visible / was removed. Emitted
  for menu/palette/dialog markers, `role="menuitem"` additions, and
  `aria-expanded` flips on menu triggers.
- **`click`** — pointer click or keyboard activation. `via: "pointer" | "keyboard"`
  distinguishes the two. When `via === "keyboard"`, also carries `key: "Enter" | " "`.
- **`dblclick`** — pointer-only. Keyboard users get a single `click` with
  `via: "keyboard"`; there is no keyboard-synthesized `dblclick`. Tutorials that
  advance on `dblclick` should also accept `click` with `via: "keyboard"`.
- **`dragStart` / `dragEnd`** — dnd-kit drag operations. Carry `dragId.source`
  (always) and `dragId.over` (on `dragEnd` when dropped on a valid target).
  `cancelled: true` fires on escape-cancel or drop-outside-valid-zone.
- **`layoutChange`** — layout reconfiguration. See Settings/layout table below.
- **`dialogChange`** — inner state change in an open dialog. Only fires for
  controls carrying `data-testid`.
- **`rateLimited`** (meta, not subscribable) — one emitted per monitor per
  second when the 50 notices/sec cap is hit. Payload:
  `{ eventType: "rateLimited", monitor, droppedCount, windowMs: 1000 }`.

## Notice payload

Top-level:

```ts
{
  eventType: "click" | "appear" | ...
  region?:   "header" | "workspace" | "overlay"   // absent on rateLimited
  target?:   { tourKey?, testId?, componentId?, label?, tag?, disabled?, interactionKind? }
  monitor:   { id: number, clientId?: string }
  // Per-event-type extras: via, key, dragId, setting, value, previousValue, dialogTarget, control, change
}
```

- `target.componentId` always present for `region: "workspace"`; absent for
  `header`; present for `overlay` only when the recent-click heuristic upgraded
  the region. Treat as optional.
- `target.label` (click / dblclick only): aria-label → aria-labelledby text →
  own textContent (≥2 chars, ≥1 alphanumeric) → omitted. Locale-dependent.
- `target.disabled` (appear / disappear / click / dblclick): `true` when
  native `disabled` or `aria-disabled="true"`. Omitted when enabled.
- `target.interactionKind` (click / dblclick / drag / appear / disappear):
  ARIA `role` → `data-role` → omitted.

## Target catalog

A non-exhaustive reference to the testid families CODAP-1232 filters can
reference. Full inventory lives in CODAP-1236's R4 tables and the tour
registry at [`src/lib/tour/tour-elements.ts`](../../src/lib/tour/tour-elements.ts).

| Family | Example patterns |
|---|---|
| Tile roots | `codap-graph`, `codap-case-table`, `codap-map`, `codap-case-card`, `codap-slider`, `codap-text`, `codap-calculator`, `codap-web-view` — use `target.componentId` for tile-instance identity, not tile-root testids. |
| Axis / legend | `axis-legend-attribute-button-{placeTestId}`, `axis-attr-menu-{placeTestId}`, `axis-attr-submenu-{placeTestId}-{collectionIndex}`, `legend-key-{index}`, `axis-drag-rect-{placeTestId}-{zone}`. `placeTestId` is kebab-case — `rightCat` → `right-cat`, `rightNumeric` → `right-numeric`, `yPlus` → `y-plus`. |
| Inspector | `inspector-palette-{tile-type}`, `inspector-popover-{name}`, `inspector-menu-{name}` |
| Tool-shelf | `tool-shelf-table-menu-list`, `tool-shelf-tiles-menu-list`, `tool-shelf-plugins-menu-list`, `tool-shelf-guide-menu-list` |
| Attribute header | `attribute-header-menu-{attrIndex}`, `codap-attribute-button-{attrIndex}` |
| Inline edit | `title-text-input`, `column-name-input`, `cfm-menu-bar-filename-input` |
| CFM dialogs | `cfm-dialog-shell`, `cfm-dialog-share`, `cfm-dialog-share-{enable,update,preview,stop,copy,close}-button`, `cfm-dialog-rename`, `cfm-dialog-alert`, `cfm-dialog-confirm-*` |
| Row index | `index-menu-list` |
| Tour registry keys | dot-notation (`menuBar.fileMenu`, `toolShelf.tableButton`, etc.) |

## Layout / settings values

| `setting` | `value` | `previousValue` | `region` | Notes |
|---|---|---|---|---|
| `toolbarPosition` | `"Top" \| "Left"` | prior value | `header` | App-global, from Settings menu |
| `tileMinimized`   | `boolean` | prior value | `workspace` | One per transition |
| `tileSize`        | `{ width, height }` | prior size | `workspace` | Debounced — ≤2 per drag (leading + trailing) |
| `tilePosition`    | `{ x, y }` | prior position | `workspace` | Debounced — ≤2 per drag |
| `tileAdded`       | `{ componentId, type? }` | `null` | `workspace` | Fires when a tile enters the doc. Pre-existing tiles at first-subscriber attach are NOT reported. Overlaps with `componentChangeNotice` — see below. |
| `tileRemoved`     | `null` | `{ componentId, type? }` | `workspace` | Fires when a tile leaves the doc. Overlaps with `componentChangeNotice`. |

### `tileAdded` / `tileRemoved` overlap with `componentChangeNotice`

CODAP already emits `componentChangeNotice` (via the existing
`documentChangeNotice` stream) when tiles are created, closed, or changed.
`tileAdded` / `tileRemoved` in `uiNotificationMonitor` are a convenience for
tutorial plugins that are already subscribed here and want all UI-relevant
signals on one channel. **Plugins subscribed to both streams will see each
tile-create / tile-close twice.** If you only care about tile lifecycle,
prefer `componentChangeNotice`; if you already have a broad
`uiNotificationMonitor`, use `tileAdded` / `tileRemoved`.

## Rate cap

A hard per-monitor cap of **50 notices/sec** is enforced as a safety net (sliding
1-second window). Notices exceeding the cap are dropped; a single `rateLimited`
meta-notice is emitted per window so plugins know they missed events. The
`rateLimited` notice itself is exempt from the cap. All other event types count
toward a single shared per-monitor counter.

## Caveats

- **Locale.** `target.label` and `dialogChange` `change.kind: "label"` are raw
  textContent and depend on language. Prefer testid/tourKey matches and
  `change.kind: "attribute"` for advancement triggers. In particular, use the
  stateful testids for CFM's Share dialog
  (`cfm-dialog-share-enable-button` ↔ `cfm-dialog-share-update-button`) rather
  than label text.
- **Initial mount.** Observers attach on first-subscribe, which happens after
  React hydration and the iframe-phone handshake. No spurious initial-mount
  notices are produced.
- **`dblclick` + keyboard parity.** No keyboard-synthesized `dblclick`. See
  Event types.
- **Focus is not activation.** Arrow keys within an open menu do not fire
  notices. Tutorial plugins advance on Enter/Space activation, not focus.
- **Non-consumption.** The observer never calls `preventDefault` or
  `stopPropagation` — CODAP's own handling is unaffected by monitor activity.
