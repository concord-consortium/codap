import { DataSet, IDataSet } from "../../models/data/data-set"
import { AppHistoryService } from "../../models/history/app-history-service"
import { toV2Id } from "../../utilities/codap-utils"
import { DICase, DIValues } from "../data-interactive-types"
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
})
