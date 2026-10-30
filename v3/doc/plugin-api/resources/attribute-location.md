# attributeLocation

> **Applies to:** CODAP v3 · **Verified:** 2026-10-21
> · Parts of this page are generated — see [conventions](../conventions.md).

Moves an attribute: to a new position among the attributes of its own collection, or into
another collection of the same data context. It is the API equivalent of dragging an attribute's
column header in a case table, and plugins use it to rearrange a data set's columns or to change
its hierarchy — moving an attribute into a parent collection groups the cases by its values.

An attribute's location is its collection and its position among that collection's attributes,
counted from `0` on the left. There is nothing to read: the resource supports only `update`. To
read where an attribute is, `get` the [`attributeList`](attribute-list.md) of each collection, or
`get` a [`collection`](collection.md), whose `attrs` lists its attributes in order, or the whole
[`dataContext`](data-context.md).

## Supported actions

<!-- BEGIN GENERATED: actions -->
| Action | Supported |
|---|---|
| `get` | — |
| `create` | — |
| `update` | ✓ |
| `delete` | — |
| `notify` | — |
| `register` | — |
| `unregister` | — |
<!-- END GENERATED: actions -->

## Resource selector patterns

<!-- BEGIN GENERATED: selectors -->
| Pattern | Actions |
|---|---|
| `dataContext[<context>].attributeLocation[<name-or-id>]` | update |
| `dataContext[<context>].collection[<collection>].attributeLocation[<name-or-id>]` | update |
<!-- END GENERATED: selectors -->

The selector names the attribute to move, by name or by numeric id. A name is looked up across
the whole data context, so the `collection` segment is not needed to find it. When you supply the
segment, that collection is searched first, which picks between attributes of the same name in
different collections. (v2 ignored the segment when finding a name, and always took the first
match in the data context.) The segment names where the attribute is now, not where it goes; the destination
is given in `values`.

CODAP v2 found an attribute by id only when the selector also named its collection, so include
the segment if your plugin must also run there and identifies attributes by id.

<!-- BEGIN GENERATED: scope -->
This resource is scoped to a data context. Omitting one selects `#default`, your plugin's
own data context — see [the index](../README.md#the-default-data-context).
<!-- END GENERATED: scope -->

## Values

### What `update` accepts

| Property | Type | Notes |
|---|---|---|
| `collection` | String or number | The collection to move the attribute into, by name or by id. Omit it to move the attribute within its own collection. The text `"parent"` names the parent of the attribute's current collection |
| `position` | number | The attribute's new position among the destination collection's attributes, counted from `0` on the left. Omit it, or send `null`, to place the attribute on the right |

**`position` counts the destination's attributes as they are before the move.** The attribute
goes just before the attribute now at that position, or at the end. So moving the first of three
attributes to position `2` leaves it in the middle, and to position `3` on the right. A position
below `0` is treated as `0` and one past the end as the end, and a fractional position is
rounded. Text that reads as a number, such as `"2"`, counts as that number.

**Moving an attribute into another collection changes the cases.** Cases are rebuilt from the
items to match the new hierarchy, in both collections, so case ids in those collections may
change. A plugin holding case ids from before the move should read them again afterwards.

**A collection left with no attributes is removed.** Moving a collection's only attribute out of
it deletes that collection.

**The destination must already exist.** `update` cannot create a collection, and is intended to
fail when `collection` names none. v3 currently does not fail; see
[Known limitations](#known-limitations). `"parent"` from the top collection, which has no parent,
fails with `Collection not found`.

`"parent"` is new in v3; v2 read it as the name of a collection. Because v3 checks for `"parent"`
first, a collection actually named `parent` can be reached only by its id.

`update` replies `{ "success": true }`.

## Examples

The examples use a data context `Mammals` with two collections: `Diets`, holding `Diet`, and its
child `Mammals`, holding `Mammal`, `Mass` and `Speed`, in that order.

**Move an attribute within its collection.** `Speed` becomes the first attribute of `Mammals`.

```json
{
  "action": "update",
  "resource": "dataContext[Mammals].attributeLocation[Speed]",
  "values": { "position": 0 }
}
```

```json
{ "success": true }
```

**Move an attribute into the parent collection.** `Mass` joins `Diets`, to the right of `Diet`,
and the cases of `Diets` are now grouped by both.

```json
{
  "action": "update",
  "resource": "dataContext[Mammals].attributeLocation[Mass]",
  "values": { "collection": "Diets" }
}
```

```json
{ "success": true }
```

**Move an attribute to the left of its parent collection, whatever that collection is called.**

```js
// sendRequest stands for however your plugin sends requests — see "Sending requests and
// receiving notifications" in the index.
sendRequest({
  action: "update",
  resource: "dataContext[Mammals].attributeLocation[Mass]",
  values: { collection: "parent", position: 0 }
}, result => {
  if (!result.success) console.warn(result.values?.error)
})
```

## Known limitations

**A destination collection that does not exist is not reported.** When `collection` names no
collection, v3 moves the attribute within its own collection, to `position` or to the right, and
replies `{ "success": true }`. v2 failed with an error saying the target collection was not
found, and moved nothing. This is a known bug; the intended behavior is v2's. Until it is fixed,
check a collection's name with [`collectionList`](collection.md#collectionlist) before moving an
attribute into it. (`"parent"` from the top collection is reported, as described above.)

**A numeric `collection` segment in the selector that matches no collection is ignored.** v3
still finds the attribute and carries out the move. v2 failed with an error saying the collection
could not be resolved. This is a known bug; the intended behavior is v2's. A segment naming a
collection that does not exist was ignored in v2 too.

**A plugin's move cannot be undone.** v2 added the move to CODAP's undo history, so the user could
undo it. v3 does not. See [Undo and redo](../guides/undo-and-redo.md#known-limitations).

## Notifications

A move sends `moveAttribute` on `dataContextChangeNotice[<context>]`, to every plugin listening
to the data context, including the one that asked, as in v2. When the move leaves a collection
with no attributes, `deleteCollection` is sent as well. In v3, a move to the attribute's own
position plus one, or to position `0` when it is already first, sends nothing; other moves that
leave the attribute where it was still send `moveAttribute`. v2 sent `moveAttribute` for every
move. See
[the notification catalog](../notifications.md#data-changes--datacontextchangenoticecontext)
for what each carries.

## Errors

| Error | Condition |
|---|---|
| `DataContext not found` | the selector's data context does not resolve. v2 reported this as being unable to resolve the data context |
| `Attribute not found` | the selector names no attribute in the data context. v2 replied `{ "success": false }` with no message, whether by name or by id |
| `Collection not found` | `collection` is `"parent"` and the attribute is in the top collection |

## See also

- [`attribute`](attribute.md) for an attribute's properties
- [`attributeList`](attribute-list.md) for the attributes of a collection, in order
- [The notification catalog](../notifications.md) for `moveAttribute` and `deleteCollection`
- [The resource index](../README.md) for the request envelope and the `#default` rule
