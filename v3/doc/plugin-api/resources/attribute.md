# attribute

> **Applies to:** CODAP v3 · **Verified:** 2026-10-02
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

The read and write shapes are **not the same**: `get` reports whether an attribute *can* be
deleted or renamed, while `update` also accepts the negated spellings. See
[Known limitations](#known-limitations) before relying on a round trip.

### What `get` returns

`get` returns the attribute object directly as `values` — not wrapped in anything.

"Always present" below means the key is always there. Its value may still be `undefined`: replies
reach a plugin by structured clone rather than JSON, so a key with no value survives the trip.
`formula`, `deletedFormula`, `description`, `unit`, `type` and `precision` are all commonly
`undefined`.

<!-- BEGIN GENERATED: values -->
| Property |
|---|
| `name` |
| `type` |
| `title` |
| `cid` |
| `description` |
| `editable` |
| `hidden` |
| `renameable` |
| `deleteable` |
| `formula` |
| `deletedFormula` |
| `guid` |
| `id` |
| `precision` |
| `unit` |
| `defaultMin`, `defaultMax` |
| `_categoryMap` |
| `v3.categoryShapes` |
<!-- END GENERATED: values -->

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

### What `create` and `update` accept

Properties are grouped by the interface that declares them. Names beginning `v2` or `ICodapV2`
are CODAP v2's own vocabulary, carried forward so v2 plugins keep working; the rest were added in
v3.


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

**The table above is the shape the API permits, not the set of properties that take effect.** It
is generated from the TypeScript interface, which describes what CODAP accepts without complaint.
These are accepted and currently do nothing:

| Property | On | Status |
|---|---|---|
| `defaultMin`, `defaultMax` | both | v2 honored these and its axes read them — a known bug |
| `_categoryMap` | both | v2 honored it on create and update — a known bug |
| `blockDisplayOfEmptyCategories` | both | v2 read it when deciding which categories to show — a known bug |
| `deletedFormula` | both | v2 stored and archived it — a known bug |
| `v3.categoryShapes`, `decimals` | both | no v3 write path; no v2 counterpart |
| `guid` | `create` | the new attribute's id comes from `id` or `cid` |
| `id`, `guid` | `update` | the attribute is identified by the selector |

`_categoryMap` and `v3.categoryShapes` are the trap, because `get` returns both: reading an
attribute, changing its category colors and sending it back is the natural thing to try, and it
silently does nothing. Use `colormap`.

`create` and `update` both reply with `{"attrs": [ ... ]}` — an array of the attribute objects in
the read shape above, even when you created or updated exactly one.

**`type` is accepted differently by the two actions.** `create` understands the v2 spellings —
`"nominal"` for categorical, `"number"` for numeric, `"none"` — and passes anything else through
unchecked. `update` accepts only v3 type names and silently ignores the v2 spellings and `null`,
so a type set on `create` cannot be cleared back to inferred by `update`.

**Date precisions are dropped on write.** `get` can return a precision such as `"month"`, but
neither `create` nor `update` applies one.

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

**The protection properties come in two spellings that mean opposite things.** `get` reports
`deleteable`, `renameable` and `editable` — whether the attribute *can* be deleted, renamed or
edited. `update` accepts those, and also `deleteProtected` and `renameProtected`, which are their
negations. Setting `deleteProtected: true` is the same as setting `deleteable: false`, and a
following `get` returns `deleteable: false`. There is no `deleteProtected` or `renameProtected` in
a `get` response.

**`editable` currently does the opposite of what it says.** Sending `editable: true` should leave
the attribute editable, and today it makes the attribute read-only; a following `get` returns
`editable: false`. This is a known bug — the value is not negated on the way in, unlike the two
properties handled beside it. Write what you mean; the behavior will be corrected, and a plugin
written against the inverted behavior will break when it is.

**`create` does not apply the protection properties to a new attribute.** `deleteable`,
`renameable`, `deleteProtected` and `renameProtected` are honored by `update` and dropped by
`create` — unless the name already exists, in which case `create` takes the update path and they
do apply. This is a known bug. Until it is fixed, set them with an `update` after creating.

**`_categoryMap` has no write path at all.** Neither action applies it, so there is no workaround:
`update` reports success and changes nothing. Set category colors with `colormap` instead. v2
honored `_categoryMap` on both actions, so this is a known bug rather than a design choice.

**`create` on an existing name updates that attribute.** This is deliberate and matches v2:
`create` guarantees an attribute with the name you gave, creating one if needed and updating it
otherwise. There is no duplicate-name error. A plugin that may run twice should expect its second
`create` to overwrite the first's properties rather than fail — and note that this path runs the
full update, so `editable` is applied here even though a genuine `create` ignores it.

**`update` rejects an array, with a misleading message.** The action takes one attribute object;
an array returns `Attribute not found` even though the attribute resolved, which reads like a
selector fault. Rejecting the array is an improvement on v2, which treated it as a single object
and wrote junk keys onto the attribute; only the message is wrong.

**`dragMove` and `dragEnd` require a requesting plugin frame.** Both are dispatched relative to
the plugin's own iframe, so a request that arrives without one falls through to
`unknown request: <value>` rather than reporting the missing frame.

## Notifications

`create` and `update` cause CODAP to broadcast attribute notifications to listening plugins,
including the plugin that made the change — unlike component changes, which exclude the
requester. **`delete` sends no notification at all.**

The operations are `createAttributes`, `updateAttributes`, `deleteAttributes` and
`moveAttribute`, all on `dataContextChangeNotice[<context>]`. See
[the notification catalog](../notifications.md#data-changes--datacontextchangenoticecontext) for
what each carries.

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
| Error |
|---|
| `DataContext not found` |
| `Collection not found` |
| `Attribute not found` |
| `<action> <resource>: <field> required` |
| `Internal error prevented color map access` |
| `unknown request: <value>` |
<!-- END GENERATED: errors -->

| Error | Condition |
|---|---|
| `DataContext not found` | `create` or `notify` when the selector's data context does not resolve. `get`, `update` and `delete` report `Attribute not found` instead |
| `Collection not found` | `create` without a resolvable `collection` segment |
| `Attribute not found` | the attribute does not resolve, the data context did not resolve on `get`/`update`/`delete`, or `update` was given an array |
| `<action> <resource>: <field> required` | a required field is missing. `create` produces it as "Create attribute: name required"; `notify` as "Notify attribute: request required" |
| `Internal error prevented color map access` | a `create` supplied `colormap` but the data set has no metadata |
| `unknown request: <value>` | a `notify` `request` CODAP does not recognize |

## See also

- [The resource index](../README.md) for the request envelope and the `#default` rule
- [Quick reference](../quick-reference.md) for the full error catalog and selector grammar
