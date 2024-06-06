import { SetRequired } from "type-fest"
import { kCaseCardTileType } from "../../components/case-card/case-card-defs"
import { kCaseTableTileType } from "../../components/case-table/case-table-defs"
import { createOrShowTableOrCardForDataset } from "../../components/case-table/case-table-utils"
import { GraphAttrRole } from "../../components/data-display/data-display-types"
import { IGraphContentModel } from "../../components/graph/models/graph-content-model"
import { IMapContentModel } from "../../components/map/models/map-content-model"
import { kSliderTileType } from "../../components/slider/slider-defs"
import { ISliderSnapshot, isSliderModel } from "../../components/slider/slider-model"
import { AnimationDirections, AnimationModes } from "../../components/slider/slider-types"
import { kWebViewTileType } from "../../components/web-view/web-view-defs"
import { IWebViewSnapshot } from "../../components/web-view/web-view-model"
import { appState } from "../../models/app-state"
import { GlobalValueManager } from "../../models/global/global-value-manager"
import { kSharedCaseMetadataType, SharedCaseMetadata } from "../../models/shared/shared-case-metadata"
import { ISharedDataSet } from "../../models/shared/shared-data-set"
import { getSharedDataSets } from "../../models/shared/shared-data-utils"
import { ITileContentSnapshotWithType } from "../../models/tiles/tile-content"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { uiState } from "../../models/ui-state"
import { toV2Id } from "../../utilities/codap-utils"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DINotification, diNotImplementedYet, DIResources, DIValues } from "../data-interactive-types"
import {
  kComponentTypeV2ToV3Map, kV2CalculatorType, kV2CaseCardType, kV2CaseTableType, kV2GameType, kV2GraphType,
  kV2MapType, kV2SliderType, kV2WebViewType, V2CaseTable, V2Component, V2Graph, V2Map, V2Slider, V2WebView
} from "../data-interactive-component-types"
import { componentNotFoundResult, dataContextNotFoundResult, valuesRequiredResult } from "./di-results"

export const diComponentHandler: DIHandler = {
  create(_resources: DIResources, values?: DIValues) {
    if (!values) return valuesRequiredResult

    const { type, cannotClose, dimensions, name, title: _title } = values as V2Component
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
    const componentNotCreatedResult = {
      success: false as const,
      values: { error: t("V3.DI.Error.componentNotCreated") }
    }
    return document.applyModelChange(() => {
      // Special case for caseCard and caseTable, which require a dataset
      if ([kV2CaseCardType, kV2CaseTableType].includes(type)) {
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

        const tileType = type === kV2CaseCardType ? kCaseCardTileType : kCaseTableTileType
        const tile = createOrShowTableOrCardForDataset(sharedDataSet, tileType)
        if (!tile) return componentNotCreatedResult

        // TODO Handle horizontalScrollOffset and isIndexHidden 
        return {
          success: true,
          values: {
            id: toV2Id(tile.id),
            title: tile.title,
            type
          }
        }

      // General case
      } else if (kComponentTypeV2ToV3Map[type]) {
        let content: ITileContentSnapshotWithType | undefined

        // Calculator
        if (type === kV2CalculatorType) {
          // No special options for calculator

        // Slider
        } else if (type === kV2SliderType) {
          const {
            animationDirection: _animationDirection, animationMode: _animationMode, globalValueName,
            lowerBound, upperBound
          } = values as V2Slider

          if (globalValueName) {
            const globalManager = document.content?.getFirstSharedModelByType(GlobalValueManager)
            const global = globalManager?.getValueByName(globalValueName)
            if (!global) {
              return {
                success: false,
                values: { error: t("V3.DI.Error.globalNotFound", { vars: [globalValueName] }) }
              }
            }

            // Multiple sliders for one global value are not allowed
            let existingTile = false
            document.content?.tileMap.forEach(sliderTile => {
              if (isSliderModel(sliderTile.content) && sliderTile.content.globalValue.id === global.id) {
                existingTile = true
              }
            })
            if (existingTile) {
              return {
                success: false,
                values: { error: t("V3.DI.Error.noMultipleSliders", { vars: [globalValueName] }) }
              }
            }

            const animationDirection = _animationDirection != null
              ? AnimationDirections[Number(_animationDirection)] : undefined
            const animationMode = _animationMode != null ? AnimationModes[_animationMode] : undefined
            content = {
              type: kSliderTileType,
              animationDirection,
              animationMode,
              axis: { min: lowerBound, max: upperBound, place: "bottom" },
              globalValue: global.id
            } as SetRequired<ISliderSnapshot, "type">
          }

        // WebView/Plugin
        } else if ([kV2GameType, kV2WebViewType].includes(type)) {
          const { URL } = values as V2WebView
          content = { type: kWebViewTileType, url: URL } as SetRequired<IWebViewSnapshot, "type">
        }

        // Create the tile
        const title = _title ?? name
        const options = { cannotClose, content, ...dimensions, title }
        const tile = document.content?.createOrShowTile(kComponentTypeV2ToV3Map[type], options)
        if (!tile) return componentNotCreatedResult

        // TODO Handle position

        // Update components based on unique type options
        // Calculator
        if (type === kV2CalculatorType) {
          // No special options for calculator

        // Graph
        } else if (type === kV2GraphType) {
          const graphTile = tile.content as IGraphContentModel
          const {
            captionAttributeName, dataContext, enableNumberToggle, legendAttributeName, numberToggleLastMode,
            rightNumericAttributeName, rightSplitAttributeName, topSplitAttributeName, xAttributeName,
            yAttributeName, y2AttributeName
          } = values as V2Graph
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
              // TODO Figure out how to do this without setTimeout
              setTimeout(() => {
                graphTile.applyModelChange(() => {
                  setAttribute("caption", captionAttributeName)
                  setAttribute("legend", legendAttributeName)
                  setAttribute("rightNumeric", rightNumericAttributeName)
                  setAttribute("rightSplit", rightSplitAttributeName)
                  setAttribute("topSplit", topSplitAttributeName)
                  setAttribute("x", xAttributeName)
                  setAttribute("y", yAttributeName)
                  setAttribute("yPlus", y2AttributeName)
                  if (enableNumberToggle != null) graphTile.setShowParentToggles(enableNumberToggle)
                  if (numberToggleLastMode != null) {
                    graphTile.setShowOnlyLastCase(numberToggleLastMode)
                    if (numberToggleLastMode) {
                      const caseIds = dataSet.cases.map(aCase => aCase.__id__)
                      const lastCaseId = caseIds[caseIds.length - 1]
                      const hiddenCaseIDs = caseIds.filter(caseId => caseId !== lastCaseId)
                      graphTile.layers.forEach(layer => {
                        layer.dataConfiguration.setHiddenCases(hiddenCaseIDs)
                      })
                    }
                  }
                })
              })
            }
          }

        // Map
        } else if (type === kV2MapType) {
          const mapTile = tile.content as IMapContentModel
          const { center, dataContext, legendAttributeName, zoom } = values as V2Map
          // TODO Figure out a way to set the center and zoom without setTimeout.
          // Center and zoom require an actual wait to not get overwritten.
          setTimeout(() => {
            mapTile.applyModelChange(() => {
              if (center) mapTile.setCenter({ lat: center[0], lng: center[1] })
              if (zoom != null) mapTile.setZoom(zoom)
            })
          }, 575)
          // TODO Figure out a way to set the legend attribute without setTimeout.
          // This is in a separate setTimeout because it doesn't require a wait like center and zoom.
          setTimeout(() => {
            mapTile.applyModelChange(() => {
              if (dataContext) {
                const dataSet = getDataSet(dataContext)
                if (dataSet) {
                  if (legendAttributeName) {
                    const attribute = dataSet.getAttributeByName(legendAttributeName)
                    if (attribute) mapTile.setLegendAttributeID(dataSet.id, attribute.id)
                  }
                }
              }
            })
          })
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
      // text
      // guide
      // image view
      return { success: false, values: { error: t("V3.DI.Error.unsupportedComponent", { vars: [type] }) } }
    })
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
