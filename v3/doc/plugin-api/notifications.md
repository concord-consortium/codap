# Notifications

> **Applies to:** CODAP v3 · **Verified:** 2026-10-14
> · Parts of this page are generated — see [conventions](conventions.md).

A notification is a message CODAP sends your plugin without being asked, because something
changed: a user dragged an attribute onto a graph, deleted a case, renamed a component. This page
catalogs them.

The operation names, the keys each notification's `values` carries, and the area of CODAP that
raises each component notification are generated from CODAP's source. When each one fires is
written by hand beside them. Where the keys cannot be read from the code, the table says so
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
  `logMessageMonitor`, a resource this reference does not yet document.
- **Sent to one plugin only.**
  - `undoAction` and `redoAction` go only to the plugin that reported the undoable action. See
    [Undo and redo](#undo-and-redo--undochangenotice).
  - `updateDocumentBegun` and `updateDocumentEnded` go only to the plugin that requested the
    document replacement.
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
| Operation | `values` carries |
|---|---|
| `createAttributes` | `result` |
| `createCases` | `result` |
| `createCollection` | `result` |
| `deleteAttributes` | `result` |
| `deleteCases` | `result` |
| `deleteCollection` | `result` |
| `dependentCases` | `result` |
| `hideAttributes` | `result` |
| `moveAttribute` | `result` |
| `moveCases` | `result` |
| `selectCases` | `result` |
| `showAttributes` | `result` |
| `unhideAttributes` | `result` |
| `updateAttributes` | `result` |
| `updateCases` | `result` |
| `updateCollection` | `result` |
| `updateDataContext` | `result` |
<!-- END GENERATED: notifications-data -->

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
`diType`; the table lists what each adds to those.

<!-- BEGIN GENERATED: notifications-component -->
| Operation | Raised by | `values` also carries |
|---|---|---|
| `add 2nd axis attribute` | graph | _not readable from the code_ |
| `add axis attribute` | graph | _not readable from the code_ |
| `add movable value` | graph | — |
| `attributeChange` | graph | _not readable from the code_ |
| `backgroundImage` | graph | `to` |
| `calculate` | calculator | — |
| `change attribute color` | data display | `color`, `end` |
| `change axis bounds` | axis | `newBounds` |
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
| `change slider value` | slider | _not readable from the code_ |
| `commitEdit` | text | `text`, `title` |
| `create` | lifecycle | — |
| `delete` | lifecycle | `name`, `title` |
| `displayOnlySelected` | graph | — |
| `drag bin boundary` | graph | `alignment`, `width` |
| `drag movable line` | graph | — |
| `drag movable point` | graph | — |
| `drag movable value` | graph | — |
| `edit formula` | formula | — |
| `edit plot formula` | graph | `adornment`, `from`, `to` |
| `edit text` | text | — |
| `expand/collapse all` | case table | _not readable from the code_ |
| `hide` | lifecycle | — |
| `hide measure labels` | graph | `isChecked` |
| `hide selected cases` | map | `numberHidden` |
| `hide unselected cases` | map | `numberHidden` |
| `hideSelected` | graph | `numberHidden` |
| `hideUnselected` | graph | `numberHidden` |
| `join` | case table | — |
| `legendAttributeChange` | graph | _not readable from the code_ |
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
| `show measure labels` | graph | `isChecked` |
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
| `toggle connecting line` | graph | `isChecked` |
| `toggle lock intercept` | graph | `isChecked` |
| `toggle minimize component` | container | — |
| `toggle movable line` | graph | `isChecked` |
| `toggle movable point` | graph | `isChecked` |
| `toggle plot function` | graph | `isChecked` |
| `toggle plotted Count` | graph | `isChecked` |
| `toggle plotted Percent` | graph | `isChecked` |
| `toggle plotted value` | graph | `isChecked` |
| `toggle show ICI` | graph | `isChecked` |
| `toggle show outliers` | graph | `isChecked` |
| `toggle show residual plot` | graph | `isChecked` |
| `toggle show squares` | graph | `isChecked` |
| `toggle stroke same as fill` | data display | `isChecked` |
| `toggle table to card` | case table | — |
| `togglePlottedBoxPlot` | graph | `isChecked` |
| `togglePlottedMad` | graph | `isChecked` |
| `togglePlottedMean` | graph | `isChecked` |
| `togglePlottedMedian` | graph | `isChecked` |
| `togglePlottedNormal` | graph | `isChecked` |
| `togglePlottedStDev` | graph | `isChecked` |
| `togglePlottedStErr` | graph | `isChecked` |
| `unlockBackgroundImage` | graph | — |
| `update` | other | _not readable from the code_ |
<!-- END GENERATED: notifications-component -->

`diType` uses the same type vocabulary as [`component`](resources/component.md). Most
notifications also carry the resulting value, so a plugin can see the new state without asking
for it.

### Lifecycle

| Operation | Fires when |
|---|---|
| `create` | a component is created. The calculator usually sends `show` instead; see below |
| `delete` | a component is closed or deleted. **Also sent when a component is only hidden**, as the guide is when it is closed, and when a case table is closed from its title bar; reopening the table sends `create`. Closing a case card sends nothing |
| `titleChange` | a component is renamed. Sent on `component[<id>]` rather than `component` |
| `hide`, `show` | the calculator is closed, or toggled from the tool shelf |
| `move`, `resize` | a component is moved or resized |
| `update` | a component's properties are changed through the API. Echoes the values from the request |
| `toggle minimize component` | a component is minimized or restored |

### Graph

The largest group.

| Operation | Fires when |
|---|---|
| `add axis attribute` | an attribute is dropped on the y-axis "+" target |
| `add 2nd axis attribute` | an attribute is dropped on the right-hand numeric axis. Also sent when that attribute is removed |
| `attributeChange` | an attribute is placed on, replaced on, or removed from an axis or the plot, by dropping it or from an axis label's menu |
| `legendAttributeChange` | the legend attribute is set or replaced, by dropping it or from the legend's menu. Removing it sends nothing |
| `change background color`, `toggle background transparency` | the plot background changes |
| `add movable value`, `remove movable value`, `drag movable value` | movable values are added, removed or dragged |
| `drag movable point` | the user finishes dragging the movable point |
| `drag movable line` | the user finishes dragging the movable line. v2 sent nothing here, so this is new in v3 |
| `toggle connecting line`, `toggle show squares`, `toggle show residual plot`, `toggle lock intercept` | adornments are toggled |
| `toggle show outliers` | the box plot's "Show Outliers" option is toggled |
| `setNumStdErrs` | the number of standard errors shown changes |
| `toggle show ICI` | the box plot's informal confidence interval is toggled. New in v3 — v2 sent `toggle show outliers` for this, which was a v2 bug |
| `togglePlottedMean`, `togglePlottedMedian`, `togglePlottedStDev`, `togglePlottedStErr`, `togglePlottedMad`, `togglePlottedNormal` | a univariate measure adornment is switched on or off |
| `toggle movable line`, `toggle movable point`, `toggle plot function`, `toggle plotted value` | the matching adornment is switched on or off |
| `toggle plotted Count`, `toggle plotted Percent` | the count or percent adornment is toggled |
| `togglePlottedBoxPlot`, `toggle LSRL` | the box plot or least-squares line is toggled |
| `show measure labels`, `hide measure labels` | measure labels are shown or hidden |
| `toggle show as <plot type>` | the plot is switched between dots, a bar for each point, and bins. The name ends with `DotPlot`, `LinePlot` or `BinnedPlot`, so match on the prefix |
| `toggle between histogram and dots`, `switch bar and dot` | the plot type is switched |
| `change bar chart from <old> to <new>` | a bar chart switches to counts or percents. `<new>` is `count` or `percent`; `<old>` can also be `formula` |
| `change formula` | a bar chart's formula is applied in its formula editor |
| `edit plot formula` | a plotted value or plotted function formula is edited |
| `toggle MeasuresForSelection`, `toggle NumberToggle` | the measures-for-selection or number-toggle settings change |
| `displayOnlySelected` | the graph is set to display only the selected cases |
| `hideSelected`, `hideUnselected` | the selected or unselected cases are hidden from the graph |
| `showAllCases` | hidden cases are shown again |
| `reposition equation` | an adornment's equation is moved |
| `rescaleGraph` | the graph is rescaled to fit its data |
| `change bin parameter` | a histogram's bin width or alignment changes |
| `drag bin boundary` | the user drags a bin boundary on a binned plot or histogram |
| `backgroundImage` | a background image is added to or removed from the plot. `to` is `"added"` or `"removed"` |
| `lockBackgroundImage`, `unlockBackgroundImage` | the background image is locked to the axes, or released |

### Axis

| Operation | Fires when |
|---|---|
| `change axis bounds` | the user finishes dragging or stretching a numeric axis, or option-clicks to zoom. Option-clicking the plot zooms both numeric axes and sends one notification for each. Rescaling the graph sends `rescaleGraph` instead |

### Slider

| Operation | Fires when |
|---|---|
| `change slider value` | the user finishes changing a slider's value: releasing the thumb, entering a value, or using the arrow keys. While the thumb is being dragged, and while the slider animates, only the value notice on `global[<name>]` is sent; see [Everything else](#everything-else) |

### Map

| Operation | Fires when |
|---|---|
| `change base map` | the base map changes |
| `change grid size` | the user releases the grid-size slider. It does not fire during the drag |
| `change map coordinates` | the map settles after the user pans or zooms it, or rescales it from the inspector |
| `hide selected cases`, `hide unselected cases`, `show all cases` | case visibility changes on a map |

Changing a map's legend attribute should send `legendAttributeChange`, as it does on a graph. v3
does not send it yet; see [Known limitations](#known-limitations).

### Case table and case card

| Operation | Fires when |
|---|---|
| `open case table` | a case table is opened, or shown again, for a data context |
| `expand/collapse all` | every group is expanded or collapsed. `to` is `"expanded"` or `"collapsed"` |
| `resize column` | one column's width changes: dragged, or fitted to its contents |
| `resize columns` | every column is fitted to its contents |
| `change column width` | a case card column is resized |
| `join` | an attribute from another data set is dropped on a case table's attribute header to join the data. The data context also reports `createAttributes` and `dependentCases` |
| `toggle card to table`, `toggle table to card` | a data context's case card is switched to a case table, or the reverse |

### Text, calculator, formula

| Operation | Fires when |
|---|---|
| `edit text` | **every** content-changing edit in a text component, so a plugin can follow a live edit. Selection-only changes are filtered out |
| `commitEdit` | editing ends and the text actually changed; a change of style alone sends nothing. `text` is the rich-text value serialized as a JSON string, not plain text. Also carries the component's `title` |
| `calculate` | the calculator evaluates, **and** when it is cleared |
| `edit formula` | an attribute's formula is applied in its formula editor. Carried by the data context's case table, open or closed, so it is not sent when the data context has never had one |

### Data display

Shared by graphs and maps.

| Operation | Fires when |
|---|---|
| `change changePointColor` | the user picks the single color for all points. This control appears only when no categorical or numeric legend colors the points. Each pick sends one, and cancelling the picker sends one more restoring the original color |
| `change point color` | the user picks the color for one category of a categorical legend |
| `change attribute color` | the user picks the color for the low or high end of a numeric legend. `end` is `"low"` or `"high"` |
| `change changeStrokeColor` | the user picks a stroke color. Not available while the stroke follows the fill |
| `toggle stroke same as fill` | the stroke-follows-fill setting is toggled |
| `change point size` | the user finishes changing the point size: releasing the slider, or using the arrow keys |
| `change point shape` | the user picks a point shape. No v2 counterpart |
| `change legend bin count` | the number of bins for a numeric legend changes. Carries the clamped count |
| `change legend bins type` | a numeric legend switches between linear and quantile binning |
| `change legend range` | a numeric legend's min or max is edited |
| `swap categories` | the user finishes dragging a category label to reorder it |

A legend whose attribute holds colors uses those colors directly, so it has no color control and
sends none of the color notifications.

## Attribute drag — `dragDrop[attribute]`

Sent while a user drags an attribute, so a plugin can offer a drop target or react to one.

<!-- BEGIN GENERATED: notifications-drag -->
| Operation | `values` carries |
|---|---|
| `drag` | `attribute`, `collection`, `context`, `position`, `text` |
| `dragend` | `attribute`, `collection`, `context`, `text` |
| `dragenter` | `attribute`, `collection`, `context`, `text` |
| `dragleave` | `attribute`, `collection`, `context`, `text` |
| `dragstart` | `attribute`, `collection`, `context`, `text` |
| `drop` | `attribute`, `collection`, `context`, `position`, `text` |
<!-- END GENERATED: notifications-drag -->

| Operation | Fires when |
|---|---|
| `dragstart` | an attribute drag begins. Sent to every plugin |
| `dragend` | the drag ends, dropped or not. Sent to every plugin |
| `dragenter`, `dragleave` | the pointer enters or leaves your plugin during the drag |
| `drag` | the pointer moves over your plugin during the drag |
| `drop` | the attribute is dropped on your plugin |

`drag` and `drop` carry `position`, measured from the top-left corner of your plugin.

## Undo and redo — `undoChangeNotice`

<!-- BEGIN GENERATED: notifications-undo -->
| Operation | `values` carries |
|---|---|
| `clearRedo` | `canRedo`, `canUndo` |
| `clearUndo` | `canRedo`, `canUndo` |
| `redoAction` | — |
| `undoAction` | — |
<!-- END GENERATED: notifications-undo -->

| Operation | Fires when |
|---|---|
| `undoAction` | the user undoes an action your plugin reported as undoable |
| `redoAction` | the user redoes an action your plugin reported as undoable |
| `clearUndo` | the undo history becomes empty, so there is nothing left to undo. Sent to every plugin |
| `clearRedo` | the redo history becomes empty. Sent to every plugin |

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
| Operation | `values` carries |
|---|---|
| `newDocumentState` | `state` |
<!-- END GENERATED: notifications-document -->

| Operation | Fires when |
|---|---|
| `newDocumentState` | CODAP has assembled the document, in reply to a `get document` |

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
| Resource | Operation | `values` carries |
|---|---|---|
| `documentChangeNotice` | `dataContextCountChanged` | — |
| `documentChangeNotice` | `dataContextDeleted` | `deletedContext` |
| `global` | `localeChanged` | `lang`, `locale` |
| `documentChangeNotice` | `updateDocumentBegun` | — |
| `documentChangeNotice` | `updateDocumentEnded` | — |
| `global` | _none_ | `globalValue` |
| `interactiveFrame` | _computed at the call site_ | _not readable from the code_ |
| `logMessageNotice` | _none_ | `formatStr`, `logMonitor`, `message`, … |
<!-- END GENERATED: notifications-other -->

| Resource | Operation | Fires when |
|---|---|---|
| `documentChangeNotice` | `dataContextCountChanged` | a data context is created or deleted anywhere in the document |
| `documentChangeNotice` | `dataContextDeleted` | a data context is deleted. `deletedContext` is its name |
| `documentChangeNotice` | `updateDocumentBegun`, `updateDocumentEnded` | your plugin replaced the document with `update document`; the two bracket the replacement. Sent only to the plugin that asked |
| `global[<name>]` | none | a global value changes: a slider is dragged or animates, or a plugin sets the value with `update` on `global`. `<name>` is the slider's global value name, and `globalValue` is the new value. This is how a plugin follows a slider continuously. v3 does not yet send it when a plugin sets the value; see [Known limitations](#known-limitations) |
| `global` | `localeChanged` | CODAP's locale changed. Carries `lang`, the two-letter base language, and `locale`, the full one. By default CODAP reloads a plugin when the locale changes; a plugin receives this instead only if it sets `handlesLocaleChange: true` on [`interactiveFrame`](resources/interactive-frame.md), on every load |
| `logMessageNotice` | none | a user-analytics log event matched a monitor your plugin registered. Carries `message`, `formatStr` and `logMonitor`, and sometimes `topic` and `replaceArgs` |
| `interactiveFrame` | computed | guided-tour and highlight messages — `tourUpdate` and `highlightUpdate`. Not documented further yet, because the implementation behind them is being replaced |

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
when items are created, `moveCases`, and `dependentCases` all went to the requester too. v2 sent
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

**Closing a case table sends no notification.** v2 sent `delete` on `component` when the user
closed a case table from its title bar, and `create` when it was reopened, as the
[Lifecycle](#lifecycle) table describes. v3 sends neither. This is a known bug.

**Changing a map's legend attribute sends no notification.** v2 sent `legendAttributeChange` for
maps as for graphs. v3 sends nothing. This is a known bug.

**A plugin setting a global value sends no notification.** v2 sent `global[<name>]` whenever a
global value changed, whoever changed it. v3 sends it only when a slider changes the value, so a
plugin following a slider that another plugin drives through `update` on `global` hears nothing.
This is a known bug.

**Undo and redo are not announced on `document`.** v2 sent a default notification to every plugin
when the user undid or redid anything — `resource: "document"`, `operation: "undo"` or `"redo"` —
so a plugin could watch one resource and know the user had undone something. v3 does not send it,
so a v2 plugin listening on `document` hears nothing. This is a known bug; the intended behavior is
that v3 sends v2's notification as well as its own.

**Log event names do not match v2's.** About 27 event tokens were renamed in v3, and about 11
payloads reshaped — `addAxisAttribute`, `attributeRemoved`, `dragEnd`, the `toggle*` family and
the `Create <X> component` events among them. A plugin that registered a `logMessageMonitor` and
matches on `formatStr` sees different strings from the ones v2 emitted, and adornment toggles in
particular collapsed to a generic `Added <x>` / `Removed <x>` where v2 named each adornment. This
is a known bug; the intended behavior is that the tokens match v2's.

**`attributeChange` and `legendAttributeChange` are crossed in two cases, and `axisOrientation`
loses two values.** Dropping an attribute on the bottom or left axis, and dropping one on the
legend, both behave as v2 did. These cases do not:

| What the user does | v2 sends | v3 sends |
|---|---|---|
| Changes the legend attribute **from its menu** | `attributeChange`, `axisOrientation: "none"` | `legendAttributeChange`, no `axisOrientation` |
| Removes the legend attribute **from its menu** | `attributeChange`, `axisOrientation: "none"` | nothing |
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
