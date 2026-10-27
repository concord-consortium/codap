# dataContextList

> **Applies to:** CODAP v3 · **Verified:** 2026-10-21
> · Parts of this page are generated — see [conventions](../conventions.md).

Lists every data context in the document. Plugins use it to find out what data the document
holds — to look up a data set by name before reading it, or to let the user choose one.

The list is a summary. To read a data context's collections and attributes, `get` that
[`dataContext`](data-context.md).

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
| `dataContextList` | get |
<!-- END GENERATED: selectors -->

<!-- BEGIN GENERATED: scope -->
This resource is **not** scoped to a data context, so the default-data-context rule does not
apply. Naming a `dataContext` in the selector has no effect.
<!-- END GENERATED: scope -->

## Values

`get` takes no `values`. The response's `values` is an array, one entry per data context, in the
order the data contexts were added to the document. It is empty when the document has none.

| Property | Notes |
|---|---|
| `name` | the data context's name, which is how selectors refer to it |
| `title` | the data context's title. See [Known limitations](#known-limitations) |
| `guid` | the data context's id |
| `id` | the same value as `guid`. New in v3; v2 sent only `guid` |

Use `name` or `id` to refer to a data context in later requests. v3 selectors also accept a
title, but a title can be changed by the user, and v2 did not accept one.

## Examples

```json
{ "action": "get", "resource": "dataContextList" }
```

```json
{
  "success": true,
  "values": [
    { "name": "Mammals", "title": "Mammal measurements", "guid": 42, "id": 42 },
    { "name": "Planets", "title": "Planets", "guid": 57, "id": 57 }
  ]
}
```

**Find a data context by name.**

```js
// sendRequest stands for however your plugin sends requests — see "Sending requests and
// receiving notifications" in the index.
sendRequest({ action: "get", resource: "dataContextList" }, result => {
  const mammals = result.success && result.values.find(dc => dc.name === "Mammals")
  if (mammals) {
    // read it with get dataContext[Mammals]
  }
})
```

## Known limitations

**`title` is missing when the data context has no title of its own.** v2 then reported the title
CODAP shows for it: its collections' names joined with `/`, such as `People/Measurements`, or
failing that its name. So `title` was always present. v3 reports only a title that was set
explicitly; otherwise the key is absent, or present with the value `undefined`. This is a known
bug.

## Notifications

This resource sends none. When a data context is created or deleted, CODAP sends
`dataContextCountChanged` on `documentChangeNotice`; see
[the notification catalog](../notifications.md#everything-else). v3 does not yet send it for a
data context imported with [`dataContextFromURL`](data-context-from-url.md#known-limitations), so
read `dataContextList` again after such an import.

## Errors

This resource reports no errors of its own. A `get` on a document with no data contexts returns
an empty array.

## See also

- [`dataContext`](data-context.md) for reading, creating and changing one data context
- [`dataContextFromURL`](data-context-from-url.md) for creating a data context from a CSV file
- [The resource index](../README.md) for the request envelope and the full resource list
