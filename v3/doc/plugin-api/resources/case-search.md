# caseSearch

> **Applies to:** CODAP v3 · **Verified:** 2026-10-21
> · Parts of this page are generated — see [conventions](../conventions.md).

Returns the cases in one collection that satisfy a simple comparison, such as `Diet==meat` or
`Mass>100`. Plugins use it to fetch a subset of cases without reading the whole collection.

**Prefer [`caseFormulaSearch`](case-formula-search.md).** It accepts any formula CODAP
understands, including `and`, `or`, functions and aggregates, while `caseSearch` accepts exactly
one comparison. `caseSearch` remains for plugins that already use it.

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
| `dataContext[<context>].collection[<collection>].caseSearch[<search-expression>]` | get |
<!-- END GENERATED: selectors -->

The `collection` segment is required. `<collection>` accepts the collection's name or its id.

<!-- BEGIN GENERATED: scope -->
This resource is scoped to a data context. Omitting one selects `#default`, the first data
context in the document — see [the index](../README.md#the-default-data-context).
<!-- END GENERATED: scope -->

## Search expressions

A search expression is either `*`, which matches every case, or a single comparison:

```
<left> <operator> <right>
```

- **`<operator>`** is one of `==`, `!=`, `<`, `<=`, `>` or `>=`.
- **Each side** is either the name of an attribute or a value. At least one side must name an
  attribute **of the collection being searched**. An attribute of a parent collection does not
  count, so searching a child collection by a parent attribute is an invalid expression; use
  [`caseFormulaSearch`](case-formula-search.md) for that.
- **A value** is read as a number if it looks like one, as a boolean if it is `true` or
  `false`, and as text otherwise. Do not quote text: `Diet==meat`, not `Diet=="meat"`. Quotes
  become part of the text and match nothing.
- **Spaces around either side are ignored**, so `Mass > 100` and `Mass>100` are the same. (v2
  kept trailing spaces on a side that also had leading ones, so avoid spaces on both ends.) Spaces
  inside a name or value are kept: `Common name==Red fox` compares the attribute `Common name`
  with the text `Red fox`.
- **An empty right side matches empty values.** `Habitat==` finds the cases with no `Habitat`,
  and also those whose `Habitat` is `0`.

Only the first comparison is read. Anything after it is not rejected but becomes part of the
value, so `Mass>100 and Diet==meat` compares `Mass` with the text `100 and Diet` and matches
nothing. There is no `and` or `or`, and no way to compare against a value that contains `=`, `!`, `<`,
`>` or `]`. Use [`caseFormulaSearch`](case-formula-search.md) for those.

Comparison is evaluated for each case using that case's values. `<`, `<=`, `>` and `>=` compare
numbers numerically, so `Mass>100` behaves as expected for a numeric attribute. An empty value
compares as `0`, so `Mass<100` also finds the cases with no `Mass`. In the same way, `==false`
and `==0` also match empty values.

## Values

`get` takes no `values`. The response's `values` is an array of the matching cases, in the
collection's order. It is empty when no case matches. Cases the user has set aside, and cases
hidden by the data set's filter formula, are never returned.

Each case is an object:

| Property | Notes |
|---|---|
| `id` | the case's id |
| `parent` | the id of its parent case; no value for a case in the top-level collection |
| `collection` | `{ "name", "id" }` of the collection searched |
| `values` | the case's values, keyed by attribute name — only the attributes of this collection, not its parents' |
| `children` | the ids of its child cases; empty for a case in the last collection. New in v3 |

## Examples

The Mammals data set is grouped by `Diet`: a parent collection named Diets holds `Diet`, and a
child collection named Mammals holds the other attributes.

**Find the cases whose diet is meat.** `Diet` is in the parent collection, so search there:

```json
{
  "action": "get",
  "resource": "dataContext[Mammals].collection[Diets].caseSearch[Diet==meat]"
}
```

```json
{
  "success": true,
  "values": [
    {
      "id": 5,
      "collection": { "name": "Diets", "id": 3 },
      "values": { "Diet": "meat" },
      "children": [12, 17, 30]
    }
  ]
}
```

**Find the heavy mammals.**

```json
{
  "action": "get",
  "resource": "dataContext[Mammals].collection[Mammals].caseSearch[Mass>=2000]"
}
```

```json
{
  "success": true,
  "values": [
    {
      "id": 13,
      "parent": 7,
      "collection": { "name": "Mammals", "id": 4 },
      "values": { "Mammal": "African Elephant", "Order": "Proboscidae", "Mass": 6400 },
      "children": []
    },
    {
      "id": 14,
      "parent": 7,
      "collection": { "name": "Mammals", "id": 4 },
      "values": { "Mammal": "Asian Elephant", "Order": "Proboscidae", "Mass": 5000 },
      "children": []
    }
  ]
}
```

The `values` objects above are shortened; a real response carries every attribute of the
collection.

## Known limitations

**A boolean value does not match.** CODAP v3 stores every value a plugin sends as either a
number or text, so a case created with `"Endangered": true` holds the text `true`. The search
`Endangered==true` compares that text with the boolean `true` and finds no cases, and
`Endangered==false` finds only the cases with no value. v2 kept the boolean, so `==true` found
the `true` cases and `==false` the `false` ones, which is the intended behavior. This is a known bug. Until it is fixed, use
[`caseFormulaSearch`](case-formula-search.md) with `Endangered=true`, which does match.

## Notifications

This resource sends none. Changes to a data set's cases are reported on
`dataContextChangeNotice[<context>]`; see [the notification catalog](../notifications.md).

## Errors

| Error | Condition |
|---|---|
| `DataContext not found` | The selector names a data context that does not exist |
| `Collection not found` | The selector names no collection, or names one that does not exist |
| `Unable to parse query.` | The search expression is missing or empty, contains no comparison, or names no attribute of the collection being searched |

v2 reported an invalid expression with `success: false` and no error message. v3 adds the
message. v2 also reported a data context that does not exist as `Collection not found`.

## See also

- [`caseFormulaSearch`](case-formula-search.md), the preferred way to search
- [`caseCount`](case-count.md) to count a collection's cases
- [The resource index](../README.md) for the request envelope and the `#default` rule
