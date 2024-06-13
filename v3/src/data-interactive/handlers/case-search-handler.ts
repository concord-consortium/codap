import { registerDIHandler } from "../data-interactive-handler"
import { getCaseRequestResultValues } from "../data-interactive-type-utils"
import { DIHandler, DIResources } from "../data-interactive-types"
import { collectionNotFoundResult, couldNotParseQueryResult, dataContextNotFoundResult } from "./di-results"

export const diCaseSearchHandler: DIHandler = {
  get(resources: DIResources) {
    const { collection, dataContext, caseSearch } = resources
    if (!dataContext) return dataContextNotFoundResult
    if (!collection) return collectionNotFoundResult
    if (!caseSearch) return couldNotParseQueryResult

    return {
      success: true,
      values: resources.caseSearch?.map(caseGroup => 
        getCaseRequestResultValues(caseGroup.pseudoCase, dataContext).case)
    }
  }
}

registerDIHandler("caseSearch", diCaseSearchHandler)
