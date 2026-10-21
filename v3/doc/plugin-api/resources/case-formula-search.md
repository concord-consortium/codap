# caseFormulaSearch

> **Applies to:** CODAP v3 · **Verified:** 2026-10-21
> · Parts of this page are generated — see [conventions](../conventions.md).

Returns the cases in one collection for which a formula is true. The formula is written exactly
as it would be in CODAP's formula editor, so a search can combine conditions, call functions and
compare against aggregates: `Diet="meat" and Mass>100`, or `Mass=max(Mass)`. Plugins use it to
fetch a subset of cases without reading the whole collection.

This is the preferred way to search for cases. [`caseSearch`](case-search.md) accepts only a
single comparison.

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
| `dataContext[<context>].collection[<collection>].caseFormulaSearch[<formula>]` | get |
<!-- END GENERATED: selectors -->

The `collection` segment is required. `<collection>` accepts the collection's name or its id.

<!-- BEGIN GENERATED: scope -->
This resource is scoped to a data context. Omitting one selects `#default`, your plugin's
own data context — see [the index](../README.md#the-default-data-context).
<!-- END GENERATED: scope -->

## Search formulas

CODAP evaluates the formula once for each case in the collection, as if it were the formula of
an attribute in that collection, and returns the cases for which the result is truthy: `true`, a
non-zero number, or non-empty text.

Because it is an ordinary formula:

- **Text is quoted**: `Diet="meat"`. An unquoted word is read as the name of an attribute.
- **Equality is a single `=`**, unlike [`caseSearch`](case-search.md)'s `==`. `!=`, `<`, `<=`,
  `>` and `>=` work as usual.
- **Attribute names with spaces or other special characters go in backquotes**:
  `` `Common name`="Red fox" ``.
- **Conditions combine** with `and` and `or`, and every function in CODAP's formula editor is
  available, including aggregates such as `max`, `mean` and `count`.
- **Attributes of parent collections can be used.** A search in a child collection can test a
  value of the case's parent: searching the Mammals collection for `Diet="meat"` works when
  `Diet` is in a parent collection.
- **Global values can be used** by name, such as the value of a slider.

The formula cannot contain `]`, since that ends the selector's bracket.

For the formula language itself, see
[CODAP's help on functions](https://codap.concord.org/help/work-functions).

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

**Find the heaviest mammal.** The Mammals data set has one collection, also named Mammals:

```json
{
  "action": "get",
  "resource": "dataContext[Mammals].collection[Mammals].caseFormulaSearch[Mass=max(Mass)]"
}
```

```json
{
  "success": true,
  "values": [
    {
      "id": 13,
      "collection": { "name": "Mammals", "id": 3 },
      "values": {
        "Mammal": "African Elephant",
        "Order": "Proboscidae",
        "LifeSpan": 70,
        "Height": 4,
        "Mass": 6400,
        "Sleep": 3,
        "Speed": 40,
        "Habitat": "land",
        "Diet": "plants"
      },
      "children": []
    }
  ]
}
```

**Combine conditions.** Only the first of the matching cases is shown here:

```json
{
  "action": "get",
  "resource": "dataContext[Mammals].collection[Mammals].caseFormulaSearch[Diet=\"meat\" and Speed>60]"
}
```

```json
{
  "success": true,
  "values": [
    {
      "id": 30,
      "collection": { "name": "Mammals", "id": 3 },
      "values": {
        "Mammal": "Lion",
        "Order": "Carnivora",
        "LifeSpan": 15,
        "Height": 2.5,
        "Mass": 250,
        "Sleep": 20,
        "Speed": 80,
        "Habitat": "land",
        "Diet": "meat"
      },
      "children": []
    }
  ]
}
```

In JavaScript, build the selector as a string and let the quotes inside it be ordinary
characters:

```js
// sendRequest stands for however your plugin sends requests — see "Sending requests and
// receiving notifications" in the index.
const formula = 'Diet="meat" and Speed>60'
sendRequest({
  action: "get",
  resource: `dataContext[Mammals].collection[Mammals].caseFormulaSearch[${formula}]`
}, response => {
  if (response.success) console.log(`${response.values.length} fast carnivores`)
})
```

## Known limitations

**A boolean value is treated as text.** CODAP v3 stores every value a plugin sends as either a
number or text, so a case created with `"Endangered": false` holds the text `false`. Non-empty
text is truthy, so the formula `Endangered` on its own matches that case as well as the ones
holding `true`. v2 kept the boolean, so `Endangered` matched only the `true` cases, which is the
intended behavior. This is a known bug. Comparing explicitly works in both: `Endangered=true`.

**A formula engine error is not in `values.error`.** When evaluating the formula fails, the
message is in a top-level `error` property, `{ "success": false, "error": "..." }`, instead of in
`values.error` as every other error is, and as v2 reported it. A plugin that reads only
`values.error` gets nothing. This is a known bug. Until it is fixed, read `values?.error ??
error`.

## Notifications

This resource sends none. Changes to a data set's cases are reported on
`dataContextChangeNotice[<context>]`; see [the notification catalog](../notifications.md).

## Errors

| Error | Condition |
|---|---|
| `Collection not found` | The selector names no collection, names one that does not exist, or names a data context that does not exist |
| `Unable to parse query.` | The formula is missing, empty, or not a valid formula |

**A formula that fails for any case fails the whole request.** If evaluating the formula throws
an error for even one case, CODAP returns `success: false` with the formula engine's message,
such as `Undefined symbol Mas` for a misspelled attribute name, and no cases. The message's
wording differs from v2's, and it currently arrives in a different place; see
[Known limitations](#known-limitations).

## See also

- [`caseSearch`](case-search.md), the older single-comparison search
- [`caseCount`](case-count.md) to count a collection's cases
- [The resource index](../README.md) for the request envelope and the `#default` rule
