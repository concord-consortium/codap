# V2 ↔ V3 Plugin-Visible Event Compatibility Audit

**Date:** 2026-05-08
**Last verified:** 2026-09-24 against `main` @ `ec4aa83f4` (CODAP-1545, second review pass). Findings below carry a
status marker; see the legend under "Status" for what each means.
**Scope:** Catalog every V2 user-analytics log and Data-Interactive notification, find each V3 counterpart, and flag every place where V3 either renames, drops, or reshapes information that V2 emitted. V3 may freely *add* fields; it must not silently *rename* or *remove* them. Adding/removing entire events is also flagged because plugins (Story Builder, etc.) listen for V2 events.

This was triggered by PR #2566 (CODAP-1306), which fixed one such drift: V3 was emitting a `notify`/`edit text`/`{}` envelope where V2 emits `commitEdit`/`{title,text}`. The audit looks for siblings.

**V2 source:** `master` branch, primarily `apps/dg/`.
**V3 source:** `main` branch, `v3/src/`.

---

## Status

Findings whose status changed, or which were re-checked, carry a marker from the 2026-09-23/24
re-verification (CODAP-1545). Rows without a marker stand as recorded on 2026-05-08 and have not
been re-checked.

| Marker | Meaning |
|---|---|
| **[RESOLVED]** | V3 now matches V2 (or the divergence was deliberately closed). The resolving commit/story is named. |
| **[NOT A DIVERGENCE]** | The original 2026-05-08 finding was wrong — V2 and V3 already agreed. |
| **[OPEN]** | Still divergent on `main` @ `ec4aa83f4`. The covering story is named, or the row is marked *no story*. |
| **[VERIFIED OK]** | A spot-check the original audit asked for, since carried out and found compatible. No action. |
| **[PARTLY RESOLVED]** | Part of the concern is closed, part stands. The row says which. |

### Who fixed what

**`CODAP-1310` / PR #2592 (merged 2026-05-24) is the main resolving work.** That story
both produced this audit (`51cbbda75`) and then fixed most of what it found — 14 fixes across
notifications and log events. Its Jira scope comment is the fullest record of what it changed,
what it deliberately left alone, and which audit claims its V2 re-checks disproved — but it is not
infallible: its `axisOrientation` rationale is wrong (§3.4), and a correction has been added there.

| Story | Role | Status |
|---|---|---|
| **CODAP-1310** (#2592) | Produced this audit; fixed the titleChange envelope, all seven operation renames, `editValue`, `attributeCreate`, the title-change log, the lowercase `change … from … to …` log, graph hide-unselected count, and the V3-internal cleanups | Done |
| **CODAP-1306** (#2566) | `commitEdit` text-tile notification | Done |
| CODAP-1351 (FU-1) | Graph adornment/plot notification backfill | Done |
| CODAP-1352 (FU-2) | Map notification backfill (+ `numberHidden` on map hide-unselected for graph/map parity) | Done |
| CODAP-1353 (FU-3) | Case-table / calculator / slider / case-card notification backfill | Done |
| CODAP-1354 (FU-4) | Document `undo`/`redo` notifications on the `document` resource (HIGH risk) | **To Do** |
| CODAP-1355 (FU-5) | V2 log-event compatibility (token renames + payloads), incl. the adornment-log family and the `toggleShowAs` log value | **To Do** |
| CODAP-1356 (FU-6) | `dataContextChangeNotice` item-vs-case operations | **To Do** |

FU-1 through FU-6 were filed *from* CODAP-1310 on 2026-05-22, not from this audit directly.

### A caution about this document

Three times now, this document has asserted V2 behavior that V2 source does not support:

1. The original 2026-05-08 text (e.g. the `Hide unselected cases` "evaluation-order bug", the
   `toggle show as` camelCase claim, `axisOrientation` "always included").
2. The first pass of the 2026-09-23 refresh, which re-derived the V3 side but not the V2 side and
   so carried those forward.
3. The second pass, which replaced one wrong `axisOrientation` premise with another taken from
   CODAP-1310's Jira scope comment (§3.4).

Each time the cause was the same: **a claim about V2 was taken from a secondary source — this
audit, or a note about it — instead of from V2 source.** Every V2 claim corrected since is cited
to a V2 `file:line`. **Do not treat an uncited V2 claim here as verified**, including the ones in
CODAP-1310's scope comment.

CODAP-1310's governing principle still applies: V2 compatibility is the primary goal, and "no
surveyed consumer" must not be read as "no consumer".

## TL;DR

**Updated 2026-09-24 (CODAP-1545).** Almost everything this audit originally found has been
fixed, and several findings turned out never to have been real. Detail lives in the per-finding
rows of §3 and §4; this summary does not repeat it.

- **Notifications (§3): nearly closed.** The `titleChange` envelope, the eight real operation
  renames and the whole missing-notification backfill are resolved. Three gaps remain, each with
  a story: default `undo`/`redo` on the `document` resource (**CODAP-1354**), the item-level
  `dataContextChangeNotice` operations (**CODAP-1356**), and the `attributeChange` /
  `legendAttributeChange` routing (**CODAP-1546**, §3.4).
- **Logs (§4): mostly still open**, covered by **CODAP-1355**, which has not started.
  `editValue`, `attributeCreate`, the title-change log, the lowercase `change … from … to …`
  log and the graph hide-unselected count are already fixed (all CODAP-1310).
- **Three findings were never divergences.** V2 re-checks show V2 and V3 already agreed on
  `toggle show as <PlotType>` (both PascalCase), on graph `Hide unselected cases` (V2 logs the
  count — there is no evaluation-order bug), and on `attributeCreate` (V2 emits it too). Two
  §4.4 "hygiene" rows are the same story: V3's `%@ case %@` and `marqueeSelection: %@` match V2
  exactly, so "fixing" them would *create* divergence.
- **Nothing is left without a story**, but not because everything dissolved. Of the three
  untracked divergences an earlier refresh claimed, two were errors (§3.2, §4.1). The third —
  `attributeChange` / `legendAttributeChange` — is real, and bigger than first recorded: the two
  operation names are **swapped** for legend-menu changes and plot-area drops. Now filed as
  **CODAP-1546** (§3.4).
- **V2 bugs are not replicated** (§3.5), confirmed in code.

Remaining work is CODAP-1354, CODAP-1355, CODAP-1356 and CODAP-1546, plus four §4.4
V3-internal collisions that have no story and are independent of V2.

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
- The 2026-09-23/24 re-verification (CODAP-1545) located each §3 operation string as a live
  notification emission in `v3/src`, and reconciled §4 against the generated log-events
  dictionary (`.claude/skills/generate-log-events-csv/`) rather than by hand. Its **first pass
  re-derived only the V3 side**, which carried forward several wrong V2 claims from 2026-05-08;
  those were caught in review and the V2 side has since been re-derived for every finding whose
  status changed. V2 claims corrected in this pass cite a V2 `file:line`.

---

## 2. Cross-Reference Summary

Counts as originally measured (2026-05-08) alongside the state after re-verification
(2026-09-24). The notification picture changed substantially; the log picture did not, because
CODAP-1355 has not started. Both columns are estimates — the `~` figures were never derived by
exhaustive count, in either pass. The exact figures are the ones without a `~`.

### Notifications

| Bucket | 2026-05-08 | 2026-09-24 |
|---|---|---|
| V2 emits, V3 emits compatibly | ~28 | ~68 |
| V2 emits, V3 emits with **operation-name rename** | 9 | 2 — the 8 renames are resolved and the 9th (`toggle show as`) was never divergent, but `attributeChange` and `legendAttributeChange` are swapped in two paths (CODAP-1546, §3.4) |
| V2 emits, V3 emits with **envelope-shape mismatch** | 1 (`titleChange`) | 0 |
| V2 emits, V3 emits with **resource mismatch** (slider routed through `global[<name>]` only) | 1 (`change slider value`) | 0 |
| V2 emits, V3 does NOT emit | ~40 (see §3.3) | 2 — `undo` and `redo` on `document` (CODAP-1354). The item-level ops (CODAP-1356) are counted separately: most are handled by V2's `performChange` but never reach a plugin (§3.3). |
| V3 emits, no V2 equivalent (additions) | ~10 | ~15 (now also the legend-range/bin and point-shape notifications) |
| V2 emits with envelope/payload bugs (do NOT replicate) | 4 | 5 — confirmed not replicated; a fifth (`case_table_controller.js:1135`) was folded in from the old §5 (§3.5) |

### Logs

| Bucket | 2026-05-08 | 2026-09-24 |
|---|---|---|
| V2 emits, V3 emits compatibly (event token + payload preserved) | ~15 | ~18 — `editValue`, `attributeCreate` and the title-change log joined |
| V2 emits, V3 emits with **event-token rename** | ~30 | ~27 — CODAP-1355. Only the rows spot-checked in §4.2 were re-verified. |
| V2 emits, V3 emits with **payload-shape change** (different keys, different braces) | ~12 | ~11 — `Close component` unified on `{tileType}` (CODAP-1310 `105c9bd64`); the rest were not re-counted |
| V2 emits, V3 does NOT emit | ~25 | ~25 |
| V3 emits, no V2 equivalent (additions) | ~30 | ~37 — net of removing `attributeCreate`, which V2 also emits (§4.3), and adding the 8 events new since May (143 in code vs 135 in the dictionary) |

---

## 3. Notification Findings

### 3.1 Envelope-shape mismatch — `titleChange` — **[RESOLVED]** (CODAP-1310, `6ee29b8de`)

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

The envelope fix itself is CODAP-1310 (`6ee29b8de`, "add type to outer envelope for titleChange
notification"). CODAP-1353 (`a5f076bbc`) later changed which value that field carries and added
`diType`.

### 3.2 Operation-name renames — 8 **[RESOLVED]**, 1 **[NOT A DIVERGENCE]**

V3 emitted the right resource and the V2 fields, but eight of these nine operation strings
differed. CODAP-1310 (`7a1b143fb`, `13a06d038`, `c46d14e9f`) renamed seven of them to V2's;
CODAP-1306 (#2566) fixed the eighth, `commitEdit`. The ninth, `toggle show as`, was never a
divergence at all.

| V2 operation | V3 operation (2026-05-08) | Status | V3 file:line |
|---|---|---|---|
| `backgroundImage` (add at `graph_controller.js:361`, remove at `:410`) | `added background image` / `removed background image` | **[RESOLVED]** CODAP-1310 `7a1b143fb` — V3 emits `backgroundImage`, keeping the add/remove distinction in `to` | `components/graph/components/camera-menu-list.tsx` |
| `lockBackgroundImage` / `unlockBackgroundImage` | `background locked to axes` | **[RESOLVED]** CODAP-1310 `7a1b143fb` | `…/camera-menu-list.tsx` |
| `switch bar and dot` | `toggle between bars and dots` | **[RESOLVED]** CODAP-1310 `13a06d038` — V3 emits `switch bar and dot` for the dot/bar fuse and `toggle between histogram and dots` for the binned case | `…/inspector-panel/display-config-palette.tsx:224` |
| `toggle connecting line` | `toggle show connecting lines` | **[RESOLVED]** CODAP-1310 `c46d14e9f` | `…/adornments-store-utils.ts:134` |
| `toggle lock intercept` | `toggle intercept locked` | **[RESOLVED]** CODAP-1310 `c46d14e9f` | `…/adornments-store-utils.ts:163` |
| `toggle show squares` | `toggle showSquares` | **[RESOLVED]** CODAP-1310 `c46d14e9f` | `…/adornments-store-utils.ts:195` |
| `<show/hide> measure labels` | `toggle showing labels` | **[RESOLVED]** CODAP-1310 `c46d14e9f` — V3 emits `show measure labels` / `hide measure labels` | `…/adornments-store-utils.ts:102` |
| `toggle show as <DotPlot/BinnedPlot/LinePlot>` (`graph_model.js:1262-1291`, `logLabel`) | *claimed* camelCase over a different value set | **[NOT A DIVERGENCE]** — the 2026-05-08 finding was wrong. V3 derives the PascalCase strings `"BinnedPlot"`/`"LinePlot"`/`"DotPlot"` in a **local const** (`display-config-palette.tsx:109-110`) and emits `` `toggle show as ${plotType}` `` (`:134`), the only emission site. The camelCase values in the original finding come from `PlotTypes`, the `as const` array of model plot types (`graphing-types.ts:40-52`, with `type PlotType` at `:53`) — not an enum, and not used by this notification. CODAP-1310 recorded the same correction and deliberately made no change. | `…/display-config-palette.tsx:109-134` |
| `commitEdit` (`text_controller.js:199`) | `edit text` with `{}` | **[RESOLVED]** CODAP-1306 / #2566 — V3 emits `commitEdit` with `{title, text}`, and additionally keeps `edit text` on every content-changing edit | `components/text/text-notifications.ts:5-16` |

### 3.3 V2 emits, V3 does not — by area — **nearly all [RESOLVED]**

These were V2 notifications with no V3 equivalent. CODAP-1310 added four of them directly
(`edit formula`, `togglePlottedMean`/`Median`, `toggle between histogram and dots`, `toggle table
to card` / `toggle card to table`); the three backfill follow-ups filed from it — CODAP-1351
(graph), CODAP-1352 (map) and CODAP-1353 (case table / calculator / slider / case card) — covered
the rest. Verified 2026-09-23 by locating each operation string as a live `updateTileNotification`
emission in `v3/src`.

**[RESOLVED] — V3 now emits these**

| Area | Operations | V3 site |
|---|---|---|
| Calculator | `calculate` | `src/components/calculator/calculator-notifications.ts:10` |
| Case Card | `change column width` | `src/components/case-card/case-card-notifications.ts:11` |
| Case Table | `open case table`, `edit formula`, `resize column`, `resize columns`, `expand/collapse all` | `src/components/case-table/case-table-notifications.ts`; `src/components/common/edit-formula-notifications.ts:8` |
| Graph adornments / axes | `drag movable point`, `drag movable line`, `reposition equation`, `edit plot formula`; `swap categories` | `src/components/graph/graph-notifications.ts`; `src/components/data-display/data-display-notifications.ts` |
| Graph controller | `add axis attribute`, `add 2nd axis attribute`, `change background color`, `toggle background transparency` | `src/components/graph/graph-notifications.ts:35` ff. |
| Graph plots | `toggle <iCapability>` (`toggle NumberToggle`, `toggle MeasuresForSelection`), `toggle between histogram and dots`, `drag bin boundary`, `toggle plotted value`, `toggle plotted <Count/Percent>`, `toggle movable point`, `toggle movable line`, `toggle LSRL`, `toggle plot function` | `src/components/graph/graph-notifications.ts`; per-adornment registration files |
| Graph univariate adornments | `add movable value`, `remove movable value`, `<iToggleLogString>` family, `setNumStdErrs`, `toggle show outliers` | `src/components/graph/graph-notifications.ts:151` ff. |
| Graph + Map common | `showAllCases`, `displayOnlySelected` | `src/components/graph/graph-notifications.ts:120, :128` |
| Map | `change point color`, `change <name>` (dynamic), `change attribute color`, `change point size`, `toggle stroke same as fill`, `change base map`, `change grid size`, `change map coordinates`, map-specific `hide selected cases` / `hide unselected cases` / `show all cases` | `src/components/map/map-notifications.ts`; `src/components/data-display/data-display-notifications.ts` |
| Slider | `change slider value` (component resource) | `src/components/slider/slider-notifications.ts:17` |
| Text | `commitEdit` | `src/components/text/text-notifications.ts:5` |
| Component framing | `hide` / `show` (singleton toggle) via `componentShowHideNotification`; `toggle table to card` / `toggle card to table` | `src/models/tiles/tile-notifications.ts:86`; `src/components/case-tile-common/case-tile-notifications.ts:11-12` |
| Data context | `join` | `src/components/case-table/case-table-notifications.ts:58` — and V3 deliberately does **not** replicate V2's `type: DG.CaseTable` class-object bug (§3.5) |

**[OPEN] — still not emitted**

- **Default `undo` / `redo` on resource `document`** — `apps/dg/controllers/undo_history.js:159-165,
  204-210`. V3 still emits only `undoChangeNotice` (`src/models/document/create-document-model.ts:87,
  :94`; `src/data-interactive/handlers/undo-change-notice-handler.ts:30`). Plugins listening for
  `resource:'document'`, `operation:'undo'`/`'redo'` receive nothing. **Covered by CODAP-1354.**
- **Item-level `dataContextChangeNotice` operations** — none of these strings appears in
  `v3/src` (verified 2026-09-23); V3 collapses the item-level variants into the `*Cases`
  operations. V3 does cover the common ops (`createCases`, `updateCases`, `deleteCases`,
  `selectCases`, `moveCases`, `dependentCases`, the `*Collection` and `*Attributes` families,
  `updateDataContext`). **Covered by CODAP-1356 — but that story's scope needs narrowing first.**

  **"Handled by `performChange`" is not the same as "sent to a plugin."** V2 forwards a change
  only when `iChange.result.success` is truthy
  (`apps/dg/components/data_interactive/notification_manager.js:156`). Several item-level handlers
  never set it, so V2 plugins never receive those operations either — and V3 owes them nothing.

  | V2 operation | Handled by `performChange` | Actually reaches a plugin? |
  |---|---|---|
  | `createItems` | yes | not verified |
  | `updateItems` | yes | not verified |
  | `moveItems` | yes (`doMoveItems`, `data_context.js:888`) | **no** — returns nothing, so no `success` |
  | `deleteItems` | yes (`doDeleteItems`, `:919`) | **no** — returns `{deletedCaseIDs, deletedItemIDs}` with no `success`. But it internally calls `applyChange({operation: 'deleteCases', …})` (`:927`), so a plugin deleting items receives a **`deleteCases`** notice — which V3 also emits. |
  | `resetCollections` | yes (`doResetCollections`, `:2109`) | **no** — returns nothing |
  | `deleteDataContext` | yes (`:564`) | not verified |

  So the real gap is smaller than six operations, and for `deleteItems` it may be nil. CODAP-1356
  should start by establishing which of these a V2 plugin can actually observe.

  *Correction (2026-09-24):* earlier versions of this row listed `moveCollection` and
  `notifyAttributeChange`. Neither string exists anywhere in V2 (`git grep` on `master`: 0 hits),
  and `moveItems` — which does exist — was missing.

### 3.4 Payload-field issues — 2 **[VERIFIED OK]**, 1 **[OPEN]**

| Operation | Issue | Status | V3 location |
|---|---|---|---|
| `attributeChange` / `legendAttributeChange` | V3 picks between the two operations differently from V2, and reports different `axisOrientation` values for the top and right axes | **[OPEN] — CODAP-1546.** Larger than the 2026-05-08 finding, whose premise was also wrong: see the table below. | `graph.tsx:271`; `graph-notification-utils.ts:9-17` |
| dataContextChangeNotice `createCases` payload | V2 `result` has `caseIDs`, `itemIDs`, `caseID`, `itemID` per case-handler. V3 has all four. | **[VERIFIED OK]** | `v3/src/models/data/data-set-notifications.ts:93` |
| dataContextChangeNotice `selectCases` `result.cases` | V2 supplies full case objects with `parent`, `context`, `collection.parent`, `values`. Verify V3's case-object shape includes them. | **[VERIFIED OK]** — `convertCaseToV2FullCase` builds `context`, `parent`, `collection` (with `collection.parent`) and `values`. V3 additionally omits `cases` when empty (V2 expects `undefined`, not `[]`) and adds `removedCases` on extend. | `v3/src/data-interactive/data-interactive-type-utils.ts:41-69`, via `data-set-notifications.ts:158-198` |

#### `attributeChange` / `legendAttributeChange` — the finding in full

**The operation names are swapped in two user actions.** A V2 plugin listening for
`attributeChange` never sees a V3 legend-menu change; one listening for `legendAttributeChange`
never sees a V3 plot-area drop. That is the same class of break as the §3.2 renames. The
orientation-value differences matter only to plugins that branch on the value.

| User action | V2 | V3 | |
|---|---|---|---|
| Drop on bottom/left axis | `attributeChange`, `'horizontal'`/`'vertical'` | same | ✓ |
| Drop on **top** axis | `attributeChange`, `'top'` | `attributeChange`, `'horizontal'` | ✗ |
| Drop on **right** (categorical) axis | `attributeChange`, `'right'` | `attributeChange`, `'vertical'` | ✗ |
| **Legend attribute-menu** change/remove | `attributeChange`, `axisOrientation: 'none'` | `legendAttributeChange`, no key | ✗ |
| Drop on legend | `legendAttributeChange`, no key | same | ✓ |
| Drop on **plot area** | `legendAttributeChange`, no key | `attributeChange`, no key | ✗ |

V2 sources: axis drops emit `attributeChange` with `axisOrientation: iAxis.get('orientation')`
(`graph_controller.js:553`); axis views carry `kHorizontal`/`kVertical`/`kVertical2`/`kTop`/`kRight`
(`graph_view.js:346-356`) and `EOrientation` defines `kTop: 'top'`, `kRight: 'right'`,
`kNone: 'none'` (`graph_types.js:41-48`). Plot **and** legend drops share one handler,
`plotOrLegendViewDidAcceptDrop` (`graph_map_common/data_display_controller.js:928`), always
emitting `legendAttributeChange` with no `axisOrientation`. The attribute menu emits
`attributeChange` with `axisOrientation: iMenu.selectedAxis` (`data_display_controller.js:846,
:852-866`), where `selectedAxis = iAxisView.get('orientation')` (`:753`, assigned `:802`); for a
legend that view is `DG.LegendView`, orientation `kNone` (`graph_map_common/legend/legend_view.js:51`).

V3 sources: `graph.tsx:271` routes solely on `place === "legend"`;
`graph-notification-utils.ts:9-17` maps `"top" → "horizontal"` and `"rightCat" → "vertical"` and
omits the key for `plot` and `legend`.

**Two wrong premises preceded this.** The 2026-05-08 audit said "V2 always includes
`axisOrientation`" — it does not; the plot/legend drop path sends no key. CODAP-1310 then recorded
the row as intentionally not fixed because "V2 itself emits `axisOrientation: undefined` for a
legend" — V2 emits the string `'none'`. Neither premise had been checked against V2 source, and
the operation-name swap was invisible under both. Filed as **CODAP-1546**.

**Adjacent, and checked: `yPlus` / `rightNumeric` do *not* diverge.** V3 short-circuits these two
places to `add axis attribute` / `add 2nd axis attribute` (`graph.tsx:269-270`) before the routing
above, while still computing `axisOrientation` into their values, so they looked like candidates
for the same problem. They are not. V2 emits both operations with a bare
`{operation, type}` payload and nothing else — `multiTargetDidAcceptDrop`
(`graph_controller.js:619-625`) and `y2AxisDidAcceptDrop` (`:688-694`). The latter computes
`iY2Axis.get('orientation')` inside `execute()` for the model change, but never puts it in the
notification, so **V2 never exposes `'vertical2'` to a plugin**. V3 sends V2's two fields plus
`attributeId`/`attributeName`/`plotType`/`primaryAxis`/`axisOrientation`, which §1.3 permits
("V3 may add fields; renaming is breaking"). The operation names match V2's two paths. Out of
scope for CODAP-1546.

*Minor, V3-only:* V3 reports `axisOrientation: "vertical"` for `rightNumeric`
(`graph-notification-utils.ts:15`), where V2's model calls that axis `'vertical2'`. No V2 plugin
can see this, since V2 omits the field here; it affects only the accuracy of V3's own added field
for a V3-aware consumer.

### 3.5 V2 bugs — V3 should NOT replicate — **[VERIFIED OK]**

Confirmed 2026-09-23: V3 replicates none of these. The graph notification code carries inline
comments for the two univariate-adornment bugs, naming the V2 site and why it is not copied
(`src/components/graph/graph-notifications.ts:97-98, :151-155`); the other sites are simply not
reproduced. The `join` type-object bug is likewise avoided (CODAP-1353, `82cd17c65`).

This is the canonical list; §5 refers here rather than repeating it.

| V2 site | Bug |
|---|---|
| `apps/dg/components/graph_map_common/data_display_controller.js:941` | `type: dataDisplayModel.constructor.toString()` — emits the JS source of the constructor, not a type string. |
| `apps/dg/utilities/data_context_utilities.js:924` | `type: DG.CaseTable` — emits a class object, not a string. |
| `apps/dg/components/graph/plots/univariate_adornment_base_model.js:511` | Hardcoded `'toggle show outliers'` for the ICI toggle (should be a separate string). |
| `apps/dg/components/graph/plots/univariate_adornment_base_model.js:107` | `'toggle movable value'` op string emitted from a method named `togglePlottedCount` — copy-paste artifact. |
| `apps/dg/components/case_table/case_table_controller.js:1135` | `"resizeColumns: { dataContext: % }".fmt(dataContext)` — `%` is missing its `@`, so the value is never substituted. (Was listed only in the original §5; folded in here 2026-09-24.) |

---

## 4. Log Findings

**Verification method and its limits (2026-09-24):** `.claude/skills/generate-log-events-csv/`
holds a deterministic AST extractor over `v3/src`. Its output was used to spot-check **23 V3
tokens from §4.2** and the rows corrected in §4.3/§4.4 — it was **not** diffed row-by-row across
all of §4.1-§4.3, so most of this chapter has not been re-verified. CODAP-1355 covers the §4.2
renames and has not started, so those rows were expected to stand as written, and they do. Rows
without a status marker are as recorded on 2026-05-08, `file:line` citations included.

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
| `Hide %@ unselected cases` (graph) | `data_layer_model.js:663` → `hide-show-menu-list.tsx:58` (graph) — **[RESOLVED]** CODAP-1310 `f2a9bf67b` added the count **to match V2**. *There is no evaluation-order bug:* V2's `execute()` overwrites `this.log` with `"Hide %@ unselected cases".fmt(tUnselected.length)` (`data_layer_model.js:663`), and `UndoHistory.execute` runs the command (`undo_history.js:73`) before `_logAction` reads `command.log` (`:113`). The static `log: "Hide unselected cases"` is only a placeholder. V2 and V3 both emit the with-count form, and graph matches map. This is the canonical entry for this finding. |
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

Verified 2026-09-23/24 against the extracted event list. Of 23 V3 tokens spot-checked, 20 are
still emitted exactly as recorded and those rows stand as written. The three exceptions:

- `editCellValue: %@` — **genuinely resolved**; V3 now emits V2's `editValue: { … }` (row below).
- `Expand all` / `Collapse all` — **not a change**. The extractor reports the unsubstituted
  template `%@ all` (`collection-table-spacer.tsx:175`, `state` = `Expand`/`Collapse`), so at
  runtime V3 still emits the two split forms the row records. The row stands.

Two further rows were corrected from other evidence rather than this spot-check: the
`change %@ from %@ to %@` row (CODAP-1310 renamed V3 to V2's lowercase form) and, in §4.3,
`attributeCreate`.

The table has ~57 rows with a V3 token, so **rows outside the 23 spot-checked have not been
re-verified**; treat them as recorded on 2026-05-08. That applies to their `file:line` citations
too — line numbers drift, and only the rows touched in this pass had theirs refreshed. Use the
§6.3 recipe to locate a token rather than trusting an unverified line number.

| V2 token / format | V3 token / format | V3 site |
|---|---|---|
| `editValue: { collection: %@, case: %@, attribute: '%@', old: '%@', new: '%@' }` | ~~`editCellValue: %@` (with stringified `{attrId, caseId, from, to}`)~~ — **[RESOLVED]** CODAP-1310 `4f6f8a764` — V3 emits V2's **event-string format**. `editCellValue` survives only as an internal `setPendingLogMessage` key and in undo/redo string keys; it is no longer an emitted token. *Caveat:* the `case` and `attribute` slots are filled with raw V3 ids (`row.__id__`, `column.key`), not the V2-style numeric ids a plugin receives from the DI API, so a consumer parsing the ids out still sees different values. | `cell-text-editor.tsx:53-55`, `color-cell-text-editor.tsx:94` |
| `Fit Column Width: {collection: %@, attribute: %@}` | `Fit column width: %@` (collection lowercased) | `attribute-menu-list.tsx:96` |
| `sort cases by attribute: %@ ("%@")` (lowercase 's') | `Sort cases by attribute: %@` (capital 'S', no `(name)`) | `data-set-undo.ts:414` |
| `resizeColumns: { dataContext: % }` (V2 has typo) | `Resize all columns` | `case-tile-inspector.tsx:51` |
| `insert %@ cases in table` (lowercase 'i') | `Create %@ cases in table` (different verb) | `use-rows.ts:310` |
| `Expand/Collapse all` | `Expand all` / `Collapse all` — **[OPEN]** CODAP-1355. Still split into two, emitted via the template `%@ all` with `state` = `Expand`/`Collapse` | `collection-table-spacer.tsx:175` |
| `addAxisAttribute: { attribute: %@ }` | `Attribute assigned: %@` | `graph.tsx:288` |
| `attributeRemoved: { attribute: %@, axis: %@ }` | `Attribute removed: %@` | `graph.tsx:288, :315` |
| `dragStart: { lower: %@, upper: %@ }` | (no V3 equivalent for axis-drag start) | — |
| `dragEnd: { lower: %@, upper: %@ }` | `Axis domain change: lower: %@, upper: %@` | `numeric-axis-drag-rects.tsx:229` |
| `Edit attribute "%@"` | `Edit attribute: %@` (no quotes; colon prefix) | `edit-attribute-properties-modal.tsx:81` |
| `Hide attribute "%@"` | `Hide attribute %@` (no quotes) | `attribute-menu-list.tsx:183` |
| `Delete attribute "%@"` | `Delete attribute %@` (no quotes) | `attribute-menu-list.tsx:220` |
| `move attribute {attribute: "%@", position: %@}` | `Moved attribute %@ to %@ collection` (uses **attrId**, not name) | `data-set-utils.ts:106-130` |
| `Join attributes from "%@" to "%@"` (attribute-level) | `Joined %@ to %@` (collection-level) | `join-datasets.ts:113` |
| `createCollection {name: %@, attr: %@}` | `Create collection: name: %@, attribute: %@` | `case-table.tsx:165`, `case-card.tsx:55` |
| `Show webView: {title: "%@", url: "%@"}` (no space) | `Show web view: %@` (with space, no title) | `tool-shelf-utilities.tsx:18` |
| `Create caseTable component` / `Create graph component` / `Create text component` / `Create map component` / `Create slider component` | `Create component: %@` (single generic) | `tool-shelf.tsx:175` |
| `createNewEmptyDataSet` | `Create New Empty DataSet` (capital words, spaces) | `case-table-tool-shelf-button.tsx:124` |
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
| `change %@ from %@ to %@` (lowercase 'c') | ~~`Changed %@ from %@ to %@` (capital 'C', "ed")~~ — **[RESOLVED]** CODAP-1310 `6bd5ca5b9` renamed V3 to V2's lowercase form and unified the arg keys. The V3-internal collision across three actions remains (§4.4), but the V2 mismatch is gone. | `display-config-palette.tsx:181, :208, :244` |
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
| `Resize one case table column` | `Resize one case table column` ✓ | `collection-table.tsx:226` |
| `Changed<end> attribute color` (V2 missing space due to bug) / `Changed <end> attribute color` (V2 with space) | `Changed attribute color` (V3 drops `<end>` entirely) | `legend-color-controls.tsx:58, :68` |

### 4.3 V3-only logs (V2 doesn't emit; informational)

These are fine — V3 adds info — but listing here so the audit is complete.

| V3 event | Notes |
|---|---|
| `Edited text component` | **[PARTLY RESOLVED]** V2 explicitly disabled this in build 0601 (per code comment in `text_controller.js:158`). CODAP-1310 `32dbfa743` moved the text out of the event name (`text-tile.tsx:154`), which fixes the **sizing and analytics-bucketing** half. The text is still sent to the log server, now in `args.text`, so the **privacy** concern stands. |
| `Calculation error: %@ = %@` | V2 doesn't log calc errors. |
| `Calculation done: %@ = %@` is shared. | |
| `WebView initialized` | New. |
| `Add Plugin: %@` | New. |
| `Show web view: %@`, `Show guide page: %@`, `Show %@`, `Imported data set: %@`, `Delete dataset: %@`, `Change web view URL: %@` | New events for V3-specific UI. |
| `Restore set aside cases`, `Recover formula for attribute %@`, `Clear formula for attribute %@`, `Change row height`, `Change case card column width …` | New events. |
| `attributeCreate: %@` | **[NOT A DIVERGENCE]** — this row was wrong. V2 emits `attributeCreate` too, from `case_table_controller.js:816` and `data_context_utilities.js:859-860`, so it is not a V3-only event. (`case_table_controller.js:843` assigns an unused local in `undo()`, and `analytics.js:32` is a `case` label — neither emits.) CODAP-1310 `fcf5ab350` standardized both V3 sites on V2's token and dropped `Create attribute: %@`. See §4.4. |
| `update checkbox case: <id> state: <attr> to <checked\|unchecked>` | New; entire payload is in event-name string (similar concern as `Edited text component`). |
| `Map base layer visibility changed: %@`, `Map layer changed: %@ %@`, `mapAction: showGrid`/`hideGrid`/`showPoints`/`hidePoints`/`showConnectingLines`/`hideConnectingLines`/`showPins`/`hidePins` | New map events (V2 has overlapping but not identical event set). |
| `Toggle parent group visibility`, `Hide all cases from parent toggles`, `Show all cases from parent toggles`, `Disable only showing last parent toggle`/`Enable …` | New phrasing for V2's `Show parent`/`Hide all`/`Show all`. |

### 4.4 V3 internal inconsistencies (worth fixing regardless of V2)

These are duplicates / asymmetries within V3 that the V2 review surfaced. **No story covers this
section.** Of the 11 rows, CODAP-1310 fixed 5 directly and determined that 2 more were never
problems — V3 already matched V2, so "fixing" them would have *created* divergence. **4 remain
open**; all are V3-internal collisions, independent of V2 compatibility.

| Issue | Where | What |
|---|---|---|
| Two events for one user action: create attribute | `collection-table.tsx:252` | **[RESOLVED]** CODAP-1310 `fcf5ab350` standardized both sites on V2's `attributeCreate` token; `Create attribute: %@` is no longer emitted (§4.3). |
| `Hide unselected cases` differs between graph and map | graph: `hide-show-menu-list.tsx:58` | **[RESOLVED]** CODAP-1310 `f2a9bf67b` — graph now emits the with-count form, matching both map and V2. There was no evaluation-order bug; see §4.1 for the canonical entry. |
| `Change title '%@' to '%@'` emitted from both generic and case-tile title bars | `component-title-bar.tsx:71` and `case-tile-title-bar.tsx:132` | **[OPEN]** The recorded token `Title changed to: %@` no longer exists — CODAP-1310 `a9860c955` changed both sites to V2's `Change title '%@' to '%@'`. The original row also assumed V2 distinguishes a dataset rename; it does not. The two V3 sites still emit the same event for different actions, so the collision stands. |
| `Close component: %@` payload differs | `container.tsx:46`, `case-tile-title-bar.tsx:144` | **[RESOLVED]** CODAP-1310 `105c9bd64` — both sites now pass `{tileType}`. |
| Adornment-checkbox arg key differs | generic `adornment-checkbox.tsx:43, :53` (`{type}`) vs box-plot `box-plot-adornment-registration.tsx:52, :61` (`{adornmentType}`) | **[OPEN]** Same event format `Added %@`/`Removed %@`, different parameter keys. |
| `change %@ from %@ to %@` collides across binWidth, binAlignment, breakdownType | `display-config-palette.tsx:181, :208, :244` | **[OPEN] — no story.** CODAP-1310 `6bd5ca5b9` renamed V3's `Changed …` to V2's lowercase `change %@ from %@ to %@` and unified the arg keys, so the **V2 mismatch is resolved**. The V3-internal collision remains: three distinct actions still share one event format, as they do in V2. |
| `toggleShowAs: %@` collides | `display-config-palette.tsx:133` (plot type) and `:232` (BarChart/DotChart toggle) | **[OPEN]** Unchanged. Two distinct user actions, same event format. |
| `parentCaseId` in the event-name string | `collection-table-spacer.tsx:191` | **[NOT A DIVERGENCE]** V3 emits `%@ case %@`, exactly matching V2 (`relation_divider_view.js:358`). CODAP-1310 declined this cleanup (former Task 19) because it would have diverged from V2. |
| `marqueeSelection: <count>` has count baked into event | `background.tsx:168` | **[NOT A DIVERGENCE]** V3 emits `marqueeSelection: %@`, matching V2 (`plot_background_view.js:248`). CODAP-1310 declined this cleanup (former Task 20) for the same reason. |
| `editCellValue: <whole stringified payload>` | `cell-text-editor.tsx:53` | **[RESOLVED]** CODAP-1310 `4f6f8a764` — V3 now emits V2's structured `editValue: { … }` format instead (§4.2). |
| `Show all cases` passes `args: { category: "data" }` | `hide-show-menu-list.tsx:77` | **[RESOLVED]** CODAP-1310 `3946d3d10` — now `{message: "Show all cases", args: {}, category: "data"}`. |

---

## 5. Recommendations / Priority

**Rewritten 2026-09-24 (CODAP-1545).** The original priority list is superseded — see "Who fixed
what" in the Status section for which story closed what. This section names only what is left, and
points at the canonical row for each rather than restating findings.

### Covered by an existing story

| Story | Covers | Status |
|---|---|---|
| **CODAP-1354** | Default `undo` / `redo` on `resource:'document'` (§3.3) | To Do |
| **CODAP-1355** | Log event-token renames (§4.2), incl. the adornment-log family and the `toggleShowAs` log value | To Do |
| **CODAP-1356** | Item-level `dataContextChangeNotice` operations (§3.3) — scope needs narrowing, see that row | To Do |
| **CODAP-1546** | `attributeChange` / `legendAttributeChange` routing and `axisOrientation` values (§3.4) | To Do |

### Open with no story

Four V3-internal collisions in §4.4, all independent of V2 compatibility:

1. `Change title '%@' to '%@'` — emitted by both the generic and case-tile title bars for
   different actions.
2. `change %@ from %@ to %@` — shared across binWidth, binAlignment and breakdownType.
3. `toggleShowAs: %@` — shared by the plot-type and BarChart/DotChart toggles.
4. The adornment-checkbox arg key (`{type}` vs `{adornmentType}`) on the same `Added %@` /
   `Removed %@` format.

Worth a single cleanup story if anyone wants V3's own log vocabulary to be self-consistent — but
note CODAP-1310's principle: never "improve" a V3 event into divergence from V2. Collisions 2 and
3 exist in V2 as well, so changing the event strings would break V2 compatibility; only the
arg-key and payload shapes are safe to touch.

**No outstanding V2-compatibility divergence lacks a story.** An earlier draft of this refresh
claimed three untracked ones: two were errors (§3.2, §4.1) and the third is real and now tracked
as CODAP-1546 (§3.4).

### Housekeeping

- **Regenerate `codap-v3-log-events.csv`.** The committed dictionary is behind the code (143
  events vs 135; 8 NEW, 0 REMOVED). The 8 new rows need Descriptions authored. This belongs to
  the `generate-log-events-csv` skill, not to a compatibility story.

### V2 bugs to NOT replicate

See §3.5 for the canonical list and confirmation that V3 replicates none of them.

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

> **Snapshot of 2026-05-08 — partly superseded.** CODAP-1310 renamed several of these to their
> V2 equivalents (`7a1b143fb`, `13a06d038`, `c46d14e9f`), and CODAP-1351/1352/1353 added roughly
> forty more. The renames below are the ones that
> matter when reading this list:
> `added background image`/`removed background image` → `backgroundImage`;
> `background locked to axes` → `lockBackgroundImage`/`unlockBackgroundImage`;
> `toggle between bars and dots` → `switch bar and dot` (plus a new `toggle between histogram and dots`);
> `toggle show connecting lines` → `toggle connecting line`;
> `toggle intercept locked` → `toggle lock intercept`;
> `toggle showSquares` → `toggle show squares`;
> `toggle showing labels` → `show measure labels`/`hide measure labels`;
> `edit text` → still emitted, but `commitEdit` is now emitted alongside it.
> `toggle show as <plotType>` was never divergent — V3 already emits V2's PascalCase values (§3.2).
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
- **V3:** `grep -rEn "operation:\s*['\"]<op>['\"]|['\"]<op>['\"]\s*[,)]" v3/src --include="*.ts" --include="*.tsx"`

For logs:
- **V2:** `git grep -n "<format-string>" master -- apps/dg`
- **V3:** `grep -rn "<format-string>" v3/src --include="*.ts" --include="*.tsx"`

(The repo's `git grep` glob `apps/dg/**/*.js` misbehaves; use plain `apps/dg` paths. Likewise `v3/src/**/*.ts` misbehaves; use `grep -rE`.)

### 6.4 Reference example

PR #2566 (CODAP-1306), merged:
- V2 site: `apps/dg/components/text/text_controller.js:199` — `commitEditing()` emits `{operation:'commitEdit', type, id, title, text:JSON.stringify(theText||"")}`.
- V3 fix: `v3/src/components/text/text-notifications.ts:5-11` — `commitEditNotification` emits `updateTileNotification("commitEdit", { title: tile.title, text: JSON.stringify(textModel.value) }, tile)`. V3 emits this **in addition to** `edit text` (`text-notifications.ts:13-16`, fired on every content-changing edit at `text-tile.tsx:135`; the `commitEdit` notify is at `:158`), not instead of it.

The same reasoning applies to every entry in §3.2 / §3.3 / §4.2.
