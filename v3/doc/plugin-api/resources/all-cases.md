# allCases

> **Applies to:** CODAP v3 · **Verified:** 2026-10-21
> · Parts of this page are generated — see [conventions](../conventions.md).

Reads every case in one collection, or deletes every case in a data context. Plugins use `get` to
read a whole collection's data in one request, with each case's place in the hierarchy, and
`delete` to clear a data set before loading fresh data into it.

## Supported actions

<!-- BEGIN GENERATED: actions -->
| Action | Supported |
|---|---|
| `get` | ✓ |
| `create` | — |
| `update` | — |
| `delete` | ✓ |
| `notify` | — |
| `register` | — |
| `unregister` | — |
<!-- END GENERATED: actions -->

## Resource selector patterns

<!-- BEGIN GENERATED: selectors -->
| Pattern | Actions |
|---|---|
| `dataContext[<context>].collection[<collection>].allCases` | get, delete |
<!-- END GENERATED: selectors -->

`get` requires the `collection` segment; `<collection>` accepts a collection's name or its numeric
id. `delete` ignores it.

**`delete` deletes every case in the data context, not only those of the named collection.** It
removes all of the data context's items, so every collection is left empty. Its collections and
attributes remain. Cases that are set aside, or hidden by a filter formula, are not deleted;
set-aside cases stay set aside, and the user can still restore them.

<!-- BEGIN GENERATED: scope -->
This resource is scoped to a data context. Omitting one selects `#default`, your plugin's
own data context — see [the index](../README.md#the-default-data-context).
<!-- END GENERATED: scope -->

## Values

### What `get` returns

| Property | Notes |
|---|---|
| `collection` | `{ "name", "id" }` of the collection |
| `cases` | one entry per case in the collection, in the order the case table shows them |
| `cases[].case.id` | the case's id |
| `cases[].case.parent` | the parent case's id; `null` for a case in the top-level collection. v3 currently differs; see [Known limitations](#known-limitations) |
| `cases[].case.children` | the ids of the case's child cases, in order; empty in the child-most collection |
| `cases[].case.values` | one key per attribute of the collection, keyed by attribute name |
| `cases[].caseIndex` | the case's position in the collection, counting from 0, as used by [`caseByIndex`](case-by-index.md) |

Each case holds only the attributes of its own collection. To read a child case together with
its parent's values, read both collections and join them on `parent`, or use the `item`
resources, whose items carry every attribute.

Unlike [`caseByID`](case-by-id.md), the cases carry no `collection` key; the collection is given
once, at the top.

### What `delete` returns

`delete` takes no `values` and replies `{ "success": true }`.

## Examples

The examples use a data context `Mammals` with two collections: `Diets`, holding the attribute
`Diet`, and below it `Mammals`, holding `Mammal` and `Mass`.

Read every diet:

```json
{
  "action": "get",
  "resource": "dataContext[Mammals].collection[Diets].allCases"
}
```

```json
{
  "success": true,
  "values": {
    "collection": { "name": "Diets", "id": 52 },
    "cases": [
      {
        "case": { "id": 53, "parent": null, "children": [ 13, 14 ], "values": { "Diet": "plants" } },
        "caseIndex": 0
      },
      {
        "case": { "id": 54, "parent": null, "children": [ 15 ], "values": { "Diet": "meat" } },
        "caseIndex": 1
      }
    ]
  }
}
```

Read every mammal:

```json
{
  "action": "get",
  "resource": "dataContext[Mammals].collection[Mammals].allCases"
}
```

```json
{
  "success": true,
  "values": {
    "collection": { "name": "Mammals", "id": 3 },
    "cases": [
      {
        "case": { "id": 13, "parent": 53, "children": [], "values": { "Mammal": "African Elephant", "Mass": 6400 } },
        "caseIndex": 0
      },
      {
        "case": { "id": 14, "parent": 53, "children": [], "values": { "Mammal": "Asian Elephant", "Mass": 5000 } },
        "caseIndex": 1
      },
      {
        "case": { "id": 15, "parent": 54, "children": [], "values": { "Mammal": "Lion", "Mass": 250 } },
        "caseIndex": 2
      }
    ]
  }
}
```

Clear the data context before loading new data:

```json
{
  "action": "delete",
  "resource": "dataContext[Mammals].collection[Mammals].allCases"
}
```

```json
{ "success": true }
```

## Known limitations

**A top-level case's `parent` is `undefined`, not `null`.** v2 sent `null`. A plugin that tests
`parent === null` treats every top-level case as a child; test for a missing parent instead, such
as `parent == null`. This is a known bug.

**`delete` notifies no other plugin.** v2 sent `deleteCases` on
`dataContextChangeNotice[<context>]` to the other plugins. v3 sends nothing, so other plugins do
not learn that the data set was emptied. This is a known bug; see
[the notification catalog](../notifications.md#known-limitations).

## Notifications

This resource takes no `notify` requests.

`delete` should notify other plugins on `dataContextChangeNotice[<context>]` with `deleteCases`,
as deleting cases in a case table does. It does not yet; see
[Known limitations](#known-limitations).

## Errors

| Error | Condition |
|---|---|
| `DataContext not found` | the selector's data context does not resolve |
| `Collection not found` | `get` without a `collection` segment, or with one that does not resolve |

## See also

- [`caseByID`](case-by-id.md) and [`caseByIndex`](case-by-index.md) to read, change or delete one
  case
- [The resource index](../README.md) for the request envelope, the `#default` rule, and the
  difference between cases and items
- [The notification catalog](../notifications.md) for the data-change notifications
