import { maybeToV2Id } from "../../utilities/codap-utils"
import { DIGetCaseResult } from "../data-interactive-types"
import { diCaseByIDHandler } from "./case-by-id-handler"
import { setupTestDataset } from "./handler-test-utils"

describe("DataInteractive CaseByIDHandler", () => {
  const handler = diCaseByIDHandler
  function setup() {
    const { dataset } = setupTestDataset()
    dataset.collectionGroups
    const aCase = dataset.getCaseAtIndex(4)
    const caseId = aCase?.__id__
    const pseudoCase = Array.from(dataset.pseudoCaseMap.values())[0].pseudoCase
    const pseudoCaseId = pseudoCase.__id__
    return { dataContext: dataset, aCase, caseId, pseudoCase, pseudoCaseId }
  }

  it("get works as expected", () => {
    const { dataContext, aCase, caseId, pseudoCase, pseudoCaseId } = setup()
    expect(handler.get?.({})?.success).toBe(false)
    expect(handler.get?.({ dataContext })?.success).toBe(false)
    expect(handler.get?.({ caseByID: aCase })?.success).toBe(false)

    const caseResult = handler.get?.({ dataContext, caseByID: aCase })?.values as DIGetCaseResult
    expect(caseResult.case.id).toBe(maybeToV2Id(caseId))

    const pseudoCaseResult = handler.get?.({ dataContext, caseByID: pseudoCase })?.values as DIGetCaseResult
    expect(pseudoCaseResult.case.id).toBe(maybeToV2Id(pseudoCaseId))
  })
})