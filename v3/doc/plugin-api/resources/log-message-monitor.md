# logMessageMonitor

> **Applies to:** CODAP v3 · **Verified:** 2026-10-21
> · Parts of this page are generated — see [conventions](../conventions.md).

A log monitor asks CODAP to tell your plugin about the events it logs. CODAP logs what the user
does in its own interface, and what plugins report with [`logMessage`](log-message.md). When an
event matches a monitor your plugin registered, CODAP sends your plugin a `logMessageNotice`. A
plugin uses this to follow what the user is doing, for example to check progress through an
activity.

## Supported actions

<!-- BEGIN GENERATED: actions -->
| Action | Supported |
|---|---|
| `get` | — |
| `create` | — |
| `update` | — |
| `delete` | — |
| `notify` | — |
| `register` | ✓ |
| `unregister` | ✓ |
<!-- END GENERATED: actions -->

## Resource selector patterns

<!-- BEGIN GENERATED: selectors -->
| Pattern | Actions |
|---|---|
| `logMessageMonitor` | register, unregister |
<!-- END GENERATED: selectors -->

No bracketed selector.

<!-- BEGIN GENERATED: scope -->
This resource is **not** scoped to a data context, so the default-data-context rule does not
apply. Naming a `dataContext` in the selector has no effect.
<!-- END GENERATED: scope -->

## Values

### What `register` accepts

At least one of the first five properties is required. v3 currently accepts a monitor with none;
see [Known limitations](#known-limitations).

| Property | Type | Notes |
|---|---|---|
| `topic` | String | Matches an event whose `topic` is exactly this |
| `topicPrefix` | String | Matches an event whose `topic` begins with this |
| `formatStr` | String | Matches an event whose `formatStr` is exactly this |
| `formatPrefix` | String | Matches an event whose `formatStr` begins with this |
| `message` | String | Matches an event whose message, with its placeholders filled in, is exactly this. `"*"` matches every event |
| `clientId` | any | Optional. A value of your own that identifies the monitor, for `unregister`. v3 currently ignores it; see [Known limitations](#known-limitations) |

**A monitor matches an event when any one of the properties it gives matches.** A monitor with
both `topic` and `formatPrefix` matches an event with that topic, and also one whose `formatStr`
has that prefix. See [Known limitations](#known-limitations).

Only events a plugin logs with `logMessage` can have a `topic`. Events from CODAP's own interface
have none, so `topic` and `topicPrefix` never match them. Their names and wording are CODAP's own
and can differ between versions; see
[the catalog's known limitations](../notifications.md#known-limitations).

`register` replies with the new monitor, as `logMonitor`, alongside `success`:

```json
{
  "success": true,
  "logMonitor": {
    "id": 1,
    "clientId": "round-watcher",
    "topicPrefix": "game."
  }
}
```

`logMonitor` holds the monitor's `id`, which CODAP assigns, and the properties you registered.
v3 currently replies differently; see [Known limitations](#known-limitations).

### What `unregister` accepts

| Property | Type | Notes |
|---|---|---|
| `id` | number | The id CODAP gave the monitor |
| `clientId` | any | The `clientId` you gave when registering. Removes every monitor registered with it |

Give one of them. `unregister` replies `{ "success": true }`, even when nothing matched. v3
currently replies `{ "success": false }` to an `id` that matches no monitor; see
[Known limitations](#known-limitations).

Monitors are not saved with the document. Register them again each time your plugin loads, and
see [Known limitations](#known-limitations) for unregistering first.

## Examples

**Follow your own plugin's game events.**

```json
{
  "action": "register",
  "resource": "logMessageMonitor",
  "values": { "topicPrefix": "game.", "clientId": "round-watcher" }
}
```

**Follow everything CODAP logs.**

```js
// sendRequest stands for however your plugin sends requests, and requestHandler is the
// handler you passed to iframePhone — see "Sending requests and receiving notifications"
// in the index.
let monitorID
sendRequest({
  action: "register",
  resource: "logMessageMonitor",
  values: { message: "*" }
}, result => {
  // v3 currently puts logMonitor in values; see Known limitations
  monitorID = (result.logMonitor ?? result.values?.logMonitor)?.id
})

function requestHandler(command, callback) {
  if (command.resource === "logMessageNotice") {
    console.log("CODAP logged:", command.values.message)
  }
  callback({ success: true })
}
```

**Stop following.**

```json
{
  "action": "unregister",
  "resource": "logMessageMonitor",
  "values": { "id": 1 }
}
```

```json
{ "success": true }
```

## Known limitations

**Monitors outlive the plugin.** v2 removed a plugin's monitors when the plugin was closed or its
document closed. v3 keeps them until they are unregistered, so a plugin that is reloaded and
registers again receives each event once per registration. This is a known bug. Until it is
fixed, unregister your monitors by `id` before registering again, or when your plugin unloads.

**A monitor matches only when every property it gives matches.** v2 notified a monitor when any
one of its properties matched; v3 requires all of them to. A monitor that gives one property
behaves the same in both. This is a known bug. Until it is fixed, register a separate monitor
for each property.

**`register` accepts a monitor with no properties, and it matches every event.** v2 refused one,
with an error saying at least one of the five properties was required. This is a known bug.

**`register` replies with `logMonitor` inside `values`, holding only `id` and `clientId`.** v2
put `logMonitor` next to `success` and included the properties you registered. This is a known
bug. Until it is fixed, read `result.logMonitor ?? result.values.logMonitor`.

**Your `clientId` is ignored.** v3 records CODAP's own id for your plugin as the monitor's
`clientId`, reports that id in the reply and in each notice, and `unregister` with your own
`clientId` removes nothing, although it replies `{ "success": true }`. This is a known bug.
Until it is fixed, unregister monitors by `id`.

**`unregister` with an `id` that matches no monitor replies `{ "success": false }`.** v2 replied
`{ "success": true }`. This is a known bug.

**A monitor can be told about a plugin's log message twice.** When a plugin sends `logMessage`,
CODAP first treats the message as one of its own events: it has no `topic` and no
`replaceArgs`, and its `formatStr` is the message with its placeholders already filled in. A
monitor that matches that, such as one with `message: "*"`, receives a notice for it, and then
the notice described under [Notifications](#notifications). v2 sent only the second. This is a
known bug. A monitor that gives `topic` or `topicPrefix` receives only the second, so until it is
fixed, give your plugin's log messages a topic and monitor them by it.

**The `formatStr` of an event from CODAP's own interface is the finished message.** v2 reported
the format string with its placeholders, and the values in
`replaceArgs`, so `formatStr` and `formatPrefix` matched every event of a kind. v3 reports the
message with its values already filled in, and no `replaceArgs`. This is a known bug.

A monitor cannot be registered by the page CODAP is embedded in; see
[Embedding CODAP in your page](../guides/embedded-server.md#known-limitations).

## Notifications

When CODAP logs an event that matches a monitor, it sends the plugin that registered the monitor
a notification on `logMessageNotice`. It has no `operation`:

```json
{
  "action": "notify",
  "resource": "logMessageNotice",
  "values": {
    "message": "Round 3 finished with score 120",
    "formatStr": "Round %@ finished with score %@",
    "topic": "game.round",
    "replaceArgs": [3, 120],
    "logMonitor": { "id": 1, "clientId": "round-watcher", "topicPrefix": "game." }
  }
}
```

| Property | Notes |
|---|---|
| `message` | the logged message, with its placeholders filled in |
| `formatStr` | the message as it was given, with its placeholders |
| `topic` | the event's topic. Absent for an event with none |
| `replaceArgs` | the values for the placeholders. Absent for an event with none |
| `logMonitor` | the monitor that matched, as `register` returned it |

Each matching monitor gets its own notice, so a plugin with two matching monitors receives the
event twice. v2 also added which of the monitor's properties had matched; v3 does not. And v3's
`logMonitor` holds only `id` and `clientId`, as its `register` reply does; see
[Known limitations](#known-limitations) and
[the notification catalog](../notifications.md#everything-else).

## Errors

| Error | Condition |
|---|---|
| `clientId and filter values are required` | `register` with no `values`, or from the page CODAP is embedded in |
| `id or clientId required` | `unregister` with neither `id` nor `clientId` |

v2 reported a `register` with none of the five properties with an error naming them, and an
`unregister` with neither `id` nor `clientId` with an error saying both were missing.

## See also

- [`logMessage`](log-message.md) to log your plugin's own events
- [The notification catalog](../notifications.md) for `logMessageNotice`
- [The resource index](../README.md) for the request envelope and how notifications arrive
