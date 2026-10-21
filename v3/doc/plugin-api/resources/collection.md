# collection

> **Applies to:** CODAP v3 · **Verified:** 2026-10-21
> · Parts of this page are generated — see [conventions](../conventions.md).

A collection is one level of a data context's hierarchy: a set of cases that share a group of
attributes. A data context has one or more collections in a series, from the top parent
collection to the last child collection, and each case in a child collection has exactly one
parent case in the collection above. Plugins use this resource to build that hierarchy, to read a
collection's attributes and labels, to retitle it, and to remove a level. `collectionList` lists
a data context's collections in order.

Moving an existing attribute to another collection is done with [`attributeLocation`](attribute-location.md), not here.
This resource creates and removes collections themselves.

## Supported actions

<!-- BEGIN GENERATED: actions -->
| Action | collection | collectionList |
|---|---|---|
| `get` | ✓ | ✓ |
| `create` | ✓ | — |
| `update` | ✓ | — |
| `delete` | ✓ | — |
| `notify` | — | — |
| `register` | — | — |
| `unregister` | — | — |
<!-- END GENERATED: actions -->

## Resource selector patterns

<!-- BEGIN GENERATED: selectors -->
| Pattern | Actions |
|---|---|
| `dataContext[<context>].collection` | create |
| `dataContext[<context>].collection[<collection>]` | get, update, delete |
| `dataContext[<context>].collectionList` | get |
<!-- END GENERATED: selectors -->

`<collection>` accepts the collection's name or its id. `create` takes no collection in the
selector; the new collections are described in `values`.

<!-- BEGIN GENERATED: scope -->
This resource is scoped to a data context. Omitting one selects `#default`, your plugin's
own data context — see [the index](../README.md#the-default-data-context).
<!-- END GENERATED: scope -->

## Values

### What `get` returns

`get` returns the collection object directly as `values`:

| Property | Notes |
|---|---|
| `name` | the collection's name, unique within its data context |
| `title` | the title shown in the case table. It is the name unless one was set |
| `id`, `guid` | the collection's id; both carry the same value |
| `parent` | the id of the parent collection. Absent for the top collection |
| `attrs` | the collection's attributes, in order, each in the shape [`attribute`](attribute.md) returns |
| `labels` | the collection's labels, below. Absent when none is set |
| `type` | always `"DG.Collection"` |

v2 also returned `areParentChildLinksConfigured`, `caseName`, `childAttrName`,
`collapseChildren`, `defaults` and an empty `cases` array. These described v2's internal state, and v3 does
not return them.

### What `create` accepts

`values` is a collection object, or an array of them. An array is applied in order, so list a
parent before the collections beneath it.

| Property | Type | Notes |
|---|---|---|
| `name` | String | required. A collection object without one is skipped |
| `title` | String | optional. The title shown in the case table |
| `parent` | String or number | optional. The name or id of the collection the new one goes beneath, below |
| `attributes`, `attrs` | Array | optional. Attribute objects for the new collection, in the shape [`attribute`](attribute.md) accepts. Either name works, and both may be given. `attrs` is new in v3; v2 read only `attributes` |
| `labels` | Object | optional. Labels, below |

Where the new collection goes depends on `parent`:

- **No `parent`**: it becomes the last collection, beneath the current last one.
- **`parent` names an existing collection**: it goes directly beneath that collection, and the
  collection that was beneath it moves down a level.
- **`parent` names no collection**: it becomes the top collection, above all the others. The
  reserved name `_root_` is the conventional way to ask for this.

An attribute whose name is already used anywhere in the data context is not created. (v2
checked only the new collection's own attributes.)

`create` replies with an array of `{ id, name }`, one for each collection object that had a
name. If a collection with that name already exists, no new collection is made, and the reply
gives the existing collection's id; see [Known limitations](#known-limitations).

A collection object without a `name` is skipped and does not appear in the reply. (v2 created a
collection with no name.)

### Labels

Labels are the words CODAP uses for this collection's cases in its own interface. Each is
optional.

| Property | Example | Used for |
|---|---|---|
| `singleCase` | `person` | one case |
| `pluralCase` | `people` | more than one case |
| `singleCaseWithArticle` | `a person` | one case, with its article |
| `setOfCases` | `group` | a group of cases |
| `setOfCasesWithArticle` | `a group` | a group of cases, with its article |

### What `update` accepts

| Property | Type | Notes |
|---|---|---|
| `title` | String | The new title. An empty title is ignored. (v2 cleared the title, so the name was shown instead) |
| `labels` | Object | Labels to set, as above. New in v3: v2 accepted labels only on `create` |

Other properties are ignored, including `name` and `parent`; see
[Known limitations](#known-limitations) for `name`. `update` replies `{ "success": true }`,
including when `values` is missing.

### What `delete` does

`delete` removes the collection and its attributes. The cases of the remaining collections are
regrouped, and no item is deleted. The reply carries the deleted collection's id:

```json
{ "success": true, "values": { "collections": [ 36 ] } }
```

### collectionList

`get` on `collectionList` returns an array with one entry per collection, in order from the top
collection to the last one:

| Property | Notes |
|---|---|
| `name` | the collection's name |
| `title` | the collection's title |
| `guid` | the collection's id |
| `id` | the collection's id, the same as `guid`. New in v3: v2 returned only `guid` |

## Examples

The examples use a data context `People`. Its collections, once created in the first example,
are `People`, holding `Name`, and its child `Measurements`, holding `Age` and `Height`.

**Create a parent and a child collection.**

```json
{
  "action": "create",
  "resource": "dataContext[People].collection",
  "values": [
    {
      "name": "People",
      "title": "Data about people",
      "labels": { "singleCase": "person", "pluralCase": "people" },
      "attributes": [ { "name": "Name" } ]
    },
    {
      "name": "Measurements",
      "parent": "People",
      "attributes": [ { "name": "Age", "type": "numeric" }, { "name": "Height", "type": "numeric" } ]
    }
  ]
}
```

```json
{
  "success": true,
  "values": [
    { "id": 35, "name": "People" },
    { "id": 36, "name": "Measurements" }
  ]
}
```

**Read a collection.**

```json
{
  "action": "get",
  "resource": "dataContext[People].collection[Measurements]"
}
```

```json
{
  "success": true,
  "values": {
    "name": "Measurements",
    "title": "Measurements",
    "id": 36,
    "guid": 36,
    "parent": 35,
    "type": "DG.Collection",
    "attrs": [
      {
        "name": "Age",
        "title": "Age",
        "type": "numeric",
        "cid": "ATTR41",
        "id": 41,
        "guid": 41,
        "editable": true,
        "hidden": false,
        "renameable": true,
        "deleteable": true
      }
    ]
  }
}
```

The `attrs` array above is shortened to one attribute, and that attribute to a few of its
properties; see [`attribute`](attribute.md) for all of them.

**Retitle a collection and set its labels.**

```json
{
  "action": "update",
  "resource": "dataContext[People].collection[People]",
  "values": {
    "title": "Students",
    "labels": { "singleCase": "student", "pluralCase": "students" }
  }
}
```

```json
{ "success": true }
```

**List the collections.**

```json
{
  "action": "get",
  "resource": "dataContext[People].collectionList"
}
```

```json
{
  "success": true,
  "values": [
    { "name": "People", "title": "Students", "guid": 35, "id": 35 },
    { "name": "Measurements", "title": "Measurements", "guid": 36, "id": 36 }
  ]
}
```

**Remove the parent collection.** `Name` is deleted with it, and `Measurements` becomes the only
collection.

```json
{
  "action": "delete",
  "resource": "dataContext[People].collection[People]"
}
```

```json
{ "success": true, "values": { "collections": [ 35 ] } }
```

## Known limitations

**`delete` removes the only collection.** v2 refused to delete a data context's last remaining
collection and replied with an error. v3 deletes it, with its attributes, and leaves a data
context with no collections and no attributes. This is a known bug. Until it is fixed, do not
delete a collection unless the data context has another.

**Deleting the last collection keeps every item.** When the collection deleted is the last one,
the collection above it becomes the last, and each of its cases should then stand for one item.
v2 deleted the extra items to make that so, keeping one item for each case of the new last
collection. v3 keeps every item, so the new last collection shows one case per item, with
repeated values. This is a known bug.

**`create` with an existing name ignores the attributes.** When a collection with the name
already exists, v2 added to it any attributes the request described that it did not have,
updated the ones it did have, and put them in the request's order. v3
adds none; it only replies with the existing collection's id. This is a known bug. Until it is
fixed, add attributes to an existing collection with `create` on
[`attribute`](attribute.md).

**`update` does not rename a collection.** v2 changed the collection's name when `update`
included `name`, which is also how v2's own case table renamed collections. v3 ignores `name`.
This is a known bug. Until it is fixed, a plugin cannot rename a collection.

**`update` and `delete` notify no other plugin.** v2 sent `updateCollection` and
`deleteCollection` to the other plugins. This is a known bug; see
[the catalog's known limitations](../notifications.md#known-limitations).

## Notifications

`create` notifies the plugins listening to the data context with `createCollection` on
`dataContextChangeNotice[<context>]`, one for each collection created. `update` and `delete` are
intended to send `updateCollection` and `deleteCollection`, but currently send nothing; see
[Known limitations](#known-limitations). `collectionList` sends none. See
[the notification catalog](../notifications.md#data-changes--datacontextchangenoticecontext) for
what each carries.

## Errors

| Error | Condition |
|---|---|
| `DataContext not found` | the selector's data context does not resolve |
| `Collection not found` | `get`, `update` or `delete` whose `collection` segment is missing or names no collection |
| `A values object is required for this request.` | `create` with no `values` |

v2 reported a data context that does not exist as an error saying it could not resolve the data
context, and a `delete` that failed as "Delete failed".

## See also

- [`attribute`](attribute.md) and [`attributeList`](attribute-list.md) for a collection's
  attributes
- [`dataContext`](data-context.md) for the data context that holds the collections
- [`caseCount`](case-count.md) and [`allCases`](all-cases.md) for a collection's cases
- [The notification catalog](../notifications.md) for `createCollection`, `updateCollection` and
  `deleteCollection`
- [The resource index](../README.md) for the request envelope and the `#default` rule
