import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources } from "../data-interactive-types"
import { collectionNotFoundResult, dataContextNotFoundResult } from "./di-results"

export const diCaseCountHandler: DIHandler = {
  get(resources: DIResources) {
    const { collection, dataContext } = resources
    if (!collection) return collectionNotFoundResult
    if (!dataContext) return dataContextNotFoundResult

    return {
      success: true,
      values: dataContext.getCasesForCollection(collection.id).length
    }
  }
}

registerDIHandler("caseCount", diCaseCountHandler)
