import { maybeToV2Id } from "../../utilities/codap-utils"
import { DIGetCaseResult } from "../data-interactive-types"
import { diCaseByIndexHandler } from "./case-by-index-handler"
import { setupTestDataset } from "./handler-test-utils"

describe("DataInteractive CaseByIndexHandler", () => {
  const handler = diCaseByIndexHandler
  function setup() {
    const { dataset, a3 } = setupTestDataset()
    const aCase = dataset.getCaseAtIndex(4)
    const caseId = aCase!.__id__
    const pseudoCase = Array.from(dataset.pseudoCaseMap.values())[1].pseudoCase
    const pseudoCaseId = pseudoCase.__id__
    return { dataContext: dataset, aCase, caseId, pseudoCase, pseudoCaseId, a3 }
  }

  it("get works as expected", () => {
    const { dataContext, aCase, caseId, pseudoCase, pseudoCaseId } = setup()

    expect(handler.get?.({})?.success).toBe(false)
    expect(handler.get?.({ dataContext })?.success).toBe(false)
    expect(handler.get?.({ caseByIndex: aCase })?.success).toBe(false)

    const caseResult = handler.get?.({ dataContext, caseByIndex: aCase })?.values as DIGetCaseResult
    expect(caseResult.case.id).toBe(maybeToV2Id(caseId))

    const pseudoCaseResult = handler.get?.({ dataContext, caseByIndex: pseudoCase })?.values as DIGetCaseResult
    expect(pseudoCaseResult.case.id).toBe(maybeToV2Id(pseudoCaseId))
  })

  it("update works as expected", () => {
    const { dataContext, aCase, caseId, pseudoCase, pseudoCaseId, a3 } = setup()
    const caseResources = { dataContext, caseByIndex: aCase }

    expect(handler.update?.({}).success).toBe(false)
    expect(handler.update?.({ dataContext }).success).toBe(false)
    expect(handler.update?.(caseResources).success).toBe(false)
    expect(handler.update?.(caseResources, {}).success).toBe(false)

    expect(handler.update?.(caseResources, { values: { a3: 10 } }).success).toBe(true)
    expect(a3.numValues[dataContext.caseIndexFromID(caseId)!]).toBe(10)

    expect(handler.update?.({ dataContext, caseByIndex: pseudoCase }, { values: { a3: 100 } }).success).toBe(true)
    dataContext.pseudoCaseMap.get(pseudoCaseId)?.childItemIds.forEach(id => {
      expect(a3.numValues[dataContext.caseIndexFromID(id)!]).toBe(100)
    })
  })

  it("delete works as expected", () => {
    const { dataContext, aCase, caseId, pseudoCase, pseudoCaseId } = setup()

    expect(handler.delete?.({}).success).toBe(false)
    expect(handler.delete?.({ dataContext }).success).toBe(false)

    expect(dataContext.getCase(caseId)).toBeDefined()
    expect(handler.delete?.({ dataContext, caseByIndex: aCase }).success).toBe(true)
    expect(dataContext.getCase(caseId)).toBeUndefined()

    const childCaseIds = dataContext.pseudoCaseMap.get(pseudoCaseId)!.childItemIds
    childCaseIds.forEach(id => expect(dataContext.getCase(id)).toBeDefined())
    expect(handler.delete?.({ dataContext, caseByIndex: pseudoCase }).success).toBe(true)
    childCaseIds.forEach(id => expect(dataContext.getCase(id)).toBeUndefined())
  })
})
