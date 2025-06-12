import { maybeToV2Id } from "../../utilities/codap-utils"
import { DIGetCaseResult } from "../data-interactive-data-set-types"
import { diCaseByIndexHandler } from "./case-by-index-handler"
import { setupForCaseTest } from "../../test/dataset-test-utils"

describe("DataInteractive CaseByIndexHandler", () => {
  const handler = diCaseByIndexHandler

  it("get works as expected", () => {
    const { dataContext, item, itemId, aCase, caseId } = setupForCaseTest()

    expect(handler.get?.({})?.success).toBe(false)
    expect(handler.get?.({ dataContext })?.success).toBe(false)
    expect(handler.get?.({ caseByIndex: item })?.success).toBe(false)

    const caseResult = handler.get?.({ dataContext, caseByIndex: item })?.values as DIGetCaseResult
    expect(caseResult.case.id).toBe(maybeToV2Id(itemId))

    const pseudoCaseResult = handler.get?.({ dataContext, caseByIndex: aCase })?.values as DIGetCaseResult
    expect(pseudoCaseResult.case.id).toBe(maybeToV2Id(caseId))
  })

  it("update works as expected", () => {
    const { dataContext, item, itemId, aCase, caseId, a3 } = setupForCaseTest()
    const caseResources = { dataContext, caseByIndex: item }

    expect(handler.update?.({}).success).toBe(false)
    expect(handler.update?.({ dataContext }).success).toBe(false)
    expect(handler.update?.(caseResources).success).toBe(false)
    expect(handler.update?.(caseResources, {}).success).toBe(false)

    expect(handler.update?.(caseResources, { values: { a3: 10 } }).success).toBe(true)
    expect(a3.numValues[dataContext.getItemIndex(itemId)!]).toBe(10)

    expect(handler.update?.({ dataContext, caseByIndex: aCase }, { values: { a3: 100 } }).success).toBe(true)
    dataContext.caseInfoMap.get(caseId)?.childItemIds.forEach(id => {
      expect(a3.numValues[dataContext.getItemIndex(id)!]).toBe(100)
    })
  })

  it("delete works as expected", () => {
    const { dataContext, item, itemId, aCase, caseId } = setupForCaseTest()

    expect(handler.delete?.({}).success).toBe(false)
    expect(handler.delete?.({ dataContext }).success).toBe(false)

    expect(dataContext.getItem(itemId)).toBeDefined()
    expect(handler.delete?.({ dataContext, caseByIndex: item }).success).toBe(true)
    expect(dataContext.getItem(itemId)).toBeUndefined()

    const childCaseIds = dataContext.caseInfoMap.get(caseId)!.childItemIds
    childCaseIds.forEach(id => expect(dataContext.getItem(id)).toBeDefined())
    expect(handler.delete?.({ dataContext, caseByIndex: aCase }).success).toBe(true)
    childCaseIds.forEach(id => expect(dataContext.getItem(id)).toBeUndefined())
  })
})
