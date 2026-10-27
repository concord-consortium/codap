# itemSearch

> **Applies to:** CODAP v3 · **Verified:** 2026-10-21
> · Parts of this page are generated — see [conventions](../conventions.md).

Finds the items in a data context that satisfy a simple comparison, such as `Diet==meat` or
`Mass>100`, and then returns them, deletes them or moves them. Plugins use it to work with a
subset of a data set's rows without reading every item.

An item is one flat row of a data set: it holds a value for every attribute, in every collection.
So unlike [`caseSearch`](case-search.md), `itemSearch` searches the whole data context at once,
and an expression may name an attribute from any collection. See
[the index's terminology](../README.md#terminology) for how items and cases relate.

## Supported actions

<!-- BEGIN GENERATED: actions -->
| Action | Supported |
|---|---|
| `get` | ✓ |
| `create` | — |
| `update` | — |
| `delete` | ✓ |
| `notify` | ✓ |
| `register` | — |
| `unregister` | — |
<!-- END GENERATED: actions -->

## Resource selector patterns

<!-- BEGIN GENERATED: selectors -->
| Pattern | Actions |
|---|---|
| `dataContext[<context>].itemSearch[<search-expression>]` | get, delete, notify |
<!-- END GENERATED: selectors -->

There is no `collection` segment: items belong to the data context, not to one collection.

<!-- BEGIN GENERATED: scope -->
This resource is scoped to a data context. Omitting one selects `#default`, your plugin's
own data context — see [the index](../README.md#the-default-data-context).
<!-- END GENERATED: scope -->

## Search expressions

A search expression is either `*`, which matches every item, or a single comparison:

```
<left> <operator> <right>
```

- **`<operator>`** is one of `==`, `!=`, `<`, `<=`, `>` or `>=`.
- **Each side** is either the name of an attribute or a value. At least one side must name an
  attribute of the data context, in any of its collections. Names must match exactly, including
  case.
- **A value** is read as a number if it looks like one, as a boolean if it is `true` or
  `false`, and as text otherwise. Do not quote text: `Diet==meat`, not `Diet=="meat"`. Quotes
  become part of the text and match nothing.
- **Spaces around either side are ignored**, so `Mass > 100` and `Mass>100` are the same. (v2
  kept trailing spaces on a side that also had leading ones, so avoid spaces on both ends.) Spaces
  inside a name or value are kept: `Common name==Red fox` compares the attribute `Common name`
  with the text `Red fox`.
- **An empty right side matches empty values.** `Habitat==` finds the items with no `Habitat`,
  and also those whose `Habitat` is `0`. This is new in v3: v2 treated an expression with nothing
  after the operator as invalid.

Only the first comparison is read. Anything after it is not rejected but becomes part of the
value, so `Mass>100 and Diet==meat` compares `Mass` with the text `100 and Diet` and matches
nothing. There is no `and` or `or`, and no way to compare against a value that contains `=`, `!`, `<`,
`>` or `]`. There is no formula search for items; to search with a formula, use
[`caseFormulaSearch`](case-formula-search.md) on the data context's last collection, where each
case corresponds to one item.

Comparison is evaluated for each item using that item's values. `<`, `<=`, `>` and `>=` compare
numbers numerically, so `Mass>100` behaves as expected for a numeric attribute. An empty value
compares as `0`, so `Mass<100` also finds the items with no `Mass`. In the same way, `==false`
and `==0` also match empty values. (In v2 this held only for a value sent as empty. An item
created without any value for an attribute had none stored, and matched none of these.)

Items the user has set aside, and items hidden by the data set's filter formula, are never
matched, so `get`, `delete` and `notify` all leave them alone.

## Values

### What `get` returns

`get` takes no `values`. The response's `values` is an array of the matching items, in the data
context's item order. It is empty when no item matches. Each item is an object:

| Property | Notes |
|---|---|
| `id` | the item's id. It is not the id of any case |
| `values` | the item's values, keyed by attribute name — every attribute of the data context, in every collection. An empty value is `""` |

### What `delete` does

`delete` takes no `values`. It deletes every matching item, and with them the cases they make
up. A parent case left with no child cases is deleted too. The response's `values` is an array
of the deleted items' ids; it is empty when no item matched.

### What `notify` does

`notify` moves the matching items to a new place in the data context's item order. The order of
items decides the order of cases in a case table and of the rows a plugin reads back.

| Property | Type | Notes |
|---|---|---|
| `itemOrder` | String or Array | required. `"first"` moves the matching items to the start, and `"last"` to the end. An array of numbers gives each matching item its own position, below. v3 treats any other value as `"last"`; v2 did not, so send only these |

With `"first"` or `"last"`, the matching items keep their order relative to one another. v2 kept
it for `"last"` but reversed it for `"first"`, so a plugin that must also run there should not
depend on the order among the items it moves.

With an array, the first matching item moves to the position given by the array's first number,
the second matching item to the second number, and so on. A position counts the other items,
starting at `0`. The moves happen one after another, so a later move can shift an item moved
earlier. A matching item with no number in the array stays where it is. v3 currently counts only
the items shown; see [Known limitations](#known-limitations).

`notify` replies `{ "success": true }`, including when no item matched.

## Examples

The examples use a data context `Mammals` grouped by `Diet`: a parent collection Diets holds
`Diet`, and a child collection Mammals holds `Mammal`, `Habitat` and `Mass`. Each item holds all
four values.

**Find the mammals that live in water.**

```json
{
  "action": "get",
  "resource": "dataContext[Mammals].itemSearch[Habitat==water]"
}
```

```json
{
  "success": true,
  "values": [
    {
      "id": 21,
      "values": { "Diet": "meat", "Mammal": "Killer Whale", "Habitat": "water", "Mass": 4000 }
    },
    {
      "id": 25,
      "values": { "Diet": "meat", "Mammal": "Walrus", "Habitat": "water", "Mass": 1500 }
    }
  ]
}
```

**Delete the heavy mammals.**

```json
{
  "action": "delete",
  "resource": "dataContext[Mammals].itemSearch[Mass>=2000]"
}
```

```json
{
  "success": true,
  "values": [3, 21]
}
```

**Move the plant eaters to the end.**

```json
{
  "action": "notify",
  "resource": "dataContext[Mammals].itemSearch[Diet==plants]",
  "values": { "itemOrder": "last" }
}
```

```json
{ "success": true }
```

**Collect a value from each matching item.**

```js
// sendRequest stands for however your plugin sends requests — see "Sending requests and
// receiving notifications" in the index.
sendRequest({
  action: "get",
  resource: "dataContext[Mammals].itemSearch[Mass<100]"
}, response => {
  if (response.success) {
    const smallMammals = response.values.map(item => item.values.Mammal)
    // ...
  }
})
```

## Known limitations

**A boolean value does not match.** CODAP v3 stores every value a plugin sends as either a
number or text, so an item created with `"Endangered": true` holds the text `true`. The search
`Endangered==true` compares that text with the boolean `true` and finds no items, and
`Endangered==false` finds only the items with no value or `0`. v2 kept the boolean, so `==true` found
the `true` items and `==false` the `false` ones, which is the intended behavior. This is a known
bug. Until it is fixed, use [`caseFormulaSearch`](case-formula-search.md) with `Endangered=true`
on the data context's last collection.

**Moving items with `"first"` or `"last"` corrupts the data when any item is hidden.** When any
item in the data context is set aside or hidden by a filter formula, CODAP moves the wrong items,
and can delete one item while duplicating another. Moving with an array is not affected. This is
a known bug. Until it is fixed, do not move items with `"first"` or `"last"` while any item is set
aside or the data context has a filter formula.

**An `itemOrder` position counts only the items shown.** When `itemOrder` is an array, v3 counts
positions among the items that are not set aside or hidden by a filter formula. v2 counted
set-aside items too, so the same number can name a different place. This is a known bug. Until it
is fixed, use array positions only when no item is set aside or hidden.

**An `itemOrder` position of `0` is ignored.** When `itemOrder` is an array, a matching item
whose position is `0` is not moved, and the reply is still `{ "success": true }`. v2 moved it to
the start. This is a known bug. Until it is fixed, move a single item to the start with
`"first"`.

**Deleting and moving items send no notification.** v2 told the other plugins about a `delete`
with `deleteCases` and about a `notify` with `moveCases`. v3 sends neither. This is a known bug;
see [the catalog's known limitations](../notifications.md#known-limitations).

## Notifications

`get` sends none. `delete` and `notify` are intended to send `deleteCases` and `moveCases` on
`dataContextChangeNotice[<context>]` to the other plugins, but currently send nothing; see
[Known limitations](#known-limitations) and
[the notification catalog](../notifications.md#data-changes--datacontextchangenoticecontext).

## Errors

| Error | Condition |
|---|---|
| `DataContext not found` | The selector names a data context that does not exist |
| `Unable to parse query.` | The search expression is missing or empty, is neither `*` nor a comparison, or names no attribute of the data context |
| `A values object is required for this request.` | `notify` with no `values` |
| `<action> <resource>: <field> required` | `notify` whose `values` has no `itemOrder` |

v2 reported an invalid expression, and a `notify` with no `itemOrder`, with `success: false` and
no error message. v3 adds the messages. v2 reported a data context that does not exist as an
error saying it could not resolve the data context.

## See also

- [`itemCount`](item-count.md) to count a data context's items
- [`caseSearch`](case-search.md) to search the cases of one collection, and
  [`caseFormulaSearch`](case-formula-search.md) to search them with a formula
- [The resource index](../README.md) for the request envelope, the `#default` rule, and the
  difference between cases and items
- [The notification catalog](../notifications.md) for the data-change notifications
