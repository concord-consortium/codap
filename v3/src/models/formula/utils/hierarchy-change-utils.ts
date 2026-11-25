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
  // true if the formula uses caseIndex or an aggregate/semi-aggregate function
  orderSensitive: boolean
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
// `disturbed` means cases were removed or retained cases shifted, which matters only to formulas whose
// results depend on case position or on the other cases in the collection.
function getCollectionChange(beforeCollection: ICollectionSnapshot | undefined, afterCollection: ICollectionSnapshot) {
  const beforeIds = beforeCollection?.caseIds ?? []
  const afterIds = afterCollection.caseIds
  const beforeSet = new Set(beforeIds)
  const newCaseIds = afterIds.filter(id => !beforeSet.has(id))
  const appendOnly = beforeIds.length <= afterIds.length && beforeIds.every((id, i) => afterIds[i] === id)
  const disturbed = !appendOnly
  return { changed: disturbed || newCaseIds.length > 0, disturbed, newCaseIds }
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
  formulas.forEach(({ formulaId, attrId, localAttrDeps, hasAggregate, orderSensitive }) => {
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
    if (ownChange?.changed) {
      if (orderSensitive && ownChange.disturbed) {
        allCases = true
        forceWrite = true
      } else if (ownChange.newCaseIds.length > 0) {
        newCaseIds = ownChange.newCaseIds
        forceWrite = true
      }
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
