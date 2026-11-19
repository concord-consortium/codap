import { IDataSet } from "../../models/data/data-set"
import { ICase } from "../../models/data/data-set-types"

// CODAP builds cases from item order (collection.ts, updateCaseGroups): top-level cases are ordered by their first
// shown item, and the child cases of a parent by their first item, shown or not. Once every item is shown again,
// every case is ordered by its first item. These are the orders a move must keep, by collection level and parent.
interface ICaseOrders {
  // the shown cases under each parent ("" for the top level)
  shown: Map<string, string[]>
  // every case under each parent, in the order it takes once every item is shown again
  restored: Map<string, string[]>
}

function orderKey(level: number, parentId?: string) {
  return `${level}:${parentId ?? ""}`
}

export function getCaseOrders(dataSet: IDataSet, itemIds: readonly string[]): ICaseOrders {
  const shown = new Map<string, string[]>()
  const restored = new Map<string, string[]>()
  const seen = new Set<string>()
  const seenShown = new Set<string>()
  const hasShownItem = new Set<string>()
  const push = (map: Map<string, string[]>, key: string, caseId: string) => {
    const list = map.get(key)
    if (list) list.push(caseId)
    else map.set(key, [caseId])
  }
  itemIds.forEach(itemId => {
    const isHidden = dataSet.isItemHidden(itemId)
    dataSet.getItemCaseIds(itemId).forEach((caseId, level, caseIds) => {
      const key = orderKey(level, caseIds[level - 1])
      if (!seen.has(caseId)) {
        seen.add(caseId)
        push(restored, key, caseId)
      }
      if (!isHidden) {
        hasShownItem.add(caseId)
        if (level === 0 && !seenShown.has(caseId)) {
          seenShown.add(caseId)
          push(shown, key, caseId)
        }
      }
    })
  })
  // child cases are ordered by their first item, shown or not
  restored.forEach((caseIds, key) => {
    if (!key.startsWith("0:")) {
      const shownCaseIds = caseIds.filter(caseId => hasShownItem.has(caseId))
      if (shownCaseIds.length) shown.set(key, shownCaseIds)
    }
  })
  return { shown, restored }
}

function sameList(a: readonly string[] = [], b: readonly string[] = []) {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

// Plans moving `aCase` (at collection `level`, under `parentId`) to `siblingIndex` among `siblings`, its other
// shown siblings in their current order. The result keeps these promises: the case lands at that place among its
// shown siblings and nothing else shown changes order; every other case, at every level, keeps its order relative to
// the other cases once every item is shown again; every case but the moved case's ancestors keeps its own items'
// order; and every ancestor keeps its place.
// Algorithm: the case's items move as one block within its siblings' items (refilled into the places they held for
// a child case). Candidate places are the sibling boundaries between the previous and next shown siblings, the
// preferred one first (the very start for the first place, the very end for the last, else just before the next
// shown sibling, as `notify itemSearch` places items), then the others, nearest first. Each candidate is checked
// with the case-order model; each check costs O(n · levels). Returns undefined when none passes within kMaxTries.
const kMaxTries = 50

export function planCaseMove(dataSet: IDataSet, aCase: ICase, level: number, parentId: string | undefined,
                             siblings: ICase[], siblingIndex: number) {
  const oldItemIds = Array.from(dataSet._itemIds)
  const caseIdAt = (itemId: string, caseLevel: number) => dataSet.getItemCaseIds(itemId)[caseLevel]
  const caseId = aCase.__id__
  const isMoved = (itemId: string) => caseIdAt(itemId, level) === caseId
  const movedItemIds = oldItemIds.filter(isMoved)
  const firstItemIndex = (list: string[], siblingId: string, shownOnly = false) =>
    list.findIndex(itemId => caseIdAt(itemId, level) === siblingId && !(shownOnly && dataSet.isItemHidden(itemId)))
  const insert = (list: string[], position: number) =>
    [...list.slice(0, position), ...movedItemIds, ...list.slice(position)]

  // The block can go anywhere from just after the previous shown sibling to just before the next one: a top-level
  // case is placed by its first shown item, and a child case by its first item.
  const parentLevel = level - 1
  const slots: number[] = []
  if (level > 0) {
    oldItemIds.forEach((itemId, index) => {
      if (caseIdAt(itemId, parentLevel) === parentId) slots.push(index)
    })
  }
  const rest = (level === 0 ? oldItemIds : slots.map(slot => oldItemIds[slot])).filter(itemId => !isMoved(itemId))
  const previous = siblings[siblingIndex - 1]
  const next = siblings[siblingIndex]
  const lowest = previous ? firstItemIndex(rest, previous.__id__, level === 0) + 1 : 0
  const highest = next ? firstItemIndex(rest, next.__id__, level === 0) : rest.length
  const preferred = !previous ? lowest : !next ? highest
    : Math.max(lowest, level === 0 ? firstItemIndex(rest, next.__id__) : highest)

  // the item orders to try for a position
  const build = (position: number) => {
    if (level === 0) return [insert(rest, position)]
    const parentItemIds = insert(rest, position)
    const newItemIds = oldItemIds.slice()
    slots.forEach((slot, index) => { newItemIds[slot] = parentItemIds[index] })

    // Refilling keeps the set of places each ancestor's items hold, so an ancestor ordered by its first item keeps
    // its place. Only the top-level case above is ordered by its first shown item, which the refill can move. Try
    // the refill as it is, which often passes no other top-level case, and then with the items between the old and
    // new first shown item reordered so the top-level case's come first (or last), keeping every other order.
    const topCaseId = caseIdAt(movedItemIds[0], 0)
    const isTop = (itemId: string) => caseIdAt(itemId, 0) === topCaseId
    const firstShown = (list: string[]) => list.findIndex(itemId => isTop(itemId) && !dataSet.isItemHidden(itemId))
    const oldFirst = firstShown(oldItemIds)
    const newFirst = firstShown(newItemIds)
    if (oldFirst < 0 || newFirst < 0 || oldFirst === newFirst) return [newItemIds]
    const [start, end] = oldFirst < newFirst ? [oldFirst, newFirst] : [newFirst, oldFirst]
    const segment = newItemIds.slice(start, end + 1)
    const topItemIds = segment.filter(isTop)
    const otherItemIds = segment.filter(itemId => !isTop(itemId))
    const keptInPlace = newItemIds.slice()
    keptInPlace.splice(start, segment.length,
      ...(oldFirst < newFirst ? [...topItemIds, ...otherItemIds] : [...otherItemIds, ...topItemIds]))
    return [newItemIds, keptInPlace]
  }

  // check every promise above against the orders CODAP will build
  const before = getCaseOrders(dataSet, oldItemIds)
  const movedKey = orderKey(level, parentId)
  const isShown = !!dataSet.caseInfoMap.get(caseId)?.childItemIds.length
  const expectedShown = isShown
    ? [...siblings.slice(0, siblingIndex), aCase, ...siblings.slice(siblingIndex)].map(({ __id__ }) => __id__)
    : before.shown.get(movedKey)
  const withoutMoved = (list?: string[]) => list?.filter(id => id !== caseId)
  const isValid = (newItemIds: string[]) => {
    const after = getCaseOrders(dataSet, newItemIds)
    const keys = new Set([...before.shown.keys(), ...after.shown.keys(), ...before.restored.keys(),
                          ...after.restored.keys()])
    return Array.from(keys).every(key =>
      sameList(after.shown.get(key), key === movedKey ? expectedShown : before.shown.get(key)) &&
      sameList(withoutMoved(after.restored.get(key)), withoutMoved(before.restored.get(key))))
  }

  // the preferred place first, then the other sibling boundaries, nearest first
  const levelOf = (index: number) => rest[index] ? caseIdAt(rest[index], level) : undefined
  const positions: number[] = []
  for (let position = lowest; position <= highest; ++position) {
    if (position === lowest || position === highest || position === preferred ||
        levelOf(position - 1) !== levelOf(position)) {
      positions.push(position)
    }
  }
  positions.sort((a, b) => Math.abs(a - preferred) - Math.abs(b - preferred))
  for (const position of positions.slice(0, kMaxTries)) {
    const newItemIds = build(position).find(isValid)
    if (newItemIds) return newItemIds
  }
}
