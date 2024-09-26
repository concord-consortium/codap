import { toV2Id } from "../../utilities/codap-utils"
import { registerDIHandler } from "../data-interactive-handler"
import { getV2ItemResult } from "../data-interactive-type-utils"
import { ICase } from "../../models/data/data-set-types"
import { DIHandler, DIItemSearchNotify, DIResources, DIValues } from "../data-interactive-types"
import { couldNotParseQueryResult, dataContextNotFoundResult, fieldRequiredResult, valuesRequiredResult } from "./di-results"

export const diItemSearchHandler: DIHandler = {
  delete(resources: DIResources) {
    const { dataContext, itemSearch } = resources
    if (!dataContext) return dataContextNotFoundResult
    if (!itemSearch) return couldNotParseQueryResult

    const itemIds = itemSearch.map(aCase => aCase.__id__)
    dataContext.applyModelChange(() => {
      dataContext.removeCases(itemIds)
    })

    return { success: true, values: itemIds.map(itemId => toV2Id(itemId)) }
  },

  get(resources: DIResources) {
    const { dataContext, itemSearch } = resources
    if (!dataContext) return dataContextNotFoundResult
    if (!itemSearch) return couldNotParseQueryResult

    const values = itemSearch.map(aCase => getV2ItemResult(dataContext, aCase.__id__))
    return { success: true, values }
  },

  notify(resources: DIResources, values?: DIValues) {
    const { dataContext, itemSearch } = resources
    if (!dataContext) return dataContextNotFoundResult
    if (!itemSearch) return couldNotParseQueryResult

    if (!values) return valuesRequiredResult
    const { itemOrder } = values as DIItemSearchNotify
    if (!itemOrder) return fieldRequiredResult("Notify", "itemSearch", "itemOrder")

    dataContext.applyModelChange(() => {
      const itemIds = itemSearch.map(({ __id__ }) => __id__)
      if (Array.isArray(itemOrder)) {
        // When itemOrder is an array, move each item to the specified index in order
        // Note that this means later items can impact the position of earlier items
        itemIds.forEach((id, index) => {
          const itemIndex = itemOrder[index]
          const item = dataContext.getItem(id) as ICase
          if (item && itemIndex && isFinite(itemIndex)) {
            dataContext.removeCases([id])
            const before = dataContext.itemIds[itemIndex]
            dataContext.addCases([item], { before })
            dataContext.validateCases()
          }
        })
      } else {
        // Otherwise, move all the items to the beginning or end
        const movingItemIds = new Set(itemIds)
        const before = itemOrder === "first"
          ? dataContext.itemIds.find(id => !movingItemIds.has(id))
          : undefined
        dataContext.moveItems(itemIds, { before })
      }
      dataContext.validateCases()
    })

    return { success: true }
  }
}

registerDIHandler("itemSearch", diItemSearchHandler)
