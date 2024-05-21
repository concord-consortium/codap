import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DIUpdateCase, DIValues } from "../data-interactive-types"
import { convertCaseToV2FullCase } from "../data-interactive-type-utils"
import { attrNamesToIds } from "../data-interactive-utils"

const dcNotFoundResult = { success: false, values: { error: t("V3.DI.Error.dataContextNotFound") } } as const
const caseNotFoundResult = { success: false, values: { error: t("V3.DI.Error.caseNotFound") } } as const

export const diCaseByIDHandler: DIHandler = {
  delete(resources: DIResources) {
    const { caseByID, dataContext } = resources
    if (!dataContext) return dcNotFoundResult
    if (!caseByID) return caseNotFoundResult

    const pseudoCase = dataContext.pseudoCaseMap.get(caseByID.__id__)
    const cases = pseudoCase?.childCaseIds ?? [caseByID.__id__]

    dataContext.applyModelChange(() => {
      dataContext.removeCases(cases)
    })

    return { success: true }
  },

  get(resources: DIResources) {
    const { caseByID, dataContext } = resources
    if (!dataContext) return dcNotFoundResult
    if (!caseByID) return caseNotFoundResult

    return { success: true, values: convertCaseToV2FullCase(caseByID, dataContext) }
  },

  update(resources: DIResources, values?: DIValues) {
    const { caseByID, dataContext } = resources
    if (!dataContext) return dcNotFoundResult
    if (!caseByID) return caseNotFoundResult

    const missingFieldResult = {
      success: false,
      values: { error: t("V3.DI.Error.fieldRequired", { vars: ["update", "caseByID", "wavlues.values"] }) }
    } as const
    if (!values) return missingFieldResult
    const updateCase = values as DIUpdateCase
    if (!updateCase.values) return missingFieldResult

    dataContext.applyModelChange(() => {
      const updatedAttributes = attrNamesToIds(updateCase.values, dataContext)
      dataContext.setCaseValues([{ ...updatedAttributes, __id__: caseByID.__id__ }])
    })

    return { success: true }
  }
}

registerDIHandler("caseByID", diCaseByIDHandler)
