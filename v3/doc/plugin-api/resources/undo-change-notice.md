# undoChangeNotice

> **Applies to:** CODAP v3 · **Verified:** 2026-10-21
> · Parts of this page are generated — see [conventions](../conventions.md).

The resource through which a plugin takes part in CODAP's undo history. A plugin sends it to put
one of its own actions on the history, or to press undo or redo from buttons of its own. CODAP
sends it back to tell the plugin to undo or redo one of its actions, and to report changes in
whether undo and redo are available.

This page is the reference card. How the pieces fit together, and a complete example of a plugin
keeping its own stack of actions, are in [Undo and redo](../guides/undo-and-redo.md).

## Supported actions

<!-- BEGIN GENERATED: actions -->
| Action | Supported |
|---|---|
| `get` | — |
| `create` | — |
| `update` | — |
| `delete` | — |
| `notify` | ✓ |
| `register` | — |
| `unregister` | — |
<!-- END GENERATED: actions -->

## Resource selector patterns

<!-- BEGIN GENERATED: selectors -->
| Pattern | Actions |
|---|---|
| `undoChangeNotice` | notify |
<!-- END GENERATED: selectors -->

No bracketed selector — there is one undo history for the whole document.

<!-- BEGIN GENERATED: scope -->
This resource is **not** scoped to a data context, so the default-data-context rule does not
apply. Naming a `dataContext` in the selector has no effect.
<!-- END GENERATED: scope -->

## Values

### What a plugin sends

`notify` takes an `operation`:

| Property | Type | Notes |
|---|---|---|
| `operation` | String | required. One of the operations below |
| `logMessage` | String | optional, with `undoableActionPerformed` only. Describes the action in CODAP's log, which records `Interactive action occurred: <logMessage>`, or `Unknown action` without it |

| Operation | What CODAP does |
|---|---|
| `undoableActionPerformed` | Adds an entry for the plugin's action to the undo history. When the user undoes or redoes that entry, CODAP sends the plugin `undoAction` or `redoAction` |
| `undoButtonPress` | Undoes the most recent entry in the history, whichever part of CODAP made it. With nothing to undo, does nothing and still succeeds |
| `redoButtonPress` | Redoes the most recently undone entry, the same way |

Each replies with the state of the history afterwards. If the entry for `undoableActionPerformed`
takes more than a second to be recorded, which should not happen, the reply describes the history
as it stands.

| Property | Notes |
|---|---|
| `canUndo` | `true` when the history has an entry to undo |
| `canRedo` | `true` when the history has an entry to redo |

Both describe the whole document's history, not only the plugin's own entries.

### What CODAP sends

CODAP sends `notify` on `undoChangeNotice` with one of these operations:

| Operation | Sent to | `values` carries | The plugin replies |
|---|---|---|---|
| `undoAction` | the plugin whose entry is being undone | — | `{ "success": true }` once it has reversed the action, or `{ "success": false }` if it could not, and CODAP then tells the user the undo failed |
| `redoAction` | the plugin whose entry is being redone | — | the same, once it has reapplied the action |
| `clearUndo` | every plugin | `canUndo`, `canRedo` | anything; CODAP does not read the reply |
| `clearRedo` | every plugin | `canUndo`, `canRedo` | anything; CODAP does not read the reply |

`clearRedo` is sent each time an action is added to the history, even when there was nothing to
redo, so a plugin learns that undo has become possible. `clearUndo` is sent, with `clearRedo`, when
the undo history is erased. v2 erased it whenever a change could not be undone and after an
`update document`. CODAP erases it after an `update document`, just before `updateDocumentEnded`, as v2 did.
It keeps the history after a change that cannot be undone, so it does not send them for that.
`clearUndo` and `clearRedo` are sent to plugins only. v3 currently also sends them to the host page
when CODAP is embedded in one; see [Known limitations](#known-limitations). Undoing or redoing sends
neither: CODAP sends `undo` or `redo` on [`document`](document.md) to every plugin instead, also
with `canUndo` and `canRedo`. Set your buttons from those values whatever the operation is called.
See [Keeping your buttons in step](../guides/undo-and-redo.md#keeping-your-buttons-in-step).

## Examples

**Report an undoable action.**

```json
{
  "action": "notify",
  "resource": "undoChangeNotice",
  "values": { "operation": "undoableActionPerformed", "logMessage": "Added 3 samples" }
}
```

```json
{ "success": true, "values": { "canUndo": true, "canRedo": false } }
```

**Press undo from the plugin's own button.**

```json
{
  "action": "notify",
  "resource": "undoChangeNotice",
  "values": { "operation": "undoButtonPress" }
}
```

```json
{ "success": true, "values": { "canUndo": false, "canRedo": true } }
```

**Handle what CODAP sends.**

```js
// requestHandler is the handler you passed to iframePhone — see "Sending requests and receiving
// notifications" in the index. undoMyLastAction and redoMyLastAction stand for your plugin's own
// code, and return false when there is nothing to undo or redo.
function requestHandler(command, callback) {
  if (command.resource === "undoChangeNotice") {
    const { operation, canUndo, canRedo } = command.values
    if (operation === "undoAction") return callback({ success: undoMyLastAction() })
    if (operation === "redoAction") return callback({ success: redoMyLastAction() })
    if (operation === "clearUndo" || operation === "clearRedo") setButtons(canUndo, canRedo)
  }
  // undoing or redoing anything in CODAP sends `undo` or `redo` on `document`
  if (command.resource === "document" && ["undo", "redo"].includes(command.values.operation)) {
    setButtons(command.values.canUndo, command.values.canRedo)
  }
  callback({ success: true })
}
```

## Known limitations

The first of these is described in full in
[the guide's known limitations](../guides/undo-and-redo.md#known-limitations).

- **Undoing an entry from a closed plugin can do nothing visible.** When the plugin was closed by
  another plugin's `delete` on `component`, which leaves no entry, undoing one of its entries
  does nothing visible but still uses an undo step.
- **The host page cannot use this resource.** When CODAP is embedded in a page, every operation
  from the host page fails with `Interactive Frame not found`; v2 accepted them. See
  [Embedding CODAP in your page](../guides/embedded-server.md#known-limitations).
- **`clearUndo` and `clearRedo` also reach the host page.** When CODAP is embedded in a page, v3
  sends them to the host page as well as to plugins. v2 sent them only to plugins. This is a
  known bug. A host page should ignore them.

## Notifications

`undoAction`, `redoAction`, `clearUndo` and `clearRedo` are the notifications on this resource;
see [What CODAP sends](#what-codap-sends) and
[the notification catalog](../notifications.md#undo-and-redo--undochangenotice).

## Errors

| Error | Condition |
|---|---|
| `Unknown undoChangeNotice operation: <operation>` | `operation` is missing or is not one of the three a plugin sends. A missing one reads `undefined` |
| `Interactive Frame not found` | the request did not come from a plugin in the document, as when the host page sends it |
| `Interactive frame content not found` | `undoableActionPerformed` from a component that is not a plugin |
| `Document content not found` | `undoableActionPerformed` from a plugin that is not part of a document |

v2 replied `success: true`, with `canUndo` and `canRedo`, to a missing or unrecognized
`operation`, and did nothing; with no `values` at all, it failed. v3 reports either as an error.

## See also

- [Undo and redo](../guides/undo-and-redo.md) for how a plugin takes part in the history
- [`interactiveFrame`](interactive-frame.md) for `externalUndoAvailable` and
  `standaloneUndoModeAvailable`
- [The notification catalog](../notifications.md#undo-and-redo--undochangenotice) for every
  notification on this resource
