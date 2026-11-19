import { moveCasesNotification } from "../../models/data/data-set-notifications"
import { toV2Id } from "../../utilities/codap-utils"
import { registerDIHandler } from "../data-interactive-handler"
import { getV2ItemResult } from "../data-interactive-type-utils"
import { DIHandler, DIItemSearchNotify, DIResources, DIValues } from "../data-interactive-types"
import {
  couldNotParseQueryResult, dataContextNotFoundResult, fieldRequiredResult, valuesRequiredResult
} from "./di-results"
import { deleteItemsNotifications } from "./handler-functions"

// "first" and "last" are the ends; v2 passed any other position to splice as its start
function itemOrderIndex(position: unknown, length: number) {
  return position === "first" ? 0 : position === "last" ? length : position as number
}

export const diItemSearchHandler: DIHandler = {
  delete(resources: DIResources) {
    const { dataContext, itemSearch } = resources
    if (!dataContext) return dataContextNotFoundResult
    if (!itemSearch) return couldNotParseQueryResult

    const itemIds = itemSearch.map(aCase => aCase.__id__)
    dataContext.applyModelChange(() => {
      dataContext.removeCases(itemIds)
    }, {
      notify: deleteItemsNotifications(dataContext, itemIds)
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

    const priorItemIds = Array.from(dataContext._itemIds)
    dataContext.applyModelChange(() => {
      const itemIds = itemSearch.map(({ __id__ }) => __id__)
      if (itemOrder === "first" || itemOrder === "last") {
        // Move all the items to the beginning or end. "first" anchors on the first item not being moved
        // among all items, set-aside and filtered-out ones included, as v2 does.
        const movingItemIds = new Set(itemIds)
        const before = itemOrder === "first"
          ? dataContext._itemIds.find(id => !movingItemIds.has(id))
          : undefined
        dataContext.moveItems(itemIds, { before })
      } else {
        // As in v2, each item moves in turn to its position (the array entry at its index, or the single
        // value for every item), so a later move can shift an earlier one. Positions count all items,
        // set-aside and filtered-out ones included, and an item with no position stays where it is.
        const order = Array.from(dataContext._itemIds)
        itemIds.forEach((id, index) => {
          const position = Array.isArray(itemOrder) ? itemOrder[index] : itemOrder
          const from = position != null ? order.indexOf(id) : -1
          if (from < 0) return
          order.splice(from, 1)
          order.splice(itemOrderIndex(position, order.length), 0, id)
        })
        dataContext.setItemOrder(order)
      }
      dataContext.validateCases()
    }, {
      // as in v2, moveCases is sent only when the order changed
      notify: () => {
        const itemIds = dataContext._itemIds
        const moved = itemIds.length !== priorItemIds.length || itemIds.some((id, i) => id !== priorItemIds[i])
        if (moved) return moveCasesNotification(dataContext)
      }
    })

    return { success: true }
  }
}

registerDIHandler("itemSearch", diItemSearchHandler)
