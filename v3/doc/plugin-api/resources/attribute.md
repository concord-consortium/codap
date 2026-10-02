# attribute

> **Applies to:** CODAP v3 · **Verified:** 2026-10-01 against `main` @ `a1ebcea11`
> · Parts of this page are generated — see [conventions](../conventions.md).

An attribute is one column of a data set — a name, a type, an optional formula, and the display
settings that control how its values are shown. Plugins use this resource to inspect a data
set's columns, add new ones, rename or hide them, attach formulas, and drive attribute
drag-and-drop from inside a plugin's own UI.

Attributes belong to a collection, and a collection belongs to a data context. `create` needs
the full path, because CODAP must be told which collection receives the new column. The other
actions can find an attribute from the data context alone.

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
| `dataContext[<context>].collection[<collection>].attribute[<name-or-id>]` | get, update, delete, notify |
| `dataContext[<context>].attribute[<name-or-id>]` | get, update, delete, notify |
| `dataContext[<context>].collection[<collection>].attribute` | create |
<!-- END GENERATED: selectors -->

The `collection` segment is optional for everything except `create`. When you supply it, that
collection is searched first, which is how you disambiguate an attribute name that occurs in
more than one collection of the same data context. When you omit it, CODAP searches the whole
data context by name and then by id.

`<name-or-id>` accepts a name or a numeric attribute id. Names are matched twice — once as you
wrote them, then again after canonicalization — so a name containing spaces or punctuation
usually resolves even when the stored name differs in those characters.

<!-- BEGIN GENERATED: scope -->
This resource is scoped to a data context. Omitting one selects `#default`, the first data
context in the document — see [the index](../README.md#the-default-data-context).
<!-- END GENERATED: scope -->

## Values

The read and write shapes are **not the same**, and three properties invert between them. See
[Known limitations](#known-limitations) before relying on a round trip.

### What `get` returns

`get` returns the attribute object directly as `values` — not wrapped in anything.

<!-- BEGIN GENERATED: values -->
| Property | Always present | Notes |
|---|---|---|
| `name` | yes | |
| `type` | yes | |
| `title` | yes | |
| `cid` | yes | |
| `description` | yes | |
| `editable` | yes | `false` when the attribute is edit-protected |
| `hidden` | yes | |
| `renameable` | yes | `false` when `renameProtected` was set |
| `deleteable` | yes | `false` when `deleteProtected` was set |
| `formula` | yes | the formula's display text |
| `deletedFormula` | yes | |
| `guid` | yes | same value as `id` |
| `id` | yes | |
| `precision` | yes | |
| `unit` | yes | |
| `defaultMin`, `defaultMax` | no | only when a default range is set |
| `_categoryMap` | no | only when the attribute has a category set |
| `v3.categoryShapes` | no | only when some category carries a point shape |
<!-- END GENERATED: values -->

### What `create` and `update` accept

<!-- BEGIN GENERATED: values-write source=DIAttribute -->
| Property | Type | | Declared in |
|---|---|---|---|
| `guid` | `number` | optional | `ICodapV2Attribute` |
| `id` | `number` | optional | `ICodapV2Attribute` |
| `name` | `string` | optional | `ICodapV2Attribute` |
| `type` | `string \| null` | optional | `ICodapV2Attribute` |
| `title` | `string` | optional | `ICodapV2Attribute` |
| `cid` | `string` | optional | `ICodapV2Attribute` |
| `defaultMin` | `number` | optional | `ICodapV2Attribute` |
| `defaultMax` | `number` | optional | `ICodapV2Attribute` |
| `description` | `string \| null` | optional | `ICodapV2Attribute` |
| `_categoryMap` | `ICodapV2CategoryMap` | optional | `ICodapV2Attribute` |
| `colormap` | `CodapV2ColorMap` | optional | `ICodapV2Attribute` |
| `blockDisplayOfEmptyCategories` | `boolean` | optional | `ICodapV2Attribute` |
| `editable` | `boolean \| unknown` | optional | `ICodapV2Attribute` |
| `hidden` | `boolean` | optional | `ICodapV2Attribute` |
| `renameable` | `boolean` | optional | `ICodapV2Attribute` |
| `deleteable` | `boolean` | optional | `ICodapV2Attribute` |
| `formula` | `string` | optional | `ICodapV2Attribute` |
| `deletedFormula` | `string` | optional | `ICodapV2Attribute` |
| `precision` | `number \| string \| null` | optional | `ICodapV2Attribute` |
| `unit` | `string \| null` | optional | `ICodapV2Attribute` |
| `decimals` | `string` | optional | `ICodapV2Attribute` |
| `v3` | `{ categoryShapes?: Record<string, string> }` | optional | `ICodapV2Attribute` |
| `deleteProtected` | `boolean` | optional | `DIAttribute` |
| `renameProtected` | `boolean` | optional | `DIAttribute` |
<!-- END GENERATED: values-write -->

**Every property above is listed as optional, and for `create` that is misleading.** The
interface these types come from makes all of its members optional, so the table reports what
TypeScript declares. At runtime `create` rejects any attribute object without a `name`. The
other properties genuinely are optional, for both actions.

`defaultMin` and `defaultMax` appear in the table because the interface declares them, but no
write path reads them. A plugin cannot set an attribute's default range; it can only read one
that a v2 document brought in.

`create` and `update` both reply with `{"attrs": [ ... ]}` — an array of the attribute objects in
the read shape above, even when you created or updated exactly one.

## Examples

Read one attribute, letting CODAP find it by name across collections:

```json
{
  "action": "get",
  "resource": "dataContext[Mammals].attribute[Height]"
}
```

Create two attributes in a named collection. `name` is required on each:

```json
{
  "action": "create",
  "resource": "dataContext[Mammals].collection[Cases].attribute",
  "values": [
    { "name": "BMI", "type": "numeric", "formula": "Mass / Height ^ 2" },
    { "name": "Notes", "type": "categorical", "description": "Field observations" }
  ]
}
```

Protect an attribute from being renamed or deleted:

```json
{
  "action": "update",
  "resource": "dataContext[Mammals].attribute[Height]",
  "values": { "renameProtected": true, "deleteProtected": true }
}
```

Start a drag from inside a plugin, so the user can drop an attribute onto a graph axis:

```json
{
  "action": "notify",
  "resource": "dataContext[Mammals].attribute[Height]",
  "values": { "request": "dragStart", "overlayWidth": 120, "overlayHeight": 24 }
}
```

## Known limitations

**Three properties invert between writing and reading.** `get` reports `deleteable`, `renameable`
and `editable`; `update` accepts those spellings *and* `deleteProtected` and `renameProtected`,
which mean the opposite. Setting `deleteProtected: true` and reading the attribute back returns
`deleteable: false`. There is no `deleteProtected` or `renameProtected` in a `get` response.

**`editable` does not behave like the other two.** `deleteable` and `renameable` are inverted on
the way in, so writing `deleteable: false` protects the attribute, as you would expect. `editable`
is not inverted: writing `editable: true` marks the attribute edit-*protected*, and a following
`get` returns `editable: false`. To make an attribute editable, send `editable: false`. This is
inconsistent with the two properties handled immediately beside it in the same function and looks
like a defect rather than a decision; it is recorded here because it is what CODAP does today.

**`create` ignores all four protection properties on a new attribute.** They are applied by the
update path only. Creating an attribute with `deleteProtected: true` silently leaves it
unprotected — unless the name already exists, in which case `create` takes the update path and
they do apply. Set them with a separate `update` after creating.

**`create` on an existing name updates instead of creating.** If the collection already has an
attribute with the name you supply, CODAP updates that attribute and returns it, rather than
creating a second column or reporting a conflict. A plugin that expects `create` to fail on a
duplicate name will instead silently overwrite the original's properties.

**`update` with an array returns `Attribute not found`.** The update action accepts only a single
attribute object. Passing an array produces that error even when the selector resolves perfectly
well, which makes it read like a selector problem rather than a values problem.

**`dragMove` and `dragEnd` require a requesting plugin frame.** Both are dispatched relative to
the plugin's own iframe, so a request that arrives without one falls through to
`unknown request: <value>` rather than reporting the missing frame.

## Notifications

`create` and `update` cause CODAP to broadcast attribute notifications to listening plugins; the
acting plugin does not need to subscribe to see its own changes reflected in the response.

This resource's `notify` action is the reverse direction — the plugin telling CODAP to do
something. It requires a `request` naming the operation:

| `request` | Effect |
|---|---|
| `dragStart` | Begins a drag of this attribute from the plugin. `overlayWidth` and `overlayHeight` size the drag image |
| `dragMove` | Continues the drag. `mouseX` and `mouseY` are relative to the plugin's frame |
| `dragEnd` | Ends the drag at `mouseX`, `mouseY` |
| `formulaEditor` | Opens CODAP's formula editor on this attribute |

Any other `request` value returns an error.

## Errors

<!-- BEGIN GENERATED: errors -->
| Error | When |
|---|---|
| `DataContext not found` | the selector's data context does not resolve |
| `Collection not found` | `create` without a resolvable `collection` segment |
| `Attribute not found` | the attribute does not resolve — or `update` was given an array |
| `<action> <resource>: <field> required` | a required field is missing. `create` produces it as "Create attribute: name required"; `notify` as "Notify attribute: request required" |
| `Internal error prevented color map access` | a `create` supplied `colormap` but the data set has no metadata |
| `unknown request: <value>` | a `notify` `request` CODAP does not recognize |
<!-- END GENERATED: errors -->

## See also

- [The resource index](../README.md) for the request envelope and the `#default` rule
- [Quick reference](../quick-reference.md) for the full error catalog and selector grammar
