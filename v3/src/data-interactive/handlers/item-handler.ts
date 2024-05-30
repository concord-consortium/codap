import { toV2Id } from "../../utilities/codap-utils"
import { registerDIHandler } from "../data-interactive-handler"
import { DICaseValues, DIHandler, DIResources, DIValues } from "../data-interactive-types"
import { attrNamesToIds, getCaseValues } from "../data-interactive-utils"
import { updateCaseBy, updateCasesBy } from "./case-by-handler-functions"
import { dataContextNotFoundResult, itemNotFoundResult, valuesRequiredResult } from "./di-results"

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

  delete(resources: DIResources) {
    const { dataContext, item } = resources
    if (!dataContext) return dataContextNotFoundResult
    if (!item) return itemNotFoundResult

    dataContext.applyModelChange(() => {
      dataContext.removeCases([item.__id__])
    })

    return { success: true, values: [toV2Id(item.__id__)] }
  },

  get(resources: DIResources) {
    const { dataContext, item } = resources
    if (!dataContext) return dataContextNotFoundResult
    if (!item) return itemNotFoundResult

    return { success: true, values: {
      id: toV2Id(item.__id__),
      values: getCaseValues(item.__id__, dataContext)
    }}
  },

  update(resources: DIResources, values?: DIValues) {
    const { item } = resources

    if (item) {
      return updateCaseBy(resources, values, item, { resourceName: "item" })
    } else {
      return updateCasesBy(resources, values, true)
    }
  }
}

registerDIHandler("item", diItemHandler)
