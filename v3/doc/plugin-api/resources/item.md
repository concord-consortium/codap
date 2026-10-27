# item

> **Applies to:** CODAP v3 · **Verified:** 2026-10-21
> · Parts of this page are generated — see [conventions](../conventions.md).

Creates, reads, changes and deletes items. An item is one complete row of a data set: a value for
every attribute, whichever collection the attribute is in. CODAP builds the cases in each
collection by grouping items, so a plugin that adds data as items does not need to know the
collection hierarchy or create parent cases first. That makes `create` on `item` the simplest way
for a plugin to send data to CODAP, and it keeps working if the user reorganizes the hierarchy.

Items are addressed by their position in the data set. To find an item by its id use `itemByID`,
by the id of a case use `itemByCaseID`, and by its values use `itemSearch`. An item is not a case:
a case in the child-most collection corresponds to one item, but the two have different ids. See
[Hierarchical data](../../hierarchical-data.md) for how items and cases relate.

## Supported actions

<!-- BEGIN GENERATED: actions -->
| Action | Supported |
|---|---|
| `get` | ✓ |
| `create` | ✓ |
| `update` | ✓ |
| `delete` | ✓ |
| `notify` | — |
| `register` | — |
| `unregister` | — |
<!-- END GENERATED: actions -->

`delete` is new in v3. v2 rejected it as an unsupported action, although its reference listed it.
A plugin that must also run on v2 should delete items with `itemByID` or `itemSearch`.

## Resource selector patterns

<!-- BEGIN GENERATED: selectors -->
| Pattern | Actions |
|---|---|
| `dataContext[<context>].item` | create, update, delete |
| `dataContext[<context>].item[<index>]` | get, update, delete |
<!-- END GENERATED: selectors -->

Without an index, `update` and `delete` act on the items whose ids you list in `values`. With an
index, they act on that one item. (v3 currently also accepts case ids in `update`; see
[Known limitations](#known-limitations).)

`<index>` is the item's zero-based position in the data set, in the order the items were added
or last sorted. It counts only the items currently in the data set: set-aside items and items
hidden by a filter formula are skipped, so the index runs from 0 to one less than the
`itemCount`. In v2 the index also counted deleted and set-aside items, which returned nothing, so
a plugin that must also run there should read items by id instead.

There is no `collection` segment. Items belong to the whole data context.

<!-- BEGIN GENERATED: scope -->
This resource is scoped to a data context. Omitting one selects `#default`, your plugin's
own data context — see [the index](../README.md#the-default-data-context).
<!-- END GENERATED: scope -->

## Values

### The item object

An item is an object mapping attribute names to values, for attributes in any collection:

```json
{ "Diet": "meat", "Mammal": "Lion", "Mass": 190 }
```

Attributes you leave out are empty. A name that matches no attribute is ignored. Text values have
leading and trailing spaces removed, and `null` is stored as an empty value. Formula attributes
compute their own values, so do not send them.

### What `create` accepts

`values` is an item object, or an array of them. Each element may instead be wrapped, which lets
the plugin choose the item's id:

| Property | Type | Notes |
|---|---|---|
| `values` | Object | The item object |
| `id` | number or string | Optional. The id to give the new item. Without it, CODAP assigns one |

In an unwrapped item, `id` is an ordinary attribute name like any other. v3 currently takes it
as the item's id instead; see [Known limitations](#known-limitations).

`create` replies with two arrays:

| Property | Notes |
|---|---|
| `itemIDs` | The ids of the new items, one for each item you sent, in the order you sent them |
| `caseIDs` | The ids of the cases the request created, in every collection. An item that joins an existing parent case adds only its own child case; one with new values for a parent collection adds a parent case too |

In v2, `itemIDs` had one entry for each new case rather than for each item: the id of the item
behind that case. With more than one collection, an item could appear more than once. A plugin
that must also run on v2 should not match `itemIDs` to the items it sent by position.

Several `create` requests on `item` sent one after another may be applied together as one
change; each still gets its own reply. See
[How CODAP processes requests](../guides/request-processing.md#sending-many-cases).

### What `get` returns

`values` holds the item's `id` and its `values`, an object with every attribute's name and
current value, formula attributes included. An empty value is `""`.

### What `update` accepts

With an index, `values` is an item object holding the values to change. Attributes you leave out
keep their values.

Without an index, `values` is an array, one object per item:

| Property | Type | Notes |
|---|---|---|
| `id` | number | The id of the item to change |
| `values` | Object | The values to change, as an item object |

An object whose `id` matches no item is skipped, and the rest are still updated. If none matches,
the reply is `{ "success": false }`. (v2 failed the whole request at the first unknown id, after
updating the items before it.) v3 currently tries each `id` as a case id first, so an id that
matches a case is not skipped; see [Known limitations](#known-limitations).

`update` replies with three arrays in `values`:

| Property | Notes |
|---|---|
| `changedCases` | The ids of the items changed. New in v3 |
| `createdCases` | The cases the change created. Currently always empty; see [Known limitations](#known-limitations) |
| `deletedCases` | The cases the change removed. Currently always empty; see [Known limitations](#known-limitations) |

Changing a value in a parent collection can move an item to a different parent case, creating or
removing cases. v2 replied to an `update` without an index in a different shape, with
`changedCases` outside `values` and holding case ids; a plugin that must also run there should
rely only on `success` for that form.

### What `delete` accepts

With an index, `delete` takes no `values`. Without one, `values` is an array of objects, each
with the `id` of an item to delete:

| Property | Type | Notes |
|---|---|---|
| `id` | number | The id of the item to delete |

Deleting items removes them from the data set, and with them any case left with no items. Unlike
setting cases aside, it cannot be undone by showing set-aside cases. `delete` replies with the
item's id in `values`, or, without an index, with every id you sent, whether or not it matched an
item.

## Examples

The examples use a data context `Mammals` with two collections: `Diets`, holding `Diet`, and its
child `Mammals`, holding `Mammal` and `Mass`. `Diets` already has a case for `meat` and none for
`fish`.

**Create two items.** The lion joins the existing `meat` case. The otter needs a new `fish` case,
so the reply lists two cases for it.

```json
{
  "action": "create",
  "resource": "dataContext[Mammals].item",
  "values": [
    { "Diet": "meat", "Mammal": "Lion", "Mass": 190 },
    { "Diet": "fish", "Mammal": "Sea Otter", "Mass": 30 }
  ]
}
```

```json
{
  "success": true,
  "caseIDs": [41, 42, 43],
  "itemIDs": [21, 22]
}
```

**Read the first item.**

```json
{
  "action": "get",
  "resource": "dataContext[Mammals].item[0]"
}
```

```json
{
  "success": true,
  "values": {
    "id": 5,
    "values": { "Diet": "plants", "Mammal": "African Elephant", "Mass": 6400 }
  }
}
```

**Change one item by its position.**

```json
{
  "action": "update",
  "resource": "dataContext[Mammals].item[0]",
  "values": { "Mass": 6000 }
}
```

```json
{
  "success": true,
  "values": { "changedCases": [5], "createdCases": [], "deletedCases": [] }
}
```

**Change several items by id.**

```json
{
  "action": "update",
  "resource": "dataContext[Mammals].item",
  "values": [
    { "id": 21, "values": { "Mass": 175 } },
    { "id": 22, "values": { "Mass": 28 } }
  ]
}
```

```json
{
  "success": true,
  "values": { "changedCases": [21, 22], "createdCases": [], "deletedCases": [] }
}
```

**Delete two items by id.**

```json
{
  "action": "delete",
  "resource": "dataContext[Mammals].item",
  "values": [ { "id": 21 }, { "id": 22 } ]
}
```

```json
{ "success": true, "values": [21, 22] }
```

**Send samples as they arrive, and keep their ids.**

```js
// sendRequest stands for however your plugin sends requests — see "Sending requests and
// receiving notifications" in the index.
function sendSamples(samples) {
  sendRequest({
    action: "create",
    resource: "dataContext[Mammals].item",
    values: samples.map(s => ({ Diet: s.diet, Mammal: s.name, Mass: s.mass }))
  }, result => {
    if (result.success) {
      result.itemIDs.forEach((id, i) => { samples[i].itemID = id })
    }
  })
}
```

## Known limitations

**`update` does not report the cases it created or removed.** `createdCases` and `deletedCases`
are always empty, even when a changed value moves an item to a different parent case. v2 listed
the cases the change removed in `deletedCases`. (Its `createdCases` was always empty too.) This is
a known bug. Until it is fixed, a plugin that needs to know the resulting cases should read them
again, for example with `caseSearch` or `allCases`.

**Attribute names must match exactly.** v2 tried a name in an item object again with leading and
trailing spaces removed, so `"Mass "` still matched `Mass`. v3 matches the name exactly and
ignores one that differs. This is a known bug; the intended behavior is v2's.

**A boolean value is stored as text.** An item created with `"Endangered": true` holds the text
`true`, and `get` returns `"true"`. v2 kept the boolean. This is a known bug; it also affects
searches, as described on [`caseSearch`](case-search.md#known-limitations).

**An `id` that is not a number is reported wrongly.** `create` stores an item under a text `id`
such as `"s9"` as given, but `itemIDs` reports it as the digits it contains, `9`, or as `NaN`
when it has none, so the reply does not find the item. v2 reported the id as given. This is a
known bug. Until it is fixed, give items numeric ids or let CODAP assign them.

**An `id` in an unwrapped item becomes the item's id.** `create` takes an `id` key in a plain item
object, such as `{ "id": 7, "Mammal": "Lion" }`, as the id of the new item rather than as a value
of an attribute named `id`. v2 used `id` as the item's id only in the wrapped `{ id, values }`
form; in a plain item object it was an ordinary attribute value, and v2 assigned the item a fresh
id. So a data set with an attribute named `id`, especially one with repeated values, gets items
that share ids, which later requests cannot tell apart. This is a known bug. Until it is fixed,
wrap each item as `{ "values": { … } }`, or do not name an attribute `id`.

**`update` without an index also accepts case ids.** v3 tries each `id` first as the id of a case.
If it matches one, `update` changes that case, and for a parent case every item under it, and
lists the id in `changedCases`. v2 accepted only item ids, and failed the request at an id that
was not one. This is a known bug. Use the ids of items, from `itemSearch` or `itemByCaseID`, and
use `caseByID` to change a case.

**`delete` notifies no other plugin.** Other plugins are not told that the items, and the cases
built from them, are gone. Deleting the same cases in a case table sends `deleteCases` on
`dataContextChangeNotice[<context>]`. This is a known bug.

**Other notifications differ from v2.** `update` with an index sends no notification, `create`
and `update` do not send `createItems` or `updateItems`, and the requesting plugin hears its own
`updateCases`. These are known bugs, described in
[the catalog's known limitations](../notifications.md#known-limitations).

## Notifications

`create` notifies the plugins listening to the data context with `createCases` on
`dataContextChangeNotice[<context>]`, one notification for each collection in which cases were
created. `update` without an index sends `updateCases`, which does not list the changed cases,
as in v2; read the cases again if you need them. v2 also sent `createItems` and
`updateItems`, and current deviations are listed under [Known limitations](#known-limitations).
See [the notification catalog](../notifications.md#data-changes--datacontextchangenoticecontext)
for what each carries.

## Errors

| Error | Condition |
|---|---|
| `DataContext not found` | the selector's data context does not resolve |
| `Item not found` | `get` with no index or one past the last item, or `delete` with an index past the last item or with neither an index nor an array of ids |
| `A values object is required for this request.` | `create` with no `values`, or `update` without an index and with no `values` |
| `<action> <resource>: <field> required` | `update` with an index and no `values`; it reads update item: values required |

`update` replies `{ "success": false }`, with no error message, when no id in `values` matches an
item. With an index past the last item, `update` is treated as if it had no index.

## See also

- [`caseByID`](case-by-id.md), [`allCases`](all-cases.md) and [`caseSearch`](case-search.md) for
  working with the cases CODAP builds from items
- [How CODAP processes requests](../guides/request-processing.md#sending-many-cases) for sending
  many items efficiently
- [The notification catalog](../notifications.md) for `createCases` and `updateCases`
- [The resource index](../README.md) for the request envelope, the `#default` rule, and the
  difference between cases and items
