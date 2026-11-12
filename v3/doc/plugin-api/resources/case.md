# case

> **Applies to:** CODAP v3 · **Verified:** 2026-10-21
> · Parts of this page are generated — see [conventions](../conventions.md).

A case is one row of a collection. In a data context with more than one collection, each case in
a child collection has a parent case in the collection above it, and the parent holds the values
its children share. Plugins use this resource to add cases to a collection and to change the
values of cases they already know the ids of.

This resource only creates and updates. To read cases, use [`caseByID`](case-by-id.md),
[`caseByIndex`](case-by-index.md), [`caseSearch`](case-search.md),
[`caseFormulaSearch`](case-formula-search.md) or [`allCases`](all-cases.md); to delete them, use
`caseByID`, `caseByIndex` or `allCases`. Plugins that do not need the hierarchy can work with items instead;
see [Hierarchical data](../../hierarchical-data.md) for how items and cases relate.

## Supported actions

<!-- BEGIN GENERATED: actions -->
| Action | Supported |
|---|---|
| `get` | — |
| `create` | ✓ |
| `update` | ✓ |
| `delete` | — |
| `notify` | — |
| `register` | — |
| `unregister` | — |
<!-- END GENERATED: actions -->

## Resource selector patterns

<!-- BEGIN GENERATED: selectors -->
| Pattern | Actions |
|---|---|
| `dataContext[<context>].collection[<collection>].case` | create, update |
<!-- END GENERATED: selectors -->

The `collection` segment is required for both actions. `create` adds the cases to that
collection. `update` finds each case by its id anywhere in the data context, but the collection
must still be named. `<collection>` accepts a collection name or id.

<!-- BEGIN GENERATED: scope -->
This resource is scoped to a data context. Omitting one selects `#default`, your plugin's
own data context — see [the index](../README.md#the-default-data-context).
<!-- END GENERATED: scope -->

## Values

Both actions take an array of case objects, one per case. `create` also accepts a single case
object on its own. v3 accepts one for `update` too, but v2 did not, so send an array.

### What `create` accepts

| Property | Type | Notes |
|---|---|---|
| `values` | Object | The new case's values, keyed by the names of this collection's attributes. Attributes you leave out are empty, and a case object with no `values` creates an empty case, as does a `null` entry in the array (v2 failed the request for one). A name that matches none of them is ignored |
| `parent` | number | The id of the parent case. Required when the collection has a parent collection, and the parent case must already exist in that collection. A case in the top collection ignores it; v2 used it if it named a case, and otherwise failed |

The new case takes its parent's values for the attributes of the collections above, so `values`
needs only this collection's attributes. A parent case created on its own starts with one empty
case beneath it; the first child case you create under it fills that case rather than adding
another, as in v2. This holds at each level, so building a parent, a child and a grandchild from
the top down makes one item.

A case object whose `parent` is missing or names no case in the parent collection is skipped, and
the others are still created. If every case object is skipped, the request fails with
`Cannot create case with invalid or deleted parent`. A request whose cases all join existing ones
(see below) succeeds with an empty reply. v2 also skipped a missing or unknown parent, but replied
`success: true` even when it created nothing; it accepted a parent from a collection further up
only while the collection had no cases, and otherwise failed the request.

`create` replies with the ids of the new cases in this collection, as an array of objects. Each
carries `id`, the new case's id, and `itemID`, the id of the item behind it. The reply does not
necessarily list the cases in the order you sent them.

### What `update` accepts

| Property | Type | Notes |
|---|---|---|
| `id` | number | The id of the case to change. A case id is unique within its data context |
| `values` | Object | The values to change, keyed by attribute name. Attributes you leave out keep their values |

A case object whose `id` matches no case is skipped, and the rest are still updated. `update`
replies with `caseIDs`, the ids of the cases it found. A case is listed even when none of its
values changed, or when its object has no `values`. If no case matched, the reply is
`{ "success": false }`. v3 currently accepts item ids as well as case ids; see
[Known limitations](#known-limitations).

If a name in `values` matches no attribute, the other values are still set, and the reply has
`success: false` alongside `caseIDs`.

## Examples

The examples use a data context `People` with two collections: `People`, holding `Name`, and its
child `Measurements`, holding `Age` and `Height`. The `People` collection has a case with id 12
for Ana and one with id 13 for Ben, and each already has at least one case in `Measurements`.

**Create two child cases, one under each parent.**

```json
{
  "action": "create",
  "resource": "dataContext[People].collection[Measurements].case",
  "values": [
    { "parent": 12, "values": { "Age": 12, "Height": 150 } },
    { "parent": 13, "values": { "Age": 11, "Height": 144 } }
  ]
}
```

```json
{
  "success": true,
  "values": [
    { "id": 15, "itemID": 7 },
    { "id": 16, "itemID": 8 }
  ]
}
```

**Create a parent case.** A case in the top collection has no `parent`.

```json
{
  "action": "create",
  "resource": "dataContext[People].collection[People].case",
  "values": [
    { "values": { "Name": "Cleo" } }
  ]
}
```

```json
{
  "success": true,
  "values": [
    { "id": 17, "itemID": 9 }
  ]
}
```

**Update two cases.**

```json
{
  "action": "update",
  "resource": "dataContext[People].collection[Measurements].case",
  "values": [
    { "id": 15, "values": { "Height": 151 } },
    { "id": 16, "values": { "Age": 12 } }
  ]
}
```

```json
{
  "success": true,
  "caseIDs": [15, 16]
}
```

**Create cases and keep their ids.**

```js
// sendRequest stands for however your plugin sends requests — see "Sending requests and
// receiving notifications" in the index.
sendRequest({
  action: "create",
  resource: "dataContext[People].collection[Measurements].case",
  values: samples.map(s => ({ parent: s.personCaseID, values: { Age: s.age, Height: s.height } }))
}, result => {
  if (result.success) {
    const newCaseIDs = result.values.map(v => v.id)
    // ...
  }
})
```

## Known limitations

**A parent's only child case can be filled if it is empty.** CODAP can't always tell the empty
case a new parent starts with from a real child case whose values were all cleared. If a parent's
only child case has no values, and no request has filled it in this collection since the document was opened, the
next child case you create under it fills that case instead of adding another. v2 added a new case
under a parent that already had a child.

**A new case that matches an existing one joins it.** CODAP groups the cases of a collection by
their values, so a new case whose values in that collection match an existing case under the same
parent, including two cases with no values, becomes part of that case rather than a separate one,
and is missing from the reply. v2 kept them separate.

**An unknown attribute name does not make `update` report failure.** v2 replied `success: false`
when a name in `values` matched no attribute, and v3 replies `success: true`. Both still set the
other values. This is a known bug; the intended behavior is v2's.

**Attribute names must match exactly.** On both actions, v2 tried a name in `values` again with
leading and trailing spaces removed, so `"Age "` still matched `Age`. v3 matches the name exactly
and ignores one that differs. This is a known bug; the intended behavior is v2's.

**`create` also sets attributes of the collections below.** v2 ignored names in `values` that
were not attributes of the named collection. v3 also sets the attributes of the collections below
it. (Attributes of the collections above take the parent's values.) This differs from v2, and a
plugin should not rely on it.

**`values` given as an array is not applied.** v2 also accepted `values` as an array of values in
the collection's attribute order, on both actions. v3 does not: `create` makes a case with no
values, and `update` changes nothing. This is a known bug; until it is fixed, key `values` by
attribute name.

**`update` also accepts item ids.** When an `id` matches no case, v3 tries it as the id of an
item, changes that item, and lists the id in `caseIDs`. v2 skipped it. This is a known bug. Use
the ids of cases, and use [`itemByID`](item-by-id.md) to change an item.

## Notifications

`create` notifies the plugins listening to the data context with `createCases`, and `update` with
`updateCases`, both on `dataContextChangeNotice[<context>]`, as the same changes made in a case
table do. An `update` that moves cases to a different parent case also sends `createCases` for the
cases it creates; v2 sent a second `updateCases` listing them instead. An `update` that names no
known attribute sends nothing; v2 failed the request. An `update` object with no `values` is
listed in `caseIDs` but not in `updateCases`; v2 listed it in both. A case that fills a parent's
empty child case is sent in `createCases`, as in v2, even though the parent's own `createCases`
already listed it, so a plugin that keeps a copy of the cases may see the same id created twice.
See
[the notification catalog](../notifications.md#data-changes--datacontextchangenoticecontext) for
what each carries.

## Errors

| Error | Condition |
|---|---|
| `DataContext not found` | the selector's data context does not resolve. v2 reported this as being unable to resolve the data context |
| `Collection not found` | the `collection` segment is missing or names no collection. For `update` without the segment, v2 replied `{ "success": false }` with no message, and for a collection that does not exist it reported being unable to resolve it |
| `Cannot create case with invalid or deleted parent` | `create` in a collection below the top, when every case object lacks a `parent` that names a case in the parent collection |
| `A values object is required for this request.` | `create` or `update` with no `values`. For `create`, v2 failed with a script error |

`update` replies `{ "success": false }`, with no error message, when no case in `values` matches
a case in the data context.

## See also

- [`caseByID`](case-by-id.md), [`caseByIndex`](case-by-index.md) and [`allCases`](all-cases.md)
  for reading and deleting cases
- [`caseSearch`](case-search.md) and [`caseFormulaSearch`](case-formula-search.md) for finding
  cases by their values
- [The notification catalog](../notifications.md) for `createCases` and `updateCases`
- [The resource index](../README.md) for the request envelope and the `#default` rule
