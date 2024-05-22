import { ICase } from "../../models/data/data-set-types"
import { t } from "../../utilities/translation/translate"
import { DIResources, DIUpdateCase, DIValues } from "../data-interactive-types"
import { getCaseRequestResultValues } from "../data-interactive-type-utils"
import { attrNamesToIds } from "../data-interactive-utils"
import { caseNotFoundResult, dataContextNotFoundResult } from "./di-results"

export function deleteCaseBy(resources: DIResources, aCase?: ICase) {
  const { dataContext } = resources
  if (!dataContext) return dataContextNotFoundResult
  if (!aCase) return caseNotFoundResult

  const pseudoCase = dataContext.pseudoCaseMap.get(aCase.__id__)
  const cases = pseudoCase?.childCaseIds ?? [aCase.__id__]

  dataContext.applyModelChange(() => {
    dataContext.removeCases(cases)
  })

  return { success: true }
}

export function getCaseBy(resources: DIResources, aCase?: ICase) {
  const { dataContext } = resources
  if (!dataContext) return dataContextNotFoundResult
  if (!aCase) return caseNotFoundResult

  return { success: true, values: getCaseRequestResultValues(aCase, dataContext) } as const
}

export function updateCaseBy(resources: DIResources, values?: DIValues, aCase?: ICase) {
  const { dataContext } = resources
  if (!dataContext) return dataContextNotFoundResult
  if (!aCase) return caseNotFoundResult

  const missingFieldResult = {
    success: false,
    values: { error: t("V3.DI.Error.fieldRequired", { vars: ["update", "caseByID/Index", "values.values"] }) }
  } as const
  if (!values) return missingFieldResult
  const updateCase = values as DIUpdateCase
  if (!updateCase.values) return missingFieldResult

  dataContext.applyModelChange(() => {
    const updatedAttributes = attrNamesToIds(updateCase.values, dataContext)
    dataContext.setCaseValues([{ ...updatedAttributes, __id__: aCase.__id__ }])
  })

  return { success: true }
}
