# Undo and redo

> **Applies to:** CODAP v3 · **Verified:** 2026-10-22

CODAP keeps one undo history for the whole document. The user steps back through it with the
undo and redo buttons. A plugin can take part in that history: it can put its own actions on it,
so that the user's undo reverses them in turn, and it can drive undo and redo from buttons of its
own.

This chapter covers both. It draws on three reference pages: the `undoChangeNotice` resource your
plugin sends to, [the notifications CODAP sends back](../notifications.md#undo-and-redo--undochangenotice),
and the two undo properties on [`interactiveFrame`](../resources/interactive-frame.md).

## What the history holds

The history holds what the user does in CODAP's own interface: moving an attribute, changing a
graph, editing a cell.

**It does not hold most changes your plugin makes through the API.** Creating cases or updating
attributes, for example, adds no entry. CODAP cannot undo them,
and the user's own earlier actions stay undoable. A few requests are exceptions, because they
match a single action in CODAP's interface and undo the same way it does:

- `update` on `dataContext` with a `sort`
- `notify` on a case table `component` with `autoScale`
- `update` on `attributeLocation`, which moves an attribute as dragging its column does
- `create` on `component`, which adds a component as the toolbar does
- `delete` on `component`, which closes a component as its close button does

v3 does not yet add entries for the last three; see [Known limitations](#known-limitations).

If your plugin needs the user to be able to undo something it did through the API, it reports
the action itself, as described next, and reverses the API changes itself when asked.

## Making your plugin's actions undoable

When your plugin does something the user should be able to undo, it tells CODAP:

```json
{
  "action": "notify",
  "resource": "undoChangeNotice",
  "values": { "operation": "undoableActionPerformed", "logMessage": "Added 3 samples" }
}
```

```json
{
  "success": true,
  "values": { "canUndo": true, "canRedo": false }
}
```

CODAP adds an entry to its history and replies with the state of the history afterwards. Today
the reply can describe the history before the entry; see [Known limitations](#known-limitations).
`logMessage` is optional; it describes the action in CODAP's log.

CODAP does not know what the action was. When the user undoes that entry, CODAP sends your plugin
alone:

```json
{
  "action": "notify",
  "resource": "undoChangeNotice",
  "values": { "operation": "undoAction" }
}
```

and on redo, the same with `"redoAction"`. Your plugin reverses or reapplies the action, then
replies `{ "success": true }`, or `{ "success": false }` if it could not.

**Reversing an action includes reversing its API changes.** If adding three samples created three
cases, undoing it must delete them: CODAP did not record the cases, so it will not remove them.

Undo and redo are chronological across the whole document. If your plugin reports an action and
the user then changes a graph, the first undo reverses the graph change and the second sends you
`undoAction`.

A plugin usually keeps its own stack of actions, in step with the entries it reported:

```js
// sendRequest stands for however your plugin sends requests, and requestHandler is the
// handler you passed to iframePhone — see "Sending requests and receiving notifications"
// in the index.
const done = []     // actions the user can undo
const undone = []   // actions the user can redo

function perform(action) {
  action.apply()
  done.push(action)
  undone.length = 0
  sendRequest({
    action: "notify",
    resource: "undoChangeNotice",
    values: { operation: "undoableActionPerformed", logMessage: action.description }
  })
}

function requestHandler(command, callback) {
  if (command.resource === "undoChangeNotice") {
    const { operation } = command.values
    if (operation === "undoAction" || operation === "redoAction") {
      const from = operation === "undoAction" ? done : undone
      const to = operation === "undoAction" ? undone : done
      const action = from.pop()
      if (!action) return callback({ success: false })
      if (operation === "undoAction") action.revert()
      else action.apply()
      to.push(action)
    }
  }
  callback({ success: true })
}
```

Replying `{ "success": false }` when the stack is empty matters: it happens when your plugin was
reloaded, for example after the user closed it and then undid the close. The restored plugin
starts with an empty stack but the document's history still holds its old entries.

## Driving undo from your plugin's own buttons

A plugin can offer undo and redo buttons of its own and pass the presses to CODAP:

```json
{
  "action": "notify",
  "resource": "undoChangeNotice",
  "values": { "operation": "undoButtonPress" }
}
```

```json
{
  "success": true,
  "values": { "canUndo": false, "canRedo": true }
}
```

`redoButtonPress` works the same way. CODAP undoes or redoes the most recent entry in the history
and replies with the state afterwards. With nothing to undo, it does nothing and still succeeds.

**The entry undone may not be yours.** If the user's last action was in CODAP's interface, the
button press undoes that, and your plugin receives no `undoAction`. So change your plugin's state
only when `undoAction` or `redoAction` arrives, never on the button press itself. For the same
reason, `canUndo` and `canRedo` describe the whole history, not only your plugin's entries.

### Standalone mode

This is mainly for a plugin that is the whole application, with CODAP behind it. The URL
parameter `standalone` hides CODAP's toolbar, and with it CODAP's undo and redo buttons:

- `?standalone=true` hides the toolbar and removes every plugin's title bar. See
  [Known limitations](#known-limitations).
- `?standalone=<plugin name>` hides the toolbar and removes the title bar of the plugin with that
  name or title, ignoring case, so it fills its space seamlessly.

Your plugin can tell which situation it is in from `interactiveFrame`:

| Property | Standalone | Otherwise |
|---|---|---|
| `standaloneUndoModeAvailable` | `true` | `false` |
| `externalUndoAvailable` | `false` | `true` |

When `standaloneUndoModeAvailable` is `true`, the user has no undo buttons except yours, so a
plugin that reports undoable actions should show them. CODAP's keyboard shortcuts for undo and
redo work only while focus is outside your plugin, which in standalone mode is rare. The history
and the messages are the same in both modes.

## Keeping your buttons in step

CODAP's replies to `undoableActionPerformed`, `undoButtonPress` and `redoButtonPress` carry
`canUndo` and `canRedo`. Between your own requests, the history changes when the user acts in
CODAP, so CODAP also tells every plugin when it changes (but see
[Known limitations](#known-limitations)):

| Operation | Sent when |
|---|---|
| `clearRedo` | an action is added to the history, which empties the redo history |
| `clearUndo` | the undo history is emptied, for example by a change that cannot be undone |

Both carry the current `canUndo` and `canRedo`. Set your buttons from those values whatever the
operation is called.

## Known limitations

**The reply to `undoableActionPerformed` describes the history before the action.** The entry
joins the history just after CODAP replies, so `canUndo` can read `false` when it should be
`true`, and `canRedo` can read `true` although the new entry empties the redo history. v2
replied with the state afterwards. This is a known bug. Until it is fixed, treat a successful
`undoableActionPerformed` as making undo available.

**`clearUndo` and `clearRedo` are sent at different moments from v2.** v3 sends them only when
`canUndo` or `canRedo` changes from `true` to `false`, including when the user undoes or redoes
the last entry. It sends nothing when an action is added to an empty redo history, so a plugin
does not hear that undo has become possible. This is a known bug; the intended behavior is v2's,
described above.

**`?standalone=true` also removes other title bars.** v3 removes the title bar of every web
page shown in a component, guides included, not only plugins'. v2 removed only plugins' title
bars. This is a known bug.

**`logMessage` is not logged.** v2 recorded it in CODAP's log; v3 ignores it. This is a known
bug.

**A failed `undoAction` or `redoAction` is not shown to the user.** When your plugin replies
`{ "success": false }`, v2 showed an error and then cleared the whole undo and redo history. v3
does neither, and the history moves on as if the step had succeeded. This is a known bug.

**Undoing an entry from a closed plugin does nothing visible.** When the user closes a plugin, the
close is itself an entry, so undoing it brings the plugin back before its own entries are
reached. But if the plugin was closed without leaving an entry, for example by another plugin's
`delete` on `component`, undoing one of its entries sends nothing and changes nothing, but still
uses an undo step.

**Undo and redo are not announced on `document`.** v2 also sent every plugin a notification on
`document`, with operation `undo` or `redo`, whenever the user undid or redid an action that had
no notification of its own. v3 does not. This is a known bug.

**A plugin's attribute moves, and the components it creates or closes, cannot be undone.** v2
added `update` on `attributeLocation`, and `create` and `delete` on `component`, to the history,
as it did the same changes made in CODAP's interface, so the user could undo them. v3 does not.
This is a known bug.

**Some other API requests add entries to the history.** Besides the exceptions listed under
[What the history holds](#what-the-history-holds), these currently add entries too: `create`,
`update` and `delete` on `adornment` (sometimes several entries for one request), `create` on
`global`, `create` on `dataContextFromURL`, and `notify` on a graph `component` with
`autoScale`. The intended behavior is that they do not. v2 also
reset the user's history after many data requests. A plugin should not depend on whether CODAP's
undo reverses a request it made.

## See also

- [`interactiveFrame`](../resources/interactive-frame.md) for `externalUndoAvailable` and
  `standaloneUndoModeAvailable`
- [The resource index](../README.md) for the request envelope and how notifications arrive
- [The notification catalog](../notifications.md#undo-and-redo--undochangenotice) for
  `undoChangeNotice` and every other notification CODAP sends
