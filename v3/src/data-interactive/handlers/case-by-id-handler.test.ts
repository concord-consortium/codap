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

    it("puts a case's shown items ahead of its hidden ones, so the parent keeps its place", () => {
      // items I0 { A, 1 }, I1 { B, 9 }, I2 { A, 2 } hidden, I3 { A, 2 }
      const { P, C, order, caseIn, notify } = setupWithHiddenItem(2, [1, 9, 2, 2])
      expect(order(P.id)).toEqual(["A", "B"])
      expect(order(C.id)).toEqual(["A1", "A2", "B9"])
      expect(notify(caseIn("A2"), { caseOrder: "first" })?.success).toBe(true)
      expect(order(C.id)).toEqual(["A2", "A1", "B9"])
      expect(order(P.id)).toEqual(["A", "B"])
    })

    it("leaves a hidden item ahead of the parent's first shown item in place, so the parent keeps its place", () => {
      // I0, A-1's first item and A's first item, is hidden, so A comes after B
      const { P, C, order, caseIn, notify } = setupWithHiddenItem(0)
      expect(order(P.id)).toEqual(["B", "A"])
      expect(order(C.id)).toEqual(["B9", "A1", "A2"])
      expect(notify(caseIn("A2"), { caseOrder: "first" })?.success).toBe(true)
      expect(order(P.id)).toEqual(["B", "A"])
      // A-1's hidden item still comes first, so A-1 stays ahead of A-2
      expect(order(C.id)).toEqual(["B9", "A1", "A2"])
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
      expect(notify(aCase, undefined)?.success).toBe(false)
      expect(notify(aCase, {})?.success).toBe(false)
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
