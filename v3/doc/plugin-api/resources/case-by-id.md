# caseByID

> **Applies to:** CODAP v3 · **Verified:** 2026-10-21
> · Parts of this page are generated — see [conventions](../conventions.md).

Reads, changes or deletes one case, found by its id. Plugins use it once they hold a case id —
from a notification, a search, or an earlier `get` — and want that case's values, its place in
the hierarchy, or to change it.

A case id is unique within its data context, so CODAP can find the case without being told its
collection. A case is not an item: in the child-most collection each case corresponds to one
item, but the two have different ids, and an item id does not resolve here. Use `itemByID` for
items.

## Supported actions

<!-- BEGIN GENERATED: actions -->
| Action | Supported |
|---|---|
| `get` | ✓ |
| `create` | — |
| `update` | ✓ |
| `delete` | ✓ |
| `notify` | — |
| `register` | — |
| `unregister` | — |
<!-- END GENERATED: actions -->

`notify`, which moves a case within its collection, is part of the API but not yet supported;
see [Known limitations](#known-limitations).

## Resource selector patterns

<!-- BEGIN GENERATED: selectors -->
| Pattern | Actions |
|---|---|
| `dataContext[<context>].caseByID[<id>]` | get, update, delete |
| `dataContext[<context>].collection[<collection>].caseByID[<id>]` | get, update, delete |
<!-- END GENERATED: selectors -->

`<id>` is the case's numeric id. The `collection` segment is optional, and CODAP ignores it
when finding the case. CODAP v2 required it for `update` and `delete`, so include it if your
plugin must also run there. If you include it, name the case's own collection: v2's `get` read
`values`, `collection` and `caseIndex` from the collection you named, even when the case
belonged to a different one.

<!-- BEGIN GENERATED: scope -->
This resource is scoped to a data context. Omitting one selects `#default`, your plugin's
own data context — see [the index](../README.md#the-default-data-context).
<!-- END GENERATED: scope -->

## Values

### What `get` returns

| Property | Notes |
|---|---|
| `case.id` | the case's id |
| `case.parent` | the parent case's id; `null` for a case in the top-level collection. v3 currently differs; see [Known limitations](#known-limitations) |
| `case.collection` | `{ "name", "id" }` of the collection the case belongs to |
| `case.values` | one key per attribute of the case's collection, keyed by attribute name |
| `case.children` | the ids of the case's child cases, in order; empty in the child-most collection |
| `caseIndex` | the case's position in its collection, counting from 0, in the order of [`caseByIndex`](case-by-index.md) |

`case.values` holds only the attributes of the case's own collection. A child case's values do
not repeat its parent's; read the parent for those.

### What `update` accepts

| Property | Type | Notes |
|---|---|---|
| `values` | Object | required. The new values, keyed by attribute name. Attributes you leave out keep their values |

The values are nested one level: the request's `values` holds an object whose own `values` key
holds the attribute values. A name that matches no attribute is tried again with leading and
trailing spaces removed. If it still matches none, the other values are still set, and the reply
is `{ "success": false }`. v3 currently differs on both points; see
[Known limitations](#known-limitations).

Updating a parent case changes that value for every item grouped under it, so the case keeps its
children.

Otherwise `update` replies `{ "success": true }`.

### What `delete` returns

Deleting a case also deletes all of its descendants, as deleting it in a case table does.
`delete` replies with the deleted case's id:

```json
{ "success": true, "values": [ 53 ] }
```

The id in `values` is new in v3. v2 replied only `{ "success": true }`, so a plugin that must also
run there should not depend on it.

## Examples

The examples use a data context `Mammals` with two collections: `Diets`, holding the attribute
`Diet`, and below it `Mammals`, holding `Mammal` and `Mass`.

Read a child case:

```json
{
  "action": "get",
  "resource": "dataContext[Mammals].caseByID[13]"
}
```

```json
{
  "success": true,
  "values": {
    "case": {
      "id": 13,
      "parent": 53,
      "collection": { "name": "Mammals", "id": 3 },
      "values": { "Mammal": "African Elephant", "Mass": 6400 },
      "children": []
    },
    "caseIndex": 0
  }
}
```

Read its parent:

```json
{
  "action": "get",
  "resource": "dataContext[Mammals].caseByID[53]"
}
```

```json
{
  "success": true,
  "values": {
    "case": {
      "id": 53,
      "parent": null,
      "collection": { "name": "Diets", "id": 52 },
      "values": { "Diet": "plants" },
      "children": [ 13, 14, 20 ]
    },
    "caseIndex": 0
  }
}
```

Change one value of a case. Note the nested `values`:

```json
{
  "action": "update",
  "resource": "dataContext[Mammals].collection[Mammals].caseByID[13]",
  "values": {
    "values": { "Mass": 6000 }
  }
}
```

```json
{ "success": true }
```

Delete a parent case, and with it every mammal grouped under it:

```json
{
  "action": "delete",
  "resource": "dataContext[Mammals].collection[Diets].caseByID[53]"
}
```

```json
{ "success": true, "values": [ 53 ] }
```

## Known limitations

**`notify` to move a case is not supported.** In v2, `notify` with `values.caseOrder` moved the
case within its collection: `"first"`, `"last"`, or a numeric position. The selector had to name
the collection. v3 rejects the request as an unsupported action. This is a known bug.

**A top-level case's `parent` is `undefined`, not `null`.** v2 sent `null`. A plugin that tests
`parent === null` treats every top-level case as a child; test for a missing parent instead, such
as `parent == null`. This is a known bug.

**An unknown attribute name does not make `update` report failure.** v2 replied `success: false`
when a name in `values` matched no attribute, and v3 replies `success: true`. Both still set the
other values. This is a known bug; the intended behavior is v2's.

**Attribute names must match exactly.** v2 tried a name in `values` again with leading and
trailing spaces removed, so `"Age "` still matched `Age`. v3 matches the name exactly and ignores
one that differs. This is a known bug; the intended behavior is v2's.

## Notifications

This resource takes no `notify` requests of its own.

`update` and `delete` notify other plugins on `dataContextChangeNotice[<context>]` with
`updateCases` or `deleteCases`, as the same change made in a case table does.

## Errors

| Error | Condition |
|---|---|
| `DataContext not found` | the selector's data context does not resolve |
| `Case not found` | no case in the data context has that id, including when the id is an item id |
| `<action> <resource>: <field> required` | `update` without `values`, or without `values.values` |

## See also

- [`caseByIndex`](case-by-index.md) to find a case by its position in a collection
- [`allCases`](all-cases.md) to read every case in a collection
- [The resource index](../README.md) for the request envelope, the `#default` rule, and the
  difference between cases and items
- [The notification catalog](../notifications.md) for the data-change notifications
