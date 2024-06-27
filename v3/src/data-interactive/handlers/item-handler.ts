import { toV2Id } from "../../utilities/codap-utils"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIItem, DIItemValues, DIResources, DIValues } from "../data-interactive-types"
import { deleteItem, getItem, updateCaseBy, updateCasesBy } from "./handler-functions"
import { dataContextNotFoundResult, valuesRequiredResult } from "./di-results"

export const diItemHandler: DIHandler = {
  create(resources: DIResources, values?: DIValues) {
    const { dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult
    if (!values) return valuesRequiredResult

    const _items = (Array.isArray(values) ? values : [values]) as DIItemValues[]
    const items: DIItem[] = []
    // Some very naughty plugins create items with values like [{ values: { ... } }] instead of like [{ ... }],
    // so we accommodate that extra layer of indirection here.
    _items.forEach(item => {
      if (typeof item.values === "object") {
        items.push(item.values)
      } else {
        items.push(item as DIItem)
      }
    })
    const itemIDs = dataContext.addCases(items, { canonicalize: true })
    return {
      success: true,
      // caseIDs, // TODO This should include all cases created, both grouped and ungrouped
      itemIDs: itemIDs.map(itemID => toV2Id(itemID))
    }
  },

  delete(resources: DIResources) {
    const { item } = resources

    return deleteItem(resources, item)
  },

  get(resources: DIResources) {
    const { item } = resources

    return getItem(resources, item)
  },

  update(resources: DIResources, values?: DIValues) {
    const { item } = resources

    if (item) {
      return updateCaseBy(resources, values, item, { itemReturnStyle: true, resourceName: "item" })
    } else {
      return updateCasesBy(resources, values, true)
    }
  }
}

registerDIHandler("item", diItemHandler)
