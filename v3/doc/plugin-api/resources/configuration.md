# configuration

> **Applies to:** CODAP v3 · **Verified:** 2026-10-21
> · Parts of this page are generated — see [conventions](../conventions.md).

A configuration setting changes how CODAP itself behaves, for the document the plugin is in.
There is exactly one setting a plugin can read or change, `gaussianFitEnabled`, and this was also
true in v2. `configurationList` lists the settings and their current values.

`gaussianFitEnabled` adds a Gaussian fit to histograms: when it is on, a graph showing a
histogram offers Gaussian fit options among its measures. CODAP can also be started with it on,
through the URL parameter `gaussianFit`; a plugin turns it on with `update`.

## Supported actions

<!-- BEGIN GENERATED: actions -->
| Action | configuration | configurationList |
|---|---|---|
| `get` | ✓ | ✓ |
| `create` | — | — |
| `update` | ✓ | — |
| `delete` | — | — |
| `notify` | — | — |
| `register` | — | — |
| `unregister` | — | — |
<!-- END GENERATED: actions -->

## Resource selector patterns

<!-- BEGIN GENERATED: selectors -->
| Pattern | Actions |
|---|---|
| `configuration[<name>]` | get, update |
| `configurationList` | get |
<!-- END GENERATED: selectors -->

`<name>` is the setting's name, `gaussianFitEnabled`. Names are matched exactly, including case.

<!-- BEGIN GENERATED: scope -->
This resource's handler does not read a data context itself. CODAP still resolves one —
defaulting to `#default` when the selector omits it — and uses it to resolve any
`collection` or `attribute` segment earlier in the selector. Naming a different
`dataContext` therefore changes what this resource returns only when the selector
contains such a segment.
<!-- END GENERATED: scope -->

Neither resource takes a `collection` or `attribute` segment, so naming a data context has no
effect on either. v2 did not resolve a data context for them at all.

## Values

### What `get` returns

| Property | Notes |
|---|---|
| `name` | the setting's name |
| `value` | `"yes"` when the setting is on, and empty text, `""`, when it is off |

v2 reported the value as it was stored instead: whatever a plugin last set, or failing that the
value of the `gaussianFit` URL parameter (`null` if the parameter had no value), or `""` if
neither was set. Only `"yes"` turned the setting on
in either version, so compare `value` with `"yes"` rather than testing whether it is empty.

### What `update` accepts

| Property | Type | Notes |
|---|---|---|
| `value` | String | required. `"yes"` turns the setting on; any other value turns it off |

`update` replies `{ "success": true }`, and the change takes effect at once.

The setting is not saved with the document, in v2 or v3. A plugin that needs it should set it
each time it loads. In v2 the setting belonged to the whole CODAP session, so it stayed on when
the user opened another document; in v3 it belongs to the document, and a newly opened document
starts with it off.

### configurationList

`get` on `configurationList` takes no `values`. It replies with an array holding one object for
each setting, in the shape `get` on `configuration` returns. Since there is one setting, the
array has one entry.

## Examples

**Turn on the Gaussian fit.**

```json
{
  "action": "update",
  "resource": "configuration[gaussianFitEnabled]",
  "values": { "value": "yes" }
}
```

```json
{ "success": true }
```

**Read the setting.**

```json
{
  "action": "get",
  "resource": "configuration[gaussianFitEnabled]"
}
```

```json
{
  "success": true,
  "values": { "name": "gaussianFitEnabled", "value": "yes" }
}
```

**List every setting.**

```json
{
  "action": "get",
  "resource": "configurationList"
}
```

```json
{
  "success": true,
  "values": [
    { "name": "gaussianFitEnabled", "value": "yes" }
  ]
}
```

**Turn the fit on each time the plugin loads.**

```js
// sendRequest stands for however your plugin sends requests — see "Sending requests and
// receiving notifications" in the index.
sendRequest({
  action: "update",
  resource: "configuration[gaussianFitEnabled]",
  values: { value: "yes" }
}, result => {
  if (!result.success) console.warn(result.values?.error)
})
```

## Known limitations

**`update` without a `value` turns the setting off.** CODAP replies `{ "success": true }` to an
`update` whose `values` has no `value`, and turns the setting off. v2 refused it with an error
and left the setting alone. This is a known bug; always send `value`.

**The `gaussianFit` URL parameter cannot be overridden.** In v3 the parameter turns the setting
on whatever its value, even `gaussianFit=no`, and while it is present a plugin cannot turn the
setting off: `update` replies success, and `get` still reports `"yes"`. In v2 only
`gaussianFit=yes` turned the setting on, and a non-empty value a plugin set took the place of
the parameter's. This is a known bug.

**Both resources fail when CODAP is embedded in a host page and the host page asks.** See
[Embedding CODAP in your page](../guides/embedded-server.md#known-limitations).

## Notifications

Neither resource sends notifications, and changing the setting sends none, as in v2. The change
cannot be undone, also as in v2.

## Errors

| Error | Condition |
|---|---|
| `unknown configuration "<name>"` | `get` or `update` names a setting other than `gaussianFitEnabled`, or names none, in which case `<name>` is `undefined` |
| `A values object is required for this request.` | `update` with no `values` |
| `Interactive Frame not found` | a request on `configuration` that did not come from a plugin; see [Known limitations](#known-limitations). The same request on `configurationList` fails with an internal error message instead |

For an unknown name, v2's messages differed: `get` replied that the setting was not found, and
`update` that it was not found or the value was missing.

## See also

- [Embedding CODAP in your page](../guides/embedded-server.md) for requests from a host page
- [The resource index](../README.md) for the request envelope
