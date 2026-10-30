# Notifications

> **Applies to:** CODAP v3 · **Verified:** 2026-10-22
> · Parts of this page are generated — see [conventions](conventions.md).

A notification is a message CODAP sends your plugin without being asked, because something
changed: a user dragged an attribute onto a graph, deleted a case, renamed a component. This page
catalogs them.

The tables are generated from CODAP's source: which operations exist, which section each
belongs in, and the keys each one's `values` carries. Only the "Fires when" column is written by
hand. Where the keys cannot be read from the code, the table says so
rather than guessing. Two operation names are assembled when they are sent, so the generated
tables cannot list them: `toggle show as <plot type>` and `change bar chart from <old> to <new>`,
both described under [Graph](#graph).

It is the opposite direction from the `notify` **action**, which a plugin sends *to* CODAP to ask
for something. Those are documented on each resource's own page.

## Receiving them

A notification arrives through the same channel as a reply to your own request: CODAP calls the
`requestHandler(command, callback)` your plugin passed to its iframe-phone endpoint (see
[Sending requests and receiving notifications](README.md#sending-requests-and-receiving-notifications)).
Branch on `command.resource`, then on `command.values.operation`, and call `callback` when you
are done:

```js
function requestHandler (command, callback) {
  if (command.action === "notify" && command.resource.startsWith("dataContextChangeNotice[")) {
    // v2 sent an array of changes; v3 currently sends one object. Accept both.
    const changes = Array.isArray(command.values) ? command.values : [command.values]
    changes.forEach(change => {
      // change.operation is "createCases", "updateCases", ...
    })
  }
  callback({ success: true })
}
```

**Who receives them.** There is no subscription call for most notifications: CODAP sends them to
every connected plugin. The exceptions:

- **Opt-in.** `newDocumentState` on `document` requires `subscribeToDocuments`; see
  [`document`](resources/document.md). `localeChanged` requires `handlesLocaleChange`; see
  [Everything else](#everything-else). A `logMessageNotice` requires registering a
  monitor; see [`logMessageMonitor`](resources/log-message-monitor.md).
- **Sent to one plugin only.**
  - `undoAction` and `redoAction` go only to the plugin that reported the undoable action. See
    [Undo and redo](#undo-and-redo--undochangenotice).
  - A `logMessageNotice` goes only to the plugin that registered the matching monitor.
  - `drag`, `dragenter`, `dragleave` and `drop` go only to the plugin under the pointer. See
    [Attribute drag](#attribute-drag--dragdropattribute).

**Your own changes.** A plugin is not sent notifications about changes it requested itself, so it
never has to recognize and ignore its own work. Component notifications follow this rule. Data
notifications currently do not: see [Known limitations](#known-limitations).

## The envelope

Every notification carries `action: "notify"` and a `resource` naming what changed. Almost all
then name the change in `values.operation`:

```json
{
  "action": "notify",
  "resource": "component",
  "values": { "operation": "change point size", "to": 1.5, "id": 12, "type": "DG.GraphView", "diType": "graph" }
}
```

**Data changes carry a list.** On `dataContextChangeNotice[<context>]`, `values` is meant to be an
array of changes, each with its own `operation` and `result`, because several changes can be
reported in one notification. This is the form v2 sends:

```json
{
  "action": "notify",
  "resource": "dataContextChangeNotice[Mammals]",
  "values": [
    {
      "operation": "createCases",
      "result": { "success": true, "caseIDs": [17], "itemIDs": [9], "caseID": 17, "itemID": 9 }
    }
  ]
}
```

**v3 currently sends a single change object instead of the array:**

```json
{
  "action": "notify",
  "resource": "dataContextChangeNotice[Mammals]",
  "values": {
    "operation": "createCases",
    "result": { "success": true, "caseIDs": [17], "itemIDs": [9], "caseID": 17, "itemID": 9 }
  }
}
```

See [Known limitations](#known-limitations). The example in [Receiving them](#receiving-them)
handles both.

**Some notifications have no `operation`.** A `logMessageNotice` carries the log event itself, and
the slider notice on `global[<name>]` carries only the new value:

```json
{
  "action": "notify",
  "resource": "logMessageNotice",
  "values": { "message": "...", "formatStr": "...", "logMonitor": { "id": 1, "clientId": "..." } }
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
| `documentChangeNotice`, `global`, `logMessageNotice`, `interactiveFrame` | a few notifications each — see [Everything else](#everything-else) |

## Data changes — `dataContextChangeNotice[<context>]`

Sent when the data in a context changes. The bracketed name is the data context's name, so a
plugin watching one data set can filter on it.

<!-- BEGIN GENERATED: notifications-data -->
| Operation | Fires when |
|---|---|
| `createAttributes` | attributes are added |
| `updateAttributes` | an attribute's properties change |
| `deleteAttributes` | attributes are removed |
| `moveAttribute` | an attribute changes position, within its collection or to another one |
| `hideAttributes` | an attribute is hidden from its menu |
| `unhideAttributes`, `showAttributes` | hidden attributes are shown again with "Show all hidden attributes". Both are sent, one after the other |
| `createCases` | cases are added |
| `updateCases` | case values change |
| `deleteCases` | cases are removed |
| `moveCases` | cases are reordered |
| `dependentCases` | case values change as a consequence of another change: random values are rerandomized, or a join adds values |
| `selectCases` | the selection changes |
| `createCollection` | a collection is added |
| `updateCollection` | a collection's properties change |
| `deleteCollection` | a collection is removed |
| `updateDataContext` | the context's own properties change, such as its title |

Every one carries `result` in `values`.
<!-- END GENERATED: notifications-data -->

These operations are part of the contract, but CODAP does not send them yet; see
[Known limitations](#known-limitations):

| Operation | Should fire when |
|---|---|
| `createItems` | items are created through an item resource. Follows the `createCases` for the same change |
| `updateItems` | items are updated through an item resource. Accompanies the `updateCases` for the same change |
| `resetCollections` | moving an attribute to another collection is undone, and the collections are rebuilt. Undoing a move within a collection sends `moveAttribute` instead |

## Component changes — `component`

Sent when a component is created, removed, or reconfigured. A plugin that wants to mirror what the
user is doing to a graph listens here. Every one carries the component's `id`, its v2 `type`, and
`diType`; each table below lists what each operation adds to those.

`diType` uses the same type vocabulary as [`component`](resources/component.md). Most
notifications also carry the resulting value, so a plugin can see the new state without asking
for it.

### Lifecycle

<!-- BEGIN GENERATED: notifications-component-lifecycle -->
| Operation | Fires when | `values` also carries |
|---|---|---|
| `create` | a component is created. The calculator usually sends `show` instead; see below | — |
| `delete` | a component is closed or deleted. **Also sent when a component is only hidden**, as the guide is when it is closed, and a case table is when it is closed from its title bar. For the case table, `type` is `DG.TableView`, as in v2. v2 also sent `create` when that close was undone; v3 does not, see [Known limitations](#known-limitations). Closing a case card sends nothing | `name`, `title` |
| `titleChange` | a component is renamed. Sent on `component[<id>]` rather than `component` | `from`, `to` |
| `hide`, `show` | the calculator is closed, or toggled from the tool shelf | — |
| `move`, `resize` | a component is moved or resized | — |
| `update` | a component's properties are changed through the API. Echoes the values from the request | _not readable from the code_ |
| `toggle minimize component` | a component is minimized or restored | — |
<!-- END GENERATED: notifications-component-lifecycle -->

### Graph

The largest group.

<!-- BEGIN GENERATED: notifications-component-graph -->
| Operation | Fires when | `values` also carries |
|---|---|---|
| `add axis attribute` | an attribute is dropped on the y-axis "+" target | _not readable from the code_ |
| `add 2nd axis attribute` | an attribute is dropped on the right-hand numeric axis. Changing or removing it from that axis's menu sends `attributeChange` instead | _not readable from the code_ |
| `legendAttributeChange` | an attribute is dropped on the legend or the plot area, and becomes the legend attribute. `type` is `DG.GraphModel`, as in v2 | `attributeId`, `attributeName`, … |
| `change background color`, `toggle background transparency` | the plot background changes | `to` |
| `add movable value`, `remove movable value`, `drag movable value` | movable values are added, removed or dragged | — |
| `drag movable point` | the user finishes dragging the movable point | — |
| `drag movable line` | the user finishes dragging the movable line. New in v3; v2 sent nothing here | — |
| `toggle connecting line`, `toggle show squares`, `toggle show residual plot`, `toggle lock intercept` | adornments are toggled | `isChecked` |
| `toggle show outliers` | the box plot's "Show Outliers" option is toggled | `isChecked` |
| `setNumStdErrs` | the number of standard errors shown changes | `to` |
| `toggle show ICI` | the box plot's informal confidence interval is toggled. New in v3; v2 sent `toggle show outliers` here, which was a v2 bug | `isChecked` |
| `togglePlottedMean`, `togglePlottedMedian`, `togglePlottedStDev`, `togglePlottedStErr`, `togglePlottedMad`, `togglePlottedNormal` | a univariate measure adornment is switched on or off | `isChecked` |
| `toggle movable line`, `toggle movable point`, `toggle plot function`, `toggle plotted value` | the matching adornment is switched on or off | `isChecked` |
| `toggle plotted Count`, `toggle plotted Percent` | the count or percent adornment is toggled | `isChecked` |
| `togglePlottedBoxPlot`, `toggle LSRL` | the box plot or least-squares line is toggled | `isChecked` |
| `show measure labels`, `hide measure labels` | measure labels are shown or hidden | `isChecked` |
| `toggle show as <plot type>` | the plot is switched between dots, a bar for each point, and bins. The name ends with `DotPlot`, `LinePlot` or `BinnedPlot`, so match on the prefix | _not readable from the code_ |
| `toggle between histogram and dots`, `switch bar and dot` | the plot type is switched | `to` |
| `change bar chart from <old> to <new>` | a bar chart switches to counts or percents. `<new>` is `count` or `percent`; `<old>` can also be `formula` | _not readable from the code_ |
| `change formula` | a bar chart's formula is applied in its formula editor | — |
| `edit plot formula` | a plotted value or plotted function formula is edited | `adornment`, `from`, `to` |
| `toggle MeasuresForSelection`, `toggle NumberToggle` | the measures-for-selection or number-toggle settings change | `to` |
| `displayOnlySelected` | the graph is set to display only the selected cases | — |
| `hideSelected`, `hideUnselected` | the selected or unselected cases are hidden from the graph | `numberHidden` |
| `showAllCases` | hidden cases are shown again | — |
| `reposition equation` | an adornment's equation is moved | `adornment` |
| `rescaleGraph` | the graph is rescaled to fit its data | — |
| `change bin parameter` | a histogram's bin width or alignment changes | — |
| `drag bin boundary` | the user drags a bin boundary on a binned plot or histogram | `alignment`, `width` |
| `backgroundImage` | a background image is added to or removed from the plot. `to` is `"added"` or `"removed"` | `to` |
| `lockBackgroundImage`, `unlockBackgroundImage` | the background image is locked to the axes, or released | — |
<!-- END GENERATED: notifications-component-graph -->

`attributeChange`, listed under [Data display](#data-display) because maps send it too, carries
`axisOrientation` for where the change was made, with v2's values. When
the change removes an attribute, `attributeName` is the label of the menu item that removed it, in
the user's language:

| Where | `axisOrientation` | `attributeName` on removal |
|---|---|---|
| Bottom axis | `horizontal` | `Remove X: <name>` |
| Left axis | `vertical` | `Remove Y: <name>` |
| Right numeric axis, from its menu | `vertical2` | `Remove Y: <name>` |
| Top axis | `top` | `Remove Side-by-side Layout by <name>` |
| Right categorical axis | `right` | `Remove Vertical Layout by <name>` |
| Legend, from its menu | `none` | `Remove Legend: <name>` |

### Axis

<!-- BEGIN GENERATED: notifications-component-axis -->
| Operation | Fires when | `values` also carries |
|---|---|---|
| `change axis bounds` | the user finishes dragging or stretching a numeric axis, or option-clicks to zoom. Option-clicking the plot zooms both numeric axes and sends one notification for each. Rescaling the graph sends `rescaleGraph` instead | `newBounds` |
<!-- END GENERATED: notifications-component-axis -->

### Slider

<!-- BEGIN GENERATED: notifications-component-slider -->
| Operation | Fires when | `values` also carries |
|---|---|---|
| `change slider value` | the user finishes changing a slider's value: releasing the thumb, entering a value, or using the arrow keys. While the thumb is being dragged, and while the slider animates, only the value notice on `global[<name>]` is sent; see [Everything else](#everything-else) | _not readable from the code_ |
<!-- END GENERATED: notifications-component-slider -->

### Map

<!-- BEGIN GENERATED: notifications-component-map -->
| Operation | Fires when | `values` also carries |
|---|---|---|
| `change base map` | the base map changes | `to` |
| `change grid size` | the user releases the grid-size slider. It does not fire during the drag | `from`, `to` |
| `change map coordinates` | the map settles after the user pans or zooms it, or rescales it from the inspector | `center`, `zoom` |
| `hide selected cases`, `hide unselected cases`, `show all cases` | case visibility changes on a map | `hide selected cases`: `numberHidden`; `hide unselected cases`: `numberHidden`; `show all cases`: — |
<!-- END GENERATED: notifications-component-map -->

Dropping an attribute on a map or its legend sends `legendAttributeChange`, as on a graph (see
[Graph](#graph)), with `type` `DG.MapModel`, as in v2. Changing or removing the legend attribute
from the legend's menu sends `attributeChange` with `axisOrientation` `none`, as on a graph. Its
`type` is `DG.GraphView`, as v2 sent it for maps too.

### Case table and case card

<!-- BEGIN GENERATED: notifications-component-case-table -->
| Operation | Fires when | `values` also carries |
|---|---|---|
| `open case table` | a case table is opened, or shown again, for a data context | — |
| `expand/collapse all` | every group is expanded or collapsed. `to` is `"expanded"` or `"collapsed"` | _not readable from the code_ |
| `resize column` | one column's width changes: dragged, or fitted to its contents | — |
| `resize columns` | every column is fitted to its contents | — |
| `change column width` | a case card column is resized | — |
| `join` | an attribute from another data set is dropped on a case table's attribute header to join the data. The data context also reports `createAttributes` and `dependentCases` | — |
| `toggle card to table`, `toggle table to card` | a data context's case card is switched to a case table, or the reverse | — |
<!-- END GENERATED: notifications-component-case-table -->

### Text, calculator, formula

<!-- BEGIN GENERATED: notifications-component-text -->
| Operation | Fires when | `values` also carries |
|---|---|---|
| `edit text` | **every** content-changing edit in a text component, so a plugin can follow a live edit. Selection-only changes are filtered out | — |
| `commitEdit` | editing ends and the text actually changed; a change of style alone sends nothing. `text` is the rich-text value serialized as a JSON string, not plain text. Also carries the component's `title` | `text`, `title` |
| `calculate` | the calculator evaluates, **and** when it is cleared | — |
| `edit formula` | an attribute's formula is applied in its formula editor. Carried by the data context's case table, open or closed, so it is not sent when the data context has never had one | — |
<!-- END GENERATED: notifications-component-text -->

### Data display

Shared by graphs and maps.

<!-- BEGIN GENERATED: notifications-component-data-display -->
| Operation | Fires when | `values` also carries |
|---|---|---|
| `change changePointColor` | the user picks the single color for all points. This control appears only when no categorical or numeric legend colors the points. Each pick sends one, and cancelling the picker sends one more restoring the original color | `color` |
| `change point color` | the user picks the color for one category of a categorical legend | `category`, `color` |
| `change attribute color` | the user picks the color for the low or high end of a numeric legend. `end` is `"low"` or `"high"` | `color`, `end` |
| `change changeStrokeColor` | the user picks a stroke color. Not available while the stroke follows the fill | `color` |
| `toggle stroke same as fill` | the stroke-follows-fill setting is toggled | `isChecked` |
| `change point size` | the user finishes changing the point size: releasing the slider, or using the arrow keys | `to` |
| `change point shape` | the user picks a point shape. New in v3 | `category`, `shape` |
| `change legend bin count` | the number of bins for a numeric legend changes. Carries the clamped count | `binCount` |
| `change legend bins type` | a numeric legend switches between linear and quantile binning | `binningType` |
| `change legend range` | a numeric legend's min or max is edited | `max`, `min` |
| `swap categories` | the user finishes dragging a category label to reorder it | `place` |
| `attributeChange` | on a graph, an attribute is placed on, replaced on, or removed from an axis, by dropping it or from an axis label's menu, including when an attribute dropped on an empty graph's plot area goes to the x axis. On a graph or a map, the legend attribute is changed or removed from the legend's menu. See [Graph](#graph) for `axisOrientation` | `attributeId`, `attributeName`, `axisOrientation`, … |
<!-- END GENERATED: notifications-component-data-display -->

A legend whose attribute holds colors uses those colors directly, so it has no color control and
sends none of the color notifications.

## Attribute drag — `dragDrop[attribute]`

Sent while a user drags an attribute, so a plugin can offer a drop target or react to one.

<!-- BEGIN GENERATED: notifications-drag -->
| Operation | Fires when | `values` carries |
|---|---|---|
| `dragstart` | an attribute drag begins. Sent to every plugin | `attribute`, `collection`, `context`, `text` |
| `dragend` | the drag ends, dropped or not. Sent to every plugin | `attribute`, `collection`, `context`, `text` |
| `dragenter`, `dragleave` | the pointer enters or leaves your plugin during the drag | `attribute`, `collection`, `context`, `text` |
| `drag` | the pointer moves over your plugin during the drag | `attribute`, `collection`, `context`, `position`, `text` |
| `drop` | the attribute is dropped on your plugin | `attribute`, `collection`, `context`, `position`, `text` |
<!-- END GENERATED: notifications-drag -->

`drag` and `drop` carry `position`, measured from the top-left corner of your plugin.

## Undo and redo — `undoChangeNotice`

<!-- BEGIN GENERATED: notifications-undo -->
| Operation | Fires when | `values` carries |
|---|---|---|
| `undoAction` | the user undoes an action your plugin reported as undoable | — |
| `redoAction` | the user redoes an action your plugin reported as undoable | — |
| `clearUndo` | the undo history is emptied, for example by a change that cannot be undone. Sent to every plugin. v3 sends it at different moments; see [Known limitations](#known-limitations) | `canRedo`, `canUndo` |
| `clearRedo` | an action is added to the history, which empties the redo history. Sent to every plugin. v3 sends it at different moments; see [Known limitations](#known-limitations) | `canRedo`, `canUndo` |
<!-- END GENERATED: notifications-undo -->

**`undoAction` and `redoAction` answer your own reports.** CODAP cannot undo a change inside your
plugin, so it does not tell you about undo in general. Instead, when your plugin makes a change
it wants the user to be able to undo, it sends:

```json
{ "action": "notify", "resource": "undoChangeNotice", "values": { "operation": "undoableActionPerformed" } }
```

CODAP adds an entry to its undo history. When the user undoes or redoes that entry, CODAP sends
`undoAction` or `redoAction`, and your plugin reverses or reapplies the change itself.

## Document state — `document`

<!-- BEGIN GENERATED: notifications-document -->
| Operation | Fires when | `values` carries |
|---|---|---|
| `newDocumentState` | CODAP has assembled the document, in reply to a `get document` | `state` |
<!-- END GENERATED: notifications-document -->

This one is opt-in: only plugins whose `subscribeToDocuments` is `true` receive it, and every
such plugin receives it — including ones that did not ask. See
[`document`](resources/document.md).

These operations are part of the contract, but CODAP does not send them yet; see
[Known limitations](#known-limitations):

| Operation | Should fire when |
|---|---|
| `undo` | the user undoes anything. Sent to every plugin |
| `redo` | the user redoes anything. Sent to every plugin |

## Everything else

Four more resources, each with a few notifications.

<!-- BEGIN GENERATED: notifications-other -->
| Resource | Operation | Fires when | `values` carries |
|---|---|---|---|
| `documentChangeNotice` | `dataContextCountChanged` | a data context is created or deleted anywhere in the document | — |
| `documentChangeNotice` | `dataContextDeleted` | a data context is deleted. `deletedContext` is its name | `deletedContext` |
| `documentChangeNotice` | `updateDocumentBegun`, `updateDocumentEnded` | a plugin, or the host page CODAP is embedded in, replaced the document with `update document`; the two bracket the replacement. Sent to every plugin. v3 sends them only to the plugin that asked; see [Known limitations](#known-limitations) | — |
| `global[<name>]` | none | a global value changes: a slider is dragged or animates, or a plugin sets the value with `update` on `global`. `<name>` is the slider's global value name, and `globalValue` is the new value. This is how a plugin follows a slider continuously. Also sent when a change is undone or redone, and to every plugin, including the one that set the value | `globalValue` |
| `global` | `localeChanged` | CODAP's locale changed. Carries `lang`, the two-letter base language, and `locale`, the locale itself, such as `pt-BR`. Sent only to plugins that set `handlesLocaleChange`; see [Language and locale](guides/locale.md) | `lang`, `locale` |
| `logMessageNotice` | none | a user-analytics log event matched a monitor your plugin registered. Carries `message`, `formatStr` and `logMonitor`, and sometimes `topic` and `replaceArgs` | `formatStr`, `logMonitor`, `message`, … |
| `interactiveFrame` | computed | guided-tour and highlight messages — `tourUpdate` and `highlightUpdate`. Not documented further yet, because the implementation behind them is being replaced | _not readable from the code_ |
<!-- END GENERATED: notifications-other -->

`dataContextCountChanged` and `dataContextDeleted` arrive here rather than on a named context
because there may be no context left to name.

## Operation names are v2's

The names above are reproduced exactly as a plugin receives them, and several are untidy:

- `change changePointColor` and `change changeStrokeColor` really do repeat the word. v2 built
  these names by concatenation and CODAP preserves them so v2 plugins keep matching.
- `showAllCases` and `show all cases` both exist — the first from graphs, the second from maps.
- Capitalization is inconsistent: `toggle MeasuresForSelection` next to `toggle show outliers`.

Match on these strings exactly. They will not change silently: any cleanup will add a consistent
name alongside the old one and go through [deprecation](conventions.md#deprecated-names).

## Known limitations

**A plugin receives notifications about its own data changes.** v3 sends every data notification —
attributes, cases, collections, the selection — to every plugin, including the one that made the
change. A plugin that refetches or writes back whenever its data changes reacts to its own
changes, and can loop. This is a known bug; the intended behavior is that the requesting plugin is
skipped, as it already is for v3's component notifications.

v2 is only a partial precedent. It skipped the requesting plugin for data changes that recorded
which plugin asked for them, but several did not: `update` on `attribute`, the `createCases` sent
when items are created, `moveCases`, `moveAttribute`, and `dependentCases` all went to the
requester too. v2 sent
component notifications to every plugin, the requester included.

**Data changes arrive one at a time, not as a list.** v2 collected the changes made together and
sent one `dataContextChangeNotice[<context>]` whose `values` is an array of
`{ operation, result }`. v3 sends one notification per change, with `values` as a single object.
A plugin that iterates over `values` fails on v3's object. This is a known bug; the intended
behavior is v2's array. Until it is fixed, accept both, as the example in
[Receiving them](#receiving-them) does.

**Some API changes send no notification.** These requests change data, but v3 does not notify
other plugins about them. v2 did, for every one of them:

- `update` and `delete` on `caseByID`, `caseByIndex`, `itemByID` and `itemByCaseID`
- `update` on `item` with a single item
- `delete` on `itemSearch`. v2 reported item deletes as `deleteCases`
- `notify` on `itemSearch`, which moves items. v2 reported the move as `moveCases`
- `delete` on `attribute`
- `delete` on `allCases`
- `update` and `delete` on `collection`
- `create` on `dataContextFromURL`. v2 reported the new data context as
  `dataContextCountChanged` on `documentChangeNotice`

This is a known bug; the intended behavior is that each sends the same notification as the
equivalent change made in CODAP's own interface.

**Formula recalculation rarely sends `dependentCases`.** v2 sent `dependentCases` for formula
attributes whose values had to be recalculated:

- after `updateCases`, for formulas that use the changed cases' values directly and for formulas
  that aggregate over them
- after cases were created or deleted, for aggregating formulas only
- for every dependent formula when a global value changed, a formula was edited, or random values
  were rerandomized

v3 sends it only when random values are rerandomized or a join adds values, so a plugin that relies
on it to see recalculated values misses them. This is a known bug; the intended behavior is v2's.

**Item-level changes are reported only as case changes.** When items were created or updated
through an item resource, v2 sent `createItems` or `updateItems` in addition to the case
operation. v3 sends only `createCases` or `updateCases`, so a plugin filtering on the item
operations receives nothing. v2 also sent `resetCollections` when moving an attribute to another collection was undone,
which v3 does not send. This is a known bug; the intended behavior is that v3 sends these as v2
did. Deleting and moving items belong to the previous entry: v2 reported them as `deleteCases`
and `moveCases`, not as item operations.

**Some map moves send no `change map coordinates`.** v3 does not notify plugins when a plugin sets
a map's center or zoom with `update component`, when a plugin rescales it with `notify component`
and `request: "autoScale"`, or when the map rescales itself because its layers changed. v2 sent it
when a plugin set the center or zoom. This is a known bug.

**Undo and redo send no component notifications.** v2 sent one for many component changes: undoing
the creation of a component sent `delete`, undoing the calculator being shown or hidden sent the
opposite, and undoing or redoing a case table close sent `create` or `delete`. v3 sends no
component notification on undo or redo. This is a known bug.

**Undo and redo are not announced on `document`.** v3 does not send v2's `undo` and `redo`
notifications on `document`. This is a known bug; see
[Undo and redo](guides/undo-and-redo.md#known-limitations).

**`clearUndo` and `clearRedo` are sent at different moments from v2.** In particular, v3 sends
nothing when an action is added to an empty redo history, so a plugin does not hear that undo
has become possible. This is a known bug; see
[Undo and redo](guides/undo-and-redo.md#known-limitations).

**`updateDocumentBegun` and `updateDocumentEnded` go only to the plugin that asked.** v2 sent
both to every plugin whoever replaced the document, so each could tell that the document was
being replaced. v3 does that only when the host page CODAP is
[embedded in](guides/embedded-server.md) makes the request. This is a known bug.

**Log event names do not match v2's.** About 27 event tokens were renamed in v3, and about 11
payloads reshaped — `addAxisAttribute`, `attributeRemoved`, `dragEnd`, the `toggle*` family and
the `Create <X> component` events among them. A plugin that registered a `logMessageMonitor` and
matches on `formatStr` sees different strings from the ones v2 emitted, and adornment toggles in
particular collapsed to a generic `Added <x>` / `Removed <x>` where v2 named each adornment. This
is a known bug; the intended behavior is that the tokens match v2's.

**"Treat as Categorical" and "Treat as Numeric" send no notification.** v2 sent `attributeChange`
for every attribute-menu item, so choosing either one on an axis or a legend sent `attributeChange`
with `attributeName` `Treat as Categorical` or `Treat as Numeric`. v3 sends nothing. This is a known
bug.

## See also

- [The resource index](README.md) for the request envelope and the full resource list
- [`component`](resources/component.md) for the component types these notifications name
- [`dataContext`](resources/data-context.md) for the data a change notice describes
