import { DataSet } from "../../models/data/data-set"
import { AppHistoryService } from "../../models/history/app-history-service"
import { maybeToV2Id } from "../../utilities/codap-utils"
import { DIGetCaseResult } from "../data-interactive-data-set-types"
import { diCaseByIDHandler } from "./case-by-id-handler"
import { setupForCaseTest, setupTestDataset } from "../../test/dataset-test-utils"

describe("DataInteractive CaseByIDHandler", () => {
  const handler = diCaseByIDHandler

  it("get works as expected", () => {
    const { dataContext, item, itemId, aCase, caseId } = setupForCaseTest()

    expect(handler.get?.({})?.success).toBe(false)
    expect(handler.get?.({ dataContext })?.success).toBe(false)
    expect(handler.get?.({ caseByID: item })?.success).toBe(false)

    const itemResult = handler.get?.({ dataContext, caseByID: item })?.values as DIGetCaseResult
    expect(itemResult.case.id).toBe(maybeToV2Id(itemId))
    expect(itemResult.case.children?.length).toBe(0)

    const caseResult = handler.get?.({ dataContext, caseByID: aCase })?.values as DIGetCaseResult
    expect(caseResult.case.id).toBe(maybeToV2Id(caseId))
    expect(caseResult.case.children?.length).toBe(2)

    // as in V2, a top-level case's parent is null
    const topCase = dataContext.getCasesForCollection(dataContext.collections[0].id)[0]
    const topResult = handler.get?.({ dataContext, caseByID: topCase })?.values as DIGetCaseResult
    expect(topResult.case.parent).toBeNull()
  })

  it("update works as expected", () => {
    const { dataContext, item, itemId, aCase, caseId, a3 } = setupForCaseTest()
    const caseResources = { dataContext, caseByID: item }

    expect(handler.update?.({}).success).toBe(false)
    expect(handler.update?.({ dataContext }).success).toBe(false)
    expect(handler.update?.(caseResources).success).toBe(false)
    expect(handler.update?.(caseResources, {}).success).toBe(false)

    expect(handler.update?.(caseResources, { values: { a3: 10 } }).success).toBe(true)
    expect(a3.numValues[dataContext.getItemIndex(itemId)!]).toBe(10)

    // as in V2, values given as an array are in the order of the collection's attributes
    const collection = dataContext.childCollection
    expect(handler.update?.({ ...caseResources, collection }, { values: [12] }).success).toBe(true)
    expect(a3.numValues[dataContext.getItemIndex(itemId)!]).toBe(12)

    // as in V2, a name that matches no attribute makes the reply report failure, but the other values are set
    expect(handler.update?.(caseResources, { values: { a3: 11, noSuchAttribute: 1 } }).success).toBe(false)
    expect(a3.numValues[dataContext.getItemIndex(itemId)!]).toBe(11)

    expect(handler.update?.({ dataContext, caseByID: aCase }, { values: { a3: 100 } }).success).toBe(true)
    dataContext.caseInfoMap.get(caseId)?.childItemIds.forEach(id => {
      expect(a3.numValues[dataContext.getItemIndex(id)!]).toBe(100)
    })
  })

  it("delete works as expected", () => {
    const { dataContext, item, itemId, aCase, caseId } = setupForCaseTest()

    expect(handler.delete?.({}).success).toBe(false)
    expect(handler.delete?.({ dataContext }).success).toBe(false)

    expect(dataContext.getItem(itemId)).toBeDefined()
    expect(handler.delete?.({ dataContext, caseByID: item }).success).toBe(true)
    expect(dataContext.getItem(itemId)).toBeUndefined()

    const childCaseIds = dataContext.caseInfoMap.get(caseId)!.childItemIds
    childCaseIds.forEach(id => expect(dataContext.getItem(id)).toBeDefined())
    expect(handler.delete?.({ dataContext, caseByID: aCase }).success).toBe(true)
    childCaseIds.forEach(id => expect(dataContext.getItem(id)).toBeUndefined())
  })

  describe("notify with caseOrder moves the case, as in V2", () => {
    // parents a, b; middle cases a-x, a-z, b-y, b-z; child cases by a3: 1, 5 (a-x), 3 (a-z), 2, 6 (b-y), 4 (b-z)
    function setup() {
      const { dataset } = setupTestDataset()
      const [c1, c2, c3] = dataset.collections
      const casesOf = (collectionId: string) => dataset.getCasesForCollection(collectionId)
      const caseIn = (collectionId: string, label: string) =>
        casesOf(collectionId).find(aCase => labelOf(aCase.__id__) === label)!
      const labelOf = (caseId: string) => {
        const collectionId = dataset.caseInfoMap.get(caseId)!.collectionId
        const names = collectionId === c1.id ? ["a1"] : collectionId === c2.id ? ["a1", "a2"] : ["a3"]
        return names.map(name => dataset.getStrValue(caseId, dataset.attrIDFromName(name)!)).join("-")
      }
      const order = (collectionId: string) => casesOf(collectionId).map(({ __id__ }) => labelOf(__id__))
      const notify = (aCase: { __id__: string }, values: any) =>
        handler.notify?.({ dataContext: dataset, caseByID: aCase }, values)
      return { dataset, c1, c2, c3, caseIn, order, notify }
    }

    it("moves a case within its siblings, matching V2", () => {
      const { c1, c2, c3, caseIn, order, notify } = setup()
      expect(order(c3.id)).toEqual(["1", "5", "3", "2", "6", "4"])
      // position 3 is among the case's siblings, so this is where V2 put it too
      expect(notify(caseIn(c3.id, "6"), { caseOrder: 3 })?.success).toBe(true)
      expect(order(c3.id)).toEqual(["1", "5", "3", "6", "2", "4"])
      expect(notify(caseIn(c1.id, "b"), { caseOrder: "first" })?.success).toBe(true)
      expect(order(c1.id)).toEqual(["b", "a"])
      expect(order(c2.id)).toEqual(["b-y", "b-z", "a-x", "a-z"])
    })

    it("clamps a position among another parent's cases to the case's own siblings", () => {
      const { c1, c2, c3, caseIn, order, notify } = setup()
      expect(notify(caseIn(c2.id, "b-z"), { caseOrder: 0 })?.success).toBe(true)
      expect(order(c2.id)).toEqual(["a-x", "a-z", "b-z", "b-y"])
      expect(order(c3.id)).toEqual(["1", "5", "3", "4", "2", "6"])
      expect(notify(caseIn(c2.id, "b-z"), { caseOrder: 99 })?.success).toBe(true)
      expect(order(c2.id)).toEqual(["a-x", "a-z", "b-y", "b-z"])
      // the case that held its parent's first item moves last, and the parent keeps its place
      expect(notify(caseIn(c2.id, "a-x"), { caseOrder: "last" })?.success).toBe(true)
      expect(order(c2.id)).toEqual(["a-z", "a-x", "b-y", "b-z"])
      expect(order(c1.id)).toEqual(["a", "b"])
      // "last" for the last parent's cases, and for a top-level case
      expect(notify(caseIn(c2.id, "b-y"), { caseOrder: "last" })?.success).toBe(true)
      expect(order(c2.id)).toEqual(["a-z", "a-x", "b-z", "b-y"])
      expect(notify(caseIn(c1.id, "a"), { caseOrder: "last" })?.success).toBe(true)
      expect(order(c1.id)).toEqual(["b", "a"])
    })

    it("drops a fractional position's fraction", () => {
      const { c2, caseIn, order, notify } = setup()
      expect(notify(caseIn(c2.id, "a-z"), { caseOrder: 0.6 })?.success).toBe(true)
      expect(order(c2.id)).toEqual(["a-z", "a-x", "b-y", "b-z"])
    })

    it("puts a case first among its siblings for a position just before them", () => {
      const { dataset, c2, caseIn, order, notify } = setup()
      dataset.addCases([{ a1: "b", a2: "w", a3: 7, a4: -7 }], { canonicalize: true })
      expect(order(c2.id)).toEqual(["a-x", "a-z", "b-y", "b-z", "b-w"])
      expect(notify(caseIn(c2.id, "b-w"), { caseOrder: 1 })?.success).toBe(true)
      expect(order(c2.id)).toEqual(["a-x", "a-z", "b-w", "b-y", "b-z"])
    })

    // parent p (top level), middle c, child d; by default items I0 { A, 1 }, I1 { B, 9 }, I2 { A, 2 }, I3 { A, 1 }
    function setupWithHiddenItem(hiddenIndex: number, middleValues = [1, 9, 2, 1]) {
      const dataset = DataSet.create({ name: "data", collections: [{ name: "P" }, { name: "C" }, { name: "D" }] },
        { historyService: new AppHistoryService() })
      const [P, C] = dataset.collections
      dataset.addAttribute({ name: "p" }, { collection: P.id })
      dataset.addAttribute({ name: "c" }, { collection: C.id })
      dataset.addAttribute({ name: "d" })
      dataset.addCases(["A", "B", "A", "A"].map((p, d) => ({ p, c: middleValues[d], d })), { canonicalize: true })
      dataset.hideCasesOrItems([dataset.itemIds[hiddenIndex]])
      const label = (caseId: string) => ["p", "c"]
        .map(name => dataset.getStrValue(caseId, dataset.attrIDFromName(name)!)).filter(v => v).join("")
      const order = (collectionId: string) => dataset.getCasesForCollection(collectionId)
        .map(({ __id__ }) => collectionId === P.id ? label(__id__).slice(0, 1) : label(__id__))
      const caseIn = (text: string) => dataset.getCasesForCollection(C.id).find(c => label(c.__id__) === text)!
      const notify = (aCase: { __id__: string }, values: any) =>
        handler.notify?.({ dataContext: dataset, caseByID: aCase }, values)
      return { P, C, order, caseIn, notify }
    }

    it("moves a case whose sibling has a hidden item, and the parent keeps its place", () => {
      // I3, a later item of A-1, is hidden
      const { P, C, order, caseIn, notify } = setupWithHiddenItem(3)
      expect(order(P.id)).toEqual(["A", "B"])
      expect(order(C.id)).toEqual(["A1", "A2", "B9"])
      expect(notify(caseIn("A2"), { caseOrder: "first" })?.success).toBe(true)
      expect(order(C.id)).toEqual(["A2", "A1", "B9"])
      expect(order(P.id)).toEqual(["A", "B"])
    })

    it("moves a case whose own hidden item comes first, and the parent keeps its place", () => {
      // items I0 { A, 1 }, I1 { B, 9 }, I2 { A, 2 } hidden, I3 { A, 2 }
      const { P, C, order, caseIn, notify } = setupWithHiddenItem(2, [1, 9, 2, 2])
      expect(order(P.id)).toEqual(["A", "B"])
      expect(order(C.id)).toEqual(["A1", "A2", "B9"])
      expect(notify(caseIn("A2"), { caseOrder: "first" })?.success).toBe(true)
      expect(order(C.id)).toEqual(["A2", "A1", "B9"])
      expect(order(P.id)).toEqual(["A", "B"])
    })

    it("refuses a move no item order can show without reordering other cases", () => {
      // I0, A-1's first item and A's first item, is hidden, so A comes after B while shown, and before B once I0 is
      // shown again. A-2 first under A would put A's first shown item first among A's, which puts A ahead of B.
      const { P, C, order, caseIn, notify } = setupWithHiddenItem(0)
      expect(order(P.id)).toEqual(["B", "A"])
      expect(order(C.id)).toEqual(["B9", "A1", "A2"])
      expect(notify(caseIn("A2"), { caseOrder: "first" })).toEqual({ success: false, values: {
        error: "The case can't move there without changing the order of other cases " +
          "(set-aside or filtered-out cases are in the way)"
      } })
      expect(order(P.id)).toEqual(["B", "A"])
      expect(order(C.id)).toEqual(["B9", "A1", "A2"])
    })

    // a data set with one collection per attribute name, items given as values in order
    function setupLevels(names: string[], items: Array<Array<string | number>>, hiddenIndices: number[]) {
      const dataset = DataSet.create({ name: "data", collections: names.map(name => ({ name: name.toUpperCase() })) },
        { historyService: new AppHistoryService() })
      names.forEach((name, i) => dataset.addAttribute({ name }, { collection: dataset.collections[i].id }))
      dataset.addCases(items.map(values => Object.fromEntries(names.map((name, i) => [name, values[i]]))),
        { canonicalize: true })
      dataset.hideCasesOrItems(hiddenIndices.map(index => dataset.itemIds[index]))
      const valuesOf = (level: number) => dataset.getCasesForCollection(dataset.collections[level].id)
        .map(({ __id__ }) => dataset.getStrValue(__id__, dataset.attrIDFromName(names[level])!))
      const caseIn = (level: number, value: string) => dataset.getCasesForCollection(dataset.collections[level].id)
        .find(({ __id__ }) => dataset.getStrValue(__id__, dataset.attrIDFromName(names[level])!) === value)!
      const notify = (aCase: { __id__: string }, values: any) =>
        handler.notify?.({ dataContext: dataset, caseByID: aCase }, values)
      return { dataset, valuesOf, caseIn, notify }
    }

    it("keeps an unmoved case's items in order, so restoring a set-aside item doesn't reorder its cases", () => {
      // items { A, 1 } { A, 2 } { A, 3 } { B, 9 }, with { A, 2 } set aside
      const two = setupLevels(["p", "c"], [["A", 1], ["A", 2], ["A", 3], ["B", 9]], [1])
      expect(two.notify(two.caseIn(0, "B"), { caseOrder: "first" })?.success).toBe(true)
      two.dataset.showHiddenCasesAndItems()
      expect(two.valuesOf(1)).toEqual(["9", "1", "2", "3"])

      // A-1's grandchildren 1, 2 (set aside) and 3, and A-2's 4
      const three = setupLevels(["p", "c", "d"], [["A", 1, 1], ["A", 1, 2], ["A", 1, 3], ["A", 2, 4]], [1])
      expect(three.notify(three.caseIn(1, "2"), { caseOrder: "first" })?.success).toBe(true)
      three.dataset.showHiddenCasesAndItems()
      expect(three.valuesOf(2)).toEqual(["4", "1", "2", "3"])
    })

    it("puts a top-level case moved first ahead of a set-aside case before it, as itemSearch does", () => {
      // items h, a, b, with h set aside
      const flat = setupLevels(["p"], [["h"], ["a"], ["b"]], [0])
      expect(flat.notify(flat.caseIn(0, "b"), { caseOrder: "first" })?.success).toBe(true)
      expect(flat.valuesOf(0)).toEqual(["b", "a"])
      flat.dataset.showHiddenCasesAndItems()
      expect(flat.valuesOf(0)).toEqual(["b", "h", "a"])
    })

    it("keeps a wholly set-aside case in place among the cases that don't move", () => {
      // items a, h (set aside), b, c
      const first = setupLevels(["p"], [["a"], ["h"], ["b"], ["c"]], [1])
      expect(first.notify(first.caseIn(0, "c"), { caseOrder: "first" })?.success).toBe(true)
      first.dataset.showHiddenCasesAndItems()
      expect(first.valuesOf(0)).toEqual(["c", "a", "h", "b"])

      const last = setupLevels(["p"], [["a"], ["h"], ["b"], ["c"]], [1])
      expect(last.notify(last.caseIn(0, "a"), { caseOrder: "last" })?.success).toBe(true)
      last.dataset.showHiddenCasesAndItems()
      expect(last.valuesOf(0)).toEqual(["h", "b", "c", "a"])

      // A's children 1, 7 (set aside), 2, 3
      const child = setupLevels(["p", "c"], [["A", 1], ["A", 7], ["A", 2], ["A", 3]], [1])
      expect(child.notify(child.caseIn(1, "3"), { caseOrder: "first" })?.success).toBe(true)
      child.dataset.showHiddenCasesAndItems()
      expect(child.valuesOf(1)).toEqual(["3", "1", "7", "2"])
    })

    it("keeps a filtered-out case in place among the cases that don't move", () => {
      const { dataset, valuesOf, caseIn, notify } =
        setupLevels(["p", "c"], [["A", 1], ["A", 7], ["A", 2], ["A", 3]], [])
      const filter = (filteredOut: boolean) => {
        dataset.updateFilterFormulaResults(dataset.items.map(({ __id__ }) => ({
          itemId: __id__, result: !(filteredOut && dataset.getStrValue(__id__, dataset.attrIDFromName("c")!) === "7")
        })), { replaceAll: true })
        dataset.invalidateCases()
      }
      filter(true)
      expect(valuesOf(1)).toEqual(["1", "2", "3"])
      expect(notify(caseIn(1, "3"), { caseOrder: "first" })?.success).toBe(true)
      filter(false)
      expect(valuesOf(1)).toEqual(["3", "1", "7", "2"])
    })

    it("keeps a top-level case moved first ahead of a case whose set-aside item came first", () => {
      // items { A, 1 } (set aside), { A, 2 }, { B, 9 }
      const { dataset, valuesOf, caseIn, notify } = setupLevels(["p", "c"], [["A", 1], ["A", 2], ["B", 9]], [0])
      expect(notify(caseIn(0, "B"), { caseOrder: "first" })?.success).toBe(true)
      expect(valuesOf(0)).toEqual(["B", "A"])
      dataset.showHiddenCasesAndItems()
      expect(valuesOf(0)).toEqual(["B", "A"])
      expect(valuesOf(1)).toEqual(["9", "1", "2"])
    })

    it("keeps each item's values with it", () => {
      const { dataset, c2, caseIn, notify } = setup()
      notify(caseIn(c2.id, "a-x"), { caseOrder: "last" })
      const [a1, a2, a3] = ["a1", "a2", "a3"].map(name => dataset.attrIDFromName(name)!)
      // a's items keep their places (first, third, fifth), refilled with a-z's item, then a-x's
      expect(dataset.items.map(({ __id__ }) => [a1, a2, a3].map(id => dataset.getStrValue(__id__, id)).join("")))
        .toEqual(["az3", "by2", "ax1", "bz4", "ax5", "by6"])
    })

    it("fails without a valid caseOrder", () => {
      const { c3, caseIn, order, notify } = setup()
      const aCase = caseIn(c3.id, "6")
      expect(notify(aCase, undefined)).toEqual(
        { success: false, values: { error: "notify caseByID: values required" } })
      expect(notify(aCase, {})).toEqual(
        { success: false, values: { error: "notify caseByID: values.caseOrder required" } })
      ;["middle", "", " ", true, false, null, [], Infinity, NaN].forEach(caseOrder => {
        expect(notify(aCase, { caseOrder })?.success).toBe(false)
      })
      // a number given as text is a position
      expect(notify(aCase, { caseOrder: "3" })?.success).toBe(true)
      expect(order(c3.id)).toEqual(["1", "5", "3", "6", "2", "4"])
      expect(notify(aCase, { caseOrder: 4 })?.success).toBe(true)
      expect(handler.notify?.({ caseByID: aCase }, { caseOrder: "first" })?.success).toBe(false)
      expect(order(c3.id)).toEqual(["1", "5", "3", "2", "6", "4"])
    })
  })
})
