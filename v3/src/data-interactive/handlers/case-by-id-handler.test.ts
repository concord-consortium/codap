import { maybeToV2Id } from "../../utilities/codap-utils"
import { DIGetCaseResult } from "../data-interactive-data-set-types"
import { diCaseByIDHandler } from "./case-by-id-handler"
import { setupForCaseTest } from "../../test/dataset-test-utils"

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

    // as in V2, a top-level case's parent is null rather than missing
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
    expect(handler.update?.({ ...caseResources, collection }, { values: [12] } as any).success).toBe(true)
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
})
