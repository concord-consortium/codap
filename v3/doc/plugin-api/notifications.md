# Notifications

> **Applies to:** CODAP v3 · **Verified:** 2026-10-09
> · Parts of this page are generated — see [conventions](conventions.md).

A notification is a message CODAP sends your plugin without being asked, because something
changed: a user dragged an attribute onto a graph, deleted a case, renamed a component. This page
catalogs them.

The tables are generated from CODAP's source — both the operation names and what each
notification carries — so they do not drift from it. Two operations are assembled at the moment
they are sent rather than named in the code; those are described in words where they occur.

It is the opposite direction from the `notify` **action**, which a plugin sends *to* CODAP to ask
for something. Those are documented on each resource's own page.

## Receiving them

A notification arrives through the same channel as a reply to your own request. Register a handler
once, at startup:

```js
codapInterface.on("notify", "*", handleNotification)
```

There is no subscription call for most notifications: CODAP sends them to every connected plugin
that is eligible to receive them. Three things narrow that:

- **Opting in.** [`document`](resources/document.md) state requires `subscribeToDocuments`, and
  log messages require registering a [`logMessageMonitor`](resources/interactive-api.md).
- **Exclusion.** A component notification is not sent back to the plugin that caused it.
- **Targeting.** `undoAction` and `redoAction` go only to the plugin whose own tile changed, not
  to every listener.

**Whether you hear your own change.** A notification about a *component* excludes the plugin that
made it, so a plugin does not echo its own component work back to itself. A notification about
*data* — attributes, cases, the selection — goes to every listener, including the one that made
the change.

## The envelope

Every notification carries `action: "notify"` and a `resource` naming what changed. Almost all
then name the change in `values.operation`:

```json
{
  "action": "notify",
  "resource": "dataContextChangeNotice[Mammals]",
  "values": { "operation": "createCases", "result": { "...": "operation-specific" } }
}
```

**Log messages are the exception.** A `logMessageNotice` has no `operation`; it carries the log
event itself:

```json
{
  "action": "notify",
  "resource": "logMessageNotice",
  "values": { "message": "...", "formatStr": "...", "topic": "..." }
}
```

So branch on `resource` first, and only then on `values.operation`.

`resource` belongs to one of these families, each a section below:

| Resource | What it reports |
|---|---|
| `dataContextChangeNotice[<context>]` | the data in one context changed |
| `component` | a component was created, removed or reconfigured |
| `dragDrop[attribute]` | the user is dragging an attribute |
| `undoChangeNotice` | something was undone or redone, or the undo history was cleared |
| `document` | document state, for plugins that asked for it |
| `documentChangeNotice`, `global`, `logMessageNotice`, `interactiveFrame` | one notification each — see [Everything else](#everything-else) |

## Data changes — `dataContextChangeNotice[<context>]`

Sent when the data in a context changes. The bracketed name is the data context's name, so a
plugin watching one data set can filter on it.

<!-- BEGIN GENERATED: notifications-data -->
| Operation | `values` carries |
|---|---|
| `createAttributes` | _not readable from the call site_ |
| `createCases` | _not readable from the call site_ |
| `createCollection` | _not readable from the call site_ |
| `deleteAttributes` | _not readable from the call site_ |
| `deleteCases` | _not readable from the call site_ |
| `deleteCollection` | _not readable from the call site_ |
| `dependentCases` | _not readable from the call site_ |
| `hideAttributes` | _not readable from the call site_ |
| `moveAttribute` | _not readable from the call site_ |
| `moveCases` | _not readable from the call site_ |
| `selectCases` | _not readable from the call site_ |
| `updateAttributes` | _not readable from the call site_ |
| `updateCases` | _not readable from the call site_ |
| `updateCollection` | _not readable from the call site_ |
| `updateDataContext` | _not readable from the call site_ |
<!-- END GENERATED: notifications-data -->

| Operation | Fires when |
|---|---|
| `createAttributes` | attributes are added |
| `updateAttributes` | an attribute's properties change |
| `deleteAttributes` | attributes are removed |
| `moveAttribute` | an attribute changes position |
| `hideAttributes` | attributes are hidden. The emitting helper takes the operation as a defaulted argument, so a caller can send a different name |
| `createCases` | cases are added |
| `updateCases` | case values change |
| `deleteCases` | cases are removed |
| `moveCases` | cases are reordered |
| `dependentCases` | cases change as a consequence of another change, such as a formula recalculating |
| `selectCases` | the selection changes, by user or by plugin |
| `createCollection` | a collection is added |
| `updateCollection` | a collection's properties change |
| `deleteCollection` | a collection is removed |
| `updateDataContext` | the context's own properties change — title, metadata |
| `dataContextCountChanged` | a data context is created or deleted anywhere in the document |
| `dataContextDeleted` | a data context is deleted |

The last two arrive on `documentChangeNotice` rather than a named context, since there is no
context left to name.

## Component changes — `component`

Sent when a component is created, removed, or reconfigured — mostly by the user working in a
component's inspector panel. A plugin that wants to mirror what the user is doing to a graph
listens here.

<!-- BEGIN GENERATED: notifications-component -->
| Operation | Raised by | `values` carries |
|---|---|---|
| `add 2nd axis attribute` | graph | _not readable from the call site_ |
| `add axis attribute` | graph | _not readable from the call site_ |
| `add movable value` | graph | — |
| `attributeChange` | graph | _not readable from the call site_ |
| `backgroundImage` | graph | `to` |
| `calculate` | calculator | — |
| `change attribute color` | data display | `color`, `end` |
| `change axis bounds` | axis | _not readable from the call site_ |
| `change background color` | graph | `to` |
| `change base map` | map | `to` |
| `change bin parameter` | graph | — |
| `change changePointColor` | data display | `color` |
| `change changeStrokeColor` | data display | `color` |
| `change column width` | case card | — |
| `change formula` | graph | — |
| `change grid size` | map | `from`, `to` |
| `change legend bin count` | data display | `binCount` |
| `change legend bins type` | data display | `binningType` |
| `change legend range` | data display | `max`, `min` |
| `change map coordinates` | map | `center`, `zoom` |
| `change point color` | data display | `category`, `color` |
| `change point shape` | data display | `category`, `shape` |
| `change point size` | data display | `to` |
| `change slider value` | slider | _not readable from the call site_ |
| `commitEdit` | text | `text`, `title` |
| `create` | lifecycle | — |
| `delete` | lifecycle | _not readable from the call site_ |
| `displayOnlySelected` | graph | — |
| `drag bin boundary` | graph | _not readable from the call site_ |
| `drag movable line` | graph | — |
| `drag movable point` | graph | — |
| `drag movable value` | graph | — |
| `edit formula` | formula | — |
| `edit plot formula` | graph | `adornment`, `from`, `to` |
| `edit text` | text | — |
| `expand/collapse all` | case table | _not readable from the call site_ |
| `hide` | lifecycle | — |
| `hide measure labels` | graph | _not readable from the call site_ |
| `hide selected cases` | map | `numberHidden` |
| `hide unselected cases` | map | `numberHidden` |
| `hideSelected` | graph | `numberHidden` |
| `hideUnselected` | graph | `numberHidden` |
| `join` | case table | — |
| `legendAttributeChange` | graph | _not readable from the call site_ |
| `lockBackgroundImage` | graph | — |
| `move` | container | — |
| `open case table` | case table | — |
| `remove movable value` | graph | — |
| `reposition equation` | graph | `adornment` |
| `rescaleGraph` | graph | — |
| `resize` | container | — |
| `resize column` | case table | — |
| `resize columns` | case table | — |
| `setNumStdErrs` | graph | `to` |
| `show` | lifecycle | — |
| `show all cases` | map | — |
| `show measure labels` | graph | _not readable from the call site_ |
| `showAllCases` | graph | — |
| `swap categories` | data display | `place` |
| `switch bar and dot` | graph | `to` |
| `titleChange` | other | `from`, `to` |
| `toggle LSRL` | graph | `isChecked` |
| `toggle MeasuresForSelection` | graph | `to` |
| `toggle NumberToggle` | graph | `to` |
| `toggle background transparency` | graph | `to` |
| `toggle between histogram and dots` | graph | `to` |
| `toggle card to table` | case table | — |
| `toggle connecting line` | graph | _not readable from the call site_ |
| `toggle lock intercept` | graph | _not readable from the call site_ |
| `toggle minimize component` | container | — |
| `toggle movable line` | graph | _not readable from the call site_ |
| `toggle movable point` | graph | _not readable from the call site_ |
| `toggle plot function` | graph | _not readable from the call site_ |
| `toggle plotted Count` | graph | `isChecked` |
| `toggle plotted Percent` | graph | `isChecked` |
| `toggle plotted value` | graph | _not readable from the call site_ |
| `toggle show ICI` | graph | `isChecked` |
| `toggle show outliers` | graph | `isChecked` |
| `toggle show residual plot` | graph | _not readable from the call site_ |
| `toggle show squares` | graph | _not readable from the call site_ |
| `toggle stroke same as fill` | data display | `isChecked` |
| `toggle table to card` | case table | — |
| `togglePlottedBoxPlot` | graph | `isChecked` |
| `togglePlottedMad` | graph | _not readable from the call site_ |
| `togglePlottedMean` | graph | _not readable from the call site_ |
| `togglePlottedMedian` | graph | _not readable from the call site_ |
| `togglePlottedNormal` | graph | _not readable from the call site_ |
| `togglePlottedStDev` | graph | _not readable from the call site_ |
| `togglePlottedStErr` | graph | _not readable from the call site_ |
| `unlockBackgroundImage` | graph | — |
| `update` | other | _not readable from the call site_ |
<!-- END GENERATED: notifications-component -->

Each carries the component's `id`, its v2 `type`, and `diType` — the same type vocabulary
[`component`](resources/component.md) uses. Most also carry the resulting value, so a plugin can
see the new state without asking for it.

### Lifecycle

| Operation | Fires when |
|---|---|
| `create` | a component is created |
| `delete` | a component is removed. **Also sent when a component is only hidden** |
| `titleChange` | a component is renamed. Sent on `component[<id>]` rather than `component` |
| `hide`, `show` | a singleton component is hidden or revealed |
| `move`, `resize` | the user moves or resizes a component |
| `update` | a component's properties are changed through the API. Echoes the values from the request |
| `toggle minimize component` | the user minimizes or restores a component |

### Graph

The largest group. Most fire from the graph's inspector panel.

| Operation | Fires when |
|---|---|
| `add axis attribute` | an attribute is dropped on the y-axis "+" target |
| `add 2nd axis attribute` | an attribute is dropped on the right-hand numeric axis |
| `attributeChange` | an axis attribute is replaced |
| `legendAttributeChange` | the legend attribute changes |
| `change background color`, `toggle background transparency` | the plot background changes |
| `add movable value`, `remove movable value`, `drag movable value` | movable values are added, removed or dragged |
| `drag movable point` | the user finishes dragging the movable point |
| `drag movable line` | the user finishes dragging the movable line. v2 sent nothing here, so this is new in v3 |
| `toggle connecting line`, `toggle show squares`, `toggle show residual plot`, `toggle lock intercept` | adornments are toggled |
| `toggle show outliers`, `setNumStdErrs` | the box-plot outlier or standard-error settings change |
| `toggle show ICI` | the informal confidence interval is toggled. New in v3 — v2 sent `toggle show outliers` for this, which was a v2 bug |
| `togglePlottedMean`, `togglePlottedMedian`, `togglePlottedStDev`, `togglePlottedStErr`, `togglePlottedMad`, `togglePlottedNormal` | a univariate measure adornment is switched on or off |
| `toggle movable line`, `toggle movable point`, `toggle plot function`, `toggle plotted value` | the matching adornment is switched on or off |
| `toggle show as <plot type>` | the plot type is changed from the inspector. The name ends with the destination plot type, so match on the prefix |
| `toggle MeasuresForSelection`, `toggle NumberToggle` | the measures-for-selection or number-toggle settings change |
| `displayOnlySelected`, `showAllCases`, `hideSelected`, `hideUnselected` | case visibility changes on a graph |
| `edit plot formula` | a plotted-value formula is edited |
| `reposition equation` | an adornment's equation is moved |
| `rescaleGraph` | the graph is rescaled to fit its data |
| `hideSelected`, `hideUnselected` | cases are hidden from the graph |
| `toggle plotted Count`, `toggle plotted Percent` | the count or percent adornment is toggled |
| `togglePlottedBoxPlot`, `toggle LSRL` | the box plot or least-squares line is toggled |
| `show measure labels`, `hide measure labels` | measure labels are shown or hidden |
| `toggle between histogram and dots`, `switch bar and dot` | the plot type is switched from the inspector |
| `change bin parameter` | a histogram's bin width or alignment changes |
| `drag bin boundary` | the user drags a bin boundary on a binned plot or histogram |
| `change formula` | a bar chart's formula changes |
| `backgroundImage` | a background image is added to or removed from the plot. `to` is `"added"` or `"removed"` |
| `lockBackgroundImage`, `unlockBackgroundImage` | the background image is locked to the axes, or released |

### Axis

| Operation | Fires when |
|---|---|
| `change axis bounds` | an axis range changes, by drag or by rescale |

### Slider

| Operation | Fires when |
|---|---|
| `change slider value` | a slider's value changes, by drag, by typing, or during animation |

### Map

| Operation | Fires when |
|---|---|
| `change base map` | the base map changes |
| `change grid size` | the user releases the grid-size slider. It does not fire during the drag |
| `change map coordinates` | the map settles after a pan or zoom, by the user or programmatically |
| `hide selected cases`, `hide unselected cases`, `show all cases` | case visibility changes on a map |

### Case table and case card

| Operation | Fires when |
|---|---|
| `open case table` | a case table is opened for a data context |
| `expand/collapse all` | the user expands or collapses every group |
| `resize column` | one column is fitted to its width |
| `resize columns` | every column is fitted, from the inspector's "Fit All Columns" |
| `change column width` | a case card column is resized |
| `join` | data is joined into the table |
| `toggle card to table`, `toggle table to card` | the user switches between the case card and case table for a data context |

### Text, calculator, formula

| Operation | Fires when |
|---|---|
| `edit text` | **every** content-changing keystroke in a text component, so a plugin can follow a live edit. Selection-only changes are filtered out |
| `commitEdit` | editing ends and the text actually changed. Carries the component's `title` |
| `calculate` | the calculator evaluates, **and** when it is cleared |
| `edit formula` | a formula is edited in the formula editor |

### Data display

Shared by graphs and maps.

| Operation | Fires when |
|---|---|
| `change changePointColor`, `change changeStrokeColor` | the user picks a point or stroke color, with its opacity, in the inspector |
| `change point color` | the user picks a color for one category of a categorical legend |
| `change point size` | the user moves the point-size slider |
| `change point shape` | the user picks a point shape. No v2 counterpart |
| `change attribute color` | the user picks a color for the low or high end of a numeric legend |
| `toggle stroke same as fill` | the stroke-follows-fill checkbox is toggled |
| `change legend bin count` | the user changes the number of bins for a numeric legend. Carries the clamped count |
| `change legend bins type` | the user switches a numeric legend between linear and quantile binning |
| `change legend range` | the user edits a numeric legend's min or max |
| `swap categories` | the user finishes dragging a category label to reorder it |

## Attribute drag — `dragDrop[attribute]`

Sent while a user drags an attribute, so a plugin can offer a drop target or react to one.

<!-- BEGIN GENERATED: notifications-drag -->
| Operation | `values` carries |
|---|---|
| `drag` | _not readable from the call site_ |
| `dragend` | _not readable from the call site_ |
| `dragenter` | — |
| `dragleave` | — |
| `dragstart` | _not readable from the call site_ |
| `drop` | _not readable from the call site_ |
<!-- END GENERATED: notifications-drag -->

| Operation | Fires when |
|---|---|
| `dragstart` | a drag begins |
| `drag` | the pointer moves during a drag |
| `drop` | the attribute is dropped |
| `dragend` | the drag ends, dropped or not |
| `dragenter`, `dragleave` | the pointer enters or leaves a plugin's own drop overlay during an attribute drag |

## Undo and redo — `undoChangeNotice`

Sent when the user undoes or redoes, and when the history runs out.

<!-- BEGIN GENERATED: notifications-undo -->
| Operation | `values` carries |
|---|---|
| `clearRedo` | _not readable from the call site_ |
| `clearUndo` | _not readable from the call site_ |
| `redoAction` | _not readable from the call site_ |
| `undoAction` | _not readable from the call site_ |
<!-- END GENERATED: notifications-undo -->

| Operation | Fires when |
|---|---|
| `undoAction` | a change is undone |
| `redoAction` | a change is redone |
| `clearUndo` | the undo history becomes empty, so there is nothing left to undo |
| `clearRedo` | the redo history becomes empty |

`undoAction` and `redoAction` are delivered to the plugin whose tile the change belongs to, so a
plugin hears about its own work being undone. See [Known limitations](#known-limitations) for how
this differs from v2.

## Document state — `document`

<!-- BEGIN GENERATED: notifications-document -->
| Operation | `values` carries |
|---|---|
| `newDocumentState` | _not readable from the call site_ |
<!-- END GENERATED: notifications-document -->

| Operation | Fires when |
|---|---|
| `newDocumentState` | CODAP has assembled the document, in reply to a `get document` |

This one is opt-in: only plugins whose `subscribeToDocuments` is `true` receive it, and every
such plugin receives it — including ones that did not ask. See
[`document`](resources/document.md).

## Everything else

Four more resources, each with a small number of notifications.

<!-- BEGIN GENERATED: notifications-other -->
| Resource | Operation |
|---|---|
| `documentChangeNotice` | `dataContextCountChanged` |
| `documentChangeNotice` | `dataContextDeleted` |
| `global` | `localeChanged` |
| `documentChangeNotice` | `updateDocumentBegun` |
| `documentChangeNotice` | `updateDocumentEnded` |
| `interactiveFrame` | _computed at the call site_ |
| `logMessageNotice` | _computed at the call site_ |
<!-- END GENERATED: notifications-other -->

| Resource | What it means |
|---|---|
| `global` / `localeChanged` | CODAP's locale changed. Carries `lang`, the two-letter base language, and `locale`, the full one. A plugin that displays its own text re-renders here |
| `logMessageNotice` | A user-analytics log event matched a filter you registered with a [`logMessageMonitor`](resources/interactive-api.md). Carries `message`, `formatStr` and sometimes `topic` — **no `operation`** |
| `documentChangeNotice` | Document-level changes: `updateDocumentBegun` and `updateDocumentEnded` around a document replacement, plus `dataContextCountChanged` and `dataContextDeleted`, which arrive here rather than on a named context because there is no context to name |
| `interactiveFrame` | Guided-tour and highlight messages — `tourUpdate` and `highlightUpdate`. Not documented further yet, because the implementation behind them is being replaced |

## Operation names are v2's

The names above are reproduced exactly as a plugin receives them, and several are untidy:

- `change changePointColor` and `change changeStrokeColor` really do repeat the word. v2 built
  these names by concatenation and CODAP preserves them so v2 plugins keep matching.
- `showAllCases` and `show all cases` both exist — the first from graphs, the second from maps.
- Capitalization is inconsistent: `toggle MeasuresForSelection` next to `toggle show outliers`.

Match on these strings exactly. They are not going to be normalized, because doing so would break
every v2 plugin that matches on them.

## Known limitations

**Undo and redo are not announced on `document`.** v2 attached a default notification to every
undoable command — `resource: "document"`, `operation: "undo"` or `"redo"` — so a plugin could
watch one resource and know the user had undone something. v3 sends `undoAction` and `redoAction`
on `undoChangeNotice` instead, and only to the plugin whose tile changed. A v2 plugin listening on
`document` hears nothing. This is a known bug; the intended behavior is that v3 sends v2's
notification as well as its own.

**Log event names do not match v2's.** Around thirty-eight event tokens were renamed in v3, and
some payloads reshaped — `addAxisAttribute`, `attributeRemoved`, `dragEnd`, the `toggle*` family
and the `Create <X> component` events among them. A plugin that registered a
[`logMessageMonitor`](resources/interactive-api.md) and matches on `formatStr` sees different
strings from the ones v2 emitted, and adornment toggles in particular collapsed to a generic
`Added <x>` / `Removed <x>` where v2 named each adornment. This is a known bug; the intended
behavior is that the tokens match v2's.

**Item-level changes are reported only as case changes.** v2 emitted `createItems`,
`updateItems` and `deleteItems` on `dataContextChangeNotice` for changes routed through the items
collection — which is the usual path for plugin-driven changes. v3 emits the corresponding
`*Cases` operations regardless of where the change originated, so a plugin filtering on the item
operations receives nothing. v2 also emitted `moveCollection`, `resetCollections`,
`notifyAttributeChange` and `deleteDataContext`, which v3 does not send at all. This is a known
bug; the intended behavior is that v3 sends the item-level operations **in addition to** the case
ones.

**`attributeChange` and `legendAttributeChange` are crossed in two cases, and `axisOrientation`
loses two values.** Dropping an attribute on the bottom or left axis, and dropping one on the
legend, both behave as v2 did. Two cases do not:

| What the user does | v2 sends | v3 sends |
|---|---|---|
| Changes or clears the legend attribute **from its menu** | `attributeChange`, `axisOrientation: "none"` | `legendAttributeChange`, no `axisOrientation` |
| Drops an attribute on the **plot area** | `legendAttributeChange` | `attributeChange` |
| Drops on the **top** axis | `attributeChange`, `axisOrientation: "top"` | `axisOrientation: "horizontal"` |
| Drops on the **right** categorical axis | `attributeChange`, `axisOrientation: "right"` | `axisOrientation: "vertical"` |

So a v2 plugin watching `attributeChange` never sees a legend-menu change, and one watching
`legendAttributeChange` never sees a plot-area drop. This is a known bug; match on both
operations, and do not rely on `axisOrientation` distinguishing the top and right axes.

## See also

- [The resource index](README.md) for the request envelope and the full resource list
- [`component`](resources/component.md) for the component types these notifications name
- [`dataContext`](resources/data-context.md) for the data a change notice describes
