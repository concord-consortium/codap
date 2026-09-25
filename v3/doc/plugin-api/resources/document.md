# document

> **Applies to:** CODAP v3 · **Verified:** 2026-09-25 against `main` @ `ae2105cf4`
> · Parts of this page are generated — see [conventions](../conventions.md).

Reads or replaces the entire CODAP document as **CODAP v2 document JSON** — every data context,
component and global value in one payload. Used by plugins that save, restore or transform whole
documents rather than individual pieces of them.

**Neither action returns the document in its response.** Both reply `{"success": true}`
immediately and do their work afterwards, delivering results as notifications. This is the most
important thing to know about this resource, and the rest of this page is mostly about it.

## Supported actions

<!-- BEGIN GENERATED: actions -->
| Action | Supported |
|---|---|
| `get` | ✓ |
| `update` | ✓ |
| `create` | — |
| `delete` | — |
| `notify` | — |
| `register` | — |
| `unregister` | — |
<!-- END GENERATED: actions -->

## Resource selector patterns

<!-- BEGIN GENERATED: selectors -->
| Pattern | Actions |
|---|---|
| `document` | get, update |
<!-- END GENERATED: selectors -->

No bracketed selector — there is one document. This resource is **not** scoped to a data context,
so the default-data-context rule does not apply.

## get — subscribing to document state

`get document` returns `{"success": true}` and nothing else. The document arrives afterwards, as
a notification sent to **every plugin whose `subscribeToDocuments` is `true`** — including
plugins that did not make the request:

```json
{
  "action": "notify",
  "resource": "document",
  "values": {
    "operation": "newDocumentState",
    "state": { "...": "the whole v2 document JSON" }
  }
}
```

A plugin that has not set `subscribeToDocuments` receives nothing at all, and its `get` looks
like a silent no-op. To use this resource you must first opt in:

```json
{
  "action": "update",
  "resource": "interactiveFrame",
  "values": { "subscribeToDocuments": true }
}
```

Then issue `get document` and handle `newDocumentState` in your notification handler.

## update — replacing the document

`update document` takes a complete v2 document JSON in `values` and replaces the current document
with it. It also returns `{"success": true}` immediately; the replacement happens asynchronously.

The work is bracketed by two notifications on the `documentChangeNotice` resource:

```json
{ "action": "notify", "resource": "documentChangeNotice", "values": { "operation": "updateDocumentBegun" } }
```

```json
{ "action": "notify", "resource": "documentChangeNotice", "values": { "operation": "updateDocumentEnded" } }
```

These go **only to the plugin that issued the update**, not to other plugins and not to an
embedded-mode parent. Treat them as your own progress signal: the document is not replaced when
the `success` response arrives, only when `updateDocumentEnded` does.

Replacing the document destroys and rebuilds the component and data-context models. CODAP matches
incoming models to existing ones by the ids inside them — data set ids and tile ids — so that
applying a snapshot updates existing instances rather than creating duplicates. A plugin holding
ids from before the update should re-read them afterwards rather than assume they survived.

## Values

### get

Takes no `values`.

### update

| Property | Type | Notes |
|---|---|---|
| *(the document)* | Object | A complete CODAP **v2** document JSON object. This is the same format `get` delivers in `values.state`, and the format CODAP writes when saving a document. |

## Examples

**Subscribe, then request the document.**

```json
{
  "action": "update",
  "resource": "interactiveFrame",
  "values": { "subscribeToDocuments": true }
}
```

```json
{
  "action": "get",
  "resource": "document"
}
```

The response is `{"success": true}`. The document follows as a `newDocumentState` notification.

**Round-trip a document.**

```js
// sendRequest stands for however your plugin sends requests, and requestHandler is the
// handler you passed to iframePhone — see Request shape in the index.

// 1. opt in once, at startup
sendRequest({
  action: 'update', resource: 'interactiveFrame',
  values: { subscribeToDocuments: true }
})

// 2. CODAP delivers the document to your request handler as a notification
function requestHandler (command, callback) {
  if (command.resource === 'document' && command.values.operation === 'newDocumentState') {
    savedState = command.values.state
  }
  callback({ success: true })
}

// 3. ask for it
sendRequest({ action: 'get', resource: 'document' })

// 4. later, restore it
sendRequest({ action: 'update', resource: 'document', values: savedState })
```

## Notifications

| Resource | Operation | When |
|---|---|---|
| `document` | `newDocumentState` | After `get document`, to every plugin with `subscribeToDocuments: true`. Carries the document in `values.state`. |
| `documentChangeNotice` | `updateDocumentBegun` | Before an `update document` begins. Sent only to the requesting plugin. |
| `documentChangeNotice` | `updateDocumentEnded` | After it completes. Sent only to the requesting plugin. |

CODAP v3 does **not** currently emit default `undo`/`redo` notifications on this resource, which
CODAP v2 did. That gap is tracked as CODAP-1354.

## Errors

This handler returns no error results of its own — both actions return `{"success": true}`
unconditionally, before their work is attempted. A malformed document passed to `update` will
fail during the asynchronous import, after you have already received a success response, and the
failure is reported to the console rather than to the plugin.
