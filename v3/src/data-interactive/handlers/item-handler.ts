import { IDataSet } from "../../models/data/data-set"
import { createCasesNotification } from "../../models/data/data-set-notifications"
import { toV2Id, toV3ItemId } from "../../utilities/codap-utils"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIHandlerFnResult, DIResources, DIValues } from "../data-interactive-types"
import { DIItem, DIItemValues, DINewCase } from "../data-interactive-data-set-types"
import { deleteItem, getItem, updateCaseBy, updateCasesBy } from "./handler-functions"
import { dataContextNotFoundResult, valuesRequiredResult } from "./di-results"

/**
 * Create the items of all segments in a single batched model change (one addCases, one
 * validateCases, one notification batch) and return one result per segment, equivalent to
 * processing each segment as its own create request. Used by the request coalescer to merge
 * consecutive streamed single-item create requests (CODAP-1408); the item handler's `create`
 * is the single-segment case.
 */
export function createItemsInSegments(dataContext: IDataSet, segments: DIItemValues[][]): DIHandlerFnResult[] {
  // Normalize all segments' items into one flat array, remembering each segment's range.
  const items: DIItem[] = []
  const segmentRanges: Array<{ start: number, count: number }> = []
  segments.forEach(segment => {
    const start = items.length
    // Some plugins (Collaborative) create items with values like [{ values: { ... } }] instead of
    // like [{ ... }], so we accommodate that extra layer of indirection here.
    segment.forEach(item => {
      let newItem: DIItem
      if (typeof item.values === "object") {
        newItem = item.values as DIItem
      } else {
        newItem = item
      }

      // If an id is specified, we need to put it in the right format
      // The Collaborative plugin makes use of this feature
      const { id } = item
      if (!newItem.__id__ && (typeof id === "string" || typeof id === "number")) {
        newItem.__id__ = toV3ItemId(id)
      }
      items.push(newItem)
    })
    segmentRanges.push({ start, count: items.length - start })
  })

  const newCaseIds: Record<string, string[]> = {}
  let itemIDs: string[] = []
  dataContext.applyModelChange(() => {
    // Get case ids from before new items are added
    const oldCaseIds: Record<string, Set<string>> = {}
    dataContext.collections.forEach(collection => {
      oldCaseIds[collection.id] = new Set(collection.caseIds)
    })

    // Add items and update cases. A multi-segment batch is a coalesced run of streamed
    // create requests, so observers (e.g. graphs) should snap rather than animate; a
    // single create request — even one with many items — animates as an ordinary add.
    const suppressAnimation = segments.length > 1
    itemIDs = dataContext.addCases(items, { canonicalize: true, suppressAnimation })
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

  // Attribute each new case to the segment containing its earliest contributing item.
  // This matches sequential semantics: under one-create-at-a-time processing, a new
  // parent case is reported by the first request whose item forms it; later requests
  // join the existing case without reporting it.
  const itemIndexMap = new Map<string, number>()
  itemIDs.forEach((itemID, index) => itemIndexMap.set(itemID, index))
  const segmentIndexForItemIndex = (itemIndex: number) =>
    segmentRanges.findIndex(({ start, count }) => itemIndex >= start && itemIndex < start + count)

  const segmentCaseIDs: number[][] = segmentRanges.map(() => [])
  for (const collectionId in newCaseIds) {
    newCaseIds[collectionId].forEach(caseId => {
      const childItemIds = dataContext.caseInfoMap.get(caseId)?.childItemIds ?? []
      const earliestItemIndex = childItemIds.reduce<number>((earliest, itemId) => {
        const index = itemIndexMap.get(itemId)
        return index != null && index < earliest ? index : earliest
      }, Infinity)
      // a new case with no contributing batch item shouldn't occur during pure adds;
      // attribute to the first segment if it ever does
      const segmentIndex = isFinite(earliestItemIndex) ? segmentIndexForItemIndex(earliestItemIndex) : 0
      segmentCaseIDs[Math.max(0, segmentIndex)].push(toV2Id(caseId))
    })
  }

  return segmentRanges.map(({ start, count }, index) => ({
    success: true as const,
    caseIDs: segmentCaseIDs[index],
    itemIDs: itemIDs.slice(start, start + count).map(itemID => toV2Id(itemID))
  }))
}

export const diItemHandler: DIHandler = {
  create(resources: DIResources, values?: DIValues) {
    const { dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult
    if (!values) return valuesRequiredResult

    const items = (Array.isArray(values) ? values : [values]) as DIItemValues[]
    return createItemsInSegments(dataContext, [items])[0]
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
