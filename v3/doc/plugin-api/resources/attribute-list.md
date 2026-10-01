# attributeList

> **Applies to:** CODAP v3 · **Verified:** 2026-10-01 against `main` @ `a1ebcea11`
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
This resource does not use a data context. CODAP still resolves one — defaulting to
`#default` when the selector omits it — but this resource ignores it, so naming a
`dataContext` has no effect.
<!-- END GENERATED: scope -->

## Values

An array, one entry per attribute, in the collection's own order:

<!-- BEGIN GENERATED: values -->
| Property | Notes |
|---|---|
| `name` | the attribute's name |
| `id` | the attribute's id |
| `title` | the attribute's title |
<!-- END GENERATED: values -->

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

**`Collection not found` means something else here.** The error appears only when the selector
resolves to no attribute list at all, not when the named collection is missing — a missing
collection yields the empty list above.

## Notifications

This resource sends none. Creating, updating or deleting an attribute produces notifications on
[`attribute`](attribute.md).

## Errors

<!-- BEGIN GENERATED: errors -->
| Error | When |
|---|---|
| `Collection not found` | the selector resolved to no attribute list |
<!-- END GENERATED: errors -->

## See also

- [`attribute`](attribute.md) for an individual attribute's full properties
- [`dataContext`](data-context.md) for the data set the collection belongs to
- [The resource index](../README.md) for the request envelope and the `#default` rule
