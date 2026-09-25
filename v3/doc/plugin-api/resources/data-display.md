# dataDisplay

> **Applies to:** CODAP v3 · **Verified:** 2026-09-25 against `main` @ `ae2105cf4`
> · Parts of this page are generated — see [conventions](../conventions.md).

Retrieves a rendered image of a data display component as a PNG data URI. A plugin uses this to
export, embed or transmit a picture of what the user is currently looking at — for instance to
include a graph in a report the plugin generates.

**Only graphs are supported today.** Although CODAP maps also render to an image internally, no
map handler is registered for this resource (`graph-registration.ts:121` is the only
`registerDataDisplayHandler` call site), so requesting a map returns the failure response
described under [Errors](#errors).

This request is **asynchronous** — CODAP re-renders the display before replying, so the response
arrives later than for most resources. A plugin that issues several in a row should wait for each
callback rather than assuming immediate delivery.

## Supported actions

<!-- BEGIN GENERATED: actions -->
| Action | Supported |
|---|---|
| `get` | ✓ |
| `create` | — |
| `update` | — |
| `delete` | — |
| `notify` | — |
| `register` | — |
| `unregister` | — |
<!-- END GENERATED: actions -->

## Resource selector patterns

<!-- BEGIN GENERATED: selectors -->
| Pattern | Actions |
|---|---|
| `dataDisplay[<component>]` | get |
<!-- END GENERATED: selectors -->

`<component>` identifies the graph by its **title**, its **name**, or its **numeric id** — all
three resolve (`resource-parser-utils.ts:110`). The id is the number CODAP reports for the
component, not a v3 internal string id.

This resource is **not** scoped to a data context, so the default-data-context rule does not
apply to it. Naming a `dataContext` in the selector has no effect.

## Values

`get` takes no `values`.

The result carries one property:

<!-- BEGIN GENERATED: values -->
| Property | Type | Notes |
|---|---|---|
| `exportDataUri` | String | A PNG image encoded as a `data:` URI, produced by `canvas.toDataURL("image/png")`. Suitable for an `<img src>` or for decoding to binary. |
<!-- END GENERATED: values -->

## Examples

**Get a PNG of a graph titled "Height by Weight".**

Send:

```json
{
  "action": "get",
  "resource": "dataDisplay[Height by Weight]"
}
```

Receive:

```json
{
  "success": true,
  "values": {
    "exportDataUri": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  }
}
```

**Display it in the plugin.**

```js
// sendRequest stands for however your plugin sends requests — see Request shape in the index.
sendRequest({
  action: 'get',
  resource: 'dataDisplay[Height by Weight]'
}, function (result) {
  if (result && result.success) {
    document.getElementById('preview').src = result.values.exportDataUri
  }
})
```

## Notifications

This resource emits none. CODAP does not notify plugins when a display re-renders; request a
fresh `dataDisplay` when you need a current image.

## Errors

<!-- BEGIN GENERATED: errors -->
| Error | Condition |
|---|---|
| `Component not found` | The selector matched no component in the document. |
| `DataDisplay not found` | The component exists but no image could be produced — either its type has no data display handler registered (any component other than a graph), or rendering failed. |
<!-- END GENERATED: errors -->

> **Note on the failure response shape.** For `Component not found`, the response is the usual
> `{success: false, values: {error: "Component not found"}}`. The `DataDisplay not found` path
> differs: `data-display-handler.ts:29` assigns the whole error *result object* to `values.error`
> rather than the error string, and when no handler is registered for the component's type
> `success` is `undefined` rather than `false`. So the response is shaped
> `{"success": undefined, "values": {"error": {"success": false, "values": {"error": "DataDisplay not found"}}}}`.
> This looks unintended — every other handler returns `errorResult()` directly — but it is what
> v3 does today, so test for `result.success` being truthy rather than comparing it to `false`,
> and do not assume `values.error` is a string. Tracked as **CODAP-1550**; this note comes out
> when that is fixed.
