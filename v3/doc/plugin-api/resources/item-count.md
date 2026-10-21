# itemCount

> **Applies to:** CODAP v3 · **Verified:** 2026-10-21
> · Parts of this page are generated — see [conventions](../conventions.md).

Returns the number of items in a data context. Plugins use it to learn how many rows a data set
has, for example before reading them one at a time with [`item`](item.md).

An item is one flat row of a data set, holding a value for every attribute in every collection.
The number of items equals the number of cases in the data context's last collection. To count
the cases of another collection, such as the groups in a parent collection, use
[`caseCount`](case-count.md).

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
| `dataContext[<context>].itemCount` | get |
<!-- END GENERATED: selectors -->

There is no `collection` segment: items belong to the data context, not to one collection.

<!-- BEGIN GENERATED: scope -->
This resource is scoped to a data context. Omitting one selects `#default`, the first data
context in the document — see [the index](../README.md#the-default-data-context).
<!-- END GENERATED: scope -->

## Values

`get` takes no `values`. The response's `values` is a single number: the count itself, not an
object.

**Only items the user can see are counted.** An item the user has set aside is not counted, and
neither is an item hidden by the data set's filter formula.

## Examples

**Count the items in a data set.** The Mammals data set has 27 mammals:

```json
{
  "action": "get",
  "resource": "dataContext[Mammals].itemCount"
}
```

```json
{
  "success": true,
  "values": 27
}
```

The count is the same however the data set is grouped. After the user drags `Diet` to the left,
making a parent collection with one case per diet, `itemCount` still returns 27.

## Notifications

This resource sends none. Changes to a data set's items are reported as case changes on
`dataContextChangeNotice[<context>]`; see [the notification catalog](../notifications.md).

## Errors

| Error | Condition |
|---|---|
| `DataContext not found` | The selector names a data context that does not exist |

v2 reported a data context that does not exist as an error saying it could not resolve the data
context.

## See also

- [`itemSearch`](item-search.md) to find, delete or move the items that match a condition
- [`caseCount`](case-count.md) to count the cases of one collection
- [The resource index](../README.md) for the request envelope, the `#default` rule, and the
  difference between cases and items
