# V2 ↔ V3 Plugin-Visible Event Compatibility Audit

**Date:** 2026-05-08
**Last verified:** 2026-09-23 against `main` @ `ec4aa83f4` (CODAP-1545). Findings below carry a
status marker; see the legend under "Status" for what each means.
**Scope:** Catalog every V2 user-analytics log and Data-Interactive notification, find each V3 counterpart, and flag every place where V3 either renames, drops, or reshapes information that V2 emitted. V3 may freely *add* fields; it must not silently *rename* or *remove* them. Adding/removing entire events is also flagged because plugins (Story Builder, etc.) listen for V2 events.

This was triggered by PR #2566 (CODAP-1306), which fixed one such drift: V3 was emitting a `notify`/`edit text`/`{}` envelope where V2 emits `commitEdit`/`{title,text}`. The audit looks for siblings.

**V2 source:** `master` branch, primarily `apps/dg/`.
**V3 source:** `main` branch, `v3/src/`.

---

## Status

Every finding in §3 and §4 carries one of these markers, applied during the 2026-09-23
re-verification (CODAP-1545):

| Marker | Meaning |
|---|---|
| **[RESOLVED]** | V3 now matches V2 (or the divergence was deliberately closed). The resolving story/PR is named. |
| **[OPEN]** | Still divergent on `main` @ `ec4aa83f4`. The covering story is named, or the row is marked *no story*. |
| **[VERIFIED OK]** | A spot-check the original audit asked for, since carried out and found compatible. No action. |
| **[CHANGED]** | V3 moved since 2026-05-08, but not to V2's form — the original row no longer describes the code. Re-triage needed. |

Stories filed from this audit on 2026-05-22: CODAP-1351 (graph), CODAP-1352 (map), CODAP-1353
(case table / calculator / slider / framing) — **all shipped**. CODAP-1354 (document undo/redo),
CODAP-1355 (log-token renames), CODAP-1356 (item-level `dataContextChangeNotice`) — **still To Do**.

---

## TL;DR

**Updated 2026-09-23 (CODAP-1545).** Most of what this audit originally found has since been
fixed. What follows is the current state; the original 2026-05-08 findings are preserved in the
per-event tables with status markers.

- **`commitEdit` — RESOLVED.** CODAP-1306 / PR #2566 landed. V3 emits `commitEdit` with
  `{title, text}`, matching V2, and additionally keeps `edit text` on every content-changing
  edit (`src/components/text/text-notifications.ts`).
- **`titleChange` envelope — RESOLVED**, but not as this audit recommended. The audit proposed
  lifting `type` out of `values`. V3 instead emits it at **both** levels and adds a `diType`
  field carrying the DI type name (`src/models/tiles/tile-notifications.ts:40-49`), so V2
  plugins reading `message.type` and V3-aware plugins reading `values.diType` both work. (§3.1)
- **Operation-name renames — 8 of 9 RESOLVED** by CODAP-1351/1352/1353: V3 now emits V2's
  strings for `backgroundImage`, `lockBackgroundImage`/`unlockBackgroundImage`, `switch bar and
  dot`, `toggle connecting line`, `toggle lock intercept`, `toggle show squares`, and
  `<show/hide> measure labels`. **Still open:** `toggle show as <PlotType>` — V2 emits
  PascalCase (`DotPlot`/`BinnedPlot`/`LinePlot`), V3 emits camelCase over a different value set
  (`dotPlot`/`binnedDotPlot`/`histogram`/`linePlot`/`scatterPlot`). **No story covers this.** (§3.2)
- **Missing notifications — nearly all RESOLVED.** Calculator `calculate`, case-card `change
  column width`, case-table `open case table`/`edit formula`/`resize column`/`resize
  columns`/`expand/collapse all`, slider `change slider value`, the full graph adornment and
  plot-toggle family, all the map operations, `join`, `hide`/`show` singleton, and `toggle table
  to card`/`toggle card to table` all now emit. **Still open:** default `undo`/`redo` on
  `resource:'document'` (CODAP-1354) and the item-level `dataContextChangeNotice` operations
  `createItems`/`updateItems`/`deleteItems`/`moveCollection`/`resetCollections`/
  `notifyAttributeChange`/`deleteDataContext` (CODAP-1356). (§3.3)
- **Log event-string renames — largely still OPEN** (CODAP-1355 has not started), with two
  exceptions worth noting:
  - **`editValue` — RESOLVED.** This was the audit's hardest-hit P3 item. V3 now emits V2's
    exact format, `editValue: { collection: %@, case: %@, attribute: '%@', old: '%@', new: '%@' }`
    (`cell-text-editor.tsx:53`). `editCellValue` survives only as an internal pending-log key and
    in undo/redo string keys — it is no longer an emitted token.
  - **`Edited text component` — RESOLVED.** The full text content is no longer embedded in the
    event name, closing the privacy/sizing concern (`text-tile.tsx:154`).
- **V2 bugs — confirmed NOT replicated.** V3's graph/plot notification code carries explicit
  comments naming each V2 bug site and why it is not copied
  (`src/components/graph/graph-notifications.ts:97-98, :151-155`). (§3.5)
- **One V3 behavior change to re-triage:** graph `Hide unselected cases` now emits the
  substituted form `Hide %@ unselected cases` with the count
  (`hide-show-menu-list.tsx:58`). The original audit recorded V3 as matching V2's actual
  (evaluation-order-bugged) unsubstituted emission. V3 is now *better* than V2 but no longer
  byte-identical to it, and graph/map are now symmetric. (§4.1, §4.4)

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
- The 2026-09-23 re-verification (CODAP-1545) located each §3 operation string as a live
  notification emission in `v3/src`, and reconciled §4 against the generated log-events
  dictionary (`.claude/skills/generate-log-events-csv/`) rather than by hand. It did not re-derive
  the V2 side; V2 citations are as recorded in 2026-05-08 unless a row says otherwise.

---

## 2. Cross-Reference Summary

Counts as originally measured (2026-05-08) alongside the state after re-verification
(2026-09-23). The notification picture changed substantially; the log picture did not, because
CODAP-1355 has not started.

### Notifications

| Bucket | 2026-05-08 | 2026-09-23 |
|---|---|---|
| V2 emits, V3 emits compatibly | ~28 | ~68 |
| V2 emits, V3 emits with **operation-name rename** | 9 | 1 (`toggle show as <PlotType>`) |
| V2 emits, V3 emits with **envelope-shape mismatch** | 1 (`titleChange`) | 0 |
| V2 emits, V3 emits with **resource mismatch** (slider routed through `global[<name>]` only) | 1 (`change slider value`) | 0 |
| V2 emits, V3 does NOT emit | ~40 (see §3.3) | ~8 — default `undo`/`redo` on `document` (CODAP-1354) + the 7 item-level `dataContextChangeNotice` ops (CODAP-1356) |
| V3 emits, no V2 equivalent (additions) | ~10 | ~15 (now also the legend-range/bin and point-shape notifications) |
| V2 emits with envelope/payload bugs (do NOT replicate) | 4 | 4 — confirmed not replicated (§3.5) |

### Logs

| Bucket | 2026-05-08 | 2026-09-23 |
|---|---|---|
| V2 emits, V3 emits compatibly (event token + payload preserved) | ~15 | ~17 (`editValue`, `Edited text component` joined) |
| V2 emits, V3 emits with **event-token rename** | ~30 | ~28 — unchanged apart from those two; CODAP-1355 |
| V2 emits, V3 emits with **payload-shape change** (different keys, different braces) | ~12 | ~11 |
| V2 emits, V3 does NOT emit | ~25 | ~25 |
| V3 emits, no V2 equivalent (additions) | ~30 | ~38 (143 events in code vs 135 in the dictionary) |

---

## 3. Notification Findings

### 3.1 Envelope-shape mismatch — `titleChange` — **[RESOLVED]** (CODAP-1353, `a5f076bbc`)

**V2** — `apps/dg/views/component_view.js:280-289` (verified):

```js
executeNotification: {
  action: 'notify',
  type: <componentType>,                // ← outer level
  resource: 'component[' + <id> + ']',
  values: { operation: 'titleChange', from, to }
}
```

**V3 as of 2026-05-08** — `v3/src/models/tiles/tile-notifications.ts:6-16`:

```ts
// resource: `component[${toV2Id(tile.id)}]`           ✓ matches V2
// values: { operation, id, type, from, to }           ✗ type INSIDE values, not outer
```

V2 plugins reading `message.type` saw `undefined`.

**V3 as of 2026-09-23** — `v3/src/models/tiles/tile-notifications.ts:40-49`:

```ts
values.operation = operation
values.id = toV2Id(tile.id)
values.type = v2Type          // V2's SC class name for operational ops
values.diType = diType        // additive: the DI type name, always present
// ...
if (isTitleChange) (result.message as any).type = v2SCType   // ← also at the outer level
```

**Resolved differently than this audit proposed.** The audit recommended *moving* `type` to the
outer level. V3 instead emits it in **both** places and adds `diType`, so V2 plugins reading
`message.type` work, plugins reading `values.type` keep working, and V3-aware plugins can read
the unambiguous `values.diType` without knowing V2's two naming conventions. The code documents
the reasoning inline (`tile-notifications.ts:14-20`).

### 3.2 Operation-name renames — **8 of 9 [RESOLVED]**, 1 **[OPEN]**

V3 emitted the right resource and the V2 fields, but the operation string itself differed.
CODAP-1351/1352/1353 renamed V3's strings to V2's in every case but one.

| V2 operation | V3 operation (2026-05-08) | Status (2026-09-23) | V3 file:line |
|---|---|---|---|
| `backgroundImage` (used for **add** at graph_controller.js:361 AND **remove** at :410) | `added background image` (add) / `removed background image` (remove) | **[RESOLVED]** CODAP-1351 — V3 now emits `backgroundImage` | `v3/src/components/graph/components/camera-menu-list.tsx` |
| `lockBackgroundImage` / `unlockBackgroundImage` | `background locked to axes` (with `to: "locked"`/`"unlocked"`) | **[RESOLVED]** CODAP-1351 | `v3/src/components/graph/components/camera-menu-list.tsx` |
| `switch bar and dot` | `toggle between bars and dots` | **[RESOLVED]** CODAP-1351 — V3 emits `switch bar and dot` for the dot/bar fuse and `toggle between histogram and dots` for the binned case | `…/display-config-palette.tsx:224` |
| `toggle connecting line` | `toggle show connecting lines` | **[RESOLVED]** CODAP-1351 | `…/adornments-store-utils.ts:134` |
| `toggle lock intercept` | `toggle intercept locked` | **[RESOLVED]** CODAP-1351 | `…/adornments-store-utils.ts:163` |
| `toggle show squares` | `toggle showSquares` | **[RESOLVED]** CODAP-1351 | `…/adornments-store-utils.ts:195` |
| `<show/hide> measure labels` (V2) | `toggle showing labels` | **[RESOLVED]** CODAP-1351 — V3 emits `show measure labels` / `hide measure labels` | `…/adornments-store-utils.ts:102` |
| `toggle show as <DotPlot/BinnedPlot/LinePlot>` (PascalCase, `graph_model.js:1262-1291` `logLabel`) | `toggle show as <dotPlot/binnedDotPlot/histogram/linePlot/scatterPlot>` (camelCase, different value set) | **[OPEN] — no story.** Unchanged; the operation is templated on V3's `plotType`. Decide whether to map V3 plot types to V2's `logLabel` values or document the change. | `…/display-config-palette.tsx:134` |
| `edit text` | should be `commitEdit` per V2 (`apps/dg/components/text/text_controller.js:199`) | **[RESOLVED]** CODAP-1306 / PR #2566 — V3 emits `commitEdit` with `{title, text}`, and additionally keeps `edit text` on every content-changing edit | `v3/src/components/text/text-notifications.ts:5-16` |

As of 2026-09-23 only the `toggle show as` value-set mismatch remains, and it has no story behind it.

### 3.3 V2 emits, V3 does not — by area — **nearly all [RESOLVED]**

These were V2 notifications with no V3 equivalent. CODAP-1351 (graph), CODAP-1352 (map) and
CODAP-1353 (case table / calculator / slider / framing / data context) backfilled almost all of
them. Verified 2026-09-23 by locating each operation string as a live `updateTileNotification`
emission in `v3/src`.

**[RESOLVED] — V3 now emits these**

| Area | Operations | V3 site |
|---|---|---|
| Calculator | `calculate` | `src/components/calculator/calculator-notifications.ts:10` |
| Case Card | `change column width` | `src/components/case-card/case-card-notifications.ts:11` |
| Case Table | `open case table`, `edit formula`, `resize column`, `resize columns`, `expand/collapse all` | `src/components/case-table/case-table-notifications.ts`; `src/components/common/edit-formula-notifications.ts:8` |
| Graph adornments / axes | `drag movable point`, `drag movable line`, `reposition equation`, `edit plot formula`, `swap categories` | `src/components/graph/graph-notifications.ts` |
| Graph controller | `add axis attribute`, `add 2nd axis attribute`, `change background color`, `toggle background transparency` | `src/components/graph/graph-notifications.ts:35` ff. |
| Graph plots | `toggle <iCapability>` (`toggle NumberToggle`, `toggle MeasuresForSelection`), `toggle between histogram and dots`, `drag bin boundary`, `toggle plotted value`, `toggle plotted <Count/Percent>`, `toggle movable point`, `toggle movable line`, `toggle LSRL`, `toggle plot function` | `src/components/graph/graph-notifications.ts`; per-adornment registration files |
| Graph univariate adornments | `add movable value`, `remove movable value`, `<iToggleLogString>` family, `setNumStdErrs`, `toggle show outliers` | `src/components/graph/graph-notifications.ts:151` ff. |
| Graph + Map common | `showAllCases`, `displayOnlySelected` | `src/components/graph/graph-notifications.ts:120, :128` |
| Map | `change point color`, `change <name>` (dynamic), `change attribute color`, `change point size`, `toggle stroke same as fill`, `change base map`, `change grid size`, `change map coordinates`, map-specific `hide selected cases` / `hide unselected cases` / `show all cases` | `src/components/map/map-notifications.ts`; `src/components/data-display/data-display-notifications.ts` |
| Slider | `change slider value` (component resource) | `src/components/slider/slider-notifications.ts:17` |
| Text | `commitEdit` | `src/components/text/text-notifications.ts:5` |
| Component framing | `hide` / `show` (singleton toggle), `toggle table to card` / `toggle card to table` | `src/components/case-tile-common/case-tile-notifications.ts:11-12` |
| Data context | `join` | `src/components/case-table/case-table-notifications.ts:58` — and V3 deliberately does **not** replicate V2's `type: DG.CaseTable` class-object bug (§3.5) |

**[OPEN] — still not emitted**

- **Default `undo` / `redo` on resource `document`** — `apps/dg/controllers/undo_history.js:159-165,
  204-210`. V3 still emits only `undoChangeNotice` (`src/models/document/create-document-model.ts:87,
  :94`; `src/data-interactive/handlers/undo-change-notice-handler.ts:30`). Plugins listening for
  `resource:'document'`, `operation:'undo'`/`'redo'` receive nothing. **Covered by CODAP-1354.**
- **Item-level `dataContextChangeNotice` operations** — V2 emits `createItems`, `updateItems`,
  `deleteItems`, `moveCollection`, `resetCollections`, `notifyAttributeChange` and
  `deleteDataContext`; none of these strings appears in `v3/src` (verified 2026-09-23). V3
  collapses the item-level variants into the `*Cases` operations. V3 does cover the common ops
  (`createCases`, `updateCases`, `deleteCases`, `selectCases`, `moveCases`, `dependentCases`,
  the `*Collection` and `*Attributes` families, `updateDataContext`). **Covered by CODAP-1356.**

### 3.4 Payload-field issues — 2 **[VERIFIED OK]**, 1 **[OPEN]**

| Operation | Issue | Status (2026-09-23) | V3 location |
|---|---|---|---|
| `attributeChange` / `legendAttributeChange` | V2 always includes `axisOrientation`; V3 only includes it when `place` is not plot/legend | **[OPEN] — no story.** Unchanged: `if (placeHasOrientation) values.axisOrientation = axisOrientation`. Decide whether to always include it or document the conditional. | `v3/src/components/graph/models/graph-notification-utils.ts:32-47` |
| dataContextChangeNotice `createCases` payload | V2 `result` has `caseIDs`, `itemIDs`, `caseID`, `itemID` per case-handler. V3 has all four. | **[VERIFIED OK]** | `v3/src/models/data/data-set-notifications.ts:93` |
| dataContextChangeNotice `selectCases` `result.cases` | V2 supplies full case objects with `parent`, `context`, `collection.parent`, `values`. Verify V3's case-object shape includes them. | **[VERIFIED OK]** — `convertCaseToV2FullCase` builds `context`, `parent`, `collection` (with `collection.parent`) and `values`. V3 additionally omits `cases` when empty (V2 expects `undefined`, not `[]`) and adds `removedCases` on extend. | `v3/src/data-interactive/data-interactive-type-utils.ts:41-69`, via `data-set-notifications.ts:158-198` |

The two spot-checks this section asked for have now been carried out and both pass. The
`axisOrientation` conditional is the only payload-shape divergence still outstanding.

### 3.5 V2 bugs — V3 should NOT replicate — **[VERIFIED OK]**

Confirmed 2026-09-23: V3 does not replicate any of these, and the graph notification code now
carries inline comments naming each V2 site and why it is not copied
(`src/components/graph/graph-notifications.ts:97-98, :151-155`). The `join` type-object bug is
likewise avoided (CODAP-1353, `82cd17c65`).

| V2 site | Bug |
|---|---|
| `apps/dg/components/graph_map_common/data_display_controller.js:941` | `type: dataDisplayModel.constructor.toString()` — emits the JS source of the constructor, not a type string. |
| `apps/dg/utilities/data_context_utilities.js:924` | `type: DG.CaseTable` — emits a class object, not a string. |
| `apps/dg/components/graph/plots/univariate_adornment_base_model.js:511` | Hardcoded `'toggle show outliers'` for the ICI toggle (should be a separate string). |
| `apps/dg/components/graph/plots/univariate_adornment_base_model.js:107` | `'toggle movable value'` op string emitted from a method named `togglePlottedCount` — copy-paste artifact. |

---

## 4. Log Findings

**Verification method (2026-09-23):** §4 was reconciled against the generated log-events
dictionary rather than by hand. `.claude/skills/generate-log-events-csv/` holds a deterministic
AST extractor over `v3/src`; its output was diffed against the V3 column below. CODAP-1355 covers
the §4.2 renames and has not started, so most rows here remain open as originally written — the
value of this pass is the verified current surface, plus the three rows that *did* move.

**Dictionary drift noted:** the committed `codap-v3-log-events.csv` is itself behind the code —
143 events in `v3/src` vs 135 in the CSV, 8 NEW and 0 REMOVED (the new ones come from the
residual-plot and legend/point-shape work). Regenerating it is the `generate-log-events-csv`
skill's own job, not this story's, but it should be done: the 8 new rows need Descriptions
authored.

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
| `Hide %@ unselected cases` (graph) | `data_layer_model.js:650` → `hide-show-menu-list.tsx:58` (graph) — **[CHANGED]** As of 2026-09-23 V3 emits the *substituted* form with the count, so it no longer mirrors V2's evaluation-order bug and graph now matches map. V3 is better than V2 here but no longer byte-identical; a V2 plugin matching the literal `Hide unselected cases` will miss it. **No story** — decide whether that is acceptable. |
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

### 4.2 Event-token renames (V2 plugins matching by `formatStr` will miss these) — **mostly [OPEN]**, covered by CODAP-1355

Verified 2026-09-23 against the extracted event list: 20 of the 23 checkable V3 tokens below are
still emitted exactly as recorded, so those rows stand as written. The exceptions are the first
two rows.

| V2 token / format | V3 token / format | V3 site |
|---|---|---|
| `editValue: { collection: %@, case: %@, attribute: '%@', old: '%@', new: '%@' }` | ~~`editCellValue: %@` (with stringified `{attrId, caseId, from, to}`)~~ — **[RESOLVED]** V3 now emits V2's exact format. `editCellValue` remains only as an internal `setPendingLogMessage` key and in undo/redo string keys; it is no longer an emitted token. This was the audit's hardest-hit P3 item. | `cell-text-editor.tsx:53`, `color-cell-text-editor.tsx:94` |
| `Fit Column Width: {collection: %@, attribute: %@}` | `Fit column width: %@` (collection lowercased) | `attribute-menu-list.tsx:93` |
| `sort cases by attribute: %@ ("%@")` (lowercase 's') | `Sort cases by attribute: %@` (capital 'S', no `(name)`) | `data-set-undo.ts:414` |
| `resizeColumns: { dataContext: % }` (V2 has typo) | `Resize all columns` | `case-tile-inspector.tsx:49` |
| `insert %@ cases in table` (lowercase 'i') | `Create %@ cases in table` (different verb) | `use-rows.ts:310` |
| `Expand/Collapse all` | `Expand all` / `Collapse all` — **[OPEN]** CODAP-1355. Still split into two, emitted via the template `%@ all` with `state` = `Expand`/`Collapse` | `collection-table-spacer.tsx:175` |
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
| `Edited text component` | **[RESOLVED]** V2 explicitly disabled this in build 0601 (per code comment in `text_controller.js:158`). V3 no longer embeds the text content in the event name (`text-tile.tsx:154`), closing the privacy/sizing concern. |
| `Calculation error: %@ = %@` | V2 doesn't log calc errors. |
| `Calculation done: %@ = %@` is shared. | |
| `WebView initialized` | New. |
| `Add Plugin: %@` | New. |
| `Show web view: %@`, `Show guide page: %@`, `Show %@`, `Imported data set: %@`, `Delete dataset: %@`, `Change web view URL: %@` | New events for V3-specific UI. |
| `Restore set aside cases`, `Recover formula for attribute %@`, `Clear formula for attribute %@`, `Change row height`, `Change case card column width …` | New events. |
| `attributeCreate: %@` (vs `Create attribute: %@`) | Two events for the same logical action — one from inspector ruler menu, one from table header (see §4.4). |
| `update checkbox case: <id> state: <attr> to <checked\|unchecked>` | New; entire payload is in event-name string (similar concern as `Edited text component`). |
| `Map base layer visibility changed: %@`, `Map layer changed: %@ %@`, `mapAction: showGrid`/`hideGrid`/`showPoints`/`hidePoints`/`showConnectingLines`/`hideConnectingLines`/`showPins`/`hidePins` | New map events (V2 has overlapping but not identical event set). |
| `Toggle parent group visibility`, `Hide all cases from parent toggles`, `Show all cases from parent toggles`, `Disable only showing last parent toggle`/`Enable …` | New phrasing for V2's `Show parent`/`Hide all`/`Show all`. |

### 4.4 V3 internal inconsistencies (worth fixing regardless of V2)

These are duplicates / asymmetries within V3 that the V2 review surfaced. **No story covers this
section** — it was P4 in §5 and nothing was filed from it. Four of the ten have since resolved
incidentally; the rest are unchanged.

| Issue | Where | What |
|---|---|---|
| Two events for one user action: create attribute | `collection-table.tsx:252` | **[RESOLVED]** Only `attributeCreate: %@` remains; `Create attribute: %@` is no longer emitted. |
| `Hide unselected cases` differs between graph and map | graph: `hide-show-menu-list.tsx:58` | **[RESOLVED]** Graph now emits `Hide %@ unselected cases` with the count, matching map. V3 no longer preserves V2's evaluation-order bug — but see §4.1: that also means V3 no longer matches V2's literal emission. |
| `Title changed to: %@` emitted from both generic and case-tile title bars | `component-title-bar.tsx:71` and `case-tile-title-bar.tsx:129` | Same event for different actions (component title vs DataSet title). V2 distinguishes (case-tile-card title is a dataset rename). |
| `Close component: %@` payload differs | `container.tsx:46` (`{tileType}`) vs `case-tile-title-bar.tsx:144` (`{type: toggleSuffix}`) | **[OPEN]** Unchanged. Same event, different keys. |
| Adornment-checkbox arg key differs | generic `adornment-checkbox.tsx:36` (`{type}`) vs box-plot `box-plot-adornment-registration.tsx:42` (`{adornmentType}`) | Same event format `Added %@`/`Removed %@`, different parameter keys. |
| `Changed %@ from %@ to %@` collides across binWidth, binAlignment, breakdownType | `display-config-palette.tsx` | **[RESOLVED]** The colliding format is no longer emitted anywhere in `v3/src`. |
| `toggleShowAs: %@` collides | `display-config-palette.tsx:133` (plot type) and `:226` (BarChart/DotChart toggle) | **[OPEN]** Unchanged. Two distinct user actions, same event format. |
| `parentCaseId` leaked into event-name string | `collection-table-spacer.tsx:175` | Use stable event name + put id in args. |
| `marqueeSelection: <count>` has count baked into event | `background.tsx:166` | V2 also did this, but the agent flagged: log-server analytics bucket on event name. |
| `editCellValue: <whole stringified payload>` | `cell-text-editor.tsx:53` | **[RESOLVED]** V3 now emits V2's structured `editValue: { … }` format instead (§4.2). |
| `Show all cases` passes `args: { category: "data" }` | `hide-show-menu-list.tsx:75` | Looks like the dev meant to pass `category` as the third arg of `logMessageWithReplacement`; instead it ends up in `parameters`. |

---

## 5. Recommendations / Priority

**Rewritten 2026-09-23 (CODAP-1545).** The original P0-P5 list has been superseded: P0, most of
P1 and nearly all of P2 shipped in CODAP-1351/1352/1353, and CODAP-1306 closed the `commitEdit`
item. What remains:

### Covered by an existing story

| Story | Covers | Status |
|---|---|---|
| **CODAP-1354** | Default `undo` / `redo` on `resource:'document'` (§3.3) | To Do |
| **CODAP-1355** | Log event-token renames (§4.2) — ~20 rows still divergent, `editValue` no longer among them | To Do |
| **CODAP-1356** | Item-level `dataContextChangeNotice` operations: `createItems`, `updateItems`, `deleteItems`, `moveCollection`, `resetCollections`, `notifyAttributeChange`, `deleteDataContext` (§3.3) | To Do |

### Open with no story — needs triage

These survived the backfill and nothing tracks them. Each needs a decision: match V2, or accept
and document the divergence.

1. **`toggle show as <PlotType>` value set** (§3.2). V2 emits PascalCase `DotPlot`/`BinnedPlot`/
   `LinePlot`; V3 emits camelCase over a wider set including `histogram` and `scatterPlot`. A V2
   plugin matching the operation string will never match V3's.
2. **`axisOrientation` conditional** (§3.4). V2 always includes it in `attributeChange` /
   `legendAttributeChange`; V3 omits it for plot and legend places.
3. **Graph `Hide unselected cases` no longer matches V2's literal emission** (§4.1, §4.4). V3
   now substitutes the count, which is the *correct* behavior and makes graph symmetric with
   map — but V2's actual (bugged) emission is the un-substituted string, so a V2 plugin matching
   it will miss. This is the one place where fixing a V2 bug created a new compatibility gap;
   worth an explicit decision rather than leaving it implicit.
4. **§4.4 internal inconsistencies** — the six rows still marked [OPEN]. Independent of V2;
   no story was ever filed from the original P4.

### Housekeeping

- **Regenerate `codap-v3-log-events.csv`.** The committed dictionary is behind the code (143
  events vs 135; 8 NEW, 0 REMOVED). The 8 new rows need Descriptions authored. This belongs to
  the `generate-log-events-csv` skill, not to a compatibility story.

### Preserved for reference: V2 bugs to NOT replicate

If further backfill happens, **don't** copy these V2 mistakes (all confirmed not replicated as of
2026-09-23, see §3.5):

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

> **Snapshot of 2026-05-08 — partly superseded.** CODAP-1351/1352/1353 renamed several of these
> to their V2 equivalents and added roughly forty more. The renames below are the ones that
> matter when reading this list:
> `added background image`/`removed background image` → `backgroundImage`;
> `background locked to axes` → `lockBackgroundImage`/`unlockBackgroundImage`;
> `toggle between bars and dots` → `switch bar and dot` (plus a new `toggle between histogram and dots`);
> `toggle show connecting lines` → `toggle connecting line`;
> `toggle intercept locked` → `toggle lock intercept`;
> `toggle showSquares` → `toggle show squares`;
> `toggle showing labels` → `show measure labels`/`hide measure labels`;
> `edit text` → still emitted, but `commitEdit` is now emitted alongside it.
> `toggle show as <plotType>` is unchanged and remains the one open rename (§3.2).
> To regenerate the current list, see §6.3.

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
