# Hierarchical Data

## History

Early versions of CODAP did not support hierarchical data. `Case`s were contained in a `Collection` which represented flat data. Later when support for hierarchical data was added to CODAP, this model was extended so that collections continued to be the underlying representation of cases. For instance, if a user of the `Mammals` example data put `Diet` and `Habitat` in a parent collection, then there would be one collection that contained cases with only those two attributes and another collection that contained cases with only the remaining attributes. Whenever it was necessary to deal with the case as a whole, the resulting `Item` was constructed from the cases in each collection. It has been clear for some time that this was an inversion of the proper arrangement. It would be better for the `Item` to represent the source of truth and for `Case`s to be constructed by grouping the underlying items into sets with values in common.

## v3

With this understanding, the v3 representation is quite different. The conceptual layering is:

- **Items** are the source of truth. Each item is a row of values, addressable by `__id__`. They live on the `DataSet` (`_itemIds`, with values stored on `Attribute`s).
- **Collections** are grouping mechanisms. The `collections` property of `DataSet` is an array of `CollectionModel`s in **parent-to-child order** (so `collections[0]` is the root and `collections[length - 1]` is the child-most, accessible as `dataSet.childCollection`). Each collection holds references to the attributes that participate in grouping at that level.
- **Cases** are constructed by grouping items. They live *on collections*, not on the DataSet directly. A case in a parent collection groups items that share values across that collection's attributes; a case in the child-most collection corresponds one-to-one with an item.

Cases and items are different identities (they have different ids), even when they correspond one-to-one in a single-collection dataset.

For rendering the case table or a graph, we need to know the cases that exist at each level of the hierarchy once grouping has been taken into account. This information is maintained in the `caseInfoMap` property, which is a map of `CaseInfo` objects keyed by case id.

```typescript
// represents a case in a collection which has a set of common grouped values
// and potentially a set of child cases.
export interface CaseInfo {
  // id of collection containing the group
  collectionId: string
  // object that represents the case
  groupedCase: IGroupedCase
  // ids of child cases in the group (if any)
  childCaseIds?: string[]
  // ids of leaf child cases (items) in the group
  childItemIds: string[]
  // stringified version of grouped case values for easy comparison/categorization
  groupKey: string
}
```

The `DataSet`'s `validateCases()` method performs the actual grouping, delegating to the individual collections (`updateCaseGroups()`, `completeCaseGroups()`) the grouping of attributes into cases based on the attributes in each collection. This occurs whenever the data changes in any way which could potentially invalidate the groupings. The grouping code iterates through the flat items (at least) once per collection, so it could be considered `O(Cxi)`, but since the number of collections will generally be small we assume this won't be a performance problem in the near term.

Two narrower invalidation paths avoid the full O(C×i) rebuild when possible: an *additive* path for appended items (used when plugins stream in new cases — see `validateCasesForNewItems`), and a *value-revalidation* path for child-collection value changes that can flip case emptiness without affecting groupings (used after formula recomputation — see `recomputeNonEmptyCases`). For the markers and observable surfaces that drive these paths, see [dataset-validation-and-reactivity.md](./dataset-validation-and-reactivity.md).

A consequence of this new arrangement is that as groupings of items into cases changed, new case ids would frequently be generated, with the result that while item ids were more persistent than their v2 counterparts, v3 case ids were initially more ephemeral. Since then the v3 code has taken several steps to persist case ids so that they should now be at least as persistent as v2 case ids. First, the mapping from a given set of parent case values (the `groupKey` internally) to case id is cached so that the same set of parent case values will always correspond to the same case id. Second, when changes that would otherwise result in generation of new case ids result in cases representing the same set of items as a previous case, the previous case id is reused.

Clients, e.g. tables and graphs, retrieve the cases relevant to their needs using `DataSet` accessors:

- `getCasesForCollection(collectionId)` — cases in a specific collection.
- `getNonEmptyCasesForCollection(collectionId)` — same, filtered to non-empty cases (the meaning of "non-empty" varies; see the reactivity doc).
- `getCasesForAttributes(attributeIds)` — cases from the *child-most* collection that contains any of the listed attributes. The function walks child → parent and returns the first match.

The rationale for the child-most rule: when a graph plots Y vs. X with one attribute in a parent collection and the other in a child, the number of cases to plot is the number in the child collection. Parent-collection attribute values can always be replicated down to the child cases, but the reverse isn't true (a child value can't be sensibly aggregated up to the parent without choosing an aggregation function). So `getCasesForAttributes(["weight", "mammal_class"])` returns one case per individual mammal (the child collection), not one per class (the parent), even though `mammal_class` lives only on the parent.

These accessors call `validateCases()` first, so they always return current groupings. Clients should generally prefer them over reading `collection.cases` directly (the difference matters for reactivity — see [dataset-validation-and-reactivity.md](./dataset-validation-and-reactivity.md)).

`DataSet` functions used by clients (e.g. value-accessing methods, `isCaseSelected()`, `selectCases()`, `setSelectedCases()`, `setCaseValues()`) have generally been extended to handle cases or items interchangeably to simplify use by clients.
