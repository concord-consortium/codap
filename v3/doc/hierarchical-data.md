# Hierarchical Data

## History

Early versions of CODAP did not support hierarchical data. `Case`s were contained in a `Collection` which represented flat data. Later when this was extended to support hierarchical data, this model was extended so that collections continued to be the underlying representation of cases. For instance, if a user of the `Mammals` example data put `Diet` and `Habitat` in a parent collection, then there would be one collection that contained cases with only those two attributes and another collection that contained cases with only the remaining attributes. Whenever it was necessary to deal with the case as a whole, the resulting `Item` was constructed from the disparate pieces. It has been clear for some time that this was an inversion of the proper arrangement. It would be better for the `Case` to represent all of the data for a given case and for `Collection`s to be constructed from the underlying cases.

## v3

With this understanding, the v3 representation is quite different. Collections are really just grouping mechanisms. The `collections` property of the `DataSet` is just an array of `CollectionModel`s, which are essentially just references to the attributes grouped at a given level of the hierarchy. For rendering the case table or a graph, we need to know the "cases" that exist at each level of the hierarchy once grouping has been taken into account. This information is maintained in the `collectionGroups` property, which is an array of `CollectionGroup` objects, one for each collection.

```typescript
// represents the set of grouped cases at a particular level of the hierarchy
export interface CollectionGroup {
  collection: ICollectionModel
  // each group represents a single case at this level along with links to child cases
  groups: CaseGroup[]
  // map from valuesJson to corresponding CaseGroup
  groupsMap: Record<string, CaseGroup>
}
```

The resulting cases are considered to be pseudo-cases. Each `CaseGroup` contains a pseudo-case and information about the group of child cases attached to this pseudo-case.

```typescript
// represents a set of cases which have common grouped values (a pseudo-case)
export interface CaseGroup {
  // id of pseudo-case and attribute values
  pseudoCase: ICase
  // ids of leaf child cases (actual cases) in the group
  childCaseIds: string[]
  // ids of child pseudo cases in the group (if any)
  childPseudoCaseIds?: string[]
  // stringified version of grouped case values for easy comparison/categorization
  valuesJson: string
}
```

The `collectionGroups` accessor method rebuilds the hierarchy when necessary, i.e. whenever the data changes in any way which could potentially invalidate the groupings. In theory, not all changes require a full rebuild, e.g. the values of a case could change in a way that didn't change the groupings, but such optimizations are left as considerations for another day. The `collectionGroups` code iterates through the flat cases a single time, but then must iterate through each collection for each case, so it could be considered `O(Cxc)`, but since the number of collections will generally be small we assume this won't be a performance problem in the near term.

Clients, e.g. tables and graphs, can use functions like `getCasesForAttribute()` and `getCasesForCollection()` to retrieve the cases or pseudo-cases to consider for a given attribute or collection. `DataSet` functions
used by such clients (e.g. value-accessing methods, `isCaseSelected()`, `selectCases()`, `setSelectedCases()`, `setCaseValues()`) have been extended to handle pseudo-cases as well to simplify use by clients.
