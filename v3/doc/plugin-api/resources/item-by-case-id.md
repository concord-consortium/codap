# itemByCaseID

> **Applies to:** CODAP v3 · **Verified:** 2026-10-21
> · Parts of this page are generated — see [conventions](../conventions.md).

Reads, changes or deletes the item behind a case, found by the case's id. Plugins use it when
they hold a case id — from a notification, a case search, or the user's selection — and want
the whole row it comes from, with the values of every collection, rather than the case's own
values.

An item is one row of a data set, holding a value for every attribute in every collection. Cases
are built by grouping items. In the child-most collection each case corresponds to exactly one
item. A case in a parent collection groups several items, and this resource reaches only the
first of them.

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
| `dataContext[<context>].itemByCaseID[<id>]` | get, update, delete |
<!-- END GENERATED: selectors -->

`<id>` is a case's id, not an item's. For a case in the child-most collection, the selector
reaches that case's item. For a case in a parent collection, it reaches the first item grouped
under that case, in the current item order, and only that one. (v2 reached the item the case was
first created from, which after a sort or a regrouping might no longer be the first.) Use a
child-most case's id to be sure which item you reach.

<!-- BEGIN GENERATED: scope -->
This resource is scoped to a data context. Omitting one selects `#default`, your plugin's
own data context — see [the index](../README.md#the-default-data-context).
<!-- END GENERATED: scope -->

## Values

### What `get` returns

| Property | Notes |
|---|---|
| `id` | the item's id, which is not the case id in the selector |
| `values` | one key per attribute in the data context, across every collection, keyed by attribute name. Formula attributes are included with their computed values. An empty value is `""` |

### What `update` accepts

`values` is an object of the values to change, keyed by attribute name. It is not nested, unlike
`update` on a case. Attributes you leave out keep their values, and a name that matches no
attribute is ignored.

`update` changes one item, even when the selector names a parent case. Changing a parent
collection's attribute through it changes that one item, which then moves to a different parent
case while the rest stay where they were. To change a value for every item under a parent case,
update the case with [`caseByID`](case-by-id.md) instead.

`update` replies with the cases the regrouping created and deleted:

| Property | Notes |
|---|---|
| `createdCases` | always empty, in v2 as well |
| `deletedCases` | the ids of the cases the change removed, such as a parent case left with no items. Currently always empty; see [Known limitations](#known-limitations) |
| `changedCases` | new in v3. Holds the id of the item that changed, despite its name |

### What `delete` returns

`delete` deletes one item, even when the selector names a parent case: the other items under
that case remain. To delete a parent case with everything under it, use
[`caseByID`](case-by-id.md). A parent case left with no items is removed. `delete` replies with
the deleted item's id:

```json
{ "success": true, "values": [ 7 ] }
```

In v2, `delete` on this resource replied `success: true` with the item's id but left the item in
place. v3 deletes it.

## Examples

The examples use a data context `Mammals` with two collections: `Diets`, holding the attribute
`Diet`, and below it `Mammals`, holding `Mammal` and `Mass`. The case with id 13 is the African
Elephant's case in `Mammals`, and its item has id 7.

Read the item behind a case:

```json
{
  "action": "get",
  "resource": "dataContext[Mammals].itemByCaseID[13]"
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
  "resource": "dataContext[Mammals].itemByCaseID[13]",
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
  "resource": "dataContext[Mammals].itemByCaseID[13]"
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

**`update` and `delete` notify no other plugin.** v2 sent `updateCases` or `deleteCases` on
`dataContextChangeNotice[<context>]` to the other plugins. v3 sends nothing, so other plugins do
not learn of the change. This is a known bug; see
[the notification catalog](../notifications.md#known-limitations).

## Notifications

This resource takes no `notify` requests of its own.

`update` and `delete` should notify other plugins on `dataContextChangeNotice[<context>]` with
`updateCases` or `deleteCases`, as the same change made in a case table does. They do not yet;
see [Known limitations](#known-limitations).

## Errors

| Error | Condition |
|---|---|
| `DataContext not found` | the selector's data context does not resolve |
| `Item not found` | `get` or `delete`, when no case in the data context has that id, including when the id is an item id |
| `Case not found` | `update`, when no case in the data context has that id |
| `<action> <resource>: <field> required` | `update` without `values` |

v2 reported a missing case on `get` and `delete` with `success: false` and no message, and on
`update` as "item not found".

## See also

- [`itemByID`](item-by-id.md) to read or change an item by its own id
- [`caseByID`](case-by-id.md) to read, change or delete a case, including a parent case and
  everything under it
- [The resource index](../README.md) for the request envelope, the `#default` rule, and the
  difference between cases and items
- [The notification catalog](../notifications.md) for the data-change notifications
