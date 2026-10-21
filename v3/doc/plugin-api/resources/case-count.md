# caseCount

> **Applies to:** CODAP v3 · **Verified:** 2026-10-21
> · Parts of this page are generated — see [conventions](../conventions.md).

Reports how many cases one collection has. Plugins use it to size a loop over
[`caseByIndex`](case-by-index.md), to check whether a data set is empty, or to notice that cases
were added or removed without reading them all.

The count is per collection, not per data set. In a data set grouped into a parent and a child
collection, the parent collection's count is the number of groups and the child collection's
count is the number of individual cases.

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
| `dataContext[<context>].collection[<collection>].caseCount` | get |
<!-- END GENERATED: selectors -->

The `collection` segment is required. `<collection>` accepts the collection's name or its id.

<!-- BEGIN GENERATED: scope -->
This resource is scoped to a data context. Omitting one selects `#default`, the first data
context in the document — see [the index](../README.md#the-default-data-context).
<!-- END GENERATED: scope -->

## Values

`get` takes no `values`. The response's `values` is a single number: the count itself, not an
object.

**Only cases the user can see are counted.** A case the user has set aside is not counted, and
neither is a case hidden by the data set's filter formula. A parent case is counted as long as
at least one of its child cases is visible.

## Examples

**Count the cases in a flat data set.** The Mammals data set has one collection, also called
Mammals, with 27 cases:

```json
{
  "action": "get",
  "resource": "dataContext[Mammals].collection[Mammals].caseCount"
}
```

```json
{
  "success": true,
  "values": 27
}
```

**Count the groups in a parent collection.** After the user drags `Diet` to the left, the Mammals
data set has a parent collection, here named Diets, with one case per diet:

```json
{
  "action": "get",
  "resource": "dataContext[Mammals].collection[Diets].caseCount"
}
```

```json
{
  "success": true,
  "values": 3
}
```

## Notifications

This resource sends none. Changes to a data set's cases are reported on
`dataContextChangeNotice[<context>]`; see [the notification catalog](../notifications.md).

## Errors

| Error | Condition |
|---|---|
| `Collection not found` | The selector names no collection, names one that does not exist, or names a data context that does not exist |

## See also

- [`caseByIndex`](case-by-index.md) to read the cases one at a time
- [`allCases`](all-cases.md) to read every case in a collection at once
- [`caseSearch`](case-search.md) and [`caseFormulaSearch`](case-formula-search.md) to read only
  the cases that match a condition
- [The resource index](../README.md) for the request envelope and the `#default` rule
