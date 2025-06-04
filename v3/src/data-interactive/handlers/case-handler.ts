import { createCasesNotification } from "../../models/data/data-set-notifications"
import { ICaseCreation } from "../../models/data/data-set-types"
import { toV2Id, toV3CaseId } from "../../utilities/codap-utils"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DIValues } from "../data-interactive-types"
import { DIFullCase } from "../data-interactive-data-set-types"
import { attrNamesToIds } from "../data-interactive-utils"
import { updateCasesBy } from "./handler-functions"
import { dataContextNotFoundResult } from "./di-results"

export const diCaseHandler: DIHandler = {
  create(resources: DIResources, values?: DIValues) {
    const { dataContext, collection } = resources
    const collectionId = collection?.id
    if (!dataContext) return dataContextNotFoundResult

    const newCaseData: ICaseCreation[] = []
    const cases = (Array.isArray(values) ? values : [values]) as DIFullCase[]
    const oldCaseIds = new Set(dataContext.caseInfoMap.keys())
    const newCaseIds: string[] = []
    dataContext.applyModelChange(() => {
      cases.forEach(aCase => {
        if (aCase.values) {
          const { parent } = aCase
          const parentValues = parent ? dataContext.getParentValues(toV3CaseId(parent)) : {}
          const caseValues = attrNamesToIds(aCase.values, dataContext)
          newCaseData.push({ ...caseValues, ...parentValues })
        }
      })
      dataContext.addCases(newCaseData)

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
