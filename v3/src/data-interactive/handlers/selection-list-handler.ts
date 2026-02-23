import { IDataSet } from "../../models/data/data-set"
import { selectCases, setSelectedCases } from "../../models/data/data-set-utils"
import { toV2Id, toV3CaseId, toV3ItemId } from "../../utilities/codap-utils"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import {
  DIHandler, DIHandlerFnResult, DIResources, DISelectionExpression, DISingleValues, DIValues
} from "../data-interactive-types"
import { evaluateCaseFormula } from "../resource-parser-utils"
import { dataContextNotFoundResult } from "./di-results"

function isSelectionExpression(values: unknown): values is DISelectionExpression {
  return values != null && typeof values === "object" && !Array.isArray(values) &&
    "expression" in values && typeof (values as Record<string, unknown>).expression === "string"
}

function illegalValuesResult(action: string) {
  return { success: false, values: {
    error: t("V3.DI.Error.selectionListIllegalValues", { vars: [action] })
  } } as const
}

type ExpressionResult = { success: true, caseIds: string[] } | { success: false, error: string }

function evaluateExpressionSelection(dataContext: IDataSet, values: DISelectionExpression): ExpressionResult {
  const collectionName = values.collection
  const collection = collectionName
    ? dataContext.getCollectionByName(collectionName)
    : dataContext.childCollection

  if (!collection) {
    return { success: false, error: t("V3.DI.Error.collectionNotFound") }
  }

  const { valid, caseIds, error } = evaluateCaseFormula(values.expression, dataContext, collection)
  if (!valid || !caseIds) {
    return { success: false, error: error ?? "Unknown formula evaluation error" }
  }

  return { success: true, caseIds }
}

function updateSelectionByExpression(
  dataContext: IDataSet | undefined,
  values: DISelectionExpression,
  applySelection: (caseIds: string[]) => void
): DIHandlerFnResult {
  if (!dataContext) return dataContextNotFoundResult
  const result = evaluateExpressionSelection(dataContext, values)
  if (!result.success) {
    return { success: false, values: { error: result.error } }
  }
  applySelection(result.caseIds)
  return { success: true }
}

function updateSelection(
  action: string, dataSet?: IDataSet, values?: DIValues, applySelection?: (caseIds: string[]) => void
) {
  if (!dataSet || !applySelection) return dataContextNotFoundResult
  if (!values || !Array.isArray(values)) return illegalValuesResult(action)

  let isIllegalValues = false
  function _toV3Id(value: string | DISingleValues) {
    if (typeof value === "object") {
      isIllegalValues = true
    }
    else {
      const caseId = toV3CaseId(value)
      if (dataSet?.caseInfoMap.get(caseId)) return caseId
      const itemId = toV3ItemId(value)
      if (dataSet?.hasItem(itemId)) return itemId
    }
  }
  const caseIds = values.map(value => _toV3Id(value)).filter(id => id != null)
  if (isIllegalValues) return illegalValuesResult(action)

  // TODO Filter based on collection
  applySelection(caseIds)
  return { success: true }
}

export const diSelectionListHandler: DIHandler = {
  create(resources: DIResources, values?: DIValues) {
    const { dataContext } = resources
    if (isSelectionExpression(values)) {
      return updateSelectionByExpression(dataContext, values, (caseIds) => setSelectedCases(caseIds, dataContext))
    }
    const applySelection = (caseIds: string[]) => setSelectedCases(caseIds, dataContext)
    return updateSelection("Create", dataContext, values, applySelection)
  },
  get(resources: DIResources) {
    const { collection, dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult

    const cases = collection?.caseGroups ?? Array.from(dataContext.caseInfoMap.values())
    const values = cases.filter(aCase => dataContext.isCaseSelected(aCase.groupedCase.__id__))
      .map(aCase => ({
        caseID: toV2Id(aCase.groupedCase.__id__),
        collectionID: toV2Id(aCase.collectionId),
        collectionName: dataContext.getCollection(aCase.collectionId)?.name
      }))
    return {
      success: true,
      values
    }
  },
  update(resources: DIResources, values?: DIValues) {
    const { dataContext } = resources
    if (isSelectionExpression(values)) {
      return updateSelectionByExpression(dataContext, values, (caseIds) => selectCases(caseIds, dataContext))
    }
    const applySelection = (caseIds: string[]) => selectCases(caseIds, dataContext)
    return updateSelection("Update", dataContext, values, applySelection)
  }
}

registerDIHandler("selectionList", diSelectionListHandler)
