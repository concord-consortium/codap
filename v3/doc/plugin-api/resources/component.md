# component

> **Applies to:** CODAP v3 · **Verified:** 2026-10-02
> · Parts of this page are generated — see [conventions](../conventions.md).

A component is a tile in the CODAP workspace — a graph, a case table, a map, a slider, a web
view. Plugins use this resource to put components on screen, move and resize them, read how a
user has configured one, and close them again. Closing is not always deletion — see
[Known limitations](#known-limitations).

Every component shares a common set of properties. Each **component type** adds its own on top,
and those type-specific properties are where most of the detail lives.

## Supported actions

<!-- BEGIN GENERATED: actions -->
| Action | Supported |
|---|---|
| `get` | ✓ |
| `create` | ✓ |
| `update` | ✓ |
| `delete` | ✓ |
| `notify` | ✓ |
| `register` | — |
| `unregister` | — |
<!-- END GENERATED: actions -->

## Resource selector patterns

<!-- BEGIN GENERATED: selectors -->
| Pattern | Actions |
|---|---|
| `component[<name-or-id>]` | get, update, delete, notify |
| `component` | create |
<!-- END GENERATED: selectors -->

`<name-or-id>` accepts a component's name, its title, or its numeric id. CODAP returns the first
component that matches any of the three, so duplicate titles resolve silently to whichever comes
first, and a component *titled* `5` can shadow the component whose id is 5. Match on id where it
matters.

`get` does not always return `title`: a component with no title of its own omits the key.

<!-- BEGIN GENERATED: scope -->
This resource is **not** scoped to a data context, so the default-data-context rule does not
apply. Naming a `dataContext` in the selector has no effect.
<!-- END GENERATED: scope -->

## Component types

Eleven component types are available to plugins.

| `type` | What it is |
|---|---|
| `calculator` | The calculator |
| `caseCard` | Case card view of a data set |
| `caseTable` | Case table view of a data set |
| `game` | A plugin, in a web view |
| `graph` | A graph |
| `guideView` | A multi-page guide, in a web view |
| `imageComponentView` | An image, in a web view |
| `map` | A map |
| `slider` | A slider |
| `text` | A text box |
| `webView` | A plain web view |

`game`, `guideView`, `imageComponentView` and `webView` are all web views, and all four accept
and return a `URL`. They differ in how the component presents itself and in the `type` CODAP
reports back: a `guideView` is a multi-page guide with `items`, a `game` hosts a plugin.

A component created as one of these should report its own type, and a `guideView` should be a
working guide. Neither holds today — see [Known limitations](#known-limitations).

## Values

### Properties every component has

Properties are grouped by the interface that declares them. Names beginning `v2` or `ICodapV2`
are CODAP v2's own vocabulary, carried forward so v2 plugins keep working; the rest were added in
v3.


<!-- BEGIN GENERATED: values source=V2Component -->
| Property | Type | |
|---|---|---|
| `cannotClose` | `boolean` | optional |
| `dimensions` | `{ width: number; height: number }` | optional |
| `id` | `number` | optional |
| `isResizable` | `boolean \| { width: boolean, height: boolean }` | optional |
| `isVisible` | `boolean` | optional |
| `name` | `string` | optional |
| `position` | `string \| { left: number; top: number }` | optional |
| `title` | `string` | optional |
| `type` | `string` | required |
<!-- END GENERATED: values -->

`type` is required when creating. On `create`, `title` falls back to `name` when only `name` is
given.

Three of these behave differently from the table:

- **`isVisible` is never returned by `get`**, and `create` ignores it — a component created with
  `isVisible: false` is visible. Only `update` honors it. To read whether a component is on
  screen, use [`componentList`](component-list.md), whose `hidden` is the inverse.
- **`position` accepts a string or an object on `create`, but only an object on `update`.** A
  string position sent to `update` is dropped silently.
- **`title: ""` does not clear a title on `update`.** An empty string is treated as "no value
  given" and the existing title is kept.

`update` additionally accepts `currentGameName` as an alias for `name`, for v2 compatibility.
Neither it nor `currentGameUrl` is ever returned by `get`, and `currentGameUrl` works on `update`
only — a `create` carrying it, and no `URL`, makes a blank web view.

### graph

<!-- BEGIN GENERATED: values-graph source=V2Graph -->
| Property | Type | | Declared in |
|---|---|---|---|
| `cannotClose` | `boolean` | optional | `V2Component` |
| `dimensions` | `{ width: number; height: number }` | optional | `V2Component` |
| `id` | `number` | optional | `V2Component` |
| `isResizable` | `boolean \| { width: boolean, height: boolean }` | optional | `V2Component` |
| `isVisible` | `boolean` | optional | `V2Component` |
| `name` | `string` | optional | `V2Component` |
| `position` | `string \| { left: number; top: number }` | optional | `V2Component` |
| `title` | `string` | optional | `V2Component` |
| `type` | `"graph"` | required | `V2Graph` |
| `backgroundColor` | `string` | optional | `V2Graph` |
| `barChartFormula` | `string` | optional | `V2Graph` |
| `barChartScale` | `string` | optional | `V2Graph` |
| `captionAttributeID` | `number \| null` | optional | `V2Graph` |
| `captionAttributeName` | `string \| null` | optional | `V2Graph` |
| `dataContext` | `string` | optional | `V2Graph` |
| `displayOnlySelectedCases` | `boolean` | optional | `V2Graph` |
| `enableNumberToggle` | `boolean` | optional | `V2Graph` |
| `filterFormula` | `string` | optional | `V2Graph` |
| `hiddenCases` | `number[]` | optional | `V2Graph` |
| `legendAttributeID` | `number \| null` | optional | `V2Graph` |
| `legendAttributeName` | `string \| null` | optional | `V2Graph` |
| `numberToggleLastMode` | `boolean` | optional | `V2Graph` |
| `plotType` | `string` | optional | `V2Graph` |
| `pointColor` | `string` | optional | `V2Graph` |
| `pointSize` | `number` | optional | `V2Graph` |
| `pointsAreFusedIntoBars` | `boolean` | optional | `V2Graph` |
| `primaryAxis` | `string` | optional | `V2Graph` |
| `rightNumericAttributeID` | `number \| null` | optional | `V2Graph` |
| `rightNumericAttributeName` | `string \| null` | optional | `V2Graph` |
| `rightSplitAttributeID` | `number \| null` | optional | `V2Graph` |
| `rightSplitAttributeName` | `string \| null` | optional | `V2Graph` |
| `showConnectingLines` | `boolean` | optional | `V2Graph` |
| `showMeasuresForSelection` | `boolean` | optional | `V2Graph` |
| `strokeColor` | `string` | optional | `V2Graph` |
| `strokeSameAsFill` | `boolean` | optional | `V2Graph` |
| `topSplitAttributeID` | `number \| null` | optional | `V2Graph` |
| `topSplitAttributeName` | `string \| null` | optional | `V2Graph` |
| `transparent` | `boolean` | optional | `V2Graph` |
| `xAttributeID` | `number \| null` | optional | `V2Graph` |
| `xAttributeName` | `string \| null` | optional | `V2Graph` |
| `xAttributeType` | `string` | optional | `V2Graph` |
| `xLowerBound` | `number` | optional | `V2Graph` |
| `xUpperBound` | `number` | optional | `V2Graph` |
| `yAttributeID` | `number \| null` | optional | `V2Graph` |
| `yAttributeIDs` | `number[]` | optional | `V2Graph` |
| `yAttributeName` | `string \| null` | optional | `V2Graph` |
| `yAttributeNames` | `string[]` | optional | `V2Graph` |
| `yAttributeType` | `string` | optional | `V2Graph` |
| `yLowerBound` | `number` | optional | `V2Graph` |
| `yUpperBound` | `number` | optional | `V2Graph` |
| `y2AttributeID` | `number \| null` | optional | `V2Graph` |
| `y2AttributeName` | `string \| null` | optional | `V2Graph` |
| `y2AttributeType` | `string` | optional | `V2Graph` |
| `y2LowerBound` | `number` | optional | `V2Graph` |
| `y2UpperBound` | `number` | optional | `V2Graph` |
<!-- END GENERATED: values-graph -->

Three of the properties above are assembled from the current plot rather than read from the
graph, so whether `get` returns them depends on the plot:

| Property | When `get` returns it |
|---|---|
| `pointsAreFusedIntoBars` | always |
| `barChartScale` | only when the graph is a bar chart |
| `barChartFormula` | only when the graph is a bar chart *and* a formula is set |

`update` accepts all three.

**`plotType` and `primaryAxis` are read-only.** `get` returns both; neither can be set on
`create` or `update`. `primaryAxis` follows from which attributes are on which axes, so it is
read-only by design. `plotType` is a known gap — a user can change the plot type from the UI and
a plugin cannot. Every other property `get` returns can be sent back to `update`.

**`showConnectingLines` is ignored on `create`.** Set it with a following `update`.

**Attributes are applied on `create` only when `dataContext` names the data set exactly.** The
match is on name, not on id or title, and there is no defaulting — a `create` that gives the
context by id, by title, or not at all produces a graph with no attributes assigned, and reports
success.

### slider

A slider is backed by a global value. `globalValueName` must name one that already exists, and a
global can have only one slider.

**Omitting `globalValueName` on `create` discards everything else you sent.** CODAP makes a
default slider and ignores `lowerBound`, `upperBound`, `multipleOf`, `scaleType` and the
animation settings, reporting success. Always name a global when creating a slider with
properties, or set them with a following `update`.

`lowerBound` and `upperBound` apply only when **both** are given; one alone is ignored.

`animationDirection` and `animationMode` are numeric indexes, not names. `value` is honored on
`update` only.

<!-- BEGIN GENERATED: values-slider source=V2Slider -->
| Property | Type | | Declared in |
|---|---|---|---|
| `cannotClose` | `boolean` | optional | `V2Component` |
| `dimensions` | `{ width: number; height: number }` | optional | `V2Component` |
| `id` | `number` | optional | `V2Component` |
| `isResizable` | `boolean \| { width: boolean, height: boolean }` | optional | `V2Component` |
| `isVisible` | `boolean` | optional | `V2Component` |
| `name` | `string` | optional | `V2Component` |
| `position` | `string \| { left: number; top: number }` | optional | `V2Component` |
| `title` | `string` | optional | `V2Component` |
| `type` | `"slider"` | required | `V2Slider` |
| `animationDirection` | `number` | optional | `V2Slider` |
| `animationMode` | `number` | optional | `V2Slider` |
| `animationRate` | `number` | optional | `V2Slider` |
| `globalValueName` | `string` | optional | `V2Slider` |
| `multipleOf` | `number` | optional | `V2Slider` |
| `dateMultipleOfUnit` | `string` | optional | `V2Slider` |
| `scaleType` | `string` | optional | `V2Slider` |
| `upperBound` | `number` | optional | `V2Slider` |
| `lowerBound` | `number` | optional | `V2Slider` |
| `value` | `number` | optional | `V2Slider` |
<!-- END GENERATED: values-slider -->

### map

<!-- BEGIN GENERATED: values-map source=V2Map -->
| Property | Type | | Declared in |
|---|---|---|---|
| `cannotClose` | `boolean` | optional | `V2Component` |
| `dimensions` | `{ width: number; height: number }` | optional | `V2Component` |
| `id` | `number` | optional | `V2Component` |
| `isResizable` | `boolean \| { width: boolean, height: boolean }` | optional | `V2Component` |
| `isVisible` | `boolean` | optional | `V2Component` |
| `name` | `string` | optional | `V2Component` |
| `position` | `string \| { left: number; top: number }` | optional | `V2Component` |
| `title` | `string` | optional | `V2Component` |
| `type` | `"map"` | required | `V2Map` |
| `center` | `[number, number]` | optional | `V2Map` |
| `dataContext` | `string` | optional | `V2Map` |
| `legendAttributeName` | `string` | optional | `V2Map` |
| `zoom` | `number` | optional | `V2Map` |
| `geoRaster` | `V2MapGeoRaster` | optional | `V2Map` |
<!-- END GENERATED: values-map -->

**A map's `get` returns only `dataContext`.** `center`, `zoom`, `legendAttributeName` and
`geoRaster` can be set but not read back; a plugin that reads a map's position in order to
restore it later gets nothing. `geoRaster` is also ignored on `create` — set it with a following
`update`. That `get` returns all four is the intended behavior and a known bug today.

A map's `geoRaster` is an object of its own:

<!-- BEGIN GENERATED: values-geo-raster source=V2MapGeoRaster -->
| Property | Type | |
|---|---|---|
| `type` | `string` | required |
| `url` | `string` | required |
| `opacity` | `number` | optional |
<!-- END GENERATED: values-geo-raster -->

### caseTable

`dataContext` is **required** for `create`, despite being optional in the table below, and must
name a data context that exists. For `caseTable` only, CODAP also accepts the data context's name
in `name` — a v2 compatibility shim that does not apply to `caseCard`.

<!-- BEGIN GENERATED: values-case-table source=V2CaseTable -->
| Property | Type | | Declared in |
|---|---|---|---|
| `cannotClose` | `boolean` | optional | `V2Component` |
| `dimensions` | `{ width: number; height: number }` | optional | `V2Component` |
| `id` | `number` | optional | `V2Component` |
| `isResizable` | `boolean \| { width: boolean, height: boolean }` | optional | `V2Component` |
| `isVisible` | `boolean` | optional | `V2Component` |
| `name` | `string` | optional | `V2Component` |
| `position` | `string \| { left: number; top: number }` | optional | `V2Component` |
| `title` | `string` | optional | `V2Component` |
| `type` | `"caseTable"` | required | `V2CaseTable` |
| `dataContext` | `string` | optional | `V2CaseTable` |
| `horizontalScrollOffset` | `number` | optional | `V2CaseTable` |
| `isIndexHidden` | `boolean` | optional | `V2CaseTable` |
<!-- END GENERATED: values-case-table -->

### caseCard

`dataContext` is **required** for `create`, as for `caseTable`, and must name a data context that
exists.

<!-- BEGIN GENERATED: values-case-card source=V2CaseCard -->
| Property | Type | | Declared in |
|---|---|---|---|
| `cannotClose` | `boolean` | optional | `V2Component` |
| `dimensions` | `{ width: number; height: number }` | optional | `V2Component` |
| `id` | `number` | optional | `V2Component` |
| `isResizable` | `boolean \| { width: boolean, height: boolean }` | optional | `V2Component` |
| `isVisible` | `boolean` | optional | `V2Component` |
| `name` | `string` | optional | `V2Component` |
| `position` | `string \| { left: number; top: number }` | optional | `V2Component` |
| `title` | `string` | optional | `V2Component` |
| `type` | `"caseCard"` | required | `V2CaseCard` |
| `dataContext` | `string` | optional | `V2CaseCard` |
<!-- END GENERATED: values-case-card -->

### calculator

<!-- BEGIN GENERATED: values-calculator source=V2Calculator -->
| Property | Type | | Declared in |
|---|---|---|---|
| `cannotClose` | `boolean` | optional | `V2Component` |
| `dimensions` | `{ width: number; height: number }` | optional | `V2Component` |
| `id` | `number` | optional | `V2Component` |
| `isResizable` | `boolean \| { width: boolean, height: boolean }` | optional | `V2Component` |
| `isVisible` | `boolean` | optional | `V2Component` |
| `name` | `string` | optional | `V2Component` |
| `position` | `string \| { left: number; top: number }` | optional | `V2Component` |
| `title` | `string` | optional | `V2Component` |
| `type` | `"calculator"` | required | `V2Calculator` |
<!-- END GENERATED: values-calculator -->

### text

<!-- BEGIN GENERATED: values-text source=V2Text -->
| Property | Type | | Declared in |
|---|---|---|---|
| `cannotClose` | `boolean` | optional | `V2Component` |
| `dimensions` | `{ width: number; height: number }` | optional | `V2Component` |
| `id` | `number` | optional | `V2Component` |
| `isResizable` | `boolean \| { width: boolean, height: boolean }` | optional | `V2Component` |
| `isVisible` | `boolean` | optional | `V2Component` |
| `name` | `string` | optional | `V2Component` |
| `position` | `string \| { left: number; top: number }` | optional | `V2Component` |
| `title` | `string` | optional | `V2Component` |
| `type` | `"text"` | required | `V2Text` |
| `text` | `string \| SlateExchangeValue` | optional | `V2Text` |
<!-- END GENERATED: values-text -->

### webView and imageComponentView

<!-- BEGIN GENERATED: values-web-view source=V2WebView -->
| Property | Type | | Declared in |
|---|---|---|---|
| `cannotClose` | `boolean` | optional | `V2Component` |
| `dimensions` | `{ width: number; height: number }` | optional | `V2Component` |
| `id` | `number` | optional | `V2Component` |
| `isResizable` | `boolean \| { width: boolean, height: boolean }` | optional | `V2Component` |
| `isVisible` | `boolean` | optional | `V2Component` |
| `name` | `string` | optional | `V2Component` |
| `position` | `string \| { left: number; top: number }` | optional | `V2Component` |
| `title` | `string` | optional | `V2Component` |
| `type` | `"webView"` | required | `V2WebView` |
| `URL` | `string` | optional | `V2WebView` |
<!-- END GENERATED: values-web-view -->

### game

<!-- BEGIN GENERATED: values-game source=V2Game -->
| Property | Type | | Declared in |
|---|---|---|---|
| `cannotClose` | `boolean` | optional | `V2Component` |
| `dimensions` | `{ width: number; height: number }` | optional | `V2Component` |
| `id` | `number` | optional | `V2Component` |
| `isResizable` | `boolean \| { width: boolean, height: boolean }` | optional | `V2Component` |
| `isVisible` | `boolean` | optional | `V2Component` |
| `name` | `string` | optional | `V2Component` |
| `position` | `string \| { left: number; top: number }` | optional | `V2Component` |
| `title` | `string` | optional | `V2Component` |
| `type` | `"game"` | required | `V2Game` |
| `URL` | `string` | optional | `V2Game` |
| `currentGameUrl` | `string` | optional | `V2Game` |
| `currentGameName` | `string` | optional | `V2Game` |
<!-- END GENERATED: values-game -->

### guideView

<!-- BEGIN GENERATED: values-guide source=V2Guide -->
| Property | Type | | Declared in |
|---|---|---|---|
| `cannotClose` | `boolean` | optional | `V2Component` |
| `dimensions` | `{ width: number; height: number }` | optional | `V2Component` |
| `id` | `number` | optional | `V2Component` |
| `isResizable` | `boolean \| { width: boolean, height: boolean }` | optional | `V2Component` |
| `isVisible` | `boolean` | optional | `V2Guide` |
| `name` | `string` | optional | `V2Component` |
| `position` | `string \| { left: number; top: number }` | optional | `V2Component` |
| `title` | `string` | optional | `V2Component` |
| `type` | `"guideView"` | required | `V2Guide` |
| `currentItemIndex` | `number` | optional | `V2Guide` |
| `items` | `V2GuidePage[]` | optional | `V2Guide` |
<!-- END GENERATED: values-guide -->

These properties are returned only for a web view CODAP itself built as a guide — not for one a
plugin created, for the reason given under [Known limitations](#known-limitations).

A guide's `items` are pages:

<!-- BEGIN GENERATED: values-guide-page source=V2GuidePage -->
| Property | Type | |
|---|---|---|
| `itemTitle` | `string` | required |
| `url` | `string` | required |
<!-- END GENERATED: values-guide-page -->

## Examples

Create a graph with two axes:

```json
{
  "action": "create",
  "resource": "component",
  "values": {
    "type": "graph",
    "name": "Height by Weight",
    "dataContext": "Mammals",
    "xAttributeName": "Weight",
    "yAttributeName": "Height",
    "dimensions": { "width": 400, "height": 300 }
  }
}
```

Read a graph back, to see how the user has reconfigured it:

```json
{
  "action": "get",
  "resource": "component[Height by Weight]"
}
```

Move and resize a component:

```json
{
  "action": "update",
  "resource": "component[Height by Weight]",
  "values": {
    "position": { "left": 20, "top": 40 },
    "dimensions": { "width": 600, "height": 400 }
  }
}
```

Bring a component to the front, then rescale it:

```json
{
  "action": "notify",
  "resource": "component[Height by Weight]",
  "values": { "request": "select" }
}
```

```json
{
  "action": "notify",
  "resource": "component[Height by Weight]",
  "values": { "request": "autoScale" }
}
```

## Known limitations

**`autoScale` applies to three types.** Graphs and maps rescale; a case table resizes its
columns instead. Every other type returns `Component does not support rescale`. This matches v2.

**Creating a web view does not set its type.** `create` with `guideView`, `game` or
`imageComponentView` makes a plain web view: CODAP decides the type it reports from an internal
subtype that `create` never sets. The consequences are specific:

- A `guideView` is not a guide. `items` and `currentItemIndex` are ignored on `create`, `update`
  cannot add them afterwards, and `delete` removes the component instead of hiding it.
- A `game` reports as `webView` until the plugin it hosts completes its handshake with CODAP,
  and as `game` from then on.
- `get` and `componentList` report `webView` for all three until that happens.

This is a known bug. The intended behavior is the one described under
[Component types](#component-types).

**An unrecognized or missing `request` succeeds silently.** `notify` requires a `values` object,
but once it has one it recognizes only `select` and `autoScale` and returns success for anything
else. A misspelled request is indistinguishable from one that worked.

**`delete` hides some components instead of removing them.** Singleton components and those that
hide on close — the case table, case card, calculator and guide views — are marked hidden rather
than deleted. They stay in the document, keep their ids, and continue to appear in
`componentList` with `hidden: true`. Every other type is genuinely deleted.

**The `image` component type is not accepted.** v2 took `"type": "image"` for an image component;
v3 registers only `imageComponentView` and returns `Unsupported component type <value>` for
`image`. A v2 plugin carrying that spelling breaks. This is a known bug — unlike `guide`, this
spelling really worked in v2.

**`update` with `title: ""` does not clear a title.** An empty string is read as "no value given".
v2 wrote it. This is a known bug.

**`create` does not always create.** Three types reuse a component that already exists:

- **`caseTable` and `caseCard`.** If one of that type already exists for the data context, CODAP
  re-shows that tile and ignores every other value you sent — title, dimensions, position,
  `isIndexHidden`, `horizontalScrollOffset`. If the *other* type exists for that context, CODAP
  hides it and creates the requested one, applying the title and dimensions. This is deliberate,
  and matches v2: there is one table and one card per data context.
- **`calculator`.** There is one calculator, and `create` toggles its visibility rather than
  showing it. Creating a calculator when one is already on screen **hides** it, and still
  returns `success: true` with the existing component's id. `title` is applied to the existing
  tile; dimensions and position are ignored. This is a known bug, inherited from v2; `create`
  should show a hidden calculator and leave a visible one alone.

## Notifications

A plugin sends `notify` to act on a component. `values` is required; `request` names the
operation:

| `request` | Effect |
|---|---|
| `select` | Brings the component to the front and selects it |
| `autoScale` | Rescales a graph or map; resizes columns on a case table |

Any other `request`, or none at all, returns `{"success": true}` without doing anything — see
[Known limitations](#known-limitations).

### What CODAP sends

CODAP notifies listening plugins when a component changes. The payload carries `operation`, the
component's `id`, its v2 `type` and its `diType`; `delete` adds `name` and `title`, and `update`
echoes the values from the request.

Over eighty component operations exist, most of them raised by the user working in an inspector
panel. [The notification catalog](../notifications.md#component-changes--component) lists them
all, grouped by component type.

| `operation` | Sent when |
|---|---|
| `create` | A component is created, by a plugin or by the user |
| `update` | A component's properties change |
| `delete` | A component is removed — **also sent when the component is only hidden**. A `create` that hides a visible calculator still sends `create` |
| `titleChange` | The user renames a component |
| `hide`, `show` | A singleton component is hidden or revealed. Closing a case table sends `delete`, not `hide` |

Two exclusions are worth knowing. A plugin does not receive the `create`, `update` or `delete`
notification for a change it made itself. And an `update` to the plugin's **own** component
notifies nobody at all, not just the sender.

## Errors

<!-- BEGIN GENERATED: errors -->
| Error |
|---|
| `Component not found` |
| `A values object is required for this request.` |
| `Unsupported component type <value>` |
| `Unsupported component type` |
| `Could not create component` |
| `Component does not support rescale` |
| `<action> <type>: dataContext required` |
| `DataSetMetadata not found for <value>` |
| `Cannot assign <value1> to <value2>` |
| `Current plot type does not support fusing points into bars` |
| `Invalid bar chart scale: <value>` |
| `Global not found: <value>` |
| `Cannot create multiple sliders for <value>` |
| `Unsupported scaleType <value>`, `Unsupported dateUnit <value>` |
| `Unsupported animationDirection <value>`, `Unsupported animationMode <value>` |
<!-- END GENERATED: errors -->

| Error | Condition |
|---|---|
| `Component not found` | the selector does not resolve to a component |
| `A values object is required for this request.` | `create`, `update` or `notify` sent with no `values` |
| `Unsupported component type <value>` | `create` was given a `type` with no registered handler. `update` with a non-object `values` also produces it, naming CODAP's internal type; a `create` with no `type` at all produces it with an empty name |
| `Unsupported component type` | `get` found a component whose type has no handler |
| `Could not create component` | the type was valid but the component could not be made |
| `Component does not support rescale` | `autoScale` on a type other than graph, map or case table |
| `<action> <type>: dataContext required` | `create` of a `caseTable` or `caseCard` without a resolvable `dataContext` |
| `DataSetMetadata not found for <value>` | the data context resolved but carries no metadata |
| `Cannot assign <value1> to <value2>` | a graph `create` or `update` assigned an attribute to a role that cannot take it |
| `Current plot type does not support fusing points into bars` | `pointsAreFusedIntoBars` on a plot that cannot show bars |
| `Invalid bar chart scale: <value>` | `barChartScale` with a value that is not a breakdown type |
| `Global not found: <value>` | a slider named a `globalValueName` that does not exist |
| `Cannot create multiple sliders for <value>` | a second slider for a global that already has one |
| `Unsupported scaleType <value>`, `Unsupported dateUnit <value>` | a slider `scaleType` or `dateMultipleOfUnit` CODAP does not recognize |
| `Unsupported animationDirection <value>`, `Unsupported animationMode <value>` | a slider animation index out of range |

## See also

- [`dataContext`](data-context.md) for the data a graph, table or map displays
- [`adornment`](adornment.md) for the measures a graph can show
- [The resource index](../README.md) for the request envelope and the full resource list
