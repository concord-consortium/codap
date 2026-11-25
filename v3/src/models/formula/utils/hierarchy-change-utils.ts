import type { IDataSet } from "../../data/data-set"
import { hashString } from "../../../utilities/js-utils"

export interface ICollectionSnapshot {
  id: string
  attrIds: string[]
  caseIds: string[]
  // An order-invariant hash of each case's visible items (see hashItemSet), parallel to caseIds. A case ID comes
  // from its grouping values alone, so it can be reused for a different set of items. Omitted for the child-most
  // collection, whose case IDs each stand for a single item.
  caseItemHashes?: string[]
}
// parent-most collection first
export type HierarchySnapshot = ICollectionSnapshot[]

export interface IHierarchyFormulaInfo {
  formulaId: string
  // the formula's own attribute
  attrId: string
  // attribute IDs the formula depends on locally
  localAttrDeps: string[]
  hasAggregate: boolean
  // see getAggregateAndOrderSensitivity
  orderSensitive: boolean
}

export interface IAffectedFormula {
  formulaId: string
  // case IDs when only new cases need recalculating
  cases: "ALL_CASES" | string[]
  // see IRecalculateOptions
  forceWrite: boolean
}

interface ICollectionStructure { id: string, attrIds: string[] }

function getCollectionAttrIds(collection: IDataSet["collections"][number]) {
  return collection.attributes.filter(attr => !!attr).map(attr => attr.id)
}

// MurmurHash3's 32-bit finalizer, which spreads every input bit across the output so that structured inputs
// (e.g. IDs differing only in their last character) don't cancel out when combined.
function mix32(hash: number) {
  /* eslint-disable no-bitwise */
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x85ebca6b)
  hash ^= hash >>> 13
  hash = Math.imul(hash, 0xc2b2ae35)
  hash ^= hash >>> 16
  return hash >>> 0
  /* eslint-enable no-bitwise */
}

// An order-invariant hash of a set of item IDs: the count plus the XOR and the sum of the mixed item hashes.
// It is only as strong as the 32-bit per-item hash (mix32 is a bijection), so two IDs that collide in hashString
// could trade places between cases undetected. With random ULID item IDs that is very unlikely.
export function hashItemSet(itemIds: readonly string[]) {
  let xor = 0
  let sum = 0
  itemIds.forEach(itemId => {
    const hash = mix32(hashString(itemId))
    // eslint-disable-next-line no-bitwise
    xor ^= hash
    // eslint-disable-next-line no-bitwise
    sum = (sum + hash) | 0
  })
  return `${itemIds.length}:${xor}:${sum}`
}

// Reads the collections' cases as they currently are, without triggering validation.
export function getHierarchySnapshot(dataSet: IDataSet): HierarchySnapshot {
  return dataSet.collections.map(collection => {
    const caseIds = Array.from(collection.caseIds)
    const caseItemHashes = collection.child
      ? caseIds.map(caseId => hashItemSet(collection.getCaseGroup(caseId)?.childItemIds ?? []))
      : undefined
    return { id: collection.id, attrIds: getCollectionAttrIds(collection), caseIds, caseItemHashes }
  })
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

// Returns the IDs of the cases in both snapshots whose items differ, when both snapshots record them.
function getRegroupedCaseIds(beforeCollection: ICollectionSnapshot, afterCollection: ICollectionSnapshot) {
  const { caseItemHashes: beforeHashes } = beforeCollection
  const { caseIds: afterIds, caseItemHashes: afterHashes } = afterCollection
  if (!beforeHashes || !afterHashes) return []
  const beforeHashMap = new Map(beforeCollection.caseIds.map((id, i) => [id, beforeHashes[i]]))
  return afterIds.filter((id, i) => beforeHashMap.has(id) && beforeHashMap.get(id) !== afterHashes[i])
}

// A collection is changed if it has new cases (including retained case IDs whose items changed), if it lost cases,
// if any retained case changed position, or if the grouping above it changed (`aboveChanged`), since case
// positions are counted within each parent case.
// `disturbed` means the collection changed other than by appending new cases, which matters only to order-sensitive
// formulas. A collection that didn't exist before isn't disturbed by changes above it: all of its cases are new.
function getCollectionChange(
  beforeCollection: ICollectionSnapshot | undefined, afterCollection: ICollectionSnapshot, aboveChanged: boolean
) {
  const beforeIds = beforeCollection?.caseIds ?? []
  const afterIds = afterCollection.caseIds
  const beforeSet = new Set(beforeIds)
  const regroupedIds = new Set(beforeCollection ? getRegroupedCaseIds(beforeCollection, afterCollection) : [])
  const newCaseIds = afterIds.filter(id => !beforeSet.has(id) || regroupedIds.has(id))
  const appendOnly = regroupedIds.size === 0 && beforeIds.every((id, i) => afterIds[i] === id)
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
    // 3. a dependency moved or lives in another, changed collection. An unmoved dependency in the formula's
    // own collection keeps its value for each item, so rule 2 covers that collection's new cases.
    const isChangedElsewhere = (depId: string) => {
      const depCollectionId = afterAttrCollection.get(depId)
      return depCollectionId !== ownCollectionId && isChanged(depCollectionId)
    }
    if (localAttrDeps.some(depId => isMoved(depId) || isChangedElsewhere(depId))) {
      allCases = true
    }
    // 4. aggregate with a collection changed or added below its own. Removing a collection below changes the
    // collection that was below it. If the formula's own collection becomes the child-most one instead, a case
    // keeps its ID only if it had a single item, so the aggregates over it are unchanged.
    if (hasAggregate) {
      const ownIndex = after.findIndex(c => c.id === ownCollectionId)
      if (after.slice(ownIndex + 1).some(c => isChanged(c.id))) allCases = true
    }

    if (allCases) result.push({ formulaId, cases: "ALL_CASES", forceWrite })
    else if (newCaseIds.length > 0) result.push({ formulaId, cases: newCaseIds, forceWrite })
  })
  return result
}
