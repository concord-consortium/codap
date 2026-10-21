# caseByIndex

> **Applies to:** CODAP v3 · **Verified:** 2026-10-21
> · Parts of this page are generated — see [conventions](../conventions.md).

Reads, changes or deletes one case, found by its position in a collection. Plugins use it to
step through a collection's cases one at a time — the first case, the next one, the last — when
they do not hold case ids.

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
| `dataContext[<context>].collection[<collection>].caseByIndex[<index>]` | get, update, delete |
<!-- END GENERATED: selectors -->

The `collection` segment is required: a position means nothing without the collection it is
counted in. `<collection>` accepts a collection's name or its numeric id.

`<index>` counts from 0 to one less than the number of cases in the collection; `caseCount`
gives that number. Cases are counted in the order the case table shows them, grouped so that
the children of each parent case are together. A position is not a stable way to refer to a
case: deleting, adding or sorting cases moves the others. Once you have a case, keep its id and
use [`caseByID`](case-by-id.md).

<!-- BEGIN GENERATED: scope -->
This resource is scoped to a data context. Omitting one selects `#default`, your plugin's
own data context — see [the index](../README.md#the-default-data-context).
<!-- END GENERATED: scope -->

## Values

### What `get` returns

| Property | Notes |
|---|---|
| `case.id` | the case's id |
| `case.parent` | the parent case's id; `null` for a case in the top-level collection |
| `case.collection` | `{ "name", "id" }` of the collection the case belongs to |
| `case.values` | one key per attribute of the case's collection, keyed by attribute name |
| `case.children` | the ids of the case's child cases, in order; empty in the child-most collection |
| `caseIndex` | the case's position, the same `<index>` you asked for |

`case.values` holds only the attributes of the case's own collection. A child case's values do
not repeat its parent's; read the parent for those.

### What `update` accepts

| Property | Type | Notes |
|---|---|---|
| `values` | Object | required. The new values, keyed by attribute name. Attributes you leave out keep their values |

The values are nested one level: the request's `values` holds an object whose own `values` key
holds the attribute values. Names that match no attribute are ignored.

Updating a parent case changes that value for every item grouped under it, so the case keeps its
children.

`update` replies `{ "success": true }`.

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

Read the first case of the `Diets` collection:

```json
{
  "action": "get",
  "resource": "dataContext[Mammals].collection[Diets].caseByIndex[0]"
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

Read every case of a collection in order, one request at a time:

```js
// sendRequest stands for however your plugin sends requests — see "Sending requests and
// receiving notifications" in the index.
const resource = "dataContext[Mammals].collection[Mammals]"
sendRequest({ action: "get", resource: `${resource}.caseCount` }, countResult => {
  for (let i = 0; i < countResult.values; i++) {
    sendRequest({ action: "get", resource: `${resource}.caseByIndex[${i}]` }, result => {
      if (result.success) console.log(result.values.case.values)
    })
  }
})
```

[`allCases`](all-cases.md) returns the same cases in one request.

Change a value of the third mammal. Note the nested `values`:

```json
{
  "action": "update",
  "resource": "dataContext[Mammals].collection[Mammals].caseByIndex[2]",
  "values": {
    "values": { "Mass": 6000 }
  }
}
```

```json
{ "success": true }
```

Delete the first diet, and with it every mammal grouped under it:

```json
{
  "action": "delete",
  "resource": "dataContext[Mammals].collection[Diets].caseByIndex[0]"
}
```

```json
{ "success": true, "values": [ 53 ] }
```

## Known limitations

**`notify` to move a case is not supported.** In v2, `notify` with `values.caseOrder` moved the
case within its collection: `"first"`, `"last"`, or a numeric position. v3 rejects the
request as an unsupported action. This is a known bug.

**A top-level case's `parent` is `undefined`, not `null`.** v2 sent `null`. A plugin that tests
`parent === null` treats every top-level case as a child; test for a missing parent instead, such
as `parent == null`. This is a known bug.

**`update` and `delete` notify no other plugin.** v2 sent `updateCases` or `deleteCases` on
`dataContextChangeNotice[<context>]` to the other plugins. v3 sends nothing, so other plugins do
not learn of the change. This is a known bug; see
[the notification catalog](../notifications.md#known-limitations).

## Notifications

This resource takes no `notify` requests of its own.

`update` and `delete` should notify other plugins on `dataContextChangeNotice[<context>]` with
`updateCases` or `deleteCases`, as the same change made in a case table does. They do not yet;
see [Known limitations](#known-limitations).

## Errors

| Error | Condition |
|---|---|
| `DataContext not found` | the selector's data context does not resolve |
| `Case not found` | the selector names no collection, the collection does not resolve, or `<index>` is not a position in it |
| `<action> <resource>: <field> required` | `update` without `values`, or without `values.values` |

## See also

- [`caseByID`](case-by-id.md) to find a case by its id
- [`allCases`](all-cases.md) to read every case in a collection at once
- [The resource index](../README.md) for the request envelope and the `#default` rule
- [The notification catalog](../notifications.md) for the data-change notifications
