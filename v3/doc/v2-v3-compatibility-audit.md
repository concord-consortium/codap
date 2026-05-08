# V2 ↔ V3 Plugin-Visible Event Compatibility Audit

**Date:** 2026-05-08
**Scope:** Catalog every V2 user-analytics log and Data-Interactive notification, find each V3 counterpart, and flag every place where V3 either renames, drops, or reshapes information that V2 emitted. V3 may freely *add* fields; it must not silently *rename* or *remove* them. Adding/removing entire events is also flagged because plugins (Story Builder, etc.) listen for V2 events.

This was triggered by PR #2566 (CODAP-1306), which fixed one such drift: V3 was emitting a `notify`/`edit text`/`{}` envelope where V2 emits `commitEdit`/`{title,text}`. The audit looks for siblings.

**V2 source:** `master` branch, primarily `apps/dg/`.
**V3 source:** `main` branch, `v3/src/`.

---

## TL;DR

- The `commitEdit` text-tile bug PR #2566 fixed is **still on `main`**; the fix is on the `CODAP-1306-story-builder-moment-description` branch only. Confirmed.
- One **envelope-shape mismatch** found beyond `commitEdit`: V2's `titleChange` puts `type` at the outer envelope level (peer of `action`/`resource`); V3 puts it inside `values`. (See §3.1.)
- Many **operation-name renames** in V3 — e.g. `lockBackgroundImage`/`unlockBackgroundImage` → `background locked to axes`; `switch bar and dot` → `toggle between bars and dots`; `toggle connecting line` → `toggle show connecting lines`; `toggle show squares` → `toggle showSquares`; `toggle lock intercept` → `toggle intercept locked`; etc.
- Many **V2 notifications V3 doesn't emit** — calculator `calculate`, slider `change slider value` (component-resource variant), most map operations (`change point color`, `change point size`, `change base map`, `change grid size`, `change map coordinates`, `toggle stroke same as fill`), case-table operations (`open case table`, `edit formula`, `resize column`, `resize columns`, `expand/collapse all`, `change column width`), graph `add axis attribute`/`add 2nd axis attribute`/`drag movable point`/`drag movable line`/`reposition equation`/`drag bin boundary`, plot toggles (`toggle plotted value`, `toggle plotted Count/Percent`, `toggle movable point`, `toggle movable line`, `toggle LSRL`, `toggle plot function`, `add movable value`, `remove movable value`, `<iToggleLogString>` mean/median/etc., `setNumStdErrs`, `toggle show outliers`, `<show/hide> measure labels`), `toggle <iCapability>`, dataset `join`, `change background color` notification, `toggle background transparency` notification, `hide`/`show` singleton component, default `undo`/`redo` on `resource:'document'`.
- **Log event-string renames** that break V2 plugins matching by `formatStr`: `editValue` → `editCellValue`, `Fit Column Width` → `Fit column width`, `sort cases` → `Sort cases`, `resizeColumns` → `Resize all columns`, `insert N cases in table` → `Create N cases in table`, `addAxisAttribute` → `Attribute assigned`, `attributeRemoved` → `Attribute removed`, `dragEnd` → `Axis domain change`, `lockIntercept` → `Lock/Unlock line intercept`, `toggleConnectingLine` → `Show/Hide connecting lines`, `toggleShowSquares` → `Show/Hide squares of residuals`, `togglePlotted<What>` → `Show/Hide count|percent`, `Moved movable point` → `Move point`, `Moved movable value` → `Moved value`, `dragMovableValue` → `Moved value from`, `Disable<Cap>`/`Enable<Cap>` → `Disable Cap`/`Enable Cap` (with spaces), `change <key> from <a> to <b>` → `Changed <key> from <a> to <b>`, `Hide attribute "%@"` → `Hide attribute %@` (no quotes), `Edit attribute "%@"` → `Edit attribute: %@`, plus dozens more.
- **V3-only logs that V2 doesn't emit** (informational): `Edited text component: <text>` (V2 explicitly disabled this in build 0601), `Calculation error`, `WebView initialized`, `Add Plugin`, `Restore set aside cases`, `Recover formula for attribute`, `Clear formula for attribute`. These add information and are fine; noted only because the V3 log has full text content embedded in the event-name string for `Edited text component`, which is a privacy/sizing concern.
- A few **V2 bugs** (e.g. `case_table_controller.js:1135` `%` typo, `data_layer_model.js:650` graph "Hide unselected" emits without count due to evaluation ordering, `data_display_controller.js:445` missing space in `Changed<end> attribute color`, `graph_map_common/data_display_controller.js:941` `type: ctor.toString()`) — V3 should NOT replicate these; flagged for awareness so V3 isn't inadvertently "fixed" to match V2 quirks.

The full per-event tables are in §3 (notifications) and §4 (logs). See §5 for prioritized recommendations.

---

## 1. Methodology

### 1.1 V2 emission paths

- **User-analytics logs** flow through `DG.Debug.logUser(formatStr, ...args)` (`apps/dg/alpha/debug.js:240`). Plugin-visible serialization happens in `notifyLogMessageSubscribers` (`apps/dg/components/data_interactive/notification_manager.js:242`): `{ action:'notify', resource:'logMessageNotice', values:{ formatStr, replaceArgs, message, topic?, logMonitor } }`.
- **Notifications** flow primarily through `DG.NotificationManager.sendNotification(message, callback)` (`notification_manager.js:86`) — broadcast — or `sendChannelNotification(gameController, ...)` (`:95`) — targeted. Most call sites attach `executeNotification` / `undoNotification` / `redoNotification` (literal or function) to a `DG.Command` and `UndoHistory._notify` (`undo_history.js:357`) sends them. `_clearUndo`/`_clearRedo`/`undoChangeNotice` go through the lower-level `DG.sendCommandToDI` (`undo_history.js:367`).
- 50 direct `DG.logUser*` call sites + ~89 `log:` Command-property sites; 97 `action:'notify'` literals across `apps/dg`.

### 1.2 V3 emission paths

- **Logs** flow through `Logger.log(message, args, category)` (`v3/src/lib/logger.ts:102`). The bridge `tileEnv.log` (`v3/src/models/document/create-document-model.ts:54-56`) is the only consumer of `applyModelChange`'s `log:` option (resolved in `v3/src/models/history/app-history-service.ts:21-38`). Helpers in `v3/src/lib/log-message.ts` substitute `%@` slots positionally; the **fully-substituted** message is what plugins see in `event` (and what `log-monitor-manager.ts` forwards as `formatStr`).
- **Notifications** flow through `DocumentContent.broadcastMessage` (`v3/src/models/document/document-content.ts:122`) → per-tile `content.broadcastMessage` (only `WebViewModel` actually forwards to a plugin: `v3/src/components/web-view/web-view-model.ts:139`). The `notify:` option of `applyModelChange` resolves to one or more `INotification` objects and calls `env.notify` per result. Helpers in `v3/src/data-interactive/notification-utils.ts`, `v3/src/models/tiles/tile-notifications.ts`, `v3/src/models/data/data-set-notifications.ts`.
- ~150 `log:` properties + 4 direct `Logger.log` calls; 79 `notify:` properties + several direct `broadcastMessage` callers.

### 1.3 What "compatible" means here

- **Operation/event name** must match V2 byte-for-byte (case, spacing, punctuation), since V2 plugins commonly match by exact `operation` or by leading-token of `formatStr`.
- **Payload field names** in `values` (notifications) and **arg keys** / **format-string slots** (logs) must include every V2 field. V3 may add fields; renaming is breaking.
- **Envelope shape** — `action`, `resource`, and the placement of `type` — must match V2.
- **Resource** must match including bracketed suffix: `component[<v2id>]`, `dataContextChangeNotice[<dsName>]`, `global[<name>]`.

### 1.4 Limitations

- Cross-checking against the actual list of V2 plugin listeners (Story Builder source, etc.) is **out of scope** — this audit looks at *emission*, not *consumption*. A rename only matters if some plugin actually filters on the renamed value. Triage with the plugin team to decide which gaps need fixing.
- Some V2 events come from runtime variables (e.g. `'toggle '+iCapability`); we list the patterns and known concrete values in the catalog sections.
- The V3 audit excludes test files (`*.test.ts`/`.test.tsx`).

---

## 2. Cross-Reference Summary

### Notifications

| Bucket | Count |
|---|---|
| V2 emits, V3 emits compatibly | ~28 |
| V2 emits, V3 emits with **operation-name rename** | 9 |
| V2 emits, V3 emits with **envelope-shape mismatch** | 1 (`titleChange`) |
| V2 emits, V3 emits with **resource mismatch** (slider routes through `global[<name>]` only) | 1 (`change slider value`) |
| V2 emits, V3 does NOT emit | ~40 (see §3.3) |
| V3 emits, no V2 equivalent (additions) | ~10 (e.g. `change bar chart from <a> to <b>`, drag-and-drop attribute notifications) |
| V2 emits with envelope/payload bugs (do NOT replicate) | 4 |

### Logs

| Bucket | Count |
|---|---|
| V2 emits, V3 emits compatibly (event token + payload preserved) | ~15 |
| V2 emits, V3 emits with **event-token rename** | ~30 |
| V2 emits, V3 emits with **payload-shape change** (different keys, different braces) | ~12 |
| V2 emits, V3 does NOT emit | ~25 |
| V3 emits, no V2 equivalent (additions) | ~30 |

---

## 3. Notification Findings

### 3.1 Envelope-shape mismatch — `titleChange`

**V2** — `apps/dg/views/component_view.js:280-289` (verified):

```js
executeNotification: {
  action: 'notify',
  type: <componentType>,                // ← outer level
  resource: 'component[' + <id> + ']',
  values: { operation: 'titleChange', from, to }
}
```

**V3** — `v3/src/models/tiles/tile-notifications.ts:6-16` (verified):

```ts
// resource: `component[${toV2Id(tile.id)}]`           ✓ matches V2
// values: { operation, id, type, from, to }           ✗ type INSIDE values, not outer
```

V2 plugins reading `message.type` will see `undefined` from V3.

**Fix sketch:** for the `titleChange` operation only, the V3 wrapper would need to lift `type` to the outer envelope (peer of `action`, `resource`). All other operations are correct as-is. This is the only V2 emission site we found that puts `type` outside `values`.

### 3.2 Operation-name renames

V3 emits the right resource and includes the V2 fields, but the operation string itself differs.

| V2 operation | V3 operation | V3 file:line |
|---|---|---|
| `backgroundImage` (used for **add** at graph_controller.js:361 AND **remove** at :410) | `added background image` (add) / `removed background image` (remove) | `v3/src/components/graph/components/camera-menu-list.tsx:36, :64` |
| `lockBackgroundImage` / `unlockBackgroundImage` | `background locked to axes` (with `to: "locked"`/`"unlocked"`) | `v3/src/components/graph/components/camera-menu-list.tsx:81` |
| `switch bar and dot` | `toggle between bars and dots` | `v3/src/components/graph/components/inspector-panel/display-config-palette.tsx:227` |
| `toggle connecting line` | `toggle show connecting lines` | `v3/src/components/graph/adornments/store/adornments-store-utils.ts:129` |
| `toggle lock intercept` | `toggle intercept locked` | `…/adornments-store-utils.ts:158` |
| `toggle show squares` | `toggle showSquares` | `…/adornments-store-utils.ts:190` |
| `<show/hide> measure labels` (V2) | `toggle showing labels` | `…/adornments-store-utils.ts:97` |
| `toggle show as <DotPlot/BinnedPlot/LinePlot>` (PascalCase) | `toggle show as <dotPlot/binnedDotPlot/linePlot/histogram>` (camelCase, different value set) | `v3/src/components/graph/components/inspector-panel/display-config-palette.tsx:134` |
| `edit text` (CODAP-1306, current `main`) | should be `commitEdit` per V2 (`apps/dg/components/text/text_controller.js:199`) | `v3/src/components/text/text-tile.tsx:145` (PR #2566 fixes) |

`commitEdit` is the known one. The rest are equally likely to break plugins matching by exact operation string.

### 3.3 V2 emits, V3 does not — by area

These are V2 notifications that send to plugins where V3 currently has no equivalent emission. Each is a possible Story Builder / V2-plugin breakage.

**Calculator**
- `calculate` (resource `component`) — `apps/dg/components/calculator/calculator.js:94, :156` (clearValue + evaluate). V3 logs `Calculator value cleared`/`Calculation done` but does not emit a notification.

**Case Card**
- `change column width` (resource `component`) — `apps/dg/components/case_card/case_card_view.js:119`. V3 logs but does not notify.

**Case Table**
- `open case table` — `apps/dg/controllers/document_controller.js:1069`.
- `edit formula` (component) — `apps/dg/components/case_table/case_table_controller.js:799`. V3 emits `change formula` only on bar chart (`bar-chart.tsx:218`), not on attribute formula edits.
- `resize column` — `case_table_controller.js:906` and `case_table_view.js:1926`.
- `resize columns` — `case_table_controller.js:1136`.
- `expand/collapse all` — `case_table_view.js:2172`.

**Graph adornments / axes**
- `drag movable point` — `apps/dg/components/graph/adornments/movable_point_adornment.js:128`.
- `drag movable line` (op string used for movable-VALUE drag) — `movable_value_adornment.js:166`.
- `reposition equation` — `plotted_average_adornment.js:529`, `twoD_line_adornment.js:285`.
- `edit plot formula` — `plotted_formula_edit_context.js:102`.
- `swap categories` — `cell_axis_view.js:198`.

**Graph controller**
- `add axis attribute` — `graph_controller.js:619`.
- `add 2nd axis attribute` — `graph_controller.js:688`.
- `change background color` (notification) — `graph_controller.js:772`. V3 logs but does not notify.
- `toggle background transparency` (notification) — `graph_controller.js:837`. V3 logs but does not notify.

**Graph plots**
- `toggle <iCapability>` (e.g. `toggle NumberToggle`, `toggle MeasuresForSelection`) — `graph_model.js:511`.
- `toggle between histogram and dots` — `binned_plot_model.js:506`.
- `drag bin boundary` — `binned_plot_view.js:210`, `histogram_view.js:261`.
- `toggle plotted value` — `plot_model.js:421`.
- `toggle plotted <iWhat>` (Count/Percent) — `plot_model.js:465`.
- `toggle movable point` — `scatter_plot_model.js:232`.
- `toggle movable line` — `scatter_plot_model.js:277`.
- `toggle LSRL` — `scatter_plot_model.js:336`.
- `toggle plot function` — `scatter_plot_model.js:461`.

**Graph univariate adornments**
- `toggle movable value` — `univariate_adornment_base_model.js:107`.
- `add movable value` — `:195`.
- `remove movable value` — `:272`.
- `<iToggleLogString>` (e.g. `togglePlottedMean`, `togglePlottedMedian`, `togglePlottedBoxPlot`) — `:321`.
- `setNumStdErrs` — `:357`.
- `toggle show outliers` — `:462`. (V2 also emits this — buggy — for ICI at `:511`; V3 should NOT replicate the bug.)

**Graph + Map common**
- `showAllCases` — `data_layer_model.js:680`. V3 emits the log but not the notification.
- `displayOnlySelected` — `data_layer_model.js:705`.

**Map** (V3 map is incomplete; many V2 notifications missing)
- `change point color` (categorical) — `map_controller.js:294`.
- `change <name>` (dynamic, e.g. `change changePointColor`/`changeStrokeColor`) — `map_controller.js:333`.
- `change attribute color` — `map_controller.js:370`.
- `change point size` — `map_controller.js:492`.
- `toggle stroke same as fill` — `map_controller.js:640, :862` (duplicate paths).
- `hide selected cases`, `hide unselected cases`, `show all cases` (map-specific op strings; V3 uses the shared graph_map_common ones) — `map_model.js:534, :562, :598`. May be intentional unification but V2 plugins listening for the map-specific strings won't match.
- `change base map` — `map_view.js:207`.
- `change grid size` — `map_view.js:247`.
- `change map coordinates` — `map_view.js:570` (pan/zoom).

**Slider**
- `change slider value` (resource `component`) — `slider_controller.js:225` and `slider_view.js:326`. V3 routes slider value changes through `global[<name>]` (`v3/src/components/slider/slider-utils.ts:6`) only. V2 plugins listening for the component-resource notification get nothing. (Plugins listening on `global[<name>]` should still work since V2 also emits that.)

**Text**
- `commitEdit` — `text_controller.js:199`. V3 main: still `edit text` with `{}`. Fixed on `CODAP-1306-story-builder-moment-description` branch / PR #2566.

**Document/undo**
- Default `undo` / `redo` on resource `document` (auto-attached to commands lacking explicit `undoNotification`/`redoNotification`) — `apps/dg/controllers/undo_history.js:159-165, 204-210`. Plugins listening for `resource:'document'`, `operation:'undo'`/`'redo'` will not receive these in V3 (which only emits `undoAction`/`redoAction` on `undoChangeNotice`).

**Component framing**
- `hide` / `show` (singleton component toggle, e.g. calculator) — `document_controller.js:1644-1666`. Resource is `component`, operation is `'hide'` or `'show'`, with `type` = component name. V3 doesn't emit.
- `toggle table to card` / `toggle card to table` — `titlebar_button_view.js:316, :373`. V3 logs `Toggle component: %@` but doesn't emit a notification.

**Data context**
- `join` — `data_context_utilities.js:924`. (V2 has a known bug: `type: DG.CaseTable` is the class object, not a string. V3 should NOT replicate.)

**dataContextChangeNotice operation list**
V3 covers the common ops (`createCases`, `updateCases`, `deleteCases`, `selectCases`, `moveCases`, `dependentCases`, `createCollection`/`updateCollection`/`deleteCollection`, `createAttributes`/`updateAttributes`/`deleteAttributes`/`moveAttribute`/`hideAttributes`/`unhideAttributes`/`showAttributes`, `updateDataContext`). V2 also emits: `createItems` / `updateItems` / `deleteItems` (V3 collapses to `*Cases`), `moveCollection`, `resetCollections`, `notifyAttributeChange`, `deleteDataContext`. Spot-check whether V2 plugins listen for the item-level variants; if so, V3 needs to either also emit `createItems` (etc.) or document the behavioral change.

### 3.4 Payload-field issues

| Operation | Issue | V3 location |
|---|---|---|
| `attributeChange` / `legendAttributeChange` | V2 always includes `axisOrientation`; V3 only includes it when `place` is not plot/legend | `v3/src/components/graph/models/graph-notification-utils.ts:26` |
| dataContextChangeNotice `createCases` payload | V2 `result` has `caseIDs`, `itemIDs`, `caseID`, `itemID` per case-handler. V3 has all four. ✓ | `v3/src/models/data/data-set-notifications.ts:93` |
| dataContextChangeNotice `selectCases` `result.cases` | V2 supplies full case objects with `parent`, `context`, `collection.parent`, `values`. V3 catalog claims `cases?` is conditional on diff state and `removedCases` is added. Verify the case-object shape inside includes V2's `parent`/`context`/`collection`/`values` keys. | `v3/src/models/data/data-set-notifications.ts:158` |

These are spot-checks — V3 has the right structure but the agents didn't enumerate every nested field. Worth a careful pass before declaring victory.

### 3.5 V2 bugs — V3 should NOT replicate

| V2 site | Bug |
|---|---|
| `apps/dg/components/graph_map_common/data_display_controller.js:941` | `type: dataDisplayModel.constructor.toString()` — emits the JS source of the constructor, not a type string. |
| `apps/dg/utilities/data_context_utilities.js:924` | `type: DG.CaseTable` — emits a class object, not a string. |
| `apps/dg/components/graph/plots/univariate_adornment_base_model.js:511` | Hardcoded `'toggle show outliers'` for the ICI toggle (should be a separate string). |
| `apps/dg/components/graph/plots/univariate_adornment_base_model.js:107` | `'toggle movable value'` op string emitted from a method named `togglePlottedCount` — copy-paste artifact. |

---

## 4. Log Findings

### 4.1 Compatible (event token + payload preserved)

These match well enough that V2 plugins matching `formatStr` on the leading word should keep working. Spot-check before declaring compatible.

| V2 / V3 event | V2 site → V3 site |
|---|---|
| `Calculator value cleared` | `calculator.js:92` → `v3/src/components/calculator/calculator.tsx:49` |
| `Calculation done: %@ = %@` | `calculator.js:155` → `calculator.tsx:108` |
| `Rescale axes from data` | `numeric_plot_model_mixin.js:135` → `v3/src/components/graph/components/graph-inspector.tsx:74` |
| `Show all cases` | `data_layer_model.js:688` (graph) + `map_model.js:597` (map) → `v3/src/components/graph/.../hide-show-menu-list.tsx:75` + `v3/src/components/map/.../hide-show-menu-list.tsx:74` |
| `Display only selected cases` | `data_layer_model.js:713` → `…/hide-show-menu-list.tsx:64` (graph) |
| `Hide %@ selected cases` | `data_layer_model.js:618` + `map_model.js:533` → `hide-show-menu-list.tsx:36` (graph) + `:52` (map) |
| `Hide unselected cases` (graph) | `data_layer_model.js:650` → `hide-show-menu-list.tsx:53` (graph) — **NB**: V2 emits the un-substituted form due to evaluation order; V3 matches V2's actual emission, not the V2 author's intent. |
| `Hide %@ unselected cases` (map) | `map_model.js:561` → `map/.../hide-show-menu-list.tsx:63` |
| `Map base layer changed: %@` | `map_view.js:202` → `map-base-layer-control.tsx:45` |
| `Made plot background <transparent/opaque>` | `graph_controller.js:836` → `point-format-palette.tsx:28` |
| `Changed background color` | `graph_controller.js:771` → `point-format-palette.tsx:37` |
| `Changed point color` / `Changed categorical point color` | `data_display_controller.js:380, :414` + `map_controller.js:293, :332` → `legend-color-controls.tsx:37, :47` |
| `Changed point size` | `data_display_controller.js:516` + `map_controller.js:491` → `point-size-slider.tsx:28` |
| `Show all hidden attributes` | `data_context_utilities.js:325` → `hide-show-menu-list.tsx:85` |
| `Moved category %@ into position of %@` | `cell_axis_view.js:194` + `categories_view.js:123` → `categorical-legend-model.ts:216` + `use-sub-axis.ts:152` |
| `dragBinBoundary from { alignment: %@, width: %@ } to { alignment: %@, width: %@ }` | `binned_plot_view.js:208` + `histogram_view.js:259` → `use-bin-boundary-drag.ts:94` |
| `dragMovableLine: '%@'` | `movable_line_adornment.js:79` → `movable-line-adornment-component.tsx:229, :325` |
| `laraData` | `main.js:312` → `cfm-log-utils.ts:7` |

### 4.2 Event-token renames (V2 plugins matching by `formatStr` will miss these)

| V2 token / format | V3 token / format | V3 site |
|---|---|---|
| `editValue: { collection: %@, case: %@, attribute: '%@', old: '%@', new: '%@' }` | `editCellValue: %@` (with stringified `{attrId, caseId, from, to}`) | `cell-text-editor.tsx:53`, `case-tile-utils.ts:189` |
| `Fit Column Width: {collection: %@, attribute: %@}` | `Fit column width: %@` (collection lowercased) | `attribute-menu-list.tsx:93` |
| `sort cases by attribute: %@ ("%@")` (lowercase 's') | `Sort cases by attribute: %@` (capital 'S', no `(name)`) | `data-set-undo.ts:414` |
| `resizeColumns: { dataContext: % }` (V2 has typo) | `Resize all columns` | `case-tile-inspector.tsx:49` |
| `insert %@ cases in table` (lowercase 'i') | `Create %@ cases in table` (different verb) | `use-rows.ts:310` |
| `Expand/Collapse all` | `Expand all` / `Collapse all` (split into two) | `collection-table-spacer.tsx:159` |
| `addAxisAttribute: { attribute: %@ }` | `Attribute assigned: %@` | `graph.tsx:274` |
| `attributeRemoved: { attribute: %@, axis: %@ }` | `Attribute removed: %@` | `graph.tsx:276, :301` |
| `dragStart: { lower: %@, upper: %@ }` | (no V3 equivalent for axis-drag start) | — |
| `dragEnd: { lower: %@, upper: %@ }` | `Axis domain change: lower: %@, upper: %@` | `numeric-axis-drag-rects.tsx:229` |
| `Edit attribute "%@"` | `Edit attribute: %@` (no quotes; colon prefix) | `edit-attribute-properties-modal.tsx:81` |
| `Hide attribute "%@"` | `Hide attribute %@` (no quotes) | `attribute-menu-list.tsx:180` |
| `Delete attribute "%@"` | `Delete attribute %@` (no quotes) | `attribute-menu-list.tsx:217` |
| `move attribute {attribute: "%@", position: %@}` | `Moved attribute %@ to %@ collection` (uses **attrId**, not name) | `data-set-utils.ts:106-130` |
| `Join attributes from "%@" to "%@"` (attribute-level) | `Joined %@ to %@` (collection-level) | `join-datasets.ts:113` |
| `createCollection {name: %@, attr: %@}` | `Create collection: name: %@, attribute: %@` | `case-table.tsx:165`, `case-card.tsx:55` |
| `Show webView: {title: "%@", url: "%@"}` (no space) | `Show web view: %@` (with space, no title) | `tool-shelf-utilities.tsx:18` |
| `Create caseTable component` / `Create graph component` / `Create text component` / `Create map component` / `Create slider component` | `Create component: %@` (single generic) | `tool-shelf.tsx:145` |
| `createNewEmptyDataSet` | `Create New Empty DataSet` (capital words, spaces) | `case-table-tool-shelf-button.tsx:90` |
| `openCaseTable: {name: "%@"}` | (no direct V3 equivalent) | — |
| `Show guide` | `Show guide page: %@` | `guide-button.tsx:37` |
| `addGame: {name: "%@", url: "%@"}` | (no direct V3 equivalent — V3 uses `Show web view`) | — |
| `Remove toggle component: %@` / `Add toggle component: %@` | (no V3 equivalent) | — |
| `Toggle case table to case card` / `Toggle case card to case table` | (no V3 equivalent) | — |
| `%@ component "%@"` (`Resized component "<title>"`/`Moved component "<title>"`) | `Resized component: %@` / `Moved component %@` (passes tileID/tileType, not title) | `use-tile-resize.ts:65`, `use-tile-drag.ts:119` |
| `marqueeToolSelect` | `marqueeToolSelect: %@` (V3 adds `: <mode>`) | `map-marquee-select-button.tsx:32` |
| `marqueeDrag: start` / `marqueeDrag: end` | (no V3 equivalent) | — |
| `changeGridMultiplier: %@` | (no V3 equivalent — V3 has `Map grid size changed`) | — |
| `Map grid size changed: {from: %@, to: %@}` | `Map grid size changed: %@` (only from-value substituted, since format has one `%@` slot) | `map-grid-slider.tsx:41` |
| `mapEvent: %@ at {center: %@, zoom: %@}` (V2 ops `pan`/`zoom`/`pan-and-zoom`) | `mapEvent: pan at %@` / `mapEvent: fitBounds at %@` (different ops; `fitBounds` is new) | `leaflet-map-state.ts:125, :145` |
| `togglePlotValue: %@` (`show`/`hide`) | (no atomic V3 equivalent — V3 uses generic adornment-checkbox `Added %@`/`Removed %@`) | `adornment-checkbox.tsx:36, :45` |
| `togglePlotted<What>: %@` (Count/Percent + show/hide) | `Show count`/`Hide count`/`Show percent`/`Hide percent` (split) | `count-adornment-registration.tsx:60, :69` |
| `toggleConnectingLine: %@` | `Show connecting lines` / `Hide connecting lines` | `adornments-store-utils.ts:137` |
| `toggleShowSquares: %@` | `Show squares of residuals` / `Hide squares of residuals` | `adornments-store-utils.ts:198` |
| `lockIntercept: %@` | `Lock line intercept` / `Unlock line intercept` | `adornments-store-utils.ts:166` |
| `toggleLSRL: %@` | `toggleLSRL %@` (no colon!) | `lsrl-adornment-registration.tsx:18-20` |
| `toggleMovablePoint: %@` / `toggleMovableLine: %@` / `togglePlotFunction: %@` | (V3 uses generic `Added %@`/`Removed %@` with adornment type) | `adornment-checkbox.tsx:36, :45` |
| `Added Movable Value` (Title Case) | `Added movable value` (lowercase) | `movable-value-adornment-registration.tsx:35` |
| `<iToggleLogString>` (`togglePlottedMean` etc.) | (V3 uses `Added %@`/`Removed %@`) | `adornment-checkbox.tsx:36, :45` |
| `graph.setNumStdErrs: %@` | `Set standard error to %@` | `standard-error-adornment-registration.tsx:43` |
| `graph.boxPlot.showOutliers` / `graph.boxPlot.showICI` | (no V3 equivalent — V3 uses generic adornment add/remove) | — |
| `Disable<Capability>` / `Enable<Capability>` (e.g. `EnableNumberToggle`, no spaces) | `Disable Number Toggle` / `Enable Number Toggle` (with spaces) | `hide-show-menu-list.tsx:108, :120` |
| `change %@ from %@ to %@` (lowercase 'c') | `Changed %@ from %@ to %@` (capital 'C', "ed") | `display-config-palette.tsx:180-182, :207-209, :237-239` |
| `Moved movable point from %@ to %@` | `Move point from (%@, %@) to (%@, %@)` | `movable-point-adornment-component.tsx:99-101` |
| `Moved movable value from %@ to %@` | `Moved value from %@ to %@` (drops "movable") | `movable-value-adornment-component.tsx:146` |
| `Moved equation from %@ to %@` | `Moved equation from (%@, %@) to (%@, %@)` (tuple format) | `movable-line-adornment-component.tsx:407-413`, `lsrl-adornment-component.tsx:367-370` |
| `dragMovableValue: '%@'` | `Moved value from %@ to %@` | `movable-value-adornment-component.tsx:146` |
| `Set quantilesAreLocked to <bool>` | `Set legend quantiles to be locked` / `unlocked` | `legend-color-controls.tsx:79` |
| `Made stroke color <same as fill/independent of fill>` | `Changed stroke color` | `display-item-format-control.tsx:58, :125` |
| `sliderEdit: { expression: '%@', result: %@ }` (V2: success/failure) | `sliderEdit: { expression: %@ = %@ }` (V3: name=value, no result) | `editable-slider-value.tsx:68` |
| `sliderThumbDrag: { "name": "%@", "newValue": %@ }` | `sliderThumbDrag: { name: %@ = value: %@ }` (different keys: `newValue` → `value`; quoting differs) | `slider-component.tsx:83` |
| `sliderMaxPerSecond: { "name": "%@", " restrictMultiplesOf to": "%@" }` (V2 used same token for two settings) | `sliderMultiplesOf: %@` (split) | `slider-settings-panel.tsx:56` |
| `sliderAnimationDirection: { "name": "%@", "to": "%@" }` | `sliderAnimationDirection: %@` (passes name + direction) | `slider-scales-panel.tsx:108` (from agent catalog) |
| `Change plotted function: "%@1" to "%@2"` | `Change plotted function: %@` (single slot) | `plotted-function-adornment-banner.tsx:46` |
| `Change plotted value: "%@1" to "%@2"` | `Change plotted value from %@ to %@` (different verb: `: "x" to "y"` vs `from x to y`) | `plotted-value-adornment-banner.tsx:43` |
| `Change bar chart function: "%@1" to "%@2"` | `Change computed bar length function: %@` | `bar-chart.tsx:216` |
| `attributeRemoved: { attribute: %@, axis: %@ }` | `Attribute removed: %@` (axis dropped) | `graph.tsx:276, :301` |
| `plotAxisAttributeChangeType: { axis: %@, attribute: %@, numeric: %@ }` | `plotAxisAttributeChangeType: %@` (only one slot — `axis` is substituted, attribute/numeric dropped from message but in args) | `graph.tsx:322` |
| `deleteSelectedCases: %@` | `Delete %@ cases` (different verb) | `data-set-undo.ts:353` |
| `selectAll` / `deselectAll` | (no V3 equivalent) | — |
| `caseSelected: %@` / `caseDeselected: %@` | (no V3 equivalent) | — |
| `caseSelected with values of: %@ between %@ and %@` | (no V3 equivalent) | — |
| `lineSelected: %@` / `lineDeselected: %@` | (no V3 equivalent) | — |
| `Show parent: %@` / `Hide all:` / `Show all:` | `Toggle parent group visibility` / `Hide all cases from parent toggles` / `Show all cases from parent toggles` | `parent-toggles.tsx:166, :175, :221` |
| `rescaleBarChart` / `rescaleBinnedPlot` / `rescaleDotPlot` / `rescaleScatterplot` | (collapsed to single `Rescale axes from data` — V3 emits this only on inspector button, not on programmatic rescales) | `graph-inspector.tsx:74` |
| `hoverOverGraphLine` / `hoverOverPlottedValue` | (no V3 equivalent) | — |
| `closeDocument: '%@'` / `confirmCloseDocument?` / `cancelCloseDocument` | (no V3 equivalent) | — |
| `validateDocument: removed case with duplicate ID: '%@'` | (no V3 equivalent) | — |
| `getContent: attempted to return invalid document!` | (no V3 equivalent) | — |
| `Shared document` / `Unshared document` | (no V3 equivalent) | — |
| `initGame: '%@', Collections: [%@]` | (no V3 equivalent — Game API replaced) | — |
| `deleteAllCaseData by Game` | `Delete all cases` (different wording, called from a different path) | `all-cases-handler.ts:15` |
| `newCollectionCreated: %@ ...` | (no V3 equivalent) | — |
| `sliderBeginAnimation: %@` / `sliderEndAnimation: %@` | (no V3 equivalent — V3 has no slider animation begin/end log) | — |
| `create new case` | (no V3 equivalent) | — |
| `Fit Column Width` | `Fit column width: %@` (lowercase 'c'/'w') | `attribute-menu-list.tsx:93` |
| `Resize one case table column` | `Resize one case table column` ✓ | `collection-table.tsx:226` |
| `Changed<end> attribute color` (V2 missing space due to bug) / `Changed <end> attribute color` (V2 with space) | `Changed attribute color` (V3 drops `<end>` entirely) | `legend-color-controls.tsx:58, :68` |

### 4.3 V3-only logs (V2 doesn't emit; informational)

These are fine — V3 adds info — but listing here so the audit is complete.

| V3 event | Notes |
|---|---|
| `Edited text component: <text>` | V2 explicitly disabled this in build 0601 (per code comment in `text_controller.js:158`). V3 logs the **full text content** in the event-name string. Privacy + size concern: long-form text appears in `event` server-side. Worth changing to put text in `args` only and use a fixed `event` like `editTextComponent`. |
| `Calculation error: %@ = %@` | V2 doesn't log calc errors. |
| `Calculation done: %@ = %@` is shared. | |
| `WebView initialized` | New. |
| `Add Plugin: %@` | New. |
| `Show web view: %@`, `Show guide page: %@`, `Show %@`, `Imported data set: %@`, `Delete dataset: %@`, `Change web view URL: %@` | New events for V3-specific UI. |
| `Restore set aside cases`, `Recover formula for attribute %@`, `Clear formula for attribute %@`, `Change row height`, `Change case card column width …` | New events. |
| `attributeCreate: %@` (vs `Create attribute: %@`) | Two events for the same logical action — one from inspector ruler menu, one from table header (see §4.4). |
| `update checkbox case: <id> state: <attr> to <checked|unchecked>` | New; entire payload is in event-name string (similar concern as `Edited text component`). |
| `Map base layer visibility changed: %@`, `Map layer changed: %@ %@`, `mapAction: showGrid`/`hideGrid`/`showPoints`/`hidePoints`/`showConnectingLines`/`hideConnectingLines`/`showPins`/`hidePins` | New map events (V2 has overlapping but not identical event set). |
| `Toggle parent group visibility`, `Hide all cases from parent toggles`, `Show all cases from parent toggles`, `Disable only showing last parent toggle`/`Enable …` | New phrasing for V2's `Show parent`/`Hide all`/`Show all`. |

### 4.4 V3 internal inconsistencies (worth fixing regardless of V2)

These are duplicates / asymmetries within V3 that the V2 review surfaced:

| Issue | Where | What |
|---|---|---|
| Two events for one user action: create attribute | `collection-table.tsx:247` (`Create attribute: %@`) vs `ruler-menu-list.tsx:44` (`attributeCreate: %@`) | Pick one. |
| `Hide unselected cases` differs between graph and map | graph: no count (`hide-show-menu-list.tsx:53`) vs map: with count (`map/.../hide-show-menu-list.tsx:63`) | V2 also had this asymmetry, but for a *different* reason (V2's graph variant is a bug — `data_layer_model.js:650`). V3 has unintentionally preserved the V2 bug rather than fixing it. |
| `Title changed to: %@` emitted from both generic and case-tile title bars | `component-title-bar.tsx:71` and `case-tile-title-bar.tsx:129` | Same event for different actions (component title vs DataSet title). V2 distinguishes (case-tile-card title is a dataset rename). |
| `Close component: %@` payload differs | `container.tsx:46` (`{tileType}`) vs `case-tile-title-bar.tsx:141` (`{type: toggleSuffix}`) | Same event, different keys. |
| Adornment-checkbox arg key differs | generic `adornment-checkbox.tsx:36` (`{type}`) vs box-plot `box-plot-adornment-registration.tsx:42` (`{adornmentType}`) | Same event format `Added %@`/`Removed %@`, different parameter keys. |
| `Changed %@ from %@ to %@` collides across binWidth, binAlignment, breakdownType | `display-config-palette.tsx:180-182, :207-209, :237-239` | Three different actions, one event-name format. V2 had distinct events. |
| `toggleShowAs: %@` collides | `display-config-palette.tsx:133` (plot type) and `:226` (BarChart/DotChart toggle) | Two distinct user actions, same event format. |
| `parentCaseId` leaked into event-name string | `collection-table-spacer.tsx:175` | Use stable event name + put id in args. |
| `marqueeSelection: <count>` has count baked into event | `background.tsx:166` | V2 also did this, but the agent flagged: log-server analytics bucket on event name. |
| `editCellValue: <whole stringified payload>` | `cell-text-editor.tsx:53` | Same — full payload in event name. Better to keep event = `editCellValue` and put payload in args. |
| `Show all cases` passes `args: { category: "data" }` | `hide-show-menu-list.tsx:75` | Looks like the dev meant to pass `category` as the third arg of `logMessageWithReplacement`; instead it ends up in `parameters`. |

---

## 5. Recommendations / Priority

Triage with the plugin team — many of these only matter if a plugin actually filters on the affected name. Suggested order:

### P0 — Known active breakage
1. Land PR #2566 (`commitEdit` fix) into `main`. Already underway.
2. Fix `titleChange` envelope: lift `type` from `values` to outer level (peer of `action`/`resource`) to match V2 (`tile-notifications.ts:7-15`).

### P1 — Operation-name renames in notifications
Most likely to break Story Builder / V2 plugins listening on specific operation strings. For each, decide: rename V3 to match V2, or document the change.
- `added background image` / `removed background image` → `backgroundImage` (V2)
- `background locked to axes` → `lockBackgroundImage` / `unlockBackgroundImage`
- `toggle between bars and dots` → `switch bar and dot`
- `toggle show connecting lines` → `toggle connecting line`
- `toggle intercept locked` → `toggle lock intercept`
- `toggle showSquares` → `toggle show squares`
- `toggle showing labels` → `<show/hide> measure labels`
- `toggle show as <camelCase>` → `toggle show as <PascalCase>`

### P2 — Missing notifications for areas with active V2 plugins
Highest-value if Story Builder uses any of these:
- Slider: emit `change slider value` on `component` resource (in addition to the global value change V3 already emits).
- Calculator: emit `calculate` on `component`.
- Case table: emit `open case table`, `edit formula`, `resize column`, `resize columns`, `expand/collapse all`.
- Graph adornments: emit `add movable value` / `remove movable value`, `<togglePlottedMean>` family, `setNumStdErrs`, `<show/hide> measure labels`, `toggle plotted value`, `toggle plotted Count/Percent`, `toggle movable point`, `toggle movable line`, `toggle LSRL`, `toggle plot function`, `drag movable point`, `drag movable line` (value), `reposition equation`, `edit plot formula`, `drag bin boundary`, `swap categories`, `change background color` (notification, in addition to log), `toggle background transparency` (notification).
- Document/undo: emit default `undo` / `redo` on `resource:'document'` for commands without explicit `undoNotification`/`redoNotification`.

### P3 — Log event-token renames
Decide policy. Easiest path: keep V3's improved wording but add a V2-compatibility alias log on the same paths. Hardest hits:
- `editValue` → `editCellValue` (Story Builder is highly likely to filter cell edits).
- `addAxisAttribute` → `Attribute assigned`.
- `attributeRemoved` → `Attribute removed`.
- `dragEnd` (axis) → `Axis domain change`.
- `togglePlotted<X>: hide/show` → `Show/Hide <x>`.
- `toggleConnectingLine`/`toggleShowSquares`/`lockIntercept`/`toggleLSRL` etc.
- `Edit attribute "X"`, `Hide attribute "X"`, `Delete attribute "X"` → no quotes (and `Edit` adds colon).
- `move attribute` (with name) → `Moved attribute` (with attrId — note the **id leak**, V3 should switch to attribute name).
- All the `Create <X> component` literals → `Create component: <X>`.

### P4 — Internal V3 cleanups (independent of V2)
- Reconcile `attributeCreate: %@` vs `Create attribute: %@`.
- Reconcile `Close component:` payload key (`tileType` vs `type`).
- Reconcile adornment-checkbox arg key (`type` vs `adornmentType`).
- Disambiguate `Changed %@ from %@ to %@` (binWidth / binAlignment / breakdownType).
- Disambiguate `toggleShowAs: %@` (plot-type vs bar/dot fuse).
- Move full text content out of `Edited text component:` event name into args.
- Move stringified payload out of `editCellValue:` event name into args.
- Fix `hide-show-menu-list.tsx:75` `Show all cases` `args` — the `{ category: "data" }` was probably intended as the third helper argument.
- Decide on graph/map symmetry for `Hide unselected cases` — V3 currently preserves V2's evaluation-order bug.

### P5 — V2 bugs to NOT replicate
If the team chooses to backfill missing operations, **don't** copy these V2 mistakes:
- `data_display_controller.js:941` `type: ctor.toString()`.
- `data_context_utilities.js:924` `type: DG.CaseTable` (class object).
- `univariate_adornment_base_model.js:511` `'toggle show outliers'` for ICI.
- `univariate_adornment_base_model.js:107` `'toggle movable value'` for togglePlottedCount.
- `case_table_controller.js:1135` `%` (missing `@`) in resizeColumns log.

---

## 6. Appendices

### 6.1 V2 notification operations (deduped, for cross-checking)

```
add 2nd axis attribute, add axis attribute, add movable value, attributeChange, backgroundImage,
calculate, change attribute color, change axis bounds, change background color, change base map,
change bin parameter, change column width, change grid size, change map coordinates,
change point color, change point size, change slider value, change <name> (dynamic),
clearRedo, clearUndo, commitEdit, create, create game controller, dataContextCountChanged,
dataContextDeleted, delete, displayOnlySelected, drag, drag bin boundary, drag movable line,
drag movable point, dragend, dragenter, dragleave, dragstart, drop, edit formula,
edit plot formula, edit text, expand/collapse all, hide, hide selected cases (map),
hide unselected cases (map), hideSelected, hideUnselected, join, legendAttributeChange,
lockBackgroundImage, move, newDocumentState, open case table, redo (default),
redoAction, remove movable value, reposition equation, rescaleGraph, resize, resize column,
resize columns, setNumStdErrs, show, show all cases (map), showAllCases, swap categories,
switch bar and dot, titleChange, toggle <iCapability>, toggle background transparency,
toggle between histogram and dots, toggle card to table, toggle connecting line,
toggle lock intercept, toggle LSRL, toggle minimize component, toggle movable line,
toggle movable point, toggle movable value, toggle plot function, toggle plotted <iWhat>,
toggle plotted value, toggle show as <logLabel>, toggle show outliers (used for ICI too — bug),
toggle show squares, toggle stroke same as fill, toggle table to card, <iToggleLogString>,
<show|hide> measure labels, unlockBackgroundImage, updateDocumentBegun, updateDocumentEnded,
undo (default), undoAction
```

### 6.2 V3 notification operations (deduped)

```
added background image, attributeChange, background locked to axes, change axis bounds,
change bar chart from <a> to <b>, change bin parameter, change formula, clearRedo, clearUndo,
create, createAttributes, createCases, createCollection, dataContextCountChanged,
dataContextDeleted, delete, deleteAttributes, deleteCases, deleteCollection, dependentCases,
drag, dragend, dragenter, dragleave, dragstart, drop, edit text, hideAttributes, hideSelected,
hideUnselected, legendAttributeChange, localeChanged, logMessageNotice (no op), move,
moveAttribute, moveCases, newDocumentState, redoAction, removed background image, rescaleGraph,
resize, selectCases, showAttributes, titleChange, toggle between bars and dots,
toggle intercept locked, toggle minimize component, toggle show as <plotType>,
toggle show connecting lines, toggle showSquares, toggle showing labels, tourUpdate,
unhideAttributes, undoAction, update, updateAttributes, updateCases, updateCollection,
updateDataContext, updateDocumentBegun, updateDocumentEnded
```

### 6.3 Verifying any specific finding

For notifications:
- **V2:** `git grep -nE "operation:\s*['\"]<op>['\"]" master -- apps/dg`
- **V3:** `grep -rEn "operation:\s*['\"]<op>['\"]\|['\"]<op>['\"]\s*[,)]" v3/src --include="*.ts" --include="*.tsx"`

For logs:
- **V2:** `git grep -n "<format-string>" master -- apps/dg`
- **V3:** `grep -rn "<format-string>" v3/src --include="*.ts" --include="*.tsx"`

(The repo's `git grep` glob `apps/dg/**/*.js` misbehaves; use plain `apps/dg` paths. Likewise `v3/src/**/*.ts` misbehaves; use `grep -rE`.)

### 6.4 Reference example

PR #2566 (CODAP-1306, branch `CODAP-1306-story-builder-moment-description`):
- V2 site: `apps/dg/components/text/text_controller.js:199` — `commitEditing()` emits `{operation:'commitEdit', type, id, title, text:JSON.stringify(theText||"")}`.
- V3 fix: `v3/src/components/text/text-tile.tsx:145` — emits `updateTileNotification("commitEdit", { title: tile?.title, text: JSON.stringify(textModel.value) }, tile)` instead of `("edit text", {}, tile)`.

The same reasoning applies to every entry in §3.2 / §3.3 / §4.2.
