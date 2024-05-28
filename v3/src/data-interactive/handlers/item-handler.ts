import { registerDIHandler } from "../data-interactive-handler"
import { DICaseValues, DIHandler, DIResources, DIValues, diNotImplementedYet } from "../data-interactive-types"
import { attrNamesToIds } from "../data-interactive-utils"
import { dataContextNotFoundResult, valuesRequiredResult } from "./di-results"

export const diItemHandler: DIHandler = {
  create(resources: DIResources, values?: DIValues) {
    const { dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult
    if (!values) return valuesRequiredResult

    const items = (Array.isArray(values) ? values : [values]) as DICaseValues[]
    const itemIDs = dataContext.addCases(items.map(item => attrNamesToIds(item, dataContext)))
    return {
      success: true,
      // caseIDs, // TODO This should include all cases created, both grouped and ungrouped
      itemIDs
    }
  },
  delete: diNotImplementedYet,
  get: diNotImplementedYet,
  update: diNotImplementedYet
}

registerDIHandler("item", diItemHandler)
