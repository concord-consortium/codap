# selectionList

> **Applies to:** CODAP v3 · **Verified:** 2026-10-01 against `main` @ `a1ebcea11`
> · Parts of this page are generated — see [conventions](../conventions.md).

The selection list is the set of cases a user has selected in a data context. Plugins read it to
react to what the user has highlighted, and write it to highlight cases themselves — linking a
plugin's own display to CODAP's graphs and tables.

Selection is a property of the data context, not of any one component: selecting a case
highlights it everywhere it appears.

## Supported actions

<!-- BEGIN GENERATED: actions -->
| Action | Supported |
|---|---|
| `get` | ✓ |
| `create` | ✓ |
| `update` | ✓ |
| `delete` | — |
| `notify` | — |
| `register` | — |
| `unregister` | — |
<!-- END GENERATED: actions -->

`create` **replaces** the selection. `update` **adds** to it. There is no `delete` — clear the
selection by sending `create` with an empty array.

## Resource selector patterns

<!-- BEGIN GENERATED: selectors -->
| Pattern | Actions |
|---|---|
| `dataContext[<context>].selectionList` | get, create, update |
| `dataContext[<context>].collection[<collection>].selectionList` | get |
<!-- END GENERATED: selectors -->

On `get`, naming a collection restricts the result to cases in that collection. Omitting it
returns the selected cases of every collection.

<!-- BEGIN GENERATED: scope -->
This resource is scoped to a data context. Omitting one selects `#default`, the first data
context in the document — see [the index](../README.md#the-default-data-context).
<!-- END GENERATED: scope -->

## Values

### What `get` returns

An array, one entry per selected case:

<!-- BEGIN GENERATED: values -->
| Property | Notes |
|---|---|
| `caseID` | the selected case's id |
| `collectionID` | the id of the collection it belongs to |
| `collectionName` | that collection's name |
<!-- END GENERATED: values -->

### What `create` and `update` accept

Two different shapes. The first is an array of case ids:

```json
[ 12, 15, 22 ]
```

Item ids are also accepted — each value is tried as a case id first, then as an item id.

The second is a **selection expression**, which selects by formula instead of by id:

<!-- BEGIN GENERATED: values-write source=DISelectionExpression -->
| Property | Type | |
|---|---|---|
| `collection` | string | optional |
| `expression` | string | required |
<!-- END GENERATED: values-write -->

`collection` defaults to the childmost collection of the data context.

## Examples

Replace the selection with three cases:

```json
{
  "action": "create",
  "resource": "dataContext[Mammals].selectionList",
  "values": [ 12, 15, 22 ]
}
```

Add one more case to whatever is already selected:

```json
{
  "action": "update",
  "resource": "dataContext[Mammals].selectionList",
  "values": [ 31 ]
}
```

Select every case matching a formula:

```json
{
  "action": "create",
  "resource": "dataContext[Mammals].selectionList",
  "values": { "expression": "Mass > 100" }
}
```

Clear the selection:

```json
{
  "action": "create",
  "resource": "dataContext[Mammals].selectionList",
  "values": []
}
```

## Known limitations

**Ids that do not resolve are dropped silently.** Each value is tried as a case id and then as an
item id; a value that matches neither is discarded and the request still reports success. Sending
ten ids of which three are stale selects seven cases and tells you nothing went wrong. Compare
the length of a following `get` against what you sent if that matters.

**A collection in the selector does not narrow a write.** `create` and `update` apply to the
whole data context even when the selector names a collection. Only `get` honours it.

**An array containing an object is rejected whole.** If any entry is an object rather than a
number or string, the entire request fails with `<action> selectionList requires a list of case
IDs.` — no part of the selection is applied.

## Notifications

Changing the selection causes CODAP to notify plugins that are listening to the data context.
A plugin that both writes the selection and listens for selection changes will see its own
change reflected back.

## Errors

<!-- BEGIN GENERATED: errors -->
| Error | When |
|---|---|
| `DataContext not found` | the selector's data context does not resolve |
| `<value1> selectionList requires a list of case IDs.` | the values were neither an array of ids nor a selection expression, or an entry was an object |
| `Collection not found` | a selection expression named a collection that does not resolve |
<!-- END GENERATED: errors -->

## See also

- [`dataContext`](data-context.md) for the data set the selection belongs to
- [The resource index](../README.md) for the request envelope and the `#default` rule
