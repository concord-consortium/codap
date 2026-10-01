# dataContext

> **Applies to:** CODAP v3 · **Verified:** 2026-10-01 against `main` @ `a1ebcea11`
> · Parts of this page are generated — see [conventions](../conventions.md).

A data context is one data set: its collections, its attributes, its cases, and the metadata
that describes where the data came from. Most plugins that bring data into CODAP start by
creating one, and most plugins that read a document start by listing them.

This page covers the data context as a whole. Its parts have their own pages — see
[See also](#see-also).

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
| Property | Always present | Notes |
|---|---|---|
| `type` | yes | `"DG.DataContext"`, or `"DG.GameContext"` for a context owned by a plugin |
| `document` | yes | always `1` |
| `guid` | yes | same value as `id` |
| `id` | yes | |
| `name` | yes | |
| `title` | yes | |
| `collections` | yes | each with its attributes — **not** its cases |
| `flexibleGroupingChangeFlag` | yes | |
| `preventReorg` | yes | |
| `setAsideItems` | yes | the items currently set aside, with their values |
| `contextStorage` | yes | carries `_links_.selectedCases` |
| `metadata` | no | `{description, source, importDate}` — present only when the data set carries metadata, and then all three together |
<!-- END GENERATED: values -->

### What `create` accepts

`create` reads only these five properties. Anything else you send is ignored.

<!-- BEGIN GENERATED: values-write -->
| Property | Type | | Notes |
|---|---|---|---|
| `name` | string | optional | defaults to a generated name such as `Data_Set_1` — note the underscores |
| `title` | string | optional | |
| `description` | string | optional | used when `metadata.description` is absent |
| `metadata` | object | optional | `importDate`, `source` and `description` are read |
| `collections` | array | optional | each in v2 collection form, with its attributes |
<!-- END GENERATED: values-write -->

Supplying `collections` replaces the automatically created default collection rather than adding
to it.

`create` does **not** return the new data context. It replies with just three properties:

```json
{ "success": true, "values": { "name": "Mammals", "id": 42, "title": "Mammals" } }
```

### What `update` accepts

`update` honours only the five properties below, and returns `{"success": true}` with no values.

| Property | Effect |
|---|---|
| `title` | Sets the title. Present-but-`undefined` clears it; omitting the key leaves it alone |
| `metadata.description` | Sets the description, only when the `description` key is present |
| `managingController` | Names the tile that owns this context, by name or id |
| `sort` | `{attr, isDescending}` — sorts the items by one attribute. `attr` is required |
| `rerandomize` | When truthy, rerandomizes every random attribute in the context |

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

**`create` on an existing name returns the existing data context.** If a data set with the name
you supply is already in the document, CODAP replies `success: true` with that data set's
`name`, `id` and `title`, having created nothing. The response is indistinguishable from a real
creation, so a plugin that may run twice should check the returned `id` rather than assume the
context is new and empty.

**`update` silently ignores most of what its type permits.** The interface behind this action
inherits the full v2 data-context shape — `collections`, `setAsideItems`, `preventReorg` and a
dozen more — but the handler reads only the five properties listed above. Sending `collections`
to `update` does nothing and still reports success.

**The two `setAside` requests differ in case-sensitivity.** `setAside` must be spelled exactly;
`restoreSetAsides` is matched case-insensitively, so `restoresetasides` also works. There is no
reason for the difference — do not rely on either being lenient.

**`get` never returns cases.** The response carries structure only — collections and attributes.
A plugin that reads a data context expecting its data will find no `cases` key anywhere in the
payload. This is the opposite of what the response's v2 document shape suggests, since a v2
document stores cases inside its collections. Use `allCases`, `caseSearch`, `caseByID` or the
`item` resources to read data.

**Metadata comes back nested, under a different shape than you send it.** `create` accepts
`description` at the top level as a fallback for `metadata.description`, but `get` returns only
`metadata`, and only when the data set has metadata at all. A plugin reading `values.description`
gets `undefined` every time.

## Notifications

A plugin sends `notify` to ask CODAP to set cases aside or restore them. `request` is required:

| `request` | `operation` | Effect |
|---|---|---|
| `setAside` | omitted | Adds the cases in `caseIDs` to those set aside |
| `setAside` | `replace` | Replaces the set-aside cases with `caseIDs` |
| `setAside` | `restore` | Restores the cases in `caseIDs`; with no `caseIDs`, restores all |
| `restoreSetAsides` | — | Restores every set-aside case |

`caseIDs` is required for `setAside` unless `operation` is `restore`.

Creating or deleting a data context also causes CODAP to notify plugins that the number of data
contexts changed.

## Errors

<!-- BEGIN GENERATED: errors -->
| Error | When |
|---|---|
| `DataContext not found` | the selector's data context does not resolve |
| `Attribute not found` | `update` was given a `sort.attr` that does not resolve |
| `<action> <resource>: <field> required` | a required field is missing — `notify` without `request` or, for `setAside`, without `caseIDs`; `update` with a `sort` that has no `attr` |
| `unknown request: <value>` | a `notify` `request` CODAP does not recognize |
<!-- END GENERATED: errors -->

## See also

- [`attribute`](attribute.md) for the columns within a data context
- [The resource index](../README.md) for the request envelope and the `#default` rule
- [Quick reference](../quick-reference.md) for the full error catalog and selector grammar
