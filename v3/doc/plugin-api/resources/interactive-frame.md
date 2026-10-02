# interactiveFrame

> **Applies to:** CODAP v3 · **Verified:** 2026-10-02
> · Parts of this page are generated — see [conventions](../conventions.md).

The interactive frame is the plugin's own component — the tile the plugin is running inside.
A plugin uses this resource to learn about its environment (which CODAP version, which locale,
how big its frame is), to save state into the CODAP document, and to set the permissions that
govern what a user may do to the data while the plugin is running.

Every plugin reads this resource at startup. Its selector names no target — a plugin can only
ever address its own frame, never another plugin's.

## Supported actions

<!-- BEGIN GENERATED: actions -->
| Action | Supported |
|---|---|
| `get` | ✓ |
| `create` | — |
| `update` | ✓ |
| `delete` | — |
| `notify` | ✓ |
| `register` | — |
| `unregister` | — |
<!-- END GENERATED: actions -->

## Resource selector patterns

<!-- BEGIN GENERATED: selectors -->
| Pattern | Actions |
|---|---|
| `interactiveFrame` | get, update, notify |
<!-- END GENERATED: selectors -->

There is no bracketed form. CODAP resolves the frame from the plugin that sent the request, so a
plugin cannot read or change another plugin's frame.

<!-- BEGIN GENERATED: scope -->
This resource is **not** scoped to a data context, so the default-data-context rule does not
apply. Naming a `dataContext` in the selector has no effect.
<!-- END GENERATED: scope -->

## Values

<!-- BEGIN GENERATED: values source=DIInteractiveFrame -->
| Property | Type | |
|---|---|---|
| `allowEmptyAttributeDeletion` | `boolean` | optional |
| `blockAPIRequestsWhileEditing` | `boolean` | optional |
| `cannotClose` | `boolean` | optional |
| `codapVersion` | `string` | optional |
| `dimensions` | `{ height?: number; width?: number }` | optional |
| `externalUndoAvailable` | `boolean` | optional |
| `id` | `string \| number` | optional |
| `name` | `string` | optional |
| `preventAttributeDeletion` | `boolean` | optional |
| `preventBringToFront` | `boolean` | optional |
| `preventDataContextReorg` | `boolean` | optional |
| `preventTopLevelReorg` | `boolean` | optional |
| `respectEditableItemAttribute` | `boolean` | optional |
| `savedState` | `unknown` | optional |
| `standaloneUndoModeAvailable` | `boolean` | optional |
| `subscribeToDocuments` | `boolean` | optional |
| `title` | `string` | optional |
| `version` | `string` | optional |
| `lang` | `string` | optional |
| `locale` | `string` | optional |
| `handlesLocaleChange` | `boolean` | optional |
<!-- END GENERATED: values -->

### Which properties each action uses

Not every property above travels in both directions. `get` returns nineteen of them; `update`
honours fourteen; `codapVersion`, `externalUndoAvailable`, `standaloneUndoModeAvailable`, `lang`,
`locale` and `savedState` are reported by CODAP and cannot be set.

| Property | `get` returns | `update` honours |
|---|---|---|
| `allowEmptyAttributeDeletion` | yes | yes |
| `blockAPIRequestsWhileEditing` | yes | yes |
| `preventAttributeDeletion` | yes | yes |
| `preventBringToFront` | yes | yes |
| `preventDataContextReorg` | yes | yes |
| `preventTopLevelReorg` | yes | yes |
| `respectEditableItemAttribute` | yes | yes |
| `subscribeToDocuments` | yes | yes |
| `dimensions` | yes | yes |
| `name` | yes | yes, unless the user renamed the tile |
| `title` | yes | yes, unless the user renamed the tile |
| `version` | yes | yes |
| `savedState` | yes | no — see below |
| `id` | yes | no |
| `codapVersion` | yes | no |
| `externalUndoAvailable` | yes | no |
| `standaloneUndoModeAvailable` | yes | no |
| `lang` | yes | no |
| `locale` | yes | no |
| `cannotClose` | no | yes |
| `handlesLocaleChange` | no | yes |

### Saving state is the other way round

`savedState` is readable here but not writable: `update` ignores a `state` property entirely.
A plugin does not push its state to CODAP. Instead CODAP asks for it — it sends the plugin a
`get` request for `interactiveState`, and stores whatever the plugin replies with. To be
restorable, a plugin must answer that request.

CODAP asks only when it is preparing to save the document, so `savedState` reflects the state at
the last save, not the plugin's current state.

### `lang` and `locale` are not the same thing

`locale` is the full locale CODAP is running in, such as `pt-BR`. `lang` is only its two-letter
base language, `pt`, and exists because V2 plugins expect that shape. A plugin that needs to
distinguish Brazilian from European Portuguese must read `locale`; a plugin that reads `lang`
will see the same value for both.

## Examples

Read the frame at startup:

```json
{ "action": "get", "resource": "interactiveFrame" }
```

Set the frame's size and the permissions a plugin needs:

```json
{
  "action": "update",
  "resource": "interactiveFrame",
  "values": {
    "title": "Sampler",
    "dimensions": { "width": 400, "height": 500 },
    "preventTopLevelReorg": true,
    "respectEditableItemAttribute": true,
    "subscribeToDocuments": true
  }
}
```

Tell CODAP the plugin is working, then that it has finished:

```json
{
  "action": "notify",
  "resource": "interactiveFrame",
  "values": { "request": "indicateBusy", "cursorMode": true }
}
```

```json
{
  "action": "notify",
  "resource": "interactiveFrame",
  "values": { "request": "indicateIdle" }
}
```

## Known limitations

**An unrecognized `notify` request succeeds silently.** CODAP replies `{"success": true}` to any
`request` it does not handle, matching V2's behaviour. The cost is that a misspelled request is
indistinguishable from one that worked, and there is no way to ask which requests this CODAP
supports.

**`cannotClose` cannot be turned back off.** `update` applies it only when the value is truthy,
unlike the other booleans on this resource, which apply whenever they are present. Sending
`cannotClose: false` leaves the frame closeable or not exactly as it already was.

**`name` and `title` are ignored once the user has renamed the tile.** Both are applied only
while the title is still CODAP's own. A plugin that renames itself in response to its own state
will stop being able to after any manual rename, and gets no error.

**A plugin cannot write its own state.** `update` accepts no `state` property, so the only way
state reaches the document is by answering CODAP's `get interactiveState` request.

**`update` with an array does nothing and reports success.**

## Notifications

A plugin sends `notify` to act on its own frame. `values` is required; `request` names the
operation. A missing `request` returns `{"success": true}` without doing anything, like an
unrecognized one.

| `request` | Effect |
|---|---|
| `indicateBusy` | Shows CODAP's busy indicator. `cursorMode: true` makes it a busy cursor |
| `indicateIdle` | Clears the busy indicator |

CODAP also accepts a set of requests for highlighting UI elements and running guided tours.
They are **not documented here yet** because the implementation behind them is being replaced,
and their values will change.

## Errors

<!-- BEGIN GENERATED: errors -->
| Error |
|---|
| `Interactive Frame not found` |
| `A values object is required for this request.` |
<!-- END GENERATED: errors -->

| Error | Condition |
|---|---|
| `Interactive Frame not found` | the request did not come from a plugin frame |
| `A values object is required for this request.` | `notify` sent with no `values` |

## See also

- [`component`](component.md) for the common properties every tile has
- [The resource index](../README.md) for the request envelope and the full resource list
