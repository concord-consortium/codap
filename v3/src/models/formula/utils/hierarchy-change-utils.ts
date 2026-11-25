import type { IDataSet } from "../../data/data-set"

export interface ICollectionSnapshot { id: string, attrIds: string[], caseIds: string[] }
// parent-most collection first
export type HierarchySnapshot = ICollectionSnapshot[]

export interface IHierarchyFormulaInfo {
  formulaId: string
  // the formula's own attribute
  attrId: string
  // attribute IDs the formula depends on locally
  localAttrDeps: string[]
  hasAggregate: boolean
}

export interface IAffectedFormula {
  formulaId: string
  // case IDs when only new cases need recalculating
  cases: "ALL_CASES" | string[]
  // true when results must be written even if they match the first item's stored value
  forceWrite: boolean
}

// Reads the collections' caseIds as they currently are, without triggering validation.
export function getHierarchySnapshot(dataSet: IDataSet): HierarchySnapshot {
  return dataSet.collections.map(collection => ({
    id: collection.id,
    attrIds: collection.attributes.filter(attr => !!attr).map(attr => attr.id),
    caseIds: Array.from(collection.caseIds)
  }))
}

// Captures collection and attribute membership only, so it is unaffected by case changes.
export function getHierarchyStructureKey(snapshot: HierarchySnapshot) {
  return JSON.stringify(snapshot.map(({ id, attrIds }) => [id, attrIds]))
}

// A collection is changed if it gained or lost cases, or if any retained case changed position.
// Only when cases were appended after all existing ones (no removals, no shifts) can the work be
// limited to the new cases; any other change affects position-dependent results of retained cases.
function getCollectionChange(beforeCollection: ICollectionSnapshot | undefined, afterCollection: ICollectionSnapshot) {
  const beforeIds = beforeCollection?.caseIds ?? []
  const afterIds = afterCollection.caseIds
  const appendOnly = beforeIds.length <= afterIds.length && beforeIds.every((id, i) => afterIds[i] === id)
  const newCaseIds = appendOnly ? afterIds.slice(beforeIds.length) : []
  const changed = !appendOnly || newCaseIds.length > 0
  return { changed, appendOnly, newCaseIds }
}

export function getAffectedFormulas(
  before: HierarchySnapshot, after: HierarchySnapshot, formulas: IHierarchyFormulaInfo[]
): IAffectedFormula[] {
  const beforeCollections = new Map(before.map(c => [c.id, c]))
  const beforeAttrCollection = new Map<string, string>()
  before.forEach(c => c.attrIds.forEach(attrId => beforeAttrCollection.set(attrId, c.id)))
  const afterAttrCollection = new Map<string, string>()
  after.forEach(c => c.attrIds.forEach(attrId => afterAttrCollection.set(attrId, c.id)))

  const changes = new Map(after.map(c => [c.id, getCollectionChange(beforeCollections.get(c.id), c)]))
  const isChanged = (collectionId?: string) => {
    const change = collectionId ? changes.get(collectionId) : undefined
    return !!change?.changed
  }
  const isMoved = (attrId: string) => {
    const beforeId = beforeAttrCollection.get(attrId)
    const afterId = afterAttrCollection.get(attrId)
    return beforeId != null && afterId != null && beforeId !== afterId
  }

  const result: IAffectedFormula[] = []
  formulas.forEach(({ formulaId, attrId, localAttrDeps, hasAggregate }) => {
    const ownCollectionId = afterAttrCollection.get(attrId)
    if (!ownCollectionId) return

    let allCases = false
    let newCaseIds: string[] = []
    let forceWrite = false

    // 1. the formula's own attribute moved
    if (isMoved(attrId)) {
      allCases = true
      forceWrite = true
    }
    // 2. the formula's collection changed
    const ownChange = changes.get(ownCollectionId)
    if (ownChange && isChanged(ownCollectionId)) {
      forceWrite = true
      if (ownChange.appendOnly) newCaseIds = ownChange.newCaseIds
      else allCases = true
    }
    // 3. a dependency moved or lives in a changed collection
    if (localAttrDeps.some(depId => isMoved(depId) || isChanged(afterAttrCollection.get(depId)))) {
      allCases = true
    }
    // 4. aggregate with a collection changed, added or removed below its own
    if (hasAggregate) {
      const ownIndex = after.findIndex(c => c.id === ownCollectionId)
      const changedBelow = after.slice(ownIndex + 1).some(c => isChanged(c.id))
      const beforeOwnIndex = before.findIndex(c => c.id === ownCollectionId)
      const removedBelow = beforeOwnIndex >= 0 &&
        before.slice(beforeOwnIndex + 1).some(c => !changes.has(c.id))
      if (changedBelow || removedBelow) allCases = true
    }

    if (allCases) result.push({ formulaId, cases: "ALL_CASES", forceWrite })
    else if (newCaseIds.length > 0) result.push({ formulaId, cases: newCaseIds, forceWrite })
  })
  return result
}
