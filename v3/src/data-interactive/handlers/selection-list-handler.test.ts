import { DataSet, IDataSet } from "../../models/data/data-set"
import { AppHistoryService } from "../../models/history/app-history-service"
import { setupTestDataset } from "../../test/dataset-test-utils"
import { toV2Id } from "../../utilities/codap-utils"
import { DISelectionExpression, DIValues } from "../data-interactive-types"
import { DICase } from "../data-interactive-data-set-types"
import { diSelectionListHandler } from "./selection-list-handler"

describe("DataInteractive SelectionListHandler", () => {
  const handler = diSelectionListHandler

  let dataset: IDataSet
  const caseId1 = "case1"
  const caseId2 = "case2"
  const caseIdUnused = "unused"
  beforeEach(function() {
    dataset = DataSet.create({ name: "data" }, {historyService: new AppHistoryService()})
    dataset.addCases([{ __id__: caseId1 }, { __id__: caseId2 }])
    dataset.validateCases()
  })

  const selection = () => Array.from(dataset.selection)
  const create = (caseIds: string[]) => handler.create?.({ dataContext: dataset }, caseIds)
  const update = (caseIds: string[]) => handler.update?.({ dataContext: dataset }, caseIds)

  it("get works as expected", () => {
    const result0 = handler.get?.({ dataContext: dataset })
    expect((result0?.values as DICase[]).length).toBe(0)

    dataset.setSelectedCases([caseId1])
    const result = handler.get?.({ dataContext: dataset })
    const caseId = toV2Id(dataset.itemIdChildCaseMap.get(caseId1)!.groupedCase.__id__)
    expect(result?.values && Array.isArray(result.values) &&
      (result.values as DICase[]).map(c => c.caseID).includes(caseId)).toBe(true)
  })

  it("create works as expected", () => {
    expect(selection().length).toBe(0)
    expect(create([caseId1])?.success).toBe(true)
    expect(selection().length).toBe(1)
    expect(dataset.selection.has(caseId1)).toBe(true)

    // Unused case ids are ignored and empty lists clear selection
    expect(create([caseIdUnused])?.success).toBe(true)
    expect(selection().length).toBe(0)

    // Illegal values fail
    expect(handler.create?.({ dataContext: dataset }, caseId1 as DIValues).success).toBe(false)
  })

  it("update works as expected", () => {
    dataset.setSelectedCases([caseId1])

    expect(selection().length).toBe(1)
    expect(update([caseId2])?.success).toBe(true)
    expect(selection().length).toBe(2)
    expect(dataset.selection.has(caseId1)).toBe(true)
    expect(dataset.selection.has(caseId2)).toBe(true)

    // Illegal values fail
    expect(handler.update?.({ dataContext: dataset }, caseId1 as DIValues).success).toBe(false)
  })

  describe("expression-based selection", () => {
    // Test dataset: 6 cases across 3 collections
    // collection1 (attribute a1): 2 groups ("a", "b")
    // collection2 (attribute a2): 4 groups (a/x, a/z, b/y, b/z)
    // collection3 (attributes a3, a4): the childmost collection, 6 leaf cases — a3 values: 1, 2, 3, 4, 5, 6
    let ds: IDataSet

    beforeEach(() => {
      const result = setupTestDataset()
      ds = result.dataset
    })

    const createExpr = (expr: DISelectionExpression) =>
      handler.create?.({ dataContext: ds }, expr as unknown as DIValues)
    const updateExpr = (expr: DISelectionExpression) =>
      handler.update?.({ dataContext: ds }, expr as unknown as DIValues)

    it("selects cases with a simple numeric expression", () => {
      // a3 values: 1, 2, 3, 4, 5, 6, so four cases have a3 > 2
      const result = createExpr({ expression: "a3 > 2", collection: "collection3" })
      expect(result?.success).toBe(true)
      expect(ds.selection.size).toBe(4)
    })

    it("selects cases with a string equality expression", () => {
      // a1 values: a, b, a, b, a, b, so three cases have a1 == "b"
      const result = createExpr({ expression: 'a1 == "b"', collection: "collection3" })
      expect(result?.success).toBe(true)
      expect(ds.selection.size).toBe(3)
    })

    it("selects cases with a compound expression", () => {
      // a3 values: 1, 2, 3, 4, 5, 6, so two cases have a3 > 1 && a3 < 4
      const result = createExpr({ expression: "a3 > 1 and a3 < 4", collection: "collection3" })
      expect(result?.success).toBe(true)
      expect(ds.selection.size).toBe(2)
    })

    it("selects cases with a statistical expression", () => {
      // a3 values: 1, 2, 3, 4, 5, 6, mean(a3) = 3.5, so three cases have a3 > mean(a3)
      const result = createExpr({ expression: "a3 > mean(a3)", collection: "collection3" })
      expect(result?.success).toBe(true)
      expect(ds.selection.size).toBe(3)
    })

    it("extends selection with update and expression", () => {
      // First select case with a3 == 1.
      const items = ds.items
      const firstItemId = items[0].__id__
      ds.setSelectedCases([firstItemId])
      expect(ds.selection.size).toBe(1)

      // Update/extend with expression: a3 > 4 (one case has a3 = 5, one has a3 = 6).
      const result = updateExpr({ expression: "a3 > 4", collection: "collection3" })
      expect(result?.success).toBe(true)
      // Original selection (1 item) + expression matches (2 items) = 3
      expect(ds.selection.size).toBe(3)
      expect(ds.selection.has(firstItemId)).toBe(true)
    })

    it("returns success with empty selection when no cases match", () => {
      const result = createExpr({ expression: "a3 > 9999", collection: "collection3" })
      expect(result?.success).toBe(true)
      expect(ds.selection.size).toBe(0)
    })

    it("selects all cases with 'true' expression", () => {
      const result = createExpr({ expression: "true", collection: "collection3" })
      expect(result?.success).toBe(true)
      expect(ds.selection.size).toBe(6)
    })

    it("returns error for invalid expression", () => {
      const result = createExpr({ expression: "invalid %%% formula", collection: "collection3" })
      expect(result?.success).toBe(false)
    })

    it("defaults to childmost collection when collection is omitted", () => {
      // childmost is collection3 with 6 cases; a3 > 2 matches 4 of the cases
      const result = createExpr({ expression: "a3 > 2" })
      expect(result?.success).toBe(true)
      expect(ds.selection.size).toBe(4)
    })

    it("returns error for invalid collection name", () => {
      const result = createExpr({ expression: "a3 > 2", collection: "nonexistent" })
      expect(result?.success).toBe(false)
      expect((result as any)?.values?.error).toContain("Collection not found: nonexistent")
    })

    it("backwards compatibility: array-of-IDs still works", () => {
      const itemId = ds.items[0].__id__
      const result = handler.create?.({ dataContext: ds }, [itemId])
      expect(result?.success).toBe(true)
      expect(ds.selection.size).toBe(1)
      expect(ds.selection.has(itemId)).toBe(true)
    })

    it("returns success with empty selection for empty dataset", () => {
      const emptyDs = DataSet.create({ name: "empty" }, { historyService: new AppHistoryService() })
      emptyDs.validateCases()
      const result = handler.create?.(
        { dataContext: emptyDs },
        { expression: "true" } as unknown as DIValues
      )
      expect(result?.success).toBe(true)
      expect(emptyDs.selection.size).toBe(0)
    })

    it("selects child items when expression targets parent collection", () => {
      // collection1 has 2 groups: a1="a" (items 0,2,4) and a1="b" (items 1,3,5)
      // "true" at collection1 level selects both groups, so all 6 child items are selected
      const result = createExpr({ expression: "true", collection: "collection1" })
      expect(result?.success).toBe(true)
      expect(ds.selection.size).toBe(6)

      // Select only the a1="a" group at collection1 level, so 3 child items
      const result2 = createExpr({ expression: 'a1 == "a"', collection: "collection1" })
      expect(result2?.success).toBe(true)
      expect(ds.selection.size).toBe(3)
    })

    it("returns error when dataContext is missing", () => {
      const result = handler.create?.(
        {},
        { expression: "a3 > 2" } as unknown as DIValues
      )
      expect(result?.success).toBe(false)
    })
  })
})
