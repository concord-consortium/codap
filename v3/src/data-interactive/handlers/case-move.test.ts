import { getSnapshot } from "mobx-state-tree"
import { DataSet, IDataSet } from "../../models/data/data-set"
import { AppHistoryService } from "../../models/history/app-history-service"
import { diCaseByIDHandler } from "./case-by-id-handler"
import { getCaseOrders } from "./case-move-utils"

// Moving a case with `notify caseByID` and `caseOrder`, checked against the orders CODAP itself builds.

const kNames = ["p", "c", "d", "e"]

interface ITestItem {
  values: string[]
  setAside?: boolean
  filteredOut?: boolean
}

function createDataSet(levels: number, items: ITestItem[]) {
  const names = kNames.slice(0, levels)
  const dataSet = DataSet.create({ name: "data", collections: names.map(name => ({ name: name.toUpperCase() })) },
    { historyService: new AppHistoryService() })
  names.forEach((name, i) => dataSet.addAttribute({ name }, { collection: dataSet.collections[i].id }))
  dataSet.addCases(items.map(({ values }) => Object.fromEntries(names.map((name, i) => [name, values[i]]))),
    { canonicalize: true })
  // _itemIds lists every item, shown or not
  const itemIds = Array.from(dataSet._itemIds)
  dataSet.hideCasesOrItems(items.flatMap((item, i) => item.setAside ? [itemIds[i]] : []))
  filterOut(dataSet, items.flatMap((item, i) => item.filteredOut ? [itemIds[i]] : []))
  return dataSet
}

function filterOut(dataSet: IDataSet, itemIds: string[]) {
  dataSet.updateFilterFormulaResults(dataSet._itemIds.map(itemId => ({ itemId, result: !itemIds.includes(itemId) })),
    { replaceAll: true })
  dataSet.invalidateCases()
  dataSet.validateCases()
}

function restoreAll(dataSet: IDataSet) {
  dataSet.showHiddenCasesAndItems()
  filterOut(dataSet, [])
}

// A case's label is its values from the top level down, so it names the same case in a copy of the data set. The
// childmost collection has a case for each item, so its labels also name the item (a copy keeps item ids).
function label(dataSet: IDataSet, caseId: string) {
  const info = dataSet.caseInfoMap.get(caseId)!
  const level = dataSet.getCollectionIndex(info.collectionId)
  const itemId = info.childItemIds[0] ?? info.hiddenChildItemIds[0]
  const values = kNames.slice(0, level + 1).map(name => dataSet.getStrValue(itemId, dataSet.attrIDFromName(name)!))
  return values.join("/") + (level === dataSet.collections.length - 1 ? `#${itemId}` : "")
}

// the label without the item, as the examples below give it
const valuesOf = (caseLabel: string) => caseLabel.split("#")[0]

// the shown cases of each collection, grouped by parent, as labels
function shownOrders(dataSet: IDataSet) {
  const orders: Record<string, string[]> = {}
  dataSet.collections.forEach((collection, level) => {
    dataSet.getCasesForCollection(collection.id).forEach(({ __id__ }) => {
      const parentId = dataSet.getParentCaseId(__id__)
      const key = `${level}:${parentId ? label(dataSet, parentId) : ""}`
      ;(orders[key] ??= []).push(label(dataSet, __id__))
    })
  })
  return orders
}

// each case's items, by case label
function caseItemOrders(dataSet: IDataSet) {
  const orders: Record<string, string[]> = {}
  dataSet._itemIds.forEach(itemId => {
    dataSet.getItemCaseIds(itemId).forEach(caseId => { (orders[label(dataSet, caseId)] ??= []).push(itemId) })
  })
  return orders
}

function copyAndRestore(dataSet: IDataSet) {
  // attribute values are only included in the snapshot when it's prepared
  dataSet.prepareSnapshot()
  const snapshot = getSnapshot(dataSet)
  dataSet.completeSnapshot()
  const copy = DataSet.create(snapshot, { historyService: new AppHistoryService() })
  copy.validateCases()
  restoreAll(copy)
  return copy
}

function move(dataSet: IDataSet, caseLabel: string, caseOrder: unknown) {
  dataSet.validateCases()
  const caseId = Array.from(dataSet.caseInfoMap.keys()).find(id => label(dataSet, id) === caseLabel)!
  return diCaseByIDHandler.notify?.({ dataContext: dataSet, caseByID: { __id__: caseId } }, { caseOrder })
}

function shownValues(dataSet: IDataSet, level: number) {
  return dataSet.getCasesForCollection(dataSet.collections[level].id).map(({ __id__ }) => label(dataSet, __id__))
}

// the examples name cases by their values alone, which is unique in each of them
function moveByValues(dataSet: IDataSet, caseValues: string, caseOrder: unknown) {
  dataSet.validateCases()
  const caseLabel = Array.from(dataSet.caseInfoMap.keys()).map(id => label(dataSet, id))
    .find(l => valuesOf(l) === caseValues)!
  return move(dataSet, caseLabel, caseOrder)
}

describe("moving a case with notify caseByID", () => {
  // `values` lists each item's values from the top level down
  const items = (rows: Array<[string, ...Array<string | number>]>) =>
    rows.map(([flags, ...values]) => ({
      values: values.map(String), setAside: flags.includes("s"), filteredOut: flags.includes("f")
    }))

  it.each([
    // [levels, items (flags: s = set aside, f = filtered out), case, caseOrder, shown after, all after restoring]
    [1, items([["", "a"], ["s", "h"], ["", "b"], ["", "c"]]), "b", "first", "b a c", "b a h c"],
    [1, items([["", "a"], ["s", "h"], ["", "b"], ["", "c"]]), "b", "last", "a c b", "a h c b"],
    [1, items([["s", "h"], ["", "a"], ["", "b"]]), "a", "last", "b a", "h b a"],
    [1, items([["s", "h"], ["", "a"], ["", "b"]]), "b", "first", "b a", "b h a"],
    [1, items([["", "a"], ["", "b"], ["s", "h"]]), "b", "first", "b a", "b a h"],
    [1, items([["", "a"], ["s", "h"], ["", "b"], ["", "c"]]), "c", "first", "c a b", "c a h b"],
    [1, items([["", "a"], ["s", "h"], ["", "b"], ["", "c"]]), "a", "last", "b c a", "h b c a"],
    [2, items([["", "C", 1], ["", "B", 3], ["f", "A", 2]]), "B", "first", "B C", "B C A"],
    [2, items([["", "A", 1], ["s", "A", 2], ["", "A", 3], ["f", "A", 4], ["", "A", 5]]), "A/5", "first",
      "A/5 A/1 A/3", "A/5 A/1 A/2 A/3 A/4"],
    [2, items([["", "A", 1], ["s", "A", 7], ["", "A", 2], ["", "A", 3]]), "A/3", "first",
      "A/3 A/1 A/2", "A/3 A/1 A/7 A/2"],
    // a case that owns an item ahead of every shown item under its parent can move
    [3, items([["s", "A", 2, "h"], ["", "A", 1, "s"], ["", "A", 2, "s"]]), "A/1", "first", "A/1 A/2", "A/1 A/2"],
    [3, items([["s", "A", 1, "h"], ["", "A", 2, "s"], ["", "A", 1, "s"]]), "A/1", "last", "A/2 A/1", "A/2 A/1"]
  ])("%#: moves the case and keeps every other case in order", (levels, testItems, caseLabel, caseOrder,
                                                                shownAfter, restoredAfter) => {
    const dataSet = createDataSet(levels, testItems)
    const level = (caseLabel).split("/").length - 1
    expect(moveByValues(dataSet, caseLabel, caseOrder)?.success).toBe(true)
    expect(shownValues(dataSet, level).map(valuesOf).join(" ")).toBe(shownAfter)
    restoreAll(dataSet)
    expect(shownValues(dataSet, level).map(valuesOf).join(" ")).toBe(restoredAfter)
  })

  it.each([
    // a case's own items, and so its children, keep their order
    [items([["", "A", 3, "x"], ["s", "A", 1, "h"], ["", "A", 1, "s"]]), "A/3", "last", "A/1/h A/1/s A/3/x"],
    [items([["", "A", 1, "a"], ["s", "A", 2, "c"], ["", "A", 2, "b"], ["", "A", 2, "d"]]), "A/2", "first",
      "A/2/c A/2/b A/2/d A/1/a"]
  ])("%#: keeps the moved case's own items in order", (testItems, caseLabel, caseOrder, restoredAfter) => {
    const dataSet = createDataSet(3, testItems)
    expect(moveByValues(dataSet, caseLabel, caseOrder)?.success).toBe(true)
    restoreAll(dataSet)
    expect(shownValues(dataSet, 2).map(valuesOf).join(" ")).toBe(restoredAfter)
  })

  it("doesn't change the item order when the case is already in place", () => {
    const dataSet = createDataSet(2, items([["", "A", 1], ["", "B", 9], ["", "A", 2]]))
    const itemIds = Array.from(dataSet._itemIds)
    expect(moveByValues(dataSet, "A/1", "first")?.success).toBe(true)
    expect(moveByValues(dataSet, "B", 1)?.success).toBe(true)
    expect(Array.from(dataSet._itemIds)).toEqual(itemIds)
  })

  // A deterministic pseudo-random generator (Park-Miller), so every run checks the same cases
  function random(seed: number) {
    let state = seed % 2147483647 || 1
    const next = () => {
      state = (state * 16807) % 2147483647
      return (state - 1) / 2147483646
    }
    const pick = <T>(list: T[]) => list[Math.floor(next() * list.length)]
    return { next, pick }
  }

  function randomItems(rand: ReturnType<typeof random>, levels: number, count: number): ITestItem[] {
    const alphabets = [["A", "B", "C"], ["1", "2", "3"], ["x", "y"], ["m", "n"]]
    return Array.from({ length: count }, () => ({
      values: alphabets.slice(0, levels).map(alphabet => rand.pick(alphabet)),
      setAside: rand.next() < 0.2,
      filteredOut: rand.next() < 0.15
    }))
  }

  // the shown and restored orders the case-order model predicts, by labels, as shownOrders gives them
  function predictedOrders(dataSet: IDataSet, itemIds: readonly string[]) {
    const { shown, restored } = getCaseOrders(dataSet, itemIds)
    const byLabels = (orders: Map<string, string[]>) => Object.fromEntries(Array.from(orders.entries()).map(
      ([key, caseIds]) => {
        const [level, parentId] = key.split(":")
        return [`${level}:${parentId ? label(dataSet, parentId) : ""}`, caseIds.map(id => label(dataSet, id))]
      }))
    return { shown: byLabels(shown), restored: byLabels(restored) }
  }

  it("predicts the orders CODAP builds, for random item orders", () => {
    for (let seed = 1; seed <= 150; ++seed) {
      const rand = random(seed)
      const levels = 1 + Math.floor(rand.next() * 4)
      const dataSet = createDataSet(levels, randomItems(rand, levels, 2 + Math.floor(rand.next() * 15)))
      const itemIds = Array.from(dataSet._itemIds)
      for (let i = itemIds.length - 1; i > 0; --i) {
        const j = Math.floor(rand.next() * (i + 1))
        ;[itemIds[i], itemIds[j]] = [itemIds[j], itemIds[i]]
      }
      const predicted = predictedOrders(dataSet, itemIds)
      dataSet.setItemOrder(itemIds)
      dataSet.invalidateCases()
      dataSet.validateCases()
      expect({ seed, orders: shownOrders(dataSet) }).toEqual({ seed, orders: predicted.shown })
      restoreAll(dataSet)
      expect({ seed, orders: shownOrders(dataSet) }).toEqual({ seed, orders: predicted.restored })
    }
  })

  // whether any item order keeps every promise, by trying them all (for a few items only)
  function isPossible(dataSet: IDataSet, movedId: string, level: number, parentId: string | undefined,
                      siblingIndex: number) {
    const itemIds = Array.from(dataSet._itemIds)
    const key = `${level}:${parentId ?? ""}`
    const before = getCaseOrders(dataSet, itemIds)
    const siblings = (before.shown.get(key) ?? []).filter(id => id !== movedId)
    const expected = [...siblings.slice(0, siblingIndex), movedId, ...siblings.slice(siblingIndex)]
    const ancestors = new Set(dataSet.getItemCaseIds(
      itemIds.find(id => dataSet.getItemCaseIds(id)[level] === movedId)!).slice(0, level))
    const ownOrders = (order: string[]) => JSON.stringify(Array.from(dataSet.caseInfoMap.keys())
      .filter(caseId => !ancestors.has(caseId))
      .map(caseId => order.filter(itemId => dataSet.getItemCaseIds(itemId).includes(caseId))))
    const ownBefore = ownOrders(itemIds)
    const same = (a: string[] = [], b: string[] = []) => a.join() === b.join()
    const without = (list?: string[]) => list?.filter(id => id !== movedId)
    const keeps = (order: string[]) => {
      const after = getCaseOrders(dataSet, order)
      const keys = new Set([...before.shown.keys(), ...after.shown.keys(), ...before.restored.keys()])
      return Array.from(keys).every(k => same(after.shown.get(k), k === key ? expected : before.shown.get(k)) &&
        same(without(after.restored.get(k)), without(before.restored.get(k)))) && ownOrders(order) === ownBefore
    }
    const tryOrders = (prefix: string[], rest: string[]): boolean => rest.length === 0
      ? keeps(prefix)
      : rest.some((itemId, i) => tryOrders([...prefix, itemId], [...rest.slice(0, i), ...rest.slice(i + 1)]))
    return tryOrders([], itemIds)
  }

  const kSeeds = 400
  it(`keeps every promise for ${kSeeds} random hierarchies and moves`, () => {
    let moved = 0, inPlace = 0, refused = 0
    // let checkedRefusals = 0
    for (let seed = 1; seed <= kSeeds; ++seed) {
      const rand = random(seed)
      const levels = 1 + Math.floor(rand.next() * 4)
      const testItems = randomItems(rand, levels, 3 + Math.floor(rand.next() * 14))
      const dataSet = createDataSet(levels, testItems)
      const shownCases = dataSet.collections.flatMap(collection => dataSet.getCasesForCollection(collection.id))
      if (!shownCases.length) continue
      const movedLabel = label(dataSet, rand.pick(shownCases).__id__)
      const movedId = Array.from(dataSet.caseInfoMap.keys()).find(id => label(dataSet, id) === movedLabel)!
      const level = valuesOf(movedLabel).split("/").length - 1
      const others = shownValues(dataSet, level).filter(l => l !== movedLabel)

      const shownBefore = shownOrders(dataSet)
      const itemIdsBefore = Array.from(dataSet._itemIds)
      const restoredBefore = copyAndRestore(dataSet)
      const restoredOrdersBefore = shownOrders(restoredBefore)
      const caseItemsBefore = caseItemOrders(restoredBefore)

      // where a caseOrder puts the case among its shown siblings
      const parentId = dataSet.getParentCaseId(movedId)
      const ancestorLabels: string[] = []
      for (let id = parentId; id; id = dataSet.getParentCaseId(id)) ancestorLabels.push(label(dataSet, id))
      const parentKey = `${level}:${parentId ? label(dataSet, parentId) : ""}`
      const siblings = shownBefore[parentKey].filter(l => l !== movedLabel)
      const firstSiblingIndex = siblings.length ? others.indexOf(siblings[0]) : 0
      const siblingIndexFor = (order: unknown) => {
        const position = order === "first" ? 0 : order === "last" ? others.length : Number(order)
        return Math.min(Math.max(Math.trunc(position) - firstSiblingIndex, 0), siblings.length)
      }
      // aim for a place the case isn't already in, when there is one
      const currentIndex = shownBefore[parentKey].indexOf(movedLabel)
      const randomOrder = () => rand.pick<unknown>(["first", "last",
        firstSiblingIndex + Math.floor(rand.next() * (siblings.length + 3)) - 1,
        firstSiblingIndex + rand.next() * (siblings.length + 1)])
      let caseOrder = randomOrder()
      for (let tries = 0; tries < 5 && siblingIndexFor(caseOrder) === currentIndex; ++tries) caseOrder = randomOrder()
      const siblingIndex = siblingIndexFor(caseOrder)
      const expectedShown = { ...shownBefore,
        [parentKey]: [...siblings.slice(0, siblingIndex), movedLabel, ...siblings.slice(siblingIndex)] }
      const isInPlace = currentIndex === siblingIndex

      const context = `seed ${seed}: ${movedLabel} to ${String(caseOrder)}`
      const isMoved = !!move(dataSet, movedLabel, caseOrder)?.success
      // a refused move, or one to where the case already is, changes nothing
      const itemIdsAfter = Array.from(dataSet._itemIds)
      expect({ context, itemIds: itemIdsAfter })
        .toEqual({ context, itemIds: isMoved && !isInPlace ? itemIdsAfter : itemIdsBefore })
      // a refused move is one no item order can make, checked by trying them all where there are few
      const canCheck = !isMoved && itemIdsBefore.length <= 7
      expect({ context, possible: canCheck && isPossible(dataSet, movedId, level, parentId, siblingIndex) })
        .toEqual({ context, possible: false })
      if (!isMoved) {
        ++refused
        // if (canCheck) ++checkedRefusals
        continue
      }
      if (isInPlace) ++inPlace
      else ++moved
      // the case is where it was asked to go, and every other shown case keeps its order
      expect({ context, orders: shownOrders(dataSet) }).toEqual({ context, orders: expectedShown })
      // once every item is shown again, every other case keeps its order, and every case its items' order
      restoreAll(dataSet)
      const withoutMoved = (orders: Record<string, string[]>) =>
        Object.fromEntries(Object.entries(orders).map(([key, labels]) => [key, labels.filter(l => l !== movedLabel)]))
      expect({ context, orders: withoutMoved(shownOrders(dataSet)) })
        .toEqual({ context, orders: withoutMoved(restoredOrdersBefore) })
      // (the moved case's ancestors' items change order, as its own move among them)
      const withoutAncestors = (orders: Record<string, string[]>) =>
        Object.fromEntries(Object.entries(orders).filter(([caseLabel]) => !ancestorLabels.includes(caseLabel)))
      expect({ context, items: withoutAncestors(caseItemOrders(dataSet)) })
        .toEqual({ context, items: withoutAncestors(caseItemsBefore) })
    }
    // console.log(`case-move property test: ${moved} moved, ${inPlace} already in place, ` +
    //            `${refused} refused (${checkedRefusals} proven impossible by trying every order)`)
    // each kind of outcome is exercised, and few moves are refused
    expect(moved).toBeGreaterThan(kSeeds / 2)
    expect(inPlace).toBeGreaterThan(0)
    expect(refused).toBeLessThan(kSeeds / 20)
  })

  it("refuses only moves no item order can make", () => {
    // small hierarchies with many set-aside items, so some moves are impossible, each checked by trying every order
    let refused = 0
    for (let seed = 1; seed <= 600; ++seed) {
      const rand = random(seed)
      // three levels, moving a middle case, whose hidden items can come first under its parent
      const levels = 3
      // two values per level, so cases share parents and hidden items often come first
      const testItems = Array.from({ length: 4 + Math.floor(rand.next() * 4) }, () => ({
        values: [["A", "B"], ["1", "2"], ["x", "y"]].slice(0, levels).map(values => rand.pick(values)),
        setAside: rand.next() < 0.35
      }))
      const dataSet = createDataSet(levels, testItems)
      const shownCases = dataSet.getCasesForCollection(dataSet.collections[1].id)
      if (!shownCases.length) continue
      const movedId = rand.pick(Array.from(shownCases)).__id__
      const level = dataSet.getCollectionIndex(dataSet.caseInfoMap.get(movedId)!.collectionId)
      const parentId = dataSet.getParentCaseId(movedId)
      const siblingIds = dataSet.getCasesForCollection(dataSet.collections[level].id)
        .filter(({ __id__ }) => dataSet.getParentCaseId(__id__) === parentId).map(({ __id__ }) => __id__)
      const siblingCount = siblingIds.length
      // move it first unless it is first already
      const caseOrder = siblingIds[0] === movedId ? "last" : "first"
      const itemIdsBefore = Array.from(dataSet._itemIds)
      const result = diCaseByIDHandler.notify?.({ dataContext: dataSet, caseByID: { __id__: movedId } }, { caseOrder })
      const isRefused = !result?.success
      if (isRefused) ++refused
      const siblingIndex = caseOrder === "first" ? 0 : siblingCount - 1
      expect({ seed, impossible: isRefused && !isPossible(dataSet, movedId, level, parentId, siblingIndex) })
        .toEqual({ seed, impossible: isRefused })
      expect({ seed, unchanged: isRefused && Array.from(dataSet._itemIds).join() === itemIdsBefore.join() })
        .toEqual({ seed, unchanged: isRefused })
    }
    // console.log(`case-move refusals: ${refused} refused, each proven impossible by trying every order`)
    expect(refused).toBeGreaterThan(0)
  })

  it("refuses an impossible move among many items quickly", () => {
    // A-0's own set-aside item comes first under B-1, so B-1 can't be moved last without reordering other cases
    const rows: Array<[string, ...string[]]> = [["", "A2", "B0", "z"], ["s", "A0", "B1", "z"], ["", "A1", "B1", "z"],
      ["", "A0", "B1", "y"]]
    for (let k = 0; k < 2000; ++k) rows.push(["", "A0", "B2", `k${k}`])
    const dataSet = createDataSet(3, items(rows))
    const start = performance.now()
    const result = moveByValues(dataSet, "A0/B1", "last")
    const elapsed = performance.now() - start
    // console.log(`case-move timing: refusing a move among 2,004 items took ${Math.round(elapsed)} ms`)
    expect(result?.success).toBe(false)
    // trying every place took seconds here; trying only sibling boundaries takes tens of milliseconds
    expect(elapsed).toBeLessThan(3000)
  })

  it("moves a case among 5,000 items", () => {
    const testItems: ITestItem[] = Array.from({ length: 5000 }, (_, i) => ({
      values: [`P${i % 50}`, `${i % 7}`, `${i}`], setAside: i % 13 === 0, filteredOut: i % 17 === 0
    }))
    const dataSet = createDataSet(3, testItems)
    // const start = performance.now()
    expect(moveByValues(dataSet, "P49/6", "first")?.success).toBe(true)
    expect(moveByValues(dataSet, "P3", "last")?.success).toBe(true)
    // console.log(`case-move timing: two moves among 5,000 items took ${Math.round(performance.now() - start)} ms`)
  })
})
