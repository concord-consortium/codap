import { IDataSet } from "../../models/data/data-set"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DIValues } from "../data-interactive-types"

const unknownDataContextResult =
  { success: false, values: { error: t("V3.DI.Error.dataContextUnknown")} } as const
function illegalValuesResult(action: string) {
  return { success: false, values: {
    error: t("V3.DI.Error.selectionListIllegalValues", { vars: [action] })
  } } as const
}

function updateSelection(
  action: string, dataSet?: IDataSet, values?: DIValues, applySelection?: (caseIds: string[]) => void
) {
  if (!dataSet || !applySelection) return unknownDataContextResult
  if (!values || !Array.isArray(values)) return illegalValuesResult(action)

  const caseIds = values.map(value => value.toString()).filter(caseID => !!dataSet.getCase(caseID))
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
    if (!dataContext) return unknownDataContextResult

    const caseIds = Array.from(dataContext.selection)
    // TODO Include collectionID and collectionName
    const values = caseIds.map(caseID => ({ caseID }))
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
