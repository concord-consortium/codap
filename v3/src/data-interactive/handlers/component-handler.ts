import { createOrShowTableForDataset } from "../../components/case-table/case-table-utils"
import { appState } from "../../models/app-state"
import { kSharedCaseMetadataType, SharedCaseMetadata } from "../../models/shared/shared-case-metadata"
import { getSharedDataSets } from "../../models/shared/shared-data-utils"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { uiState } from "../../models/ui-state"
import { toV2Id } from "../../utilities/codap-utils"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DINotification, diNotImplementedYet, DIResources, DIValues } from "../data-interactive-types"
import {
  kComponentTypeV2ToV3Map, kV2CaseTableType, kV2GraphType, V2CaseTable, V2Component, V2Graph
} from "../data-interactive-component-types"
import { componentNotFoundResult, dataContextNotFoundResult, valuesRequiredResult } from "./di-results"
import { IGraphContentModel } from "../../components/graph/models/graph-content-model"
import { ISharedDataSet } from "../../models/shared/shared-data-set"
import { GraphAttrRole } from "../../components/data-display/data-display-types"

export const diComponentHandler: DIHandler = {
  create(_resources: DIResources, values?: DIValues) {
    if (!values) return valuesRequiredResult

    const { type, dimensions, name, title } = values as V2Component
    const { document } = appState

    function getSharedDataSet(dataContext: string) {
      return getSharedDataSets(document).find(sds => sds.dataSet.name === dataContext)
    }
    function getDataSet(dataContext: string, _sharedDataSet?: ISharedDataSet) {
      const sharedDataSet = _sharedDataSet ?? getSharedDataSet(dataContext)
      return sharedDataSet?.dataSet
    }
    function getCaseMetadata(dataSetId: string) {
      const manager = getSharedModelManager(document)
      const caseMetadatas = manager?.getSharedModelsByType<typeof SharedCaseMetadata>(kSharedCaseMetadataType)
      return caseMetadatas?.find(cm => cm.data?.id === dataSetId)
    }

    const dataContextRequiredResult = {
      success: false as const,
      values: { error: t("V3.DI.Error.fieldRequired", { vars: ["Create", type, "dataContext"] }) }
    }
    if (type === kV2CaseTableType) {
      const { dataContext } = values as V2CaseTable
      if (!dataContext) return dataContextRequiredResult
      const sharedDataSet = getSharedDataSet(dataContext)
      if (!sharedDataSet) return dataContextNotFoundResult
      const dataSet = getDataSet(dataContext, sharedDataSet)
      if (!dataSet) return dataContextNotFoundResult

      const caseMetadata = getCaseMetadata(dataSet.id)
      if (!caseMetadata) {
        return { success: false, values: { error: t("V3.DI.Error.caseMetadataNotFound", { vars: [dataContext] }) } }
      }

      const tile = createOrShowTableForDataset(sharedDataSet)
      if (!tile) return { success: false, values: { error: "Unable to create tile." } }

      // TODO Handle more options, like isIndexHidden
      return {
        success: true,
        values: {
          id: toV2Id(tile.id),
          title: tile.title,
          type
        }
      }
    } else if (kComponentTypeV2ToV3Map[type]) {
      const tile = document.content?.createOrShowTile(kComponentTypeV2ToV3Map[type], dimensions)
      if (!tile) return { success: false, values: { error: "Unable to create tile." } }

      if (title) {
        tile.setTitle(title)
      } else if (name) {
        tile.setTitle(name)
      }

      // TODO Handle position

      if (type === kV2GraphType) {
        const graphTile = tile.content as IGraphContentModel
        const { dataContext, legendAttributeName, xAttributeName, yAttributeName, y2AttributeName } = values as V2Graph
        if (dataContext) {
          const dataSet = getDataSet(dataContext)
          if (dataSet) {
            const caseMetadata = getCaseMetadata(dataSet.id)
            graphTile.layers.forEach(layer => layer.dataConfiguration.setDataset(dataSet, caseMetadata))

            const setAttribute = (role: GraphAttrRole, attributeName?: string) => {
              if (attributeName) {
                const attribute = dataSet.getAttributeByName(attributeName)
                if (attribute) {
                  graphTile.setAttributeID(role, dataSet.id, attribute.id)
                }
              }
            }
            setTimeout(() => {
              setAttribute("legend", legendAttributeName)
              setAttribute("x", xAttributeName)
              setAttribute("y", yAttributeName)
              setAttribute("yPlus", y2AttributeName)
            })

            // TODO Handle enableNumberToggle and numberToggleLastMode
          }
        }
      }

      return {
        success: true,
        values: {
          id: toV2Id(tile.id),
          title: tile.title,
          type
        }
      }
    }

    // TODO Handle other types:
    // map
    // slider
    // calculator
    // text
    // webView
    // guide
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

    if (!values) return valuesRequiredResult

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
