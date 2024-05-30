import { registerDIHandler } from "../data-interactive-handler"
import { getV2ItemResult } from "../data-interactive-type-utils"
import { DIHandler, DIResources, diNotImplementedYet } from "../data-interactive-types"
import { couldNotParseQueryResult, dataContextNotFoundResult } from "./di-results"

export const diItemSearchHandler: DIHandler = {
  delete: diNotImplementedYet,

  get(resources: DIResources) {
    const { dataContext, itemSearch } = resources
    if (!dataContext) return dataContextNotFoundResult
    if (!itemSearch) return couldNotParseQueryResult

    const values = itemSearch?.map(aCase => getV2ItemResult(dataContext, aCase.__id__))
    return { success: true, values }
  }
}

registerDIHandler("itemSearch", diItemSearchHandler)
