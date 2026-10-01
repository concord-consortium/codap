# componentList

> **Applies to:** CODAP v3 · **Verified:** 2026-10-01 against `main` @ `a1ebcea11`
> · Parts of this page are generated — see [conventions](../conventions.md).

Lists every component in the document. Plugins use it to discover what is on screen — to find a
graph by name before updating it, or to check whether the component they created still exists.

The list is a summary. To read a component's own properties, `get` that component.

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

## Resource selector patterns

<!-- BEGIN GENERATED: selectors -->
| Pattern | Actions |
|---|---|
| `componentList` | get |
<!-- END GENERATED: selectors -->

<!-- BEGIN GENERATED: scope -->
This resource is **not** scoped to a data context, so the default-data-context rule does not
apply. Naming a `dataContext` in the selector has no effect.
<!-- END GENERATED: scope -->

## Values

An array, one entry per component:

<!-- BEGIN GENERATED: values source=DIComponentInfo -->
| Property | Type | |
|---|---|---|
| `hidden` | boolean | optional |
| `id` | number | optional |
| `name` | string | optional |
| `title` | string | optional |
| `type` | string | optional |
<!-- END GENERATED: values -->

`type` is the component's type name, the same vocabulary [`component`](component.md) uses.
`hidden` is `true` for a component the user has hidden rather than closed.

## Examples

```json
{ "action": "get", "resource": "componentList" }
```

A response:

```json
{
  "success": true,
  "values": [
    { "hidden": false, "id": 12, "name": "Mammals", "title": "Mammals", "type": "caseTable" },
    { "hidden": false, "id": 14, "title": "Height by Weight", "type": "graph" }
  ]
}
```

## Known limitations

**The list includes the requesting plugin.** A plugin is itself a component, so it appears in its
own `componentList` with type `game`. Filter by `id` against your own
[`interactiveFrame`](interactive-frame.md) if you need to exclude yourself.

**Hidden components are listed.** They are reported with `hidden: true` rather than omitted, so
a plugin counting what the user can see must filter them out.

**Neither `name` nor `title` is guaranteed.** `name` is omitted when a component has none, and
`title` is omitted when the tile has no title of its own. Match on `id` rather than on either.

## Notifications

This resource sends none. Creating or deleting a component produces a notification on
[`component`](component.md).

## Errors

<!-- BEGIN GENERATED: errors -->
This resource reports no errors of its own. A `get` on an empty document returns an empty array.
<!-- END GENERATED: errors -->

## See also

- [`component`](component.md) for reading and changing an individual component
- [The resource index](../README.md) for the request envelope and the `#default` rule
