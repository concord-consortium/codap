# global

> **Applies to:** CODAP v3 · **Verified:** 2026-10-21
> · Parts of this page are generated — see [conventions](../conventions.md).

A global value is a named number that belongs to the document rather than to any data context.
Formulas anywhere in the document can refer to it by name, and a slider shows and changes one.
Plugins use this resource to create a global value, to read it, and to set it — for example to
drive a simulation parameter that formulas depend on, or to follow a slider the user moves.
`globalList` lists every global value in the document.

Creating a global value does not create a slider for it. To give the user a slider, create a
slider [`component`](component.md) that names the global value.

## Supported actions

<!-- BEGIN GENERATED: actions -->
| Action | global | globalList |
|---|---|---|
| `get` | ✓ | ✓ |
| `create` | ✓ | — |
| `update` | ✓ | — |
| `delete` | — | — |
| `notify` | — | — |
| `register` | — | — |
| `unregister` | — | — |
<!-- END GENERATED: actions -->

There is no `delete`. A global value is removed only when the slider that shows it is deleted,
by the user or with `delete` on [`component`](component.md). A global value with no slider cannot
be removed.

## Resource selector patterns

<!-- BEGIN GENERATED: selectors -->
| Pattern | Actions |
|---|---|
| `global` | create |
| `global[<name-or-id>]` | get, update |
| `globalList` | get |
<!-- END GENERATED: selectors -->

`<name-or-id>` accepts the global value's name or its numeric id. The name is tried first.
`create` takes no name in the selector; the new global value is described in `values`.

<!-- BEGIN GENERATED: scope -->
This resource is **not** scoped to a data context, so the default-data-context rule does not
apply. Naming a `dataContext` in the selector has no effect.
<!-- END GENERATED: scope -->

## Values

### What `get` returns

| Property | Notes |
|---|---|
| `name` | the global value's name, which is how formulas and selectors refer to it |
| `value` | its current value, a number |
| `id` | its id |

### What `create` accepts

| Property | Type | Notes |
|---|---|---|
| `name` | String | optional. Without one, CODAP picks the first unused name of the form `v1`, `v2`, … |
| `value` | number | optional; default `0.5` |

`create` replies with the new global value, in the shape `get` returns. With no `values` at all,
v2 created a global value with the default name and value; v3 currently fails, see
[Known limitations](#known-limitations).

A name already used by another global value is refused with `globals must have unique names`.
This is new in v3: v2 replied with success, but the new global value could not be found by its
name.

`value` must be a number. v3 converts what it is given to a number and refuses it with
`global values must be numbers` only when that fails: text that reads as a number, such as
`"3"`, is stored as that number, and `true`, `false` and empty text are stored as `1`, `0` and
`0`. v2 did not check, and stored
whatever it was given, so a plugin that must also run there should send numbers.

### What `update` accepts

| Property | Type | Notes |
|---|---|---|
| `value` | number | required. The new value, converted to a number as for `create`. `0` is a value; only a missing or `null` `value` is refused. See [Known limitations](#known-limitations) for `false` and empty text |

The name cannot be changed. `update` replies `{ "success": true }`. A slider showing the global
value moves to the new value.

### globalList

`get` on `globalList` takes no `values`. It replies with an array of every global value in the
document, in the order they were created, each in the shape `get` on `global` returns. The array
is empty when the document has none.

## Examples

**Create a global value.**

```json
{
  "action": "create",
  "resource": "global",
  "values": { "name": "rate", "value": 2 }
}
```

```json
{
  "success": true,
  "values": { "name": "rate", "value": 2, "id": 18 }
}
```

**Read it.**

```json
{
  "action": "get",
  "resource": "global[rate]"
}
```

```json
{
  "success": true,
  "values": { "name": "rate", "value": 2, "id": 18 }
}
```

**Set it.**

```json
{
  "action": "update",
  "resource": "global[rate]",
  "values": { "value": 3.5 }
}
```

```json
{ "success": true }
```

**List every global value.**

```json
{
  "action": "get",
  "resource": "globalList"
}
```

```json
{
  "success": true,
  "values": [
    { "name": "v1", "value": 0.5, "id": 12 },
    { "name": "rate", "value": 3.5, "id": 18 }
  ]
}
```

**Follow a slider as the user moves it.**

```js
// sendRequest stands for however your plugin sends requests, and requestHandler is the
// handler you passed to iframePhone — see "Sending requests and receiving notifications"
// in the index.
function requestHandler(command, callback) {
  if (command.action === "notify" && command.resource === "global[rate]") {
    setRate(command.values.globalValue)
  }
  callback({ success: true })
}

sendRequest({ action: "get", resource: "global[rate]" }, result => {
  if (result.success) setRate(result.values.value)
})
```

## Known limitations

**`update` turns `false` and empty text into `0`.** Like any other `value`, they are converted
to a number, so `false` and `""` are stored as `0`, and `true` as `1`. v2 stored the value as
given. This is a known bug; send numbers.

**`create` with no `values` fails.** v3 replies with the generic error
`An error occurred while processing the request.` and creates nothing. v2 created a global value
named `v1` (or the next unused name) with the value `0.5`. This is a known bug. Until it is fixed,
send `values: {}` to get the defaults.

**`update` does not respect a slider's "multiple of" setting.** When a slider showing the global
value restricts it to multiples of some number, v2 rounded a value a plugin set to the nearest
multiple. v3 stores the value as sent. This is a known bug.

**`create` adds an entry to the undo history.** v2 did not, and the intended behavior is that it
does not; see [Undo and redo](../guides/undo-and-redo.md#known-limitations). `update` adds no
entry, as in v2.

**Setting a value from a plugin sends no notification.** v2 sent `global[<name>]` to every
plugin, the requesting one included, whenever a global value changed, including on undo and
redo. v3 sends it only when the user changes the value with a slider. This is a known bug; see
[the catalog's known limitations](../notifications.md#known-limitations).

## Notifications

When a global value changes, CODAP sends a notification on `global[<name>]`, where `<name>` is
the global value's name, with the new value in `globalValue`:

```json
{
  "action": "notify",
  "resource": "global[rate]",
  "values": { "globalValue": 3.5 }
}
```

It is sent while a slider is dragged or animates, and when the user types a value into a slider
or changes it with the arrow keys, so a plugin can follow a slider continuously.
It is intended to be sent when a plugin sets the value too; see
[Known limitations](#known-limitations). `create` sends no notification. See
[the notification catalog](../notifications.md#everything-else).

## Errors

| Error | Condition |
|---|---|
| `Not found` | `get` names a global value that does not exist, or names none |
| `missing global or value` | `update` names a global value that does not exist, or has no `value`, or a `null` one. This assumes the request has `values`; without it v3 replies with the generic error |
| `global values must be numbers` | `create` or `update` with a `value` that is not a number |
| `globals must have unique names` | `create` with a name another global value already has |
| `error creating global value` | `create` failed for any other reason |

v2 used the same messages for a missing global value, but did not check that values were numbers
or that names were unique.

## See also

- [`component`](component.md) to create a slider for a global value
- [`formulaEngine`](formula-engine.md) for evaluating formulas that use global values
- [The notification catalog](../notifications.md#everything-else) for `global[<name>]`
- [The resource index](../README.md) for the request envelope
