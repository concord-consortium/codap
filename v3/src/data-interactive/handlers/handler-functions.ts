import {
  createCasesNotification, deleteCasesNotification, deleteItemsNotification, moveCasesNotification,
  updateCasesNotificationFromIds, updateItemsNotification
} from "../../models/data/data-set-notifications"
import { IDataSet } from "../../models/data/data-set"
import { getGroupedCases } from "../../models/data/data-set-utils"
import { ICase } from "../../models/data/data-set-types"
import { toV2Id, toV3CaseId, toV3ItemId } from "../../utilities/codap-utils"
import { DICaseOrderNotify, DIResources, DISuccessResult, DIValues } from "../data-interactive-types"
import {
  DIRequestCase, DIRequestCaseValues, DIUpdateCase, DIUpdateItemResult
} from "../data-interactive-data-set-types"
import { getV2ItemResult, getCaseRequestResultValues } from "../data-interactive-type-utils"
import { resolveAttrNames } from "../data-interactive-utils"
import { t } from "../../utilities/translation/translate"
import { planCaseMove } from "./case-move-utils"
import {
  caseNotFoundResult, dataContextNotFoundResult, errorResult, fieldRequiredResult, itemNotFoundResult,
  valuesRequiredResult
} from "./di-results"

export function deleteCaseBy(resources: DIResources, aCase?: ICase) {
  const { dataContext } = resources
  if (!dataContext) return dataContextNotFoundResult
  if (!aCase) return caseNotFoundResult

  const pseudoCase = dataContext.caseInfoMap.get(aCase.__id__)
  const caseIds = pseudoCase?.childItemIds ?? [aCase.__id__]

  dataContext.applyModelChange(() => {
    dataContext.removeCases(caseIds)
  }, {
    // as in V2, deleting cases keeps the undo history (data_context.js:520, :575)
    keepRedo: true,
    notify: deleteCasesNotification(dataContext, getGroupedCases(dataContext, [aCase.__id__]))
  })

  return { success: true as const, values: [toV2Id(aCase.__id__)] }
}

// The notifications for deleting items, built before they are removed: `deleteCases` for their cases,
// then `deleteItems` for the items themselves (new in V3; V2 never forwarded deleteItems)
export function deleteItemsNotifications(dataContext: IDataSet, itemIds: string[]) {
  const existingItemIds = Array.from(new Set(itemIds)).filter(itemId => dataContext.itemInfoMap.has(itemId))
  const notifications = [deleteCasesNotification(dataContext, getGroupedCases(dataContext, existingItemIds))]
  // no deleteItems when none of the listed items existed
  if (existingItemIds.length > 0) notifications.push(deleteItemsNotification(dataContext, existingItemIds))
  return notifications
}

export function deleteItem(resources: DIResources, item?: ICase | string[]) {
  const { dataContext } = resources
  if (!dataContext) return dataContextNotFoundResult
  if (!item) return itemNotFoundResult

  const itemIds = Array.isArray(item) ? item : [item.__id__]
  dataContext.applyModelChange(() => {
    dataContext.removeCases(itemIds)
  }, {
    // as in V2, deleting items keeps the undo history (data_context.js:540, :575)
    keepRedo: true,
    notify: deleteItemsNotifications(dataContext, itemIds)
  })

  return { success: true as const, values: itemIds.map(itemId => toV2Id(itemId)) }
}

// As in V2, `notify` with `caseOrder` ("first", "last" or a position) moves a case to that position in its
// collection. A case stays grouped under its parent, so a position among another parent's cases is clamped to
// the first or last place among the case's siblings (V2 moved it there anyway).
export function moveCaseBy(resources: DIResources, values: DIValues | undefined, aCase: ICase | undefined,
                           resourceName: string) {
  const { dataContext } = resources
  if (!dataContext) return dataContextNotFoundResult
  if (!aCase) return caseNotFoundResult
  if (!values) return fieldRequiredResult("notify", resourceName, "values")
  const { caseOrder } = values as DICaseOrderNotify
  if (caseOrder == null) return fieldRequiredResult("notify", resourceName, "values.caseOrder")

  const caseId = aCase.__id__
  const collectionId = dataContext.caseInfoMap.get(caseId)?.collectionId
  if (!collectionId) return caseNotFoundResult
  const otherCases = dataContext.getCasesForCollection(collectionId).filter(({ __id__ }) => __id__ !== caseId)
  const position = caseOrder === "first" ? 0
    : caseOrder === "last" ? otherCases.length
    : typeof caseOrder === "number" || (typeof caseOrder === "string" && caseOrder.trim() !== "")
      ? Number(caseOrder)
      : NaN
  if (!isFinite(position)) return { success: false as const }

  // the case's siblings are together in the collection; a position before them puts the case first among them,
  // and one past them puts it last
  const parentId = dataContext.getParentCaseId(caseId)
  const siblings = otherCases.filter(({ __id__ }) => dataContext.getParentCaseId(__id__) === parentId)
  const firstSiblingIndex = siblings.length > 0 ? otherCases.indexOf(siblings[0]) : 0
  const siblingIndex = Math.min(Math.max(Math.trunc(position) - firstSiblingIndex, 0), siblings.length)
  const shownSiblingIds = dataContext.getCasesForCollection(collectionId)
    .filter(({ __id__ }) => dataContext.getParentCaseId(__id__) === parentId).map(({ __id__ }) => __id__)

  // as in V2, a case already in place isn't moved, but moveCases is still sent
  let itemIds: Maybe<string[]>
  if (shownSiblingIds.indexOf(caseId) !== siblingIndex) {
    const level = dataContext.getCollectionIndex(collectionId)
    itemIds = planCaseMove(dataContext, aCase, level, parentId, siblings, siblingIndex)
    if (!itemIds) return errorResult(t("V3.DI.Error.caseCannotMove"))
  }

  dataContext.applyModelChange(() => {
    itemIds && dataContext.setItemOrder(itemIds)
  }, {
    // as in V2, moveCases lists the case, with its values, and is sent even when the case was already in place
    notify: moveCasesNotification(dataContext, [aCase])
  })

  return { success: true as const }
}

export function getCaseBy(resources: DIResources, aCase?: ICase) {
  const { dataContext } = resources
  if (!dataContext) return dataContextNotFoundResult
  if (!aCase) return caseNotFoundResult

  return { success: true as const, values: getCaseRequestResultValues(aCase, dataContext) }
}

export function getItem(resources: DIResources, item?: ICase) {
  const { dataContext } = resources
  if (!dataContext) return dataContextNotFoundResult
  if (!item) return itemNotFoundResult

  return { success: true as const, values: getV2ItemResult(dataContext, item.__id__) }
}

function itemResult({ changedCases, createdCases, deletedCases }: DIUpdateItemResult) {
  return {
    success: true,
    values: {
      changedCases: changedCases ?? [],
      createdCases: createdCases ?? [],
      deletedCases: deletedCases ?? []
    }
  } as DISuccessResult
}

export interface IUpdateCaseByOptions {
  itemReturnStyle?: boolean
  nestedValues?: boolean // Case requests expect values: { values: { ... } }
  resourceName?: string
}
export function updateCaseBy(
  resources: DIResources, values?: DIValues, aCase?: ICase, options?: IUpdateCaseByOptions
) {
  const { dataContext } = resources
  if (!dataContext) return dataContextNotFoundResult
  if (!aCase) return caseNotFoundResult

  const { itemReturnStyle, nestedValues, resourceName } = options ?? {}

  const missingFieldResult = (field: string) => fieldRequiredResult("update", resourceName ?? "case", field)
  if (!values) return missingFieldResult("values")

  let _values = values as DIRequestCaseValues
  if (nestedValues) {
    const updateCase = values as DIUpdateCase
    if (!updateCase.values) return missingFieldResult("values.values")
    _values = updateCase.values
  }

  // an array is read in the order of the named collection's attributes, or of the case's own collection when the
  // selector names none
  const collection = itemReturnStyle
    ? undefined
    : resources.collection ?? dataContext.getCollectionForCase(aCase.__id__)
  const { caseValues: updatedAttributes, unknownNames } = resolveAttrNames(_values, dataContext, collection)
  const hasUpdates = Object.keys(updatedAttributes).length > 0
  dataContext.validateCases()
  const priorCaseIds = new Set(dataContext.caseInfoMap.keys())
  dataContext.applyModelChange(() => {
    dataContext.setCaseValues([{ ...updatedAttributes, __id__: aCase.__id__ }])
  }, {
    // as in V2, updating items keeps the undo history (data_context.js:532, :575); updating cases
    // clears it, so it clears what could be redone
    keepRedo: !!itemReturnStyle,
    // as the case table does, report the changed case and any cases the change created by regrouping
    notify: () => {
      if (!hasUpdates) return
      // an item is reported as the childmost case containing it
      const caseIds = getGroupedCases(dataContext, [aCase.__id__]).map(({ __id__ }) => __id__)
      const newCaseIds = Array.from(dataContext.caseInfoMap.keys()).filter(caseId => !priorCaseIds.has(caseId))
      // updateCases goes out even when the case merged into an existing group and so is gone, as the case table
      // sends it
      const notifications = [updateCasesNotificationFromIds(dataContext, caseIds)]
      if (newCaseIds.length > 0) notifications.push(createCasesNotification(newCaseIds, dataContext))
      // as in V2, an item update follows its case notices with `updateItems`
      if (itemReturnStyle) notifications.push(updateItemsNotification(dataContext, [aCase.__id__]))
      return notifications
    }
  })

  if (itemReturnStyle) return itemResult({ changedCases: [toV2Id(aCase.__id__)] })

  return { success: unknownNames.length === 0 }
}

export function updateCasesBy(resources: DIResources, values?: DIValues, itemReturnStyle?: boolean) {
  const { collection, dataContext } = resources
  if (!dataContext) return dataContextNotFoundResult
  if (!values) return valuesRequiredResult

  const cases = (Array.isArray(values) ? values : [values]) as DIRequestCase[]
  const caseIDs: number[] = []
  const updatedCases: ICase[] = []
  let unknownAttributeName = false
  // the cases and items whose values change, for the notifications
  const changedIds = new Set<string>()
  const changedItemIds = new Set<string>()
  dataContext.validateCases()
  const priorCaseIds = new Set(dataContext.caseInfoMap.keys())
  dataContext.applyModelChange(() => {
    cases.forEach(aCase => {
      const { id } = aCase
      const v3CaseId = id ? toV3CaseId(id) : undefined
      // as in V2, update case looks up only cases; the item resources also accept item ids
      const v3ItemId = id && itemReturnStyle ? toV3ItemId(id) : undefined
      const dcCase = v3CaseId ? dataContext.caseInfoMap.get(v3CaseId) : undefined
      const dcItem = v3ItemId ? dataContext.getItem(v3ItemId) : undefined
      const v3Id = dcCase ? v3CaseId : v3ItemId
      // as in V2, update case lists every case it finds, even one sent with no values
      if (id && v3Id && (dcItem || dcCase) && (aCase.values || !itemReturnStyle)) {
        caseIDs.push(id)
        if (aCase.values) {
          const { caseValues: updatedAttributes, unknownNames } =
            resolveAttrNames(aCase.values, dataContext, itemReturnStyle ? undefined : collection)
          updatedCases.push({ ...updatedAttributes, __id__: v3Id })
          if (unknownNames.length > 0) unknownAttributeName = true
          if (Object.keys(updatedAttributes).length > 0) {
            changedIds.add(v3Id)
            // a case id (which `update item` also accepts) stands for the items setCaseValues changes:
            // its visible ones, not those set aside
            const itemIds = dcCase ? dcCase.childItemIds : [v3Id]
            itemIds.forEach(itemId => changedItemIds.add(itemId))
          }
        }
      }
    })
    dataContext.setCaseValues(updatedCases)
  }, {
    // as in V2, updating items keeps the undo history (data_context.js:532, :575); updating cases
    // clears it, so it clears what could be redone
    keepRedo: !!itemReturnStyle,
    // as the case table does, report the changed cases and any cases the change created by regrouping;
    // as in V2, an item update follows its case notices with `updateItems`
    notify: () => {
      if (changedIds.size === 0) return
      // an item is reported as the childmost case containing it
      const caseIds = new Set(getGroupedCases(dataContext, Array.from(changedIds)).map(({ __id__ }) => __id__))
      const newCaseIds = Array.from(dataContext.caseInfoMap.keys()).filter(caseId => !priorCaseIds.has(caseId))
      // updateCases goes out even when every changed case merged into an existing group and so is gone, as
      // updateCaseBy and the case table send it
      const notifications = [updateCasesNotificationFromIds(dataContext, Array.from(caseIds))]
      if (newCaseIds.length > 0) notifications.push(createCasesNotification(newCaseIds, dataContext))
      if (itemReturnStyle) notifications.push(updateItemsNotification(dataContext, Array.from(changedItemIds)))
      return notifications
    }
  })

  if (caseIDs.length > 0) {
    if (itemReturnStyle) return itemResult({ changedCases: caseIDs })

    return { success: !unknownAttributeName, caseIDs }
  }

  return { success: false }
}
