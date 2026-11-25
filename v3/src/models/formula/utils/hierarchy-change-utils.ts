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

interface ICollectionStructure { id: string, attrIds: string[] }

function getCollectionAttrIds(collection: IDataSet["collections"][number]) {
  return collection.attributes.filter(attr => !!attr).map(attr => attr.id)
}

// Reads the collections' caseIds as they currently are, without triggering validation.
export function getHierarchySnapshot(dataSet: IDataSet): HierarchySnapshot {
  return dataSet.collections.map(collection => ({
    id: collection.id,
    attrIds: getCollectionAttrIds(collection),
    caseIds: Array.from(collection.caseIds)
  }))
}

// Captures collection and attribute membership only, so it is unaffected by case changes or by the order of
// attributes within a collection.
export function getHierarchyStructureKey(structure: ICollectionStructure[]) {
  return JSON.stringify(structure.map(({ id, attrIds }) => [id, [...attrIds].sort()]))
}

// Same as getHierarchyStructureKey(getHierarchySnapshot(dataSet)), without copying the case IDs.
export function getDataSetHierarchyStructureKey(dataSet: IDataSet) {
  return getHierarchyStructureKey(dataSet.collections.map(collection => ({
    id: collection.id,
    attrIds: getCollectionAttrIds(collection)
  })))
}

// A collection is changed if it gained or lost cases, if any retained case changed position, or if the grouping
// above it changed (`aboveChanged`), since case positions are counted within each parent case.
// `disturbed` means cases were removed, retained cases shifted, or the grouping above changed, which matters
// only to formulas whose results depend on case position or on the other cases in the collection.
function getCollectionChange(
  beforeCollection: ICollectionSnapshot | undefined, afterCollection: ICollectionSnapshot, aboveChanged: boolean
) {
  const beforeIds = beforeCollection?.caseIds ?? []
  const afterIds = afterCollection.caseIds
  const beforeSet = new Set(beforeIds)
  const newCaseIds = afterIds.filter(id => !beforeSet.has(id))
  const appendOnly = beforeIds.length <= afterIds.length && beforeIds.every((id, i) => afterIds[i] === id)
  const disturbed = !appendOnly || (aboveChanged && !!beforeCollection)
  return { changed: disturbed || newCaseIds.length > 0, disturbed, newCaseIds }
}

type CollectionChange = ReturnType<typeof getCollectionChange>

// Computes each collection's change, parent-most first. The grouping above a collection changed if any
// ancestor changed or if a collection was added or removed above it.
function getCollectionChanges(before: HierarchySnapshot, after: HierarchySnapshot) {
  const beforeCollections = new Map(before.map(c => [c.id, c]))
  const beforeIndices = new Map(before.map((c, i) => [c.id, i]))
  const changes = new Map<string, CollectionChange>()
  let ancestorChanged = false
  after.forEach((collection, index) => {
    const beforeIndex = beforeIndices.get(collection.id)
    const beforeAbove = beforeIndex != null ? before.slice(0, beforeIndex).map(c => c.id) : []
    const afterAbove = after.slice(0, index).map(c => c.id)
    const aboveListChanged = beforeAbove.length !== afterAbove.length ||
      beforeAbove.some((id, i) => afterAbove[i] !== id)
    const change = getCollectionChange(
      beforeCollections.get(collection.id), collection, ancestorChanged || aboveListChanged
    )
    if (change.changed) ancestorChanged = true
    changes.set(collection.id, change)
  })
  return changes
}

export function getAffectedFormulas(
  before: HierarchySnapshot, after: HierarchySnapshot, formulas: IHierarchyFormulaInfo[]
): IAffectedFormula[] {
  const beforeAttrCollection = new Map<string, string>()
  before.forEach(c => c.attrIds.forEach(attrId => beforeAttrCollection.set(attrId, c.id)))
  const afterAttrCollection = new Map<string, string>()
  after.forEach(c => c.attrIds.forEach(attrId => afterAttrCollection.set(attrId, c.id)))

  const changes = getCollectionChanges(before, after)
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
