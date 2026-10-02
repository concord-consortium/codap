# attributeList

> **Applies to:** CODAP v3 · **Verified:** 2026-10-02
> · Parts of this page are generated — see [conventions](../conventions.md).

Lists the attributes of one collection. Plugins use it to discover a data set's columns before
reading cases — to find out what is there, and in what order.

The list is a summary: a name, an id and a title per attribute. To read an attribute's type,
formula, or display settings, `get` that [`attribute`](attribute.md).

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
| `dataContext[<context>].collection[<collection>].attributeList` | get |
<!-- END GENERATED: selectors -->

**The `collection` segment is required in practice.** See
[Known limitations](#known-limitations) — omitting it does not report an error.

<!-- BEGIN GENERATED: scope -->
This resource's handler does not read a data context itself. CODAP still resolves one —
defaulting to `#default` when the selector omits it — and uses it to resolve any
`collection` or `attribute` segment earlier in the selector. Naming a different
`dataContext` therefore changes what this resource returns only when the selector
contains such a segment.
<!-- END GENERATED: scope -->

## Values

An array, one entry per attribute, in the collection's own order:

<!-- BEGIN GENERATED: values -->
| Property |
|---|
| `name` |
| `id` |
| `title` |
<!-- END GENERATED: values -->

| Property | Notes |
|---|---|
| `name` | the attribute's name |
| `id` | the attribute's id |
| `title` | the attribute's title |

Nothing else is returned — not `type`, not `formula`, not `hidden`.

## Examples

```json
{
  "action": "get",
  "resource": "dataContext[Mammals].collection[Cases].attributeList"
}
```

A response:

```json
{
  "success": true,
  "values": [
    { "name": "Species", "id": 31, "title": "Species" },
    { "name": "Mass", "id": 32, "title": "Mass" }
  ]
}
```

## Known limitations

**Omitting the collection returns an empty list, not an error.** CODAP builds the attribute list
from the collection named in the selector. With no collection, it builds it from nothing and
replies `{"success": true, "values": []}`. A data context with fifty attributes reports zero, and
the response is indistinguishable from a collection that genuinely has none. There is no selector
that lists every attribute of a data context — read `collectionList` and ask for each.

**There is no error for a bad collection.** Naming a collection that does not exist gives the
same empty list and the same `success: true` as omitting the collection entirely.

## Notifications

This resource sends none. Creating or updating an attribute produces notifications on
[`attribute`](attribute.md); deleting one does not.

## Errors

<!-- BEGIN GENERATED: errors -->
| Error |
|---|
<!-- END GENERATED: errors -->

This resource returns no errors. A selector that resolves to no collection — because the
collection segment is missing, or names one that does not exist — yields an empty list with
`success: true`.

## See also

- [`attribute`](attribute.md) for an individual attribute's full properties
- [`dataContext`](data-context.md) for the data set the collection belongs to
- [The resource index](../README.md) for the request envelope and the `#default` rule
