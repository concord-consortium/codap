# itemByID

> **Applies to:** CODAP v3 · **Verified:** 2026-10-21
> · Parts of this page are generated — see [conventions](../conventions.md).

Reads, changes or deletes one item, found by its id. Plugins use it once they hold an item id —
from creating items, from an item search, or from an earlier `get` — and want that item's
values or to change them.

An item is one row of a data set, holding a value for every attribute in every collection. Cases
are built by grouping items: in the child-most collection each case corresponds to one item, but
the two have different ids, and a case id does not resolve here. Use
[`itemByCaseID`](item-by-case-id.md) to reach an item from a case, and
[`caseByID`](case-by-id.md) for cases.

## Supported actions

<!-- BEGIN GENERATED: actions -->
| Action | Supported |
|---|---|
| `get` | ✓ |
| `create` | — |
| `update` | ✓ |
| `delete` | ✓ |
| `notify` | — |
| `register` | — |
| `unregister` | — |
<!-- END GENERATED: actions -->

## Resource selector patterns

<!-- BEGIN GENERATED: selectors -->
| Pattern | Actions |
|---|---|
| `dataContext[<context>].itemByID[<id>]` | get, update, delete |
<!-- END GENERATED: selectors -->

`<id>` is the item's id, as CODAP reported it. Items belong to the data context as a whole, not
to one collection, so there is no `collection` segment.

An item that the user has set aside can still be read, changed and deleted by its id, as in v2.

<!-- BEGIN GENERATED: scope -->
This resource is scoped to a data context. Omitting one selects `#default`, your plugin's
own data context — see [the index](../README.md#the-default-data-context).
<!-- END GENERATED: scope -->

## Values

### What `get` returns

| Property | Notes |
|---|---|
| `id` | the item's id |
| `values` | one key per attribute in the data context, across every collection, keyed by attribute name. Formula attributes are included with their computed values. An empty value is `""` |

### What `update` accepts

`values` is an object of the values to change, keyed by attribute name. It is not nested, unlike
`update` on a case. Attributes you leave out keep their values, and a name that matches no
attribute is ignored.

Any attribute can be changed, including one in a parent collection. Changing a parent
collection's attribute changes it for this item only, so the item can move to a different parent
case: the change regroups the cases. To change a value for every item under a parent case,
update the case with [`caseByID`](case-by-id.md) instead.

`update` replies with the cases the regrouping created and deleted:

| Property | Notes |
|---|---|
| `createdCases` | always empty, in v2 as well |
| `deletedCases` | the ids of the cases the change removed, such as a parent case left with no items. Currently always empty; see [Known limitations](#known-limitations) |
| `changedCases` | new in v3. Holds the id of the item that changed, despite its name |

### What `delete` returns

Deleting an item removes it from every collection. A parent case left with no items is removed
too. `delete` replies with the deleted item's id:

```json
{ "success": true, "values": [ 7 ] }
```

## Examples

The examples use a data context `Mammals` with two collections: `Diets`, holding the attribute
`Diet`, and below it `Mammals`, holding `Mammal` and `Mass`.

Read an item:

```json
{
  "action": "get",
  "resource": "dataContext[Mammals].itemByID[7]"
}
```

```json
{
  "success": true,
  "values": {
    "id": 7,
    "values": { "Diet": "plants", "Mammal": "African Elephant", "Mass": 6400 }
  }
}
```

Change one of its values. `values` is not nested:

```json
{
  "action": "update",
  "resource": "dataContext[Mammals].itemByID[7]",
  "values": { "Mass": 6000 }
}
```

```json
{
  "success": true,
  "values": { "changedCases": [ 7 ], "createdCases": [], "deletedCases": [] }
}
```

Delete it:

```json
{
  "action": "delete",
  "resource": "dataContext[Mammals].itemByID[7]"
}
```

```json
{ "success": true, "values": [ 7 ] }
```

## Known limitations

**`update` does not report the cases it deletes.** When a change regroups the cases and removes
one, such as a parent case left with no items, v2 listed its id in `deletedCases`. v3 always
replies with an empty `deletedCases`. This is a known bug. Until it is fixed, a plugin that
tracks case ids should read them again after changing a parent collection's attribute.

**Attribute names in `values` must match exactly.** v2 tried a name again with leading and
trailing spaces removed, so `"Mass "` still matched `Mass`. v3 ignores a name that differs. This
is a known bug.

**A boolean value is stored as text.** An item updated with `true` reads back as the text
`"true"`. v2 kept the boolean. This is a known bug.

## Notifications

This resource takes no `notify` requests of its own.

`update` and `delete` notify other plugins on `dataContextChangeNotice[<context>]` with
`updateCases` or `deleteCases` for the item's case in the last collection, as the same change made
in a case table does.

## Errors

| Error | Condition |
|---|---|
| `DataContext not found` | the selector's data context does not resolve |
| `Item not found` | `get` or `delete`, when no item in the data context has that id, including when the id is a case id |
| `Case not found` | `update`, when no item in the data context has that id |
| `<action> <resource>: <field> required` | `update` without `values` |

v2 reported a missing item differently for each action: on `get` with `success: false` and no
message, on `update` as "item not found", and on `delete` with a JavaScript `TypeError` message.

## See also

- [`itemByCaseID`](item-by-case-id.md) to reach an item from one of its cases
- [`caseByID`](case-by-id.md) to read or change a case, including a parent case
- [The resource index](../README.md) for the request envelope, the `#default` rule, and the
  difference between cases and items
- [The notification catalog](../notifications.md) for the data-change notifications
