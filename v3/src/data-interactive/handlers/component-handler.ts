import { createOrShowTableForDataset } from "../../components/case-table/case-table-utils"
import { appState } from "../../models/app-state"
import { kSharedCaseMetadataType, SharedCaseMetadata } from "../../models/shared/shared-case-metadata"
import { getSharedDataSets } from "../../models/shared/shared-data-utils"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { uiState } from "../../models/ui-state"
import { maybeToV2Id } from "../../utilities/codap-utils"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DINotification, diNotImplementedYet, DIResources, DIValues } from "../data-interactive-types"
import { V2Component, kV2CaseTableType } from "../data-interactive-component-types"

const componentNotFoundResult = { success: false, values: { error: t("V3.DI.Error.componentNotFound") } } as const

export const diComponentHandler: DIHandler = {
  create(_resources: DIResources, values?: DIValues) {
    if (!values) return { success: false, values: { error: t("V3.DI.Error.valuesRequired") } }

    const { type, dataContext } = values as V2Component

    if (type === kV2CaseTableType) {
      if (!dataContext) {
        return {
          success: false,
          values: { error: t("V3.DI.Error.fieldRequired", { vars: ["Create", "caseTable", "dataContext"] }) }
        }
      }
      const { document } = appState
      const sharedDataSet = getSharedDataSets(document).find(sds => sds.dataSet.name === dataContext)
      const dataSet = sharedDataSet?.dataSet
      if (!dataSet) return { success: false, values: { error: t("V3.DI.Error.dataContextNotFound") } }

      const manager = getSharedModelManager(document)
      const caseMetadatas = manager?.getSharedModelsByType<typeof SharedCaseMetadata>(kSharedCaseMetadataType)
      const caseMetadata = caseMetadatas?.find(cm => cm.data?.id === dataSet.id)
      if (!caseMetadata) {
        return { success: false, values: { error: t("V3.DI.Error.caseMetadataNotFound", { vars: [dataContext] }) } }
      }

      const tile = createOrShowTableForDataset(sharedDataSet)

      // TODO Handle more options, like isIndexHidden
      return {
        success: true,
        values: {
          id: maybeToV2Id(tile?.id),
          title: tile?.title,
          type: kV2CaseTableType
        }
      }
    }

    // TODO Handle other types
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
  get: diNotImplementedYet,
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
  },
  update: diNotImplementedYet
}

registerDIHandler("component", diComponentHandler)
