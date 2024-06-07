import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources } from "../data-interactive-types"
import { dataContextNotFoundResult } from "./di-results"

export const diItemCountHandler: DIHandler = {
  get(resources: DIResources) {
    const { dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult

    return { success: true, values: dataContext.items.length }
  }
}

registerDIHandler("itemCount", diItemCountHandler)
