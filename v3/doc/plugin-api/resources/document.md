# document

> **Applies to:** CODAP v3 · **Verified:** 2026-10-22
> · Parts of this page are generated — see [conventions](../conventions.md).

Reads or replaces the entire CODAP document as **CODAP v2 document JSON** — every data context,
component and global value in one payload. Used by plugins that save, restore or transform whole
documents rather than individual pieces of them.

**Neither action returns the document in its response.** `get` replies `{"success": true}`
immediately and delivers the document afterwards, as a notification. `update` replies once the
document has been replaced, and announces the replacement with notifications.

## Supported actions

<!-- BEGIN GENERATED: actions -->
| Action | Supported |
|---|---|
| `get` | ✓ |
| `create` | — |
| `update` | ✓ |
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

No bracketed selector — there is one document.

<!-- BEGIN GENERATED: scope -->
This resource is **not** scoped to a data context, so the default-data-context rule does not
apply. Naming a `dataContext` in the selector has no effect.
<!-- END GENERATED: scope -->

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
with it. It replies once the document has been replaced: `{"success": true}`, or an error if the
replacement failed.

The work is bracketed by two notifications on the `documentChangeNotice` resource:

```json
{ "action": "notify", "resource": "documentChangeNotice", "values": { "operation": "updateDocumentBegun" } }
```

```json
{ "action": "notify", "resource": "documentChangeNotice", "values": { "operation": "updateDocumentEnded", "success": true } }
```

`updateDocumentBegun` is sent before the reply. After a successful replacement,
`updateDocumentEnded` follows about half a second after the reply, once the replaced document has
settled; after a failure, it comes just before the error reply. Both go to every plugin, including the one that sent
the update, and to the page CODAP is [embedded in](../guides/embedded-server.md), as in v2. So each
one can tell that the document is being replaced, whoever replaced it.

`updateDocumentEnded` is sent whether the replacement succeeded or failed, and its `success` says
which. v2 sent no `success`, and sent no `updateDocumentEnded` at all when the replacement failed.

**Your own state is not restored from the document you send.** Before applying the incoming
snapshot, CODAP replaces the incoming state of every plugin with `subscribeToDocuments: true`
with that plugin's *current* state. This is deliberate — it stops a plugin that saved a document
from overwriting itself when it restores one — but it means the copy of your state inside the
document you pass to `update` is ignored. Restore your own state yourself.

Replacing the document destroys and rebuilds models, and not everything is preserved across the
change. **A plugin holding ids from before an update should re-read them afterwards rather than
assume they survived.**

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

The response carries no document:

```json
{ "success": true }
```

The document follows as a `newDocumentState` notification.

**Round-trip a document.**

```js
// sendRequest stands for however your plugin sends requests, and requestHandler is the
// handler you passed to iframePhone — see "Sending requests and receiving notifications"
// in the index.

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
| `documentChangeNotice` | `updateDocumentBegun` | Before an `update document` begins. Sent to every plugin and to the host page. |
| `documentChangeNotice` | `updateDocumentEnded` | After it completes or fails. Carries `success`. Sent to every plugin and to the host page. |

CODAP v3 does **not** currently emit default `undo`/`redo` notifications on this resource, which
CODAP v2 did. That is a known gap.

## Errors

| Error | Condition |
|---|---|
| `A values object is required for this request.` | `update` without `values` |
| `An error occurred while processing the request.` | `update` with a document that could not be read or applied. `updateDocumentEnded` with `success: false` comes just before this reply. A failure partway through applying the document can leave it partly replaced, so read it again before relying on it |

`get` returns `{"success": true}` before the document is serialized; the document arrives in the
`newDocumentState` notification. v2 replied to a failed `update` with the exception's own message.
