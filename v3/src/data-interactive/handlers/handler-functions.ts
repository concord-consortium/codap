import { ICase } from "../../models/data/data-set-types"
import { toV2Id, toV3CaseId } from "../../utilities/codap-utils"
import { t } from "../../utilities/translation/translate"
import {
  DICaseValues, DIFullCase, DIResources, DISuccessResult, DIUpdateCase, DIUpdateItemResult, DIValues
} from "../data-interactive-types"
import { getV2ItemResult, getCaseRequestResultValues } from "../data-interactive-type-utils"
import { attrNamesToIds } from "../data-interactive-utils"
import { caseNotFoundResult, dataContextNotFoundResult, itemNotFoundResult } from "./di-results"

export function deleteCaseBy(resources: DIResources, aCase?: ICase) {
  const { dataContext } = resources
  if (!dataContext) return dataContextNotFoundResult
  if (!aCase) return caseNotFoundResult

  const pseudoCase = dataContext.pseudoCaseMap.get(aCase.__id__)
  const caseIds = pseudoCase?.childCaseIds ?? [aCase.__id__]

  dataContext.applyModelChange(() => {
    dataContext.removeCases(caseIds)
  })

  return { success: true as const, values: [toV2Id(aCase.__id__)] }
}

export function deleteItem(resources: DIResources, item?: ICase) {
  const { dataContext } = resources
  if (!dataContext) return dataContextNotFoundResult
  if (!item) return itemNotFoundResult

  dataContext.applyModelChange(() => {
    dataContext.removeCases([item.__id__])
  })

  return { success: true as const, values: [toV2Id(item.__id__)] }
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

  const missingFieldResult = (field: string) => ({
    success: false as const,
    values: { error: t("V3.DI.Error.fieldRequired", { vars: ["update", resourceName ?? "case", field] }) }
  })
  if (!values) return missingFieldResult("values")

  let _values = values as DICaseValues
  if (nestedValues) {
    const updateCase = values as DIUpdateCase
    if (!updateCase.values) return missingFieldResult("values.values")
    _values = updateCase.values
  }

  dataContext.applyModelChange(() => {
    const updatedAttributes = attrNamesToIds(_values, dataContext)
    dataContext.setCaseValues([{ ...updatedAttributes, __id__: aCase.__id__ }])
  })

  if (itemReturnStyle) return itemResult({ changedCases: [toV2Id(aCase.__id__)] })

  return { success: true }
}

export function updateCasesBy(resources: DIResources, values?: DIValues, itemReturnStyle?: boolean) {
  const { dataContext } = resources
  if (!dataContext) return dataContextNotFoundResult

  const cases = (Array.isArray(values) ? values : [values]) as DIFullCase[]
  const caseIDs: number[] = []
  dataContext.applyModelChange(() => {
    cases.forEach(aCase => {
      const { id } = aCase
      const v3Id = id && toV3CaseId(id)
      if (v3Id && aCase.values && (dataContext.getCase(v3Id) || dataContext.pseudoCaseMap.get(v3Id))) {
        caseIDs.push(id)
        const updatedAttributes = attrNamesToIds(aCase.values, dataContext)
        dataContext.setCaseValues([{ ...updatedAttributes, __id__: v3Id }])
      }
    })
  })

  if (caseIDs.length > 0) {
    if (itemReturnStyle) return itemResult({ changedCases: caseIDs })

    return { success: true, caseIDs }
  }

  return { success: false }
}
