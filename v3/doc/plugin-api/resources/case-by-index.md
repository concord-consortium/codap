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
| `notify` | ✓ |
| `register` | — |
| `unregister` | — |
<!-- END GENERATED: actions -->

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
| `values` | Object or Array | required. The new values, keyed by attribute name. Attributes you leave out keep their values. As in v2, it may instead be an array of values in the order of the collection's attributes, as described on [`case`](case.md#what-create-accepts) |

The values are nested one level: the request's `values` holds an object whose own `values` key
holds the attribute values. A name that matches no attribute is tried again with leading and
trailing spaces removed. If it still matches none, the other values are still set, and the reply
is `{ "success": false }`.

Updating a parent case changes that value for every item grouped under it, so the case keeps its
children.

Otherwise `update` replies `{ "success": true }`.

### What `notify` accepts

| Property | Type | Notes |
|---|---|---|
| `caseOrder` | String or number | required. `"first"`, `"last"`, or the position, counting from 0, the case should end up at in its collection. A position may be sent as text, such as `"2"` |

`notify` moves the case to that position, as in v2, and replies `{ "success": true }` unless the
move is impossible (see below). Its child cases move with it, and a child case stays under its
parent: a position among another parent's cases puts it first or last among its own parent's cases,
on the side the position was on. A position is rounded toward zero, and one before the start or past
the end puts the case first or last. Any other `caseOrder` replies `{ "success": false }`. A case
already at that position isn't moved.

Only the moved case changes places. Every other case, at every level, keeps its order, both among
the cases shown and once set-aside and filtered-out cases are shown again, and every case but the
moved case's parent and higher-level cases keeps its own items in order. Moved first, the case also
goes ahead of the set-aside and filtered-out cases under its parent, and moved last, after them, as
`notify` on `itemSearch` places items, unless that would reorder other cases. A case that is wholly
set aside or filtered out can be moved too: only where it appears once it is shown again changes.
When set-aside or filtered-out items make the move impossible without reordering other cases,
`notify` replies with an error and changes nothing.
As in v2, the move can't be undone.

v2 moved cases differently. A plugin that must also run in v2 should avoid a position of `0`, text
that isn't a number, negative positions and positions past the end. Even then, v2 placed child
cases differently:

- A position of `0` replied `{ "success": false }`.
- v2 moved the case within its whole collection: `"first"` and `"last"` meant the first and last
  case of the collection, and a position counted across every parent's cases, so a child case
  could end up under another parent's cases. Its own child cases kept their places.
- Reading v2's code (not run): text that isn't a number, such as `"middle"`, moved the case first,
  and `true` moved it to position 1. A negative position counted back from the end, so `-1` put it
  just ahead of the last case. A position past the end failed with an out-of-range error after the
  case had already been taken out of its place.

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

Read every case of a collection in order, with one request per case. CODAP answers a plugin's
requests in the order it sent them, so the callbacks run in order too:

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

Move the third mammal to the top of its diet's mammals. `"first"` puts it first in its collection, as
in v2, but a child case stays under its parent, so it goes first among its parent's cases:

```json
{
  "action": "notify",
  "resource": "dataContext[Mammals].collection[Mammals].caseByIndex[2]",
  "values": { "caseOrder": "first" }
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

**The text `true` and `false` reads back as a boolean.** A value a plugin sent as `true` reads back
as `true` from `get`, as in v2. CODAP stores every value as a number or text, so it cannot tell
that boolean from the text `true` typed into a table, imported from a file, or set by a checkbox:
those read back as booleans too, where v2 returned the text. Only the lowercase words are
converted; `TRUE` stays text. This is a deliberate difference.

## Notifications

`notify` sends `moveCases` to the other plugins on `dataContextChangeNotice[<context>]`, even
when the case was already in place, as in v2. It lists the case's id in `caseIDs` and the case,
with its values, in `cases`, as v2 did.

`update` and `delete` notify other plugins on `dataContextChangeNotice[<context>]` with
`updateCases` or `deleteCases`, as the same change made in a case table does. An `update` that
moves the case to a different parent case also sends `createCases` for the cases it creates; v2
sent a second `updateCases` listing them instead.

An `update` that replies `success: false` because a name matches no attribute still sends
`updateCases` for the values it did set, and that notice's `result` says `success: true`. v2 sent
no `updateCases` for the change itself, since it had failed; it sent one only for the regrouping
when an attribute of a parent collection changed.

## Errors

| Error | Condition |
|---|---|
| `DataContext not found` | the selector's data context does not resolve |
| `Case not found` | the selector names no collection, the collection does not resolve, or `<index>` is not a position in it |
| `<action> <resource>: <field> required` | `update` without `values`, or without `values.values`; `notify` without `values`, or without `values.caseOrder` (v2 replied `{ "success": false }` with no message) |
| `The case can't move there without changing the order of other cases (set-aside or filtered-out cases are in the way)` | `notify` with a `caseOrder` that can't be reached without reordering other cases, because of set-aside or filtered-out items |

## See also

- [`caseByID`](case-by-id.md) to find a case by its id
- [`allCases`](all-cases.md) to read every case in a collection at once
- [The resource index](../README.md) for the request envelope and the `#default` rule
- [The notification catalog](../notifications.md) for the data-change notifications
