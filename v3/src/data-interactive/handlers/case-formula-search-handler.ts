import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources } from "../data-interactive-types"
import { getCaseRequestResultValues } from "../data-interactive-type-utils"
import { collectionNotFoundResult, couldNotParseQueryResult, dataContextNotFoundResult } from "./di-results"

export const diCaseFormulaSearchHandler: DIHandler = {
  get(resources: DIResources) {
    const { caseFormulaSearch, collection, dataContext, error } = resources
    if (!collection) return collectionNotFoundResult
    if (!dataContext) return dataContextNotFoundResult
    if (error) return { success: false, error }
    if (!caseFormulaSearch) return couldNotParseQueryResult

    return {
      success: true,
      values: caseFormulaSearch?.map(aCase => 
        getCaseRequestResultValues(aCase, dataContext).case)
    }
  }
}

registerDIHandler("caseFormulaSearch", diCaseFormulaSearchHandler)
