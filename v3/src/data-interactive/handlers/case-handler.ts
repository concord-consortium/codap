import { createCasesNotification } from "../../models/data/data-set-notifications"
import { ICase, ICaseCreation } from "../../models/data/data-set-types"
import { ICollectionModel } from "../../models/data/collection"
import { IDataSet } from "../../models/data/data-set"
import { isValueNonEmpty } from "../../utilities/math-utils"
import { toV2Id, toV3CaseId } from "../../utilities/codap-utils"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DIValues } from "../data-interactive-types"
import { DIFullCase } from "../data-interactive-data-set-types"
import { attrNamesToIds } from "../data-interactive-utils"
import { updateCasesBy } from "./handler-functions"
import { dataContextNotFoundResult } from "./di-results"

// When a parent case is created in a hierarchical dataset, V3's flat data model creates an
// underlying item that also appears as a child case with no child-level attribute values
// (a "phantom" child). When child cases are subsequently created with a parent reference,
// we detect these phantom items and populate them instead of creating additional items.
function findPhantomChildItemId(
  dataContext: IDataSet, parentId: string, collection: ICollectionModel, claimedIds: Set<string>
): string | undefined {
  const parentCase = dataContext.caseInfoMap.get(parentId)
  if (!parentCase) return
  const collectionAttrs = collection.dataAttributesArray
  if (collectionAttrs.length === 0) return
  return parentCase.childItemIds.find(itemId => {
    if (claimedIds.has(itemId)) return false
    return !collectionAttrs.some(attr => isValueNonEmpty(collection.itemData.getValue(itemId, attr.id)))
  })
}

export const diCaseHandler: DIHandler = {
  create(resources: DIResources, values?: DIValues) {
    const { dataContext, collection } = resources
    const collectionId = collection?.id
    if (!dataContext) return dataContextNotFoundResult

    const newCaseData: ICaseCreation[] = []
    const phantomUpdates: ICase[] = []
    const cases = (Array.isArray(values) ? values : [values]) as DIFullCase[]
    const oldCaseIds = new Set(dataContext.caseInfoMap.keys())
    const newCaseIds: string[] = []
    dataContext.applyModelChange(() => {
      const claimedPhantomIds = new Set<string>()
      cases.forEach(aCase => {
        if (aCase.values) {
          const { parent } = aCase
          const parentValues = parent ? dataContext.getParentValues(toV3CaseId(parent)) : {}
          const caseValues = attrNamesToIds(aCase.values, dataContext)

          if (parent && collection) {
            const phantomItemId = findPhantomChildItemId(
              dataContext, toV3CaseId(parent), collection, claimedPhantomIds
            )
            if (phantomItemId) {
              claimedPhantomIds.add(phantomItemId)
              phantomUpdates.push({ ...caseValues, __id__: phantomItemId })
              return
            }
          }

          newCaseData.push({ ...caseValues, ...parentValues })
        }
      })
      if (phantomUpdates.length > 0) {
        dataContext.setCaseValues(phantomUpdates)
      }
      if (newCaseData.length > 0) {
        dataContext.addCases(newCaseData)
      }

      dataContext.validateCases()
      Array.from(dataContext.caseInfoMap.keys()).forEach(caseId => {
        if (!oldCaseIds.has(caseId)) newCaseIds.push(caseId)
      })
    }, {
      notify: () => {
        if (newCaseIds.length > 0) return createCasesNotification(newCaseIds, dataContext)
      }
    })

    return {
      success: true,
      values: newCaseIds.filter(newCaseId => {
        // if a collection is specified, only return cases in that collection
        return !collectionId || dataContext.getCollection(collectionId)?.hasCase(newCaseId)
      }).map(id => ({ id: toV2Id(id) }))
    }
  },
  update(resources: DIResources, values?: DIValues) {
    return updateCasesBy(resources, values)
  }
}

registerDIHandler("case", diCaseHandler)
