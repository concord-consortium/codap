import { createCasesNotification } from "../../models/data/data-set-notifications"
import { toV2Id, toV3ItemId } from "../../utilities/codap-utils"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DIValues } from "../data-interactive-types"
import { DIItem, DIItemValues, DINewCase } from "../data-interactive-data-set-types"
import { deleteItem, getItem, updateCaseBy, updateCasesBy } from "./handler-functions"
import { dataContextNotFoundResult, valuesRequiredResult } from "./di-results"

export const diItemHandler: DIHandler = {
  create(resources: DIResources, values?: DIValues) {
    const { dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult
    if (!values) return valuesRequiredResult

    const _items = (Array.isArray(values) ? values : [values]) as DIItemValues[]
    const items: DIItem[] = []
    // Some plugins (Collaborative) create items with values like [{ values: { ... } }] instead of
    // like [{ ... }], so we accommodate that extra layer of indirection here.
    _items.forEach(item => {
      let newItem: DIItem
      if (typeof item.values === "object") {
        newItem = item.values as DIItem
      } else {
        newItem = item as DIItem
      }

      // If an id is specified, we need to put it in the right format
      // The Collaborative plugin makes use of this feature
      const { id } = item
      if (!newItem.__id__ && (typeof id === "string" || typeof id === "number")) {
        newItem.__id__ = toV3ItemId(id)
      }
      items.push(newItem)
    })

    const newCaseIds: Record<string, string[]> = {}
    let itemIDs: string[] = []
    dataContext.applyModelChange(() => {
      // Get case ids from before new items are added
      const oldCaseIds: Record<string, Set<string>> = {}
      dataContext.collections.forEach(collection => {
        oldCaseIds[collection.id] = new Set(collection.caseIds)
      })

      // Add items and update cases
      itemIDs = dataContext.addCases(items, { canonicalize: true })
      dataContext.validateCases()

      // Find newly added cases by comparing current cases to previous cases
      dataContext.collections.forEach(collection => {
        newCaseIds[collection.id] = []
        collection.caseIds.forEach(caseId => {
          if (!oldCaseIds[collection.id].has(caseId)) newCaseIds[collection.id].push(caseId)
        })
      })
    }, {
      notify: () => {
        const notifications = []
        for (const collectionId in newCaseIds) {
          const caseIds = newCaseIds[collectionId]
          if (caseIds.length > 0) {
            notifications.push(createCasesNotification(caseIds, dataContext))
          }
        }
        return notifications
      }
    })

    let caseIDs: string[] = []
    for (const collectionId in newCaseIds) {
      caseIDs = caseIDs.concat(newCaseIds[collectionId])
    }
    return {
      success: true,
      caseIDs: caseIDs.map(caseID => toV2Id(caseID)),
      itemIDs: itemIDs.map(itemID => toV2Id(itemID))
    }
  },

  delete(resources: DIResources, values?: DIValues) {
    const { item } = resources

    let itemIds: string[] | undefined
    if (!item && values && Array.isArray(values)) {
      itemIds = (values as DINewCase[]).map(aCase => aCase.id != null && toV3ItemId(aCase.id))
        .filter(id => !!id) as string[]
    }

    return deleteItem(resources, item ?? itemIds)
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
