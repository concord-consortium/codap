# component

> **Applies to:** CODAP v3 · **Verified:** 2026-10-01 against `main` @ `a1ebcea11`
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

`<name-or-id>` accepts a component's name, its title, or its numeric id.

<!-- BEGIN GENERATED: scope -->
This resource is **not** scoped to a data context, so the default-data-context rule does not
apply. Naming a `dataContext` in the selector has no effect.
<!-- END GENERATED: scope -->

## Component types

Eleven types are registered in a normal CODAP build. A twelfth, `ErrorTester`, exists for
CODAP's own development and is registered only when CODAP is loaded with the `errorTester` URL
parameter — without it, nothing registers the type at all.

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
| `ErrorTester` | CODAP development only — not registered unless the `errorTester` URL parameter is set |

**The guide type is `guideView`, not `guide`.** Sending `"type": "guide"` returns
`Unsupported component type <value>`.

`game`, `guideView`, `imageComponentView` and `webView` are four names for one implementation:
all four are web views, and all four accept and return the same `URL` property.

**A component you create as one of these is reported back as `webView`.** CODAP derives the type
it reports from the web view's internal subtype, and `create` never sets one. So creating a
component with `"type": "guideView"` succeeds, but every later `get` and `componentList` reports
it as `webView`. The distinction survives only for components CODAP itself made, such as a guide
loaded from a document.

## Values

### Properties every component has

<!-- BEGIN GENERATED: values source=V2Component -->
| Property | Type | |
|---|---|---|
| `cannotClose` | boolean | optional |
| `dimensions` | { width: number; height: number } | optional |
| `id` | number | optional |
| `isResizable` | boolean \| { width: boolean, height: boolean } | optional |
| `isVisible` | boolean | optional |
| `name` | string | optional |
| `position` | string \| { left: number; top: number } | optional |
| `title` | string | optional |
| `type` | string | required |
<!-- END GENERATED: values -->

`type` is required when creating. On `create`, `title` falls back to `name` when only `name` is
given. `position` accepts either an object with `left` and `top` or a string.

`update` additionally accepts `currentGameName` as an alias for `name`, which is how V2 plugins
renamed a component.

### graph

<!-- BEGIN GENERATED: values-graph source=V2Graph -->
| Property | Type | | Declared in |
|---|---|---|---|
| `cannotClose` | boolean | optional | `V2Component` |
| `dimensions` | { width: number; height: number } | optional | `V2Component` |
| `id` | number | optional | `V2Component` |
| `isResizable` | boolean \| { width: boolean, height: boolean } | optional | `V2Component` |
| `isVisible` | boolean | optional | `V2Component` |
| `name` | string | optional | `V2Component` |
| `position` | string \| { left: number; top: number } | optional | `V2Component` |
| `title` | string | optional | `V2Component` |
| `type` | "graph" | required | `V2Graph` |
| `backgroundColor` | string | optional | `V2Graph` |
| `barChartFormula` | string | optional | `V2Graph` |
| `barChartScale` | string | optional | `V2Graph` |
| `captionAttributeID` | number \| null | optional | `V2Graph` |
| `captionAttributeName` | string \| null | optional | `V2Graph` |
| `dataContext` | string | optional | `V2Graph` |
| `displayOnlySelectedCases` | boolean | optional | `V2Graph` |
| `enableNumberToggle` | boolean | optional | `V2Graph` |
| `filterFormula` | string | optional | `V2Graph` |
| `hiddenCases` | number[] | optional | `V2Graph` |
| `legendAttributeID` | number \| null | optional | `V2Graph` |
| `legendAttributeName` | string \| null | optional | `V2Graph` |
| `numberToggleLastMode` | boolean | optional | `V2Graph` |
| `plotType` | string | optional | `V2Graph` |
| `pointColor` | string | optional | `V2Graph` |
| `pointSize` | number | optional | `V2Graph` |
| `pointsAreFusedIntoBars` | boolean | optional | `V2Graph` |
| `primaryAxis` | string | optional | `V2Graph` |
| `rightNumericAttributeID` | number \| null | optional | `V2Graph` |
| `rightNumericAttributeName` | string \| null | optional | `V2Graph` |
| `rightSplitAttributeID` | number \| null | optional | `V2Graph` |
| `rightSplitAttributeName` | string \| null | optional | `V2Graph` |
| `showConnectingLines` | boolean | optional | `V2Graph` |
| `showMeasuresForSelection` | boolean | optional | `V2Graph` |
| `strokeColor` | string | optional | `V2Graph` |
| `strokeSameAsFill` | boolean | optional | `V2Graph` |
| `topSplitAttributeID` | number \| null | optional | `V2Graph` |
| `topSplitAttributeName` | string \| null | optional | `V2Graph` |
| `transparent` | boolean | optional | `V2Graph` |
| `xAttributeID` | number \| null | optional | `V2Graph` |
| `xAttributeName` | string \| null | optional | `V2Graph` |
| `xAttributeType` | string | optional | `V2Graph` |
| `xLowerBound` | number | optional | `V2Graph` |
| `xUpperBound` | number | optional | `V2Graph` |
| `yAttributeID` | number \| null | optional | `V2Graph` |
| `yAttributeIDs` | number[] | optional | `V2Graph` |
| `yAttributeName` | string \| null | optional | `V2Graph` |
| `yAttributeNames` | string[] | optional | `V2Graph` |
| `yAttributeType` | string | optional | `V2Graph` |
| `yLowerBound` | number | optional | `V2Graph` |
| `yUpperBound` | number | optional | `V2Graph` |
| `y2AttributeID` | number \| null | optional | `V2Graph` |
| `y2AttributeName` | string \| null | optional | `V2Graph` |
| `y2AttributeType` | string | optional | `V2Graph` |
| `y2LowerBound` | number | optional | `V2Graph` |
| `y2UpperBound` | number | optional | `V2Graph` |
<!-- END GENERATED: values-graph -->

A `get` on a graph also returns **plot-specific properties** that are not in the table above,
because they are assembled from the current plot rather than declared:

| Property | When it appears |
|---|---|
| `pointsAreFusedIntoBars` | always |
| `barChartScale` | only when the graph is a bar chart |
| `barChartFormula` | only when the graph is a bar chart *and* a formula is set |

### slider

<!-- BEGIN GENERATED: values-slider source=V2Slider -->
| Property | Type | | Declared in |
|---|---|---|---|
| `cannotClose` | boolean | optional | `V2Component` |
| `dimensions` | { width: number; height: number } | optional | `V2Component` |
| `id` | number | optional | `V2Component` |
| `isResizable` | boolean \| { width: boolean, height: boolean } | optional | `V2Component` |
| `isVisible` | boolean | optional | `V2Component` |
| `name` | string | optional | `V2Component` |
| `position` | string \| { left: number; top: number } | optional | `V2Component` |
| `title` | string | optional | `V2Component` |
| `type` | "slider" | required | `V2Slider` |
| `animationDirection` | number | optional | `V2Slider` |
| `animationMode` | number | optional | `V2Slider` |
| `animationRate` | number | optional | `V2Slider` |
| `globalValueName` | string | optional | `V2Slider` |
| `multipleOf` | number | optional | `V2Slider` |
| `dateMultipleOfUnit` | string | optional | `V2Slider` |
| `scaleType` | string | optional | `V2Slider` |
| `upperBound` | number | optional | `V2Slider` |
| `lowerBound` | number | optional | `V2Slider` |
| `value` | number | optional | `V2Slider` |
<!-- END GENERATED: values-slider -->

### map

<!-- BEGIN GENERATED: values-map source=V2Map -->
| Property | Type | | Declared in |
|---|---|---|---|
| `cannotClose` | boolean | optional | `V2Component` |
| `dimensions` | { width: number; height: number } | optional | `V2Component` |
| `id` | number | optional | `V2Component` |
| `isResizable` | boolean \| { width: boolean, height: boolean } | optional | `V2Component` |
| `isVisible` | boolean | optional | `V2Component` |
| `name` | string | optional | `V2Component` |
| `position` | string \| { left: number; top: number } | optional | `V2Component` |
| `title` | string | optional | `V2Component` |
| `type` | "map" | required | `V2Map` |
| `center` | [number, number] | optional | `V2Map` |
| `dataContext` | string | optional | `V2Map` |
| `legendAttributeName` | string | optional | `V2Map` |
| `zoom` | number | optional | `V2Map` |
| `geoRaster` | V2MapGeoRaster | optional | `V2Map` |
<!-- END GENERATED: values-map -->

A map's `geoRaster` is an object of its own:

<!-- BEGIN GENERATED: values-geo-raster source=V2MapGeoRaster -->
| Property | Type | |
|---|---|---|
| `type` | string | required |
| `url` | string | required |
| `opacity` | number | optional |
<!-- END GENERATED: values-geo-raster -->

### caseTable

<!-- BEGIN GENERATED: values-case-table source=V2CaseTable -->
| Property | Type | | Declared in |
|---|---|---|---|
| `cannotClose` | boolean | optional | `V2Component` |
| `dimensions` | { width: number; height: number } | optional | `V2Component` |
| `id` | number | optional | `V2Component` |
| `isResizable` | boolean \| { width: boolean, height: boolean } | optional | `V2Component` |
| `isVisible` | boolean | optional | `V2Component` |
| `name` | string | optional | `V2Component` |
| `position` | string \| { left: number; top: number } | optional | `V2Component` |
| `title` | string | optional | `V2Component` |
| `type` | "caseTable" | required | `V2CaseTable` |
| `dataContext` | string | optional | `V2CaseTable` |
| `horizontalScrollOffset` | number | optional | `V2CaseTable` |
| `isIndexHidden` | boolean | optional | `V2CaseTable` |
<!-- END GENERATED: values-case-table -->

### caseCard

<!-- BEGIN GENERATED: values-case-card source=V2CaseCard -->
| Property | Type | | Declared in |
|---|---|---|---|
| `cannotClose` | boolean | optional | `V2Component` |
| `dimensions` | { width: number; height: number } | optional | `V2Component` |
| `id` | number | optional | `V2Component` |
| `isResizable` | boolean \| { width: boolean, height: boolean } | optional | `V2Component` |
| `isVisible` | boolean | optional | `V2Component` |
| `name` | string | optional | `V2Component` |
| `position` | string \| { left: number; top: number } | optional | `V2Component` |
| `title` | string | optional | `V2Component` |
| `type` | "caseCard" | required | `V2CaseCard` |
| `dataContext` | string | optional | `V2CaseCard` |
<!-- END GENERATED: values-case-card -->

### calculator

<!-- BEGIN GENERATED: values-calculator source=V2Calculator -->
| Property | Type | | Declared in |
|---|---|---|---|
| `cannotClose` | boolean | optional | `V2Component` |
| `dimensions` | { width: number; height: number } | optional | `V2Component` |
| `id` | number | optional | `V2Component` |
| `isResizable` | boolean \| { width: boolean, height: boolean } | optional | `V2Component` |
| `isVisible` | boolean | optional | `V2Component` |
| `name` | string | optional | `V2Component` |
| `position` | string \| { left: number; top: number } | optional | `V2Component` |
| `title` | string | optional | `V2Component` |
| `type` | "calculator" | required | `V2Calculator` |
<!-- END GENERATED: values-calculator -->

### text

<!-- BEGIN GENERATED: values-text source=V2Text -->
| Property | Type | | Declared in |
|---|---|---|---|
| `cannotClose` | boolean | optional | `V2Component` |
| `dimensions` | { width: number; height: number } | optional | `V2Component` |
| `id` | number | optional | `V2Component` |
| `isResizable` | boolean \| { width: boolean, height: boolean } | optional | `V2Component` |
| `isVisible` | boolean | optional | `V2Component` |
| `name` | string | optional | `V2Component` |
| `position` | string \| { left: number; top: number } | optional | `V2Component` |
| `title` | string | optional | `V2Component` |
| `type` | "text" | required | `V2Text` |
| `text` | string \| SlateExchangeValue | optional | `V2Text` |
<!-- END GENERATED: values-text -->

### webView and imageComponentView

<!-- BEGIN GENERATED: values-web-view source=V2WebView -->
| Property | Type | | Declared in |
|---|---|---|---|
| `cannotClose` | boolean | optional | `V2Component` |
| `dimensions` | { width: number; height: number } | optional | `V2Component` |
| `id` | number | optional | `V2Component` |
| `isResizable` | boolean \| { width: boolean, height: boolean } | optional | `V2Component` |
| `isVisible` | boolean | optional | `V2Component` |
| `name` | string | optional | `V2Component` |
| `position` | string \| { left: number; top: number } | optional | `V2Component` |
| `title` | string | optional | `V2Component` |
| `type` | "webView" | required | `V2WebView` |
| `URL` | string | optional | `V2WebView` |
<!-- END GENERATED: values-web-view -->

### game

<!-- BEGIN GENERATED: values-game source=V2Game -->
| Property | Type | | Declared in |
|---|---|---|---|
| `cannotClose` | boolean | optional | `V2Component` |
| `dimensions` | { width: number; height: number } | optional | `V2Component` |
| `id` | number | optional | `V2Component` |
| `isResizable` | boolean \| { width: boolean, height: boolean } | optional | `V2Component` |
| `isVisible` | boolean | optional | `V2Component` |
| `name` | string | optional | `V2Component` |
| `position` | string \| { left: number; top: number } | optional | `V2Component` |
| `title` | string | optional | `V2Component` |
| `type` | "game" | required | `V2Game` |
| `URL` | string | optional | `V2Game` |
| `currentGameUrl` | string | optional | `V2Game` |
| `currentGameName` | string | optional | `V2Game` |
<!-- END GENERATED: values-game -->

### guideView

<!-- BEGIN GENERATED: values-guide source=V2Guide -->
| Property | Type | | Declared in |
|---|---|---|---|
| `cannotClose` | boolean | optional | `V2Component` |
| `dimensions` | { width: number; height: number } | optional | `V2Component` |
| `id` | number | optional | `V2Component` |
| `isResizable` | boolean \| { width: boolean, height: boolean } | optional | `V2Component` |
| `isVisible` | boolean | optional | `V2Guide` |
| `name` | string | optional | `V2Component` |
| `position` | string \| { left: number; top: number } | optional | `V2Component` |
| `title` | string | optional | `V2Component` |
| `type` | "guideView" | required | `V2Guide` |
| `currentItemIndex` | number | optional | `V2Guide` |
| `items` | V2GuidePage[] | optional | `V2Guide` |
<!-- END GENERATED: values-guide -->

These properties are returned only for a web view CODAP itself built as a guide. A component a
plugin created with `"type": "guideView"` has no guide subtype, so `get` reports it as `webView`
and returns neither `currentItemIndex` nor `items`.

A guide's `items` are pages:

<!-- BEGIN GENERATED: values-guide-page source=V2GuidePage -->
| Property | Type | |
|---|---|---|
| `itemTitle` | string | required |
| `url` | string | required |
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

**`autoScale` works on three types only.** Graphs and maps rescale; a case table resizes its
columns instead. Every other component type returns `Component does not support rescale`.

**The type name `guide` does not work.** V2 documented the guide component as `guide`; v3
registers it as `guideView`. A plugin carrying the V2 spelling gets
`Unsupported component type <value>`.

**A graph's `get` and `update` do not cover the same properties.** `get` reports the plot-specific
properties described above, and `update` does not accept all of them back. Reading a graph and
posting the result to `update` unchanged is not a supported round trip.

**An unrecognized or missing `request` succeeds silently.** `notify` requires a `values` object,
but once it has one it recognizes only `select` and `autoScale` and returns success for anything
else. A misspelled request is indistinguishable from one that worked.

**`delete` hides some components instead of removing them.** Singleton components and those that
hide on close — the case table, case card, calculator and guide views — are marked hidden rather
than deleted. They stay in the document, keep their ids, and continue to appear in
`componentList` with `hidden: true`. Every other type is genuinely deleted.

**`ErrorTester` is not available unless CODAP is started for it.** Both its tile type and its
component handler are registered inside a check on the `errorTester` URL parameter, so in a
normal build `create` with that type returns `Unsupported component type <value>`.

## Notifications

A plugin sends `notify` to act on a component. `values` is required; `request` names the
operation:

| `request` | Effect |
|---|---|
| `select` | Brings the component to the front and selects it |
| `autoScale` | Rescales a graph or map; resizes columns on a case table |

Any other `request`, or none at all, returns `{"success": true}` without doing anything — see
[Known limitations](#known-limitations).

CODAP also broadcasts notifications to listening plugins when a component is created, updated or
deleted. The plugin that made the change does not receive an echo of its own request.

## Errors

<!-- BEGIN GENERATED: errors -->
| Error | When |
|---|---|
| `Component not found` | the selector does not resolve to a component |
| `A values object is required for this request.` | `create`, `update` or `notify` sent with no `values` |
| `Unsupported component type <value>` | `create` was given a `type` with no registered handler |
| `Unsupported component type` | `get` found a component whose type has no handler |
| `Could not create component` | the type was valid but the component could not be made |
| `Component does not support rescale` | `autoScale` on a type other than graph, map or case table |
<!-- END GENERATED: errors -->

## See also

- [`dataContext`](data-context.md) for the data a graph, table or map displays
- [`adornment`](adornment.md) for the measures a graph can show
- [The resource index](../README.md) for the request envelope and the `#default` rule
