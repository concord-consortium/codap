import { appState } from "../../models/app-state"
import { kSharedCaseMetadataType, SharedCaseMetadata } from "../../models/shared/shared-case-metadata"
import { getSharedDataSets } from "../../models/shared/shared-data-utils"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { uiState } from "../../models/ui-state"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DINotification, DIResources, DIValues } from "../data-interactive-types"
import { V2Component, kV2CaseTableType } from "../data-interactive-component-types"
import { openTableForDataset } from "../../components/case-table/case-table-utils"

const componentNotFoundResult = { success: false, values: { error: t("V3.DI.Error.componentNotFound") } } as const

export const diComponentHandler: DIHandler = {
  create(_resources: DIResources, values?: DIValues) {
    const { type, dataContext } = values as V2Component

    if (type === kV2CaseTableType) {
      if (!dataContext) return { success: false, values: { error: "dataContext required to create caseTable" } }
      const { document } = appState
      const sharedDataSet = getSharedDataSets(document).find(sds => sds.dataSet.name === dataContext)
      const dataSet = sharedDataSet?.dataSet
      if (!dataSet) return { success: false, values: { error: t("V3.DI.Error.dataContextNotFound") } }

      const manager = getSharedModelManager(document)
      const caseMetadatas = manager?.getSharedModelsByType<typeof SharedCaseMetadata>(kSharedCaseMetadataType)
      const caseMetadata = caseMetadatas?.find(cm => cm.data?.id === dataSet.id)
      if (!caseMetadata) {
        return { success: false, values: { error: `Unable to locate caseMetadata for ${dataContext}` } }
      }

      const tile = openTableForDataset(sharedDataSet, caseMetadata)
      return {
        success: true,
        values: {
          id: tile?.id,
          title: tile?.title,
          type: kV2CaseTableType
        }
      }
    }

    return { success: false, values: { error: `Unsupported component type ${type}` } }
  },
  delete(resources: DIResources) {
    const { component } = resources
    if (!component) return componentNotFoundResult

    const { document } = appState
    document.applyModelChange(() => {
      document.content?.deleteOrHideTile(component.id)
    })

    return { success: true }
  },
  notify(resources: DIResources, values?: DIValues) {
    const { component } = resources
    if (!component) return componentNotFoundResult

    if (!values) return { success: false, values: { error: t("V3.DI.Error.valuesRequired") } }

    const { request } = values as DINotification
    if (request === "select") {
      uiState.setFocusedTile(component.id)
    // } else if (request === "autoScale") { // TODO Handle autoScale requests
    }

    return { success: true }
  }
}

registerDIHandler("component", diComponentHandler)
