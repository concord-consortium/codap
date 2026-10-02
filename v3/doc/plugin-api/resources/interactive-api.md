# interactiveApi

> **Applies to:** CODAP v3 · **Verified:** 2026-10-02
> · Parts of this page are generated — see [conventions](../conventions.md).

Reports whether CODAP is itself running as an *interactive* inside a host learning platform —
for example an LARA or Activity Player activity — and if so, hands back that platform's
`initInteractive` message.

This is for plugins that need to know about the environment **around** CODAP: which student or
run the activity belongs to, what mode the platform is in, what its saved state is. That
information reaches CODAP through the Cloud File Manager's `interactiveApi` provider, and this
resource passes it through unchanged.

Most plugins never need it. It matters when a plugin must coordinate with the host platform
rather than with CODAP.

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

`get` is **asynchronous**, and there is no timeout: CODAP waits on the host platform's
`initInteractive` message before replying. If the host never sends one, **the request never
resolves and your callback is never called.** Impose your own timeout rather than assuming a
reply will arrive.

## Resource selector patterns

<!-- BEGIN GENERATED: selectors -->
| Pattern | Actions |
|---|---|
| `interactiveApi` | get |
<!-- END GENERATED: selectors -->

<!-- BEGIN GENERATED: scope -->
This resource is **not** scoped to a data context, so the default-data-context rule does not
apply. Naming a `dataContext` in the selector has no effect.
<!-- END GENERATED: scope -->

## Values

`get` takes no `values`. The result always has `success: true` — availability is reported in the
values rather than as an error:

<!-- BEGIN GENERATED: values -->
| Property | Type |
|---|---|
| `available` | Boolean |
| `initInteractive` | Object |
| `notAvailableReason` | String |
<!-- END GENERATED: values -->

`available` says whether the interactive API is available in this session. When it is `true`,
`initInteractive` carries the host platform's message, passed through unchanged. When it is
`false`, `notAvailableReason` explains which condition failed.

`available` is `false` in two distinct situations, distinguished by `notAvailableReason`:

| Reason | Meaning |
|---|---|
| `The interactiveApi parameter is not present in the URL.` | CODAP was not launched with the `interactiveApi` URL parameter, so the integration is switched off. Note the parameter may be present with an empty value — CODAP tests for presence, not for a truthy value. |
| `The interactiveApi is not available.` | The parameter was present, but the Cloud File Manager has no `interactiveApi` provider offering an `initInteractive` message. |

Because both cases return `success: true`, a plugin must branch on `values.available` rather than
on the success flag.

## Examples

**Ask whether the host platform is available.**

```json
{
  "action": "get",
  "resource": "interactiveApi"
}
```

Available:

```json
{
  "success": true,
  "values": {
    "available": true,
    "initInteractive": { "...": "the host platform's initInteractive message, unchanged" }
  }
}
```

Not available:

```json
{
  "success": true,
  "values": {
    "available": false,
    "notAvailableReason": "The interactiveApi parameter is not present in the URL."
  }
}
```

**Branch correctly in a plugin.**

```js
// sendRequest stands for however your plugin sends requests — see "Sending requests and
// receiving notifications" in the index.
sendRequest({ action: 'get', resource: 'interactiveApi' }, function (result) {
  // success is true either way — check `available`
  if (result.success && result.values.available) {
    usePlatformContext(result.values.initInteractive)
  } else {
    runStandalone()
  }
})
```

## Notifications

This resource emits none.

## Errors

This handler returns no error results. Unavailability is reported as `success: true` with
`available: false`, as described above.
