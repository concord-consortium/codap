# dataContextFromURL

> **Applies to:** CODAP v3 · **Verified:** 2026-10-21
> · Parts of this page are generated — see [conventions](../conventions.md).

Creates a new data context from a CSV file on the web. CODAP downloads the file and imports it,
just as when the user opens a CSV file from a URL. Plugins use it to bring a published data set
into the document without downloading and parsing the file themselves.

To build a data context from data your plugin already has, use [`dataContext`](data-context.md)
and then [`item`](item.md) instead.

## Supported actions

<!-- BEGIN GENERATED: actions -->
| Action | Supported |
|---|---|
| `get` | — |
| `create` | ✓ |
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
| `dataContextFromURL` | create |
<!-- END GENERATED: selectors -->

<!-- BEGIN GENERATED: scope -->
This resource is scoped to a data context. Omitting one selects `#default`, your plugin's
own data context — see [the index](../README.md#the-default-data-context).
<!-- END GENERATED: scope -->

Creating is the exception to the defaulting rule: the data context does not exist yet, so
`create` takes the bare `dataContextFromURL` selector and no data context is selected.

## Values

### What `create` accepts

| Property | Type | Notes |
|---|---|---|
| `URL` | string | Required, and spelled in capitals. The address of a CSV file. The server must allow requests from other origins, or the download fails |
| `title` | string | Optional. The new data context's title. New in v3 |
| `showCaseTable` | boolean | Optional. `false` imports the data without opening a case table for it. New in v3 |

The first row of the file names the attributes, and each later row becomes one item, in a data
context with a single collection. The data context's name is the last part of the URL's path,
without its extension, exactly as it appears in the URL: `https://example.org/data/pets.csv`
makes a data context named `pets`, and a name containing `%20` keeps it. If a data context with
that name already exists, v2 made the new name unique, such as `pets_1`; v3 currently does not
(see [Known limitations](#known-limitations)), so look the new data context up by its `id`.

By default CODAP opens a case table for the new data context, as v2 did.

### What `create` returns

**The reply arrives only once the file has been downloaded and imported.** It carries the new
data context's `name` and `id`, and its `title` if you gave one:

```json
{ "success": true, "values": { "name": "pets", "id": 64 } }
```

The `values` are new in v3: v2 replied `{ "success": true }` at once, before it had downloaded
anything, so a v2 plugin learned of the new data context only from the
`dataContextCountChanged` notification. A plugin that must also run there should not depend on
`values`.

Because CODAP processes a plugin's requests one at a time, your plugin's later requests wait
until the import has finished. See [How CODAP processes requests](../guides/request-processing.md).

## Examples

**Import a CSV file without opening a case table.**

```json
{
  "action": "create",
  "resource": "dataContextFromURL",
  "values": {
    "URL": "https://example.org/data/pets.csv",
    "title": "Class pets",
    "showCaseTable": false
  }
}
```

```json
{ "success": true, "values": { "name": "pets", "id": 64, "title": "Class pets" } }
```

**Import a file and then read its structure.**

```js
// sendRequest stands for however your plugin sends requests — see "Sending requests and
// receiving notifications" in the index.
sendRequest({
  action: "create",
  resource: "dataContextFromURL",
  values: { URL: "https://example.org/data/pets.csv" }
}, result => {
  if (!result.success) return console.warn(result.values?.error)
  sendRequest({ action: "get", resource: `dataContext[${result.values.id}]` }, context => {
    // context.values.collections describes what was imported
  })
})
```

## Known limitations

**Other plugins are not told about the new data context.** v2 sent every plugin
`dataContextCountChanged` on `documentChangeNotice` when the import created the data context.
v3 sends nothing. This is a known bug. Until it is fixed, a plugin that needs to know about new
data contexts cannot rely on the notification for data imported this way, and should read
[`dataContextList`](data-context-list.md) again when it needs the current list.

**The import adds an entry to the undo history.** The intended behavior is that a request
through the API does not; see
[Undo and redo](../guides/undo-and-redo.md#known-limitations).

**A second import with the same name is not renamed.** v2 gave the new data context a unique
name, such as `pets_1`. v3 gives it the same name as the existing one, so selecting by name finds
only one of them. This is a known bug.

**Other differences from v2's import.** v2 ran the import through a separate importer, which also
set the data context's title to its name, recorded the URL and import date in its metadata, read
a header such as `Mass (kg)` as the attribute `Mass` with unit `kg`, and, for a file whose
attributes matched an existing data context's or with more than 5000 rows, asked the user whether
to add to or replace that data context. v3 does none of these. These are known bugs.

**A `data:` URL gets an odd name.** v2 named a data context imported from a `data:` URL `data`.
v3 names it from the text after the URL's last `/`, which for a `data:` URL is part of the data
itself. Give such an import a `title`, or rename the data context afterwards.

## Notifications

The intended notification is `dataContextCountChanged` on `documentChangeNotice`, sent to every
plugin when the new data context is created. v3 does not currently send it; see
[Known limitations](#known-limitations) and
[the notification catalog](../notifications.md#everything-else).

## Errors

| Error | Condition |
|---|---|
| `<action> <resource>: <field> required` | `values` is missing or has no `URL`; it reads create dataContextFromURL: URL required |
| `Failed to download and import CSV: <url>` | the file could not be downloaded, for example because the server refused a request from another origin, or the address does not exist |

v2 replied `{ "success": true }` to a request with no `URL` and did nothing, and failed with an
error from deep inside CODAP when `values` was missing altogether. It never reported a failed
download to the plugin, because it had already replied.

## See also

- [`dataContext`](data-context.md) for creating a data context from data your plugin has, and
  for reading the new one's collections and attributes
- [`dataContextList`](data-context-list.md) for listing the document's data contexts
- [How CODAP processes requests](../guides/request-processing.md) for how a slow request holds
  your later ones
- [The resource index](../README.md) for the request envelope and the full resource list
