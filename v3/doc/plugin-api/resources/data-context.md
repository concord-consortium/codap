# dataContext

> **Applies to:** CODAP v3 · **Verified:** 2026-10-02
> · Parts of this page are generated — see [conventions](../conventions.md).

A data context is one data set: its collections, its attributes, its cases, and the metadata
that describes where the data came from. Most plugins that bring data into CODAP start by
creating one, and most plugins that read a document start by listing them.

This page covers the data context as a whole. Its attributes have their own page; its
collections, cases and items do not yet.

## Supported actions

<!-- BEGIN GENERATED: actions -->
| Action | Supported |
|---|---|
| `get` | ✓ |
| `create` | ✓ |
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
| `dataContext[<context>]` | get, update, delete, notify |
| `dataContext` | create |
<!-- END GENERATED: selectors -->

`<context>` accepts a data context's name, its title, or its numeric id.

<!-- BEGIN GENERATED: scope -->
This resource is scoped to a data context. Omitting one selects `#default`, the first data
context in the document — see [the index](../README.md#the-default-data-context).
<!-- END GENERATED: scope -->

Creating is the exception to the defaulting rule: there is nothing to default to before the
data context exists, so `create` takes the bare `dataContext` selector.

## Values

### What `get` returns

`get` returns the data set's **structure** in CODAP v2 document form — its collections and their
attributes. It does **not** return cases: the conversion runs with case export switched off, so
there is no `cases` key in the response regardless of how much data the set holds. Read cases
through `allCases`, `caseSearch` or the `item` resources instead.

<!-- BEGIN GENERATED: values -->
| Property |
|---|
| `type` |
| `document` |
| `guid` |
| `id` |
| `name` |
| `title` |
| `collections` |
| `flexibleGroupingChangeFlag` |
| `preventReorg` |
| `setAsideItems` |
| `contextStorage` |
| `metadata` |
| `v3.filterFormula` |
<!-- END GENERATED: values -->

| Property | Always present | Notes |
|---|---|---|
| `type` | yes | `"DG.DataContext"` or `"DG.GameContext"`. Which one you get follows from whether a collection carries defaults, not from who owns the context, so do not branch on it |
| `document` | yes | always `1` |
| `guid` | yes | same value as `id` |
| `id` | yes | |
| `name` | yes | |
| `title` | yes | the key is always present; its value may be `undefined` |
| `collections` | yes | each with its attributes — **not** its cases (see above) |
| `flexibleGroupingChangeFlag` | yes | |
| `preventReorg` | yes | |
| `setAsideItems` | yes | the items currently set aside, with their values |
| `contextStorage` | yes | carries `_links_.selectedCases` |
| `metadata` | no | `{description, source, importDate}` — present only when the data set carries at least one of them |
| `v3.filterFormula` | no | present only when the data context has a filter formula |

### What `create` accepts

`create` reads only these five properties. Anything else you send is ignored.

<!-- BEGIN GENERATED: values-write -->
| Property |
|---|
| `name` |
| `title` |
| `description` |
| `metadata` |
| `collections` |
<!-- END GENERATED: values-write -->

| Property | Type | | Notes |
|---|---|---|---|
| `name` | string | optional | defaults to a generated name such as `Data_Set_1` — note the underscores |
| `title` | string | optional | |
| `description` | string | optional | used when `metadata.description` is absent |
| `metadata` | object | optional | `importDate`, `source` and `description` are read |
| `collections` | array | optional | each in v2 collection form, with its attributes |

Supplying `collections` replaces the automatically created default collection rather than adding
to it.

`create` does **not** return the new data context. It replies with just three properties:

```json
{ "success": true, "values": { "name": "Mammals", "id": 42, "title": "Mammal measurements" } }
```

`title` may be `undefined` if the context has none.

### What `update` accepts

`update` returns `{"success": true}` with no values. It accepts:

| Property | Effect |
|---|---|
| `title` | Sets the title. Present-but-`undefined` clears it; omitting the key leaves it alone |
| `metadata` | Merges into the context's metadata. **Only `description` is applied today** |
| `description` | A deprecated v2 alias for `metadata.description`. **Not applied today** |
| `managingController` | Names the tile that owns this context, by name or id |
| `preventReorg` | Protects the context's attribute configuration. **Not applied today** |
| `sort` | `{attr, isDescending}` — sorts the items by one attribute. `attr` is required |
| `rerandomize` | When truthy, rerandomizes every random attribute in the context |

The three marked rows are known bugs — v2 honored all of them; see
[Known limitations](#known-limitations). Properties not listed, such as `collections` and
`setAsideItems`, are ignored: use the resources that own them.

## Examples

Create a data context with one collection and two attributes:

```json
{
  "action": "create",
  "resource": "dataContext",
  "values": {
    "name": "Mammals",
    "title": "Mammal measurements",
    "collections": [
      {
        "name": "Cases",
        "attrs": [ { "name": "Species" }, { "name": "Mass", "type": "numeric" } ]
      }
    ]
  }
}
```

Sort a data context by one attribute, descending:

```json
{
  "action": "update",
  "resource": "dataContext[Mammals]",
  "values": { "sort": { "attr": "Mass", "isDescending": true } }
}
```

Set two cases aside, then restore everything that is set aside:

```json
{
  "action": "notify",
  "resource": "dataContext[Mammals]",
  "values": { "request": "setAside", "caseIDs": [12, 15] }
}
```

```json
{
  "action": "notify",
  "resource": "dataContext[Mammals]",
  "values": { "request": "restoreSetAsides" }
}
```

## Known limitations

**`create` on an existing name returns the existing data context.** This is deliberate and
matches v2. CODAP replies `success: true` with that data set's `name`, `id` and `title`, having
created nothing, and the response is indistinguishable from a real creation — so a plugin that
may run twice should check the returned `id` rather than assume the context is new and empty.

**Three `update` properties are accepted and ignored.** `preventReorg`, the top-level
`description`, and everything in `metadata` except `description` — `source` and `importDate` are
dropped. All three are known bugs; the contract is the table above.

**Metadata does not round-trip.** `get` rebuilds `metadata` from `description`, `source` and
`importDate` only, so any other key you set is lost, and the top-level `description` is never
returned. This too is a known bug: metadata should come back as it went in.

**`restoreSetasides` is accepted as a deprecated spelling.** v2 spelled the request with a
lowercase "a", and CODAP still accepts it so v2 plugins keep working. New plugins should send
`restoreSetAsides`.

**`update` is not atomic.** `title`, `metadata` and `managingController` are applied first. If
`sort.attr` then fails to resolve, the request returns an error with those earlier changes
already made, and `rerandomize` is skipped.

**An unresolvable `managingController` clears the existing one.** Naming a tile that does not
exist removes the context's managing controller and reports success.

**`get` never returns cases.** The response carries structure only — collections and attributes.
A plugin that reads a data context expecting its data will find no `cases` key anywhere in the
payload. This is the opposite of what the response's v2 document shape suggests, since a v2
document stores cases inside its collections, but it is deliberate and matches v2, which also
omitted cases from this response. Use `allCases`, `caseSearch`, `caseByID` or the `item`
resources to read data.

## Notifications

A plugin sends `notify` to ask CODAP to set cases aside or restore them. `request` is required:

| `request` | `operation` | Effect |
|---|---|---|
| `setAside` | `replace` | Replaces the set-aside cases with `caseIDs` |
| `setAside` | `restore` | Restores the cases in `caseIDs`; with no `caseIDs`, restores all |
| `setAside` | anything else, or omitted | Adds the cases in `caseIDs` to those set aside |
| `restoreSetAsides` | — | Restores every set-aside case. `restoreSetasides` is accepted as a deprecated v2 spelling |

`caseIDs` is required for `setAside` unless `operation` is `restore`. An empty array is not the
same as omitting it: `restore` with `caseIDs: []` restores nothing, and `replace` with `caseIDs:
[]` does nothing rather than clearing the set-aside cases.

Setting cases aside deselects them; restoring them replaces the selection.

Creating or deleting a data context also notifies plugins that the number of data contexts
changed, and `delete` additionally sends `dataContextDeleted` carrying `deletedContext`. A
`create` that returned an existing context sends nothing.

## Errors

<!-- BEGIN GENERATED: errors -->
| Error |
|---|
| `DataContext not found` |
| `Attribute not found` |
| `<action> <resource>: <field> required` |
| `unknown request: <value>` |
| `An error occurred while processing the request.` |
<!-- END GENERATED: errors -->

| Error | Condition |
|---|---|
| `DataContext not found` | the selector's data context does not resolve |
| `Attribute not found` | `update` was given a `sort.attr` that does not resolve |
| `<action> <resource>: <field> required` | a required field is missing — `notify` without `request` or, for `setAside`, without `caseIDs`; `update` with a `sort` that has no `attr` |
| `unknown request: <value>` | a `notify` `request` CODAP does not recognize |
| `An error occurred while processing the request.` | `create` sent with no `values` at all. Every property is optional, but the object itself is not |

## See also

- [`attribute`](attribute.md) for the columns within a data context
- [The resource index](../README.md) for the request envelope and the `#default` rule
- [Quick reference](../quick-reference.md) for the full error catalog and selector grammar
