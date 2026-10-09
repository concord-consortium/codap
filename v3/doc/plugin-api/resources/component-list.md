# componentList

> **Applies to:** CODAP v3 · **Verified:** 2026-10-02
> · Parts of this page are generated — see [conventions](../conventions.md).

Lists every component in the document. Plugins use it to discover what is on screen — to find a
graph by name before updating it, or to see what the user has open.

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
| `hidden` | `boolean` | optional |
| `id` | `number` | optional |
| `name` | `string` | optional |
| `title` | `string` | optional |
| `type` | `string` | optional |
<!-- END GENERATED: values -->

`type` is the component's type name, the same vocabulary [`component`](component.md) uses. A
plugin appears as `game` once it has connected to CODAP, and as `webView` before that; a web view
created through the API reports `webView` — see
[`component`'s known limitations](component.md#known-limitations).

`hidden` is `true` for a component that is in the document but not on screen. That includes
components the user closed, since closing a case table, case card or calculator hides it rather
than deleting it. A guide CODAP itself built behaves the same way; one created through the API
does not, because it is not marked as a guide.

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

**A deleted component may still be listed.** Case tables, case cards and calculators are hidden
rather than deleted when closed — by the user or by `delete component` — and remain here with
`hidden: true`. This list therefore cannot answer "does the component I created still exist": for
those types the answer is always yes. Filter on `hidden` to find what the user can actually see.

**Neither `name` nor `title` is guaranteed.** `name` is omitted when a component has none, and
`title` is omitted when the tile has no title of its own. Match on `id` rather than on either.

## Notifications

This resource sends none. Creating, updating, deleting, hiding, showing or renaming a component
produces a notification on [`component`](component.md), and every component operation is listed
in [the notification catalog](../notifications.md#component-changes--component).

## Errors

<!-- BEGIN GENERATED: errors -->
| Error |
|---|
<!-- END GENERATED: errors -->

This resource reports no errors of its own. A `get` on an empty document returns an empty array.

## See also

- [`component`](component.md) for reading and changing an individual component
- [The resource index](../README.md) for the request envelope and the full resource list
