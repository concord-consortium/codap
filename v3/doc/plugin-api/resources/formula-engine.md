# formulaEngine

> **Applies to:** CODAP v3 · **Verified:** 2026-10-21
> · Parts of this page are generated — see [conventions](../conventions.md).

CODAP's formula engine is the language users type into attribute formulas, filters and plotted
functions. This resource lets a plugin use it directly: `get` returns the catalog of built-in
functions, with their descriptions, arguments and examples, and `notify` evaluates a formula
against values the plugin supplies.

The formula is evaluated against the plugin's own values only. It cannot see the document's
data contexts, attributes or global values; to evaluate a formula against a data set's cases, use
[`caseFormulaSearch`](case-formula-search.md) or give an attribute a formula through
[`attribute`](attribute.md).

## Supported actions

<!-- BEGIN GENERATED: actions -->
| Action | Supported |
|---|---|
| `get` | ✓ |
| `create` | — |
| `update` | — |
| `delete` | — |
| `notify` | ✓ |
| `register` | — |
| `unregister` | — |
<!-- END GENERATED: actions -->

## Resource selector patterns

<!-- BEGIN GENERATED: selectors -->
| Pattern | Actions |
|---|---|
| `formulaEngine` | get, notify |
<!-- END GENERATED: selectors -->

No bracketed selector — there is one formula engine.

<!-- BEGIN GENERATED: scope -->
This resource is **not** scoped to a data context, so the default-data-context rule does not
apply. Naming a `dataContext` in the selector has no effect.
<!-- END GENERATED: scope -->

## Values

### What `get` returns

`get` takes no `values`. The response's `values` is an object with one key per category, such as
`Arithmetic Functions` or `String Functions`. Each category is an object with one key per
function, and each function is an object:

| Property | Notes |
|---|---|
| `name` | the function's name, as typed in a formula |
| `displayName` | the name CODAP shows for the function |
| `category` | the category name, the same as the key it is listed under |
| `description` | what the function does |
| `minArgs` | the fewest arguments it accepts |
| `maxArgs` | the most arguments it documents. Some functions, such as `concat`, accept more |
| `args` | its arguments, in order, below |
| `examples` | example formulas using it, each with its result, as text |

Each argument is an object:

| Property | Notes |
|---|---|
| `name` | the argument's name |
| `type` | the kind of value it takes, such as `number`, `string`, `boolean` or `any` |
| `description` | what the argument is for |
| `required` | `true` for an argument the function needs. v2 set it only on required arguments and left it out of the others; v3 also sends `false` |
| `optional` | `true` for an argument the function can do without. New in v3, and present only on such arguments |

**The catalog differs between versions.** v3 adds functions and a `Color Functions` category,
and moves the two-attribute statistics, such as `correlation` and `linRegrSlope`, from
`Statistical Functions` to a new `Bivariate Statistical Functions` category. Some descriptions and
optional arguments also changed. A plugin that shows or checks functions should read the catalog
at run time rather than rely on a fixed list.

### What `notify` accepts

| Property | Type | Notes |
|---|---|---|
| `request` | String | required. Must be `"evalExpression"` |
| `source` | String | required. The formula to evaluate, written as a user would type it in CODAP |
| `records` | Array | required. One object per evaluation. Each object's keys are the names the formula can use, and its values are their values |

CODAP evaluates `source` once for each record, using that record's values for the names in the
formula. `pi`, `π` and `e` are also available. The response's `values` is an array with one
result per record, in the same order. An empty `records` gives an empty array. Each result is
whatever the formula produces: a number, text, a boolean, a date or an empty value. `a > 1`, for
example, gives `true` or `false`.

Only functions that work on a single set of values are available. Functions that summarize many
cases, such as `mean` or `count`, need a data set, and fail here. v2 failed the whole request
saying the function was unrecognized. v3 puts an internal error message in each record's place
instead; see [Known limitations](#known-limitations).

An entry of `records` that is not an object gives the text `Invalid record for evaluation` in its
place. This check is new in v3.

## Examples

**Read the function catalog.**

```json
{
  "action": "get",
  "resource": "formulaEngine"
}
```

```json
{
  "success": true,
  "values": {
    "Arithmetic Functions": {
      "abs": {
        "name": "abs",
        "displayName": "abs",
        "category": "Arithmetic Functions",
        "description": "Computes the absolute value of its argument.",
        "minArgs": 1,
        "maxArgs": 1,
        "args": [
          {
            "name": "number",
            "type": "number",
            "description": "The number of which you want the absolute value.",
            "required": true
          }
        ],
        "examples": ["abs(–5) is 5", "abs(3-7) is 4"]
      }
    }
  }
}
```

The response is shortened to one function; a real one lists every category and function.

**Evaluate a formula for three records.**

```json
{
  "action": "notify",
  "resource": "formulaEngine",
  "values": {
    "request": "evalExpression",
    "source": "a + 1",
    "records": [ { "a": 1 }, { "a": 2 }, { "a": 3 } ]
  }
}
```

```json
{
  "success": true,
  "values": [2, 3, 4]
}
```

**Use CODAP's formula functions on a plugin's own values.**

```js
// sendRequest stands for however your plugin sends requests — see "Sending requests and
// receiving notifications" in the index.
sendRequest({
  action: "notify",
  resource: "formulaEngine",
  values: {
    request: "evalExpression",
    source: "if(Mass > 1000, 'large', 'small')",
    records: animals.map(a => ({ Mass: a.mass }))
  }
}, result => {
  if (result.success) result.values.forEach((size, i) => { animals[i].size = size })
})
```

## Known limitations

**An error for one record does not fail the request.** When evaluating the formula fails for a
record, for example because the formula names something the record does not have, v3 puts the
error's text, such as `Error: Undefined symbol a`, in that record's place and still replies
`success: true`. v2 failed the whole request instead, with the error in `values.error` and no
results. A plugin cannot tell such an entry from a formula that returns text. This is a known
bug; the intended behavior is v2's. Until it is fixed, give every record a value for every name
the formula uses.

**A name in backticks does not match a record's key.** A formula can name something whose name
contains spaces or punctuation by putting it in backticks, as in `` `Common name` ``. v2 looked
that name up in each record as written. v3 does not find it, and gives an undefined-symbol error
for every record. This is a known bug. Until it is fixed, use record keys that need no backticks,
such as `CommonName`.

## Notifications

This resource sends none.

## Errors

| Error | Condition |
|---|---|
| `A values object is required for this request.` | `notify` with no `values` |
| `<action> <resource>: <field> required` | `notify` whose `values` has no `request`, a `request` other than `"evalExpression"`, no `source`, or no `records` array. It reads, for example, `notify formulaEngine: values.source required` |

A formula that cannot be parsed fails the whole request, with the parser's message in
`values.error`, such as `SyntaxError: Unexpected end of expression (char 4)`. The wording differs
from v2's, which read, for example, "SyntaxError: Incomplete expression". v3 checks the formula before it looks at `records`, so it reports this even when
`records` is empty; v2 did not. v2 reported an unsupported `request` as an unsupported request
type rather than as a missing field.

## See also

- [`caseFormulaSearch`](case-formula-search.md) to find a data set's cases with a formula
- [`attribute`](attribute.md) to give an attribute a formula
- [The resource index](../README.md) for the request envelope
