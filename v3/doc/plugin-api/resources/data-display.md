# dataDisplay

> **Applies to:** CODAP v3 · **Verified:** 2026-09-25
> · Parts of this page are generated — see [conventions](../conventions.md).

Retrieves a rendered image of a data display component as a PNG data URI. A plugin uses this to
export, embed or transmit a picture of what the user is currently looking at — for instance to
include a graph in a report the plugin generates.

**Only graphs are supported today.** Although CODAP maps also render to an image internally, no
map handler is registered for this resource, so requesting a map returns the failure response
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
three resolve. The id is the number CODAP reports for the component, not a v3 internal string
id.

<!-- BEGIN GENERATED: scope -->
This resource is **not** scoped to a data context, so the default-data-context rule does not
apply. Naming a `dataContext` in the selector has no effect.
<!-- END GENERATED: scope -->

## Values

`get` takes no `values`.

The result carries one property:

<!-- BEGIN GENERATED: values -->
| Property | Type |
|---|---|
| `exportDataUri` | String |
<!-- END GENERATED: values -->

`exportDataUri` is a PNG encoded as a `data:` URI, produced by `canvas.toDataURL("image/png")`.
It can be assigned straight to an `<img src>`, or decoded to binary if the plugin needs the
bytes.

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
// sendRequest stands for however your plugin sends requests — see "Sending requests and
// receiving notifications" in the index.
sendRequest({
  action: 'get',
  resource: 'dataDisplay[Height by Weight]'
}, function (result) {
  if (result && result.success) {
    document.getElementById('preview').src = result.values.exportDataUri
  }
})
```

## Known limitations

**The image may not match the graph on screen.** `dataDisplay` renders through the same snapshot
path as the graph's own PNG export. Several adornments draw their text — equations, plotted
values, counts — as HTML, which cannot go into a PNG directly, so the export re-creates it as SVG
text through a converter that supports only a subset of the original styling. The text is
present, but it may not be styled as it appears on screen. This is a known limitation and is
expected to improve; a plugin embedding the image in a report should not assume pixel fidelity
for adornment labels.

## Notifications

This resource emits none. CODAP does not notify plugins when a display re-renders; request a
fresh `dataDisplay` when you need a current image.

## Errors

<!-- BEGIN GENERATED: errors -->
| Error |
|---|
| `Component not found` |
| `DataDisplay not found` |
<!-- END GENERATED: errors -->

`Component not found` means the selector matched nothing in the document.

`DataDisplay not found` has two causes worth distinguishing: the component's type has no data
display handler registered — which is every component other than a graph — or the graph handler
ran and could not produce an image.

> **Known bug in the failure response — do not code against it.** `Component not found` returns
> the normal shape, `{success: false, values: {error: "Component not found"}}`. The
> `DataDisplay not found` path currently does not: `values.error` holds a nested result object
> instead of the error string, and `success` can be `undefined` rather than `false`. **This will
> be corrected to the normal shape.** Write `if (!result.success)` — a truthiness test that keeps
> working either way — and check `typeof result.values?.error === "string"` before using it as a
> message, which is correct both before and after the fix.
