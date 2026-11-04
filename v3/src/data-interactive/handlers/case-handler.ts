import { IValueType } from "../../models/data/attribute-types"
import { createCasesNotification } from "../../models/data/data-set-notifications"
import { ICase, ICaseCreation } from "../../models/data/data-set-types"
import { IDataSet } from "../../models/data/data-set"
import { isValueNonEmpty } from "../../utilities/math-utils"
import { toV2Id, toV3CaseId } from "../../utilities/codap-utils"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DIValues } from "../data-interactive-types"
import { DIFullCase } from "../data-interactive-data-set-types"
import { attrNamesToIds } from "../data-interactive-utils"
import { t } from "../../utilities/translation/translate"
import { updateCasesBy } from "./handler-functions"
import {
  collectionNotFoundResult, dataContextNotFoundResult, errorResult, valuesRequiredResult
} from "./di-results"

// When a parent case is created on its own in a hierarchical dataset, V3's flat data model gives it one
// item, which also appears as a child case with no child-level values. As in V2, which filled the parent's
// item while the parent had no children, the first child case created under such a parent fills that item
// instead of adding another. The empty child case must be the parent's only one, so a real child case whose
// values the user cleared isn't reused, and an item is filled only once, so a child created with no values
// isn't filled again by the next request.
const filledItemIds = new WeakMap<IDataSet, Set<string>>()

function getFilledItemIds(dataContext: IDataSet) {
  let itemIds = filledItemIds.get(dataContext)
  if (!itemIds) {
    itemIds = new Set<string>()
    filledItemIds.set(dataContext, itemIds)
  }
  return itemIds
}

function findReusableChildItemId(dataContext: IDataSet, parentId: string, lowerAttrIds: string[]) {
  const childItemIds = dataContext.caseInfoMap.get(parentId)?.childItemIds ?? []
  if (childItemIds.length !== 1) return
  const [itemId] = childItemIds
  if (getFilledItemIds(dataContext).has(itemId)) return
  return lowerAttrIds.some(attrId => isValueNonEmpty(dataContext.getValue(itemId, attrId))) ? undefined : itemId
}

export const diCaseHandler: DIHandler = {
  create(resources: DIResources, values?: DIValues) {
    const { dataContext, collection } = resources
    if (!dataContext) return dataContextNotFoundResult
    // as in V2, a case is created in a named collection
    if (!collection) return collectionNotFoundResult
    if (values == null) return valuesRequiredResult

    const collectionIndex = dataContext.getCollectionIndex(collection.id)
    const parentCollection = dataContext.getParentCollection(collection.id)
    // the non-formula attributes of this collection and those below it
    const lowerAttrIds = dataContext.collections.slice(collectionIndex)
      .flatMap(aCollection => aCollection.dataAttributesArray.map(attr => attr.id))
    const ancestorCollectionIds = new Set(dataContext.collections.slice(0, collectionIndex).map(({ id }) => id))

    const newCaseData: ICaseCreation[] = []
    const reusedItemUpdates: ICase[] = []
    const cases = (Array.isArray(values) ? values : [values]) as Array<Maybe<DIFullCase>>
    const oldCaseIds = new Set(dataContext.caseInfoMap.keys())
    const newCaseIds: string[] = []
    const reusedCaseIds: string[] = []
    let skippedCount = 0
    dataContext.applyModelChange(() => {
      cases.forEach(aCase => {
        // as in V2, a case with no values is created empty
        const caseValues = aCase?.values ? attrNamesToIds(aCase.values, dataContext) : {}
        if (!parentCollection) {
          // a top-level case has no parent, so any parent given is ignored (V2 used it if it named a case,
          // and otherwise failed)
          newCaseData.push(caseValues)
          return
        }
        // as in V2, a case below the top level needs an existing parent case, in a collection above this one;
        // otherwise nothing is created
        const parentId = aCase?.parent != null ? toV3CaseId(aCase.parent) : undefined
        const parentCollectionId = parentId ? dataContext.caseInfoMap.get(parentId)?.collectionId : undefined
        if (!parentId || !parentCollectionId || !ancestorCollectionIds.has(parentCollectionId)) {
          ++skippedCount
          return
        }
        const reusableItemId = findReusableChildItemId(dataContext, parentId, lowerAttrIds)
        if (reusableItemId) {
          getFilledItemIds(dataContext).add(reusableItemId)
          // only this collection's values and those below it, so the parent case doesn't change
          const lowerValues: ICase = { __id__: reusableItemId }
          lowerAttrIds.forEach(attrId => {
            if (attrId in caseValues) lowerValues[attrId] = caseValues[attrId] as IValueType
          })
          reusedItemUpdates.push(lowerValues)
          return
        }
        newCaseData.push({ ...caseValues, ...dataContext.getParentValues(parentId) })
      })
      if (reusedItemUpdates.length > 0) {
        dataContext.setCaseValues(reusedItemUpdates)
      }
      if (newCaseData.length > 0) {
        dataContext.addCases(newCaseData)
      }

      dataContext.validateCases()
      Array.from(dataContext.caseInfoMap.keys()).forEach(caseId => {
        if (!oldCaseIds.has(caseId)) newCaseIds.push(caseId)
      })
      // a reused item's case in this collection already existed, but it is reported as created, as in V2
      reusedItemUpdates.forEach(({ __id__: itemId }) => {
        const caseId = dataContext.getItemCaseIds(itemId).find(id => collection.hasCase(id))
        if (caseId) reusedCaseIds.push(caseId)
      })
    }, {
      notify: () => {
        const notifyCaseIds = [...newCaseIds, ...reusedCaseIds]
        if (notifyCaseIds.length > 0) return createCasesNotification(notifyCaseIds, dataContext)
      }
    })

    const createdCaseIds = [...reusedCaseIds, ...newCaseIds.filter(caseId => collection.hasCase(caseId))]
    if (createdCaseIds.length === 0 && skippedCount > 0) {
      return errorResult(t("V3.DI.Error.caseParentInvalid"))
    }
    return {
      success: true,
      values: createdCaseIds.map(id => {
        // as in V2, each case is reported with the id of an item it contains
        const itemId = dataContext.caseInfoMap.get(id)?.childItemIds[0]
        return { id: toV2Id(id), itemID: itemId ? toV2Id(itemId) : null }
      })
    }
  },
  update(resources: DIResources, values?: DIValues) {
    // as in V2, cases are updated in a named collection (V2 replied { success: false } without a message)
    if (resources.dataContext && !resources.collection) return collectionNotFoundResult
    return updateCasesBy(resources, values)
  }
}

registerDIHandler("case", diCaseHandler)
