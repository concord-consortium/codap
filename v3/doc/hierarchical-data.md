# Hierarchical Data

## History

Early versions of CODAP did not support hierarchical data. `Case`s were contained in a `Collection` which represented flat data. Later when support for hierarchical data was added to CODAP, this model was extended so that collections continued to be the underlying representation of cases. For instance, if a user of the `Mammals` example data put `Diet` and `Habitat` in a parent collection, then there would be one collection that contained cases with only those two attributes and another collection that contained cases with only the remaining attributes. Whenever it was necessary to deal with the case as a whole, the resulting `Item` was constructed from the cases in each collection. It has been clear for some time that this was an inversion of the proper arrangement. It would be better for the `Item` to represent the source of truth and for `Case`s to be constructed by grouping the underlying items into sets with values in common.

## v3

With this understanding, the v3 representation is quite different. Collections are really just grouping mechanisms. The `collections` property of the `DataSet` is an array of `CollectionModel`s, which are essentially just references to the attributes grouped at a given level of the hierarchy. For rendering the case table or a graph, we need to know the cases that exist at each level of the hierarchy once grouping has been taken into account. This information is maintained in the `caseInfoMap` property, which is a map of `CaseInfo` objects keyed by case id.

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

The `DataSet`'s `validateCases()` method performs the actual grouping, delegating to the individual collections (`updateCaseGroups()`, `completeCaseGroups()`) the grouping of attributes into cases based on the attributes in each collection. This occurs whenever the data changes in any way which could potentially invalidate the groupings. In theory, not all changes require a full rebuild, e.g. the values of a case could change in a way that didn't change the groupings, but such optimizations are left as considerations for another day. The grouping code iterates through the flat items (at least) once per collection, so it could be considered `O(Cxi)`, but since the number of collections will generally be small we assume this won't be a performance problem in the near term.

A consequence of this new arrangement is that as groupings of items into cases changed, new case ids would frequently be generated, with the result that while item ids were more persistent than their v2 counterparts, v3 case ids were initially more ephemeral. Since then the v3 code has taken several steps to persist case ids so that they should now be at least as persistent as v2 case ids. First, the mapping from a given set of parent case values (the `groupKey` internally) to case id is cached so that the same set of parent case values will always correspond to the same case id. Second, when changes that would otherwise result in generation of new case ids result in cases representing the same set of items as a previous case, the previous case id is reused.

Clients, e.g. tables and graphs, can use functions like `getCasesForAttribute()` and `getCasesForCollection()` to retrieve the cases to consider for a given attribute or collection. `DataSet` functions used by clients (e.g. value-accessing methods, `isCaseSelected()`, `selectCases()`, `setSelectedCases()`, `setCaseValues()`) have generally been extended to handle cases or items interchangeably to simplify use by clients.
