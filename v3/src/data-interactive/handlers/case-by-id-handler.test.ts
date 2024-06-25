import { maybeToV2Id } from "../../utilities/codap-utils"
import { DIGetCaseResult } from "../data-interactive-types"
import { diCaseByIDHandler } from "./case-by-id-handler"
import { setupTestDataset } from "./handler-test-utils"

describe("DataInteractive CaseByIDHandler", () => {
  const handler = diCaseByIDHandler
  function setup() {
    const { dataset, a3 } = setupTestDataset()
    const item = dataset.getItemAtIndex(4)!
    const itemId = item.__id__
    const aCase = Array.from(dataset.caseGroupMap.values())[1].groupedCase
    const caseId = aCase.__id__
    return { dataContext: dataset, item, itemId, aCase, caseId, a3 }
  }

  it("get works as expected", () => {
    const { dataContext, item, itemId, aCase, caseId } = setup()

    expect(handler.get?.({})?.success).toBe(false)
    expect(handler.get?.({ dataContext })?.success).toBe(false)
    expect(handler.get?.({ caseByID: item })?.success).toBe(false)

    const itemResult = handler.get?.({ dataContext, caseByID: item })?.values as DIGetCaseResult
    expect(itemResult.case.id).toBe(maybeToV2Id(itemId))
    expect(itemResult.case.children?.length).toBe(0)

    const caseResult = handler.get?.({ dataContext, caseByID: aCase })?.values as DIGetCaseResult
    expect(caseResult.case.id).toBe(maybeToV2Id(caseId))
    expect(caseResult.case.children?.length).toBe(2)
  })

  it("update works as expected", () => {
    const { dataContext, item, itemId, aCase, caseId, a3 } = setup()
    const caseResources = { dataContext, caseByID: item }

    expect(handler.update?.({}).success).toBe(false)
    expect(handler.update?.({ dataContext }).success).toBe(false)
    expect(handler.update?.(caseResources).success).toBe(false)
    expect(handler.update?.(caseResources, {}).success).toBe(false)

    expect(handler.update?.(caseResources, { values: { a3: 10 } }).success).toBe(true)
    expect(a3.numValues[dataContext.caseIndexFromID(itemId)!]).toBe(10)

    expect(handler.update?.({ dataContext, caseByID: aCase }, { values: { a3: 100 } }).success).toBe(true)
    dataContext.caseGroupMap.get(caseId)?.childItemIds.forEach(id => {
      expect(a3.numValues[dataContext.caseIndexFromID(id)!]).toBe(100)
    })
  })

  it("delete works as expected", () => {
    const { dataContext, item, itemId, aCase, caseId } = setup()

    expect(handler.delete?.({}).success).toBe(false)
    expect(handler.delete?.({ dataContext }).success).toBe(false)

    expect(dataContext.getItem(itemId)).toBeDefined()
    expect(handler.delete?.({ dataContext, caseByID: item }).success).toBe(true)
    expect(dataContext.getItem(itemId)).toBeUndefined()

    const childCaseIds = dataContext.caseGroupMap.get(caseId)!.childItemIds
    childCaseIds.forEach(id => expect(dataContext.getItem(id)).toBeDefined())
    expect(handler.delete?.({ dataContext, caseByID: aCase }).success).toBe(true)
    childCaseIds.forEach(id => expect(dataContext.getItem(id)).toBeUndefined())
  })
})
