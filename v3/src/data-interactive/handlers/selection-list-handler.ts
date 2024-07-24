import { IDataSet } from "../../models/data/data-set"
import { toV2Id, toV3CaseId, toV3ItemId } from "../../utilities/codap-utils"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DISingleValues, DIValues } from "../data-interactive-types"
import { dataContextNotFoundResult } from "./di-results"

function illegalValuesResult(action: string) {
  return { success: false, values: {
    error: t("V3.DI.Error.selectionListIllegalValues", { vars: [action] })
  } } as const
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
    return updateSelection("Create", dataContext, values, dataContext?.setSelectedCases)
  },
  get(resources: DIResources) {
    const { dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult

    const caseIds = Array.from(dataContext.selection)
    // TODO Include collectionID and collectionName
    const values = caseIds.map(caseID => ({ caseID: toV2Id(caseID) }))
    // TODO Filter based on collection
    return {
      success: true,
      values
    }
  },
  update(resources: DIResources, values?: DIValues) {
    const { dataContext } = resources
    return updateSelection("Update", dataContext, values, dataContext?.selectCases)
  }
}

registerDIHandler("selectionList", diSelectionListHandler)
