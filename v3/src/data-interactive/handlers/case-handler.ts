import { createCasesNotification } from "../../models/data/data-set-notifications"
import { ICaseCreation } from "../../models/data/data-set-types"
import { toV2Id, toV3CaseId } from "../../utilities/codap-utils"
import { registerDIHandler } from "../data-interactive-handler"
import { DIFullCase, DIHandler, DIResources, DIValues } from "../data-interactive-types"
import { attrNamesToIds } from "../data-interactive-utils"
import { updateCasesBy } from "./handler-functions"
import { dataContextNotFoundResult } from "./di-results"

export const diCaseHandler: DIHandler = {
  create(resources: DIResources, values?: DIValues) {
    const { dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult

    let itemIds: string[] = []
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
      itemIds = dataContext.addCases(newCaseData)

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
      values: itemIds.map(id => {
        const caseId = dataContext.itemIdChildCaseMap.get(id)?.groupedCase.__id__
        return ({
          id: caseId ? toV2Id(caseId) : undefined,
          itemID: toV2Id(id)
        })
      })
    }
  },
  update(resources: DIResources, values?: DIValues) {
    return updateCasesBy(resources, values)
  }
}

registerDIHandler("case", diCaseHandler)
