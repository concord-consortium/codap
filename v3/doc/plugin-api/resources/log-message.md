# logMessage

> **Applies to:** CODAP v3 · **Verified:** 2026-10-21
> · Parts of this page are generated — see [conventions](../conventions.md).

Writes an event to CODAP's log, the record CODAP keeps of what happens during a session for
researchers and teachers. A plugin uses it to record its own actions alongside CODAP's: a game
round started, a simulation run, a setting changed. Plugins that have registered a
[`logMessageMonitor`](log-message-monitor.md) are told about matching events.

Sending a log message also tells CODAP that the plugin's state has changed, so the document
counts as changed and is saved by autosave. See [Known limitations](#known-limitations).

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
| `logMessage` | notify |
<!-- END GENERATED: selectors -->

No bracketed selector.

<!-- BEGIN GENERATED: scope -->
This resource is **not** scoped to a data context, so the default-data-context rule does not
apply. Naming a `dataContext` in the selector has no effect.
<!-- END GENERATED: scope -->

## Values

### What `notify` accepts

| Property | Type | Notes |
|---|---|---|
| `formatStr` | String | The message, with placeholders for the values in `replaceArgs`, below |
| `replaceArgs` | Array | Optional. The values for the placeholders in `formatStr`. A single value that is not an array counts as an array of one |
| `topic` | String | Optional. A label for the event, such as `game.lifecycle`, that a log monitor can match. It is not part of the logged message |

A placeholder in `formatStr` takes one of two forms:

```text
%@     the next value of replaceArgs, in order
%@1    the first value of replaceArgs; %@2 the second, and so on
```

CODAP fills in the placeholders and logs the result. A placeholder with no value is left empty.
v3 currently differs when the two forms are mixed; see [Known limitations](#known-limitations).

`notify` replies `{ "success": true }`.

## Examples

**Log an action.**

```json
{
  "action": "notify",
  "resource": "logMessage",
  "values": {
    "formatStr": "Launched rocket with %@ engine toward %@",
    "replaceArgs": ["red", "satellite"]
  }
}
```

```json
{ "success": true }
```

CODAP logs `Launched rocket with red engine toward satellite`.

**Log an action with a topic, so a monitor can pick it out.**

```js
// sendRequest stands for however your plugin sends requests — see "Sending requests and
// receiving notifications" in the index.
sendRequest({
  action: "notify",
  resource: "logMessage",
  values: { topic: "game.round", formatStr: "Round %@ finished with score %@", replaceArgs: [3, 120] }
})
```

## Known limitations

**A log message does not mark the document as changed.** v2 treated a log message as a sign that
the plugin's state had changed, so the document counted as changed and autosave saved it. v3
does not. This is a known bug. Until it is fixed, a plugin that needs its state saved should not
rely on its log messages to trigger a save.

**A log monitor is told about each message twice.** See
[`logMessageMonitor`](log-message-monitor.md#known-limitations).

**A `formatStr` that is the key of one of CODAP's own strings is translated.** v3 looks
`formatStr` up among CODAP's translated strings before filling in the placeholders, so a
`formatStr` such as `DG.Undo.interactiveUndoableAction` is logged as CODAP's text for that key.
v2 logged it as written. Do not begin a `formatStr` with `DG.` or `V3.`.

**Mixed placeholders take the wrong values.** v3 counts every placeholder when it picks the value
for the next unnumbered one, numbered placeholders included. In this `formatStr`, the unnumbered
placeholder takes the second value of `replaceArgs` rather than the first:

```text
%@1 then %@
```

v3 also replaces text of the form `%{name}` with nothing. v2 counted only the unnumbered
placeholders and left `%{name}` as written. This is a known bug. Until it is fixed, do not mix
numbered and unnumbered placeholders in one `formatStr`, and do not use `%{`.

A log message sent by the page CODAP is embedded in is not logged; see
[Embedding CODAP in your page](../guides/embedded-server.md#known-limitations).

## Notifications

This resource sends no notification of its own. A log message that matches a monitor some plugin
registered is sent to that plugin as a `logMessageNotice`; see
[`logMessageMonitor`](log-message-monitor.md#notifications).

## Errors

| Error | Condition |
|---|---|
| `A values object is required for this request.` | `notify` with no `values` |

v2 reported a missing `values` with a JavaScript error message.

## See also

- [`logMessageMonitor`](log-message-monitor.md) to be told about log events
- [`undoChangeNotice`](undo-change-notice.md), whose `logMessage` value v2 also wrote to
  CODAP's log
- [The notification catalog](../notifications.md) for `logMessageNotice`
- [The resource index](../README.md) for the request envelope
