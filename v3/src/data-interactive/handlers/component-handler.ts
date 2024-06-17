import { getSnapshot } from "mobx-state-tree"
import { SetRequired } from "type-fest"
import { kCaseCardTileType } from "../../components/case-card/case-card-defs"
import { createOrShowTableOrCardForDataset } from "../../components/case-table-card-common/case-table-card-utils"
import { kCaseTableTileType } from "../../components/case-table/case-table-defs"
import { GraphAttrRole } from "../../components/data-display/data-display-types"
import {
  AttributeDescriptionsMapSnapshot, IAttributeDescriptionSnapshot, kDataConfigurationType
} from "../../components/data-display/models/data-configuration-model"
import { kGraphTileType } from "../../components/graph/graph-defs"
import { GraphContentModel, IGraphContentModelSnapshot } from "../../components/graph/models/graph-content-model"
import { kGraphDataConfigurationType } from "../../components/graph/models/graph-data-configuration-model"
import { GraphLayout } from "../../components/graph/models/graph-layout"
import { syncModelWithAttributeConfiguration } from "../../components/graph/models/graph-model-utils"
import {
  IGraphPointLayerModelSnapshot, kGraphPointLayerType
} from "../../components/graph/models/graph-point-layer-model"
import { IMapBaseLayerModelSnapshot } from "../../components/map/models/map-base-layer-model"
import { IMapModelContentSnapshot } from "../../components/map/models/map-content-model"
import { kMapTileType } from "../../components/map/map-defs"
import { kMapPointLayerType, kMapPolygonLayerType } from "../../components/map/map-types"
import { IMapPointLayerModelSnapshot } from "../../components/map/models/map-point-layer-model"
import { IMapPolygonLayerModelSnapshot } from "../../components/map/models/map-polygon-layer-model"
import {
  boundaryAttributeFromDataSet, datasetHasBoundaryData, datasetHasLatLongData, latLongAttributesFromDataSet
} from "../../components/map/utilities/map-utils"
import { kSliderTileType } from "../../components/slider/slider-defs"
import { ISliderSnapshot, isSliderModel } from "../../components/slider/slider-model"
import { AnimationDirections, AnimationModes } from "../../components/slider/slider-types"
import { kWebViewTileType } from "../../components/web-view/web-view-defs"
import { IWebViewSnapshot } from "../../components/web-view/web-view-model"
import { appState } from "../../models/app-state"
import { INewTileOptions } from "../../models/codap/create-tile"
import { IDataSet } from "../../models/data/data-set"
import { GlobalValueManager } from "../../models/global/global-value-manager"
import {
  ISharedCaseMetadata, kSharedCaseMetadataType, SharedCaseMetadata
} from "../../models/shared/shared-case-metadata"
import { ISharedDataSet } from "../../models/shared/shared-data-set"
import { getSharedDataSets } from "../../models/shared/shared-data-utils"
import { ITileContentSnapshotWithType } from "../../models/tiles/tile-content"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { uiState } from "../../models/ui-state"
import { toV2Id } from "../../utilities/codap-utils"
import { t } from "../../utilities/translation/translate"
import {
  kComponentTypeV2ToV3Map, kV2CalculatorType, kV2CaseCardType, kV2CaseTableType, kV2GameType, kV2GraphType,
  kV2MapType, kV2SliderType, kV2WebViewType, V2CaseTable, V2Component, V2Graph, V2Map, V2Slider, V2WebView
} from "../data-interactive-component-types"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DINotification, diNotImplementedYet, DIResources, DIValues } from "../data-interactive-types"
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

        const title = _title ?? name
        const options = { cannotClose, ...dimensions, title }

        const tileType = type === kV2CaseCardType ? kCaseCardTileType : kCaseTableTileType
        const tile = createOrShowTableOrCardForDataset(sharedDataSet, tileType, options)
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
        const extraOptions: INewTileOptions = {}

        // Calculator
        if (type === kV2CalculatorType) {
          // No special options for calculator

        // Graph
        } else if (type === kV2GraphType) {
          const {
            captionAttributeName, dataContext: _dataContext, enableNumberToggle: showParentToggles, legendAttributeName,
            numberToggleLastMode: showOnlyLastCase, rightNumericAttributeName, rightSplitAttributeName,
            topSplitAttributeName, xAttributeName, yAttributeName, y2AttributeName
          } = values as V2Graph
          const attributeNames: Record<string, string | undefined> = {
            captionAttributeName, legendAttributeName, rightNumericAttributeName, rightSplitAttributeName,
            topSplitAttributeName, xAttributeName, y2AttributeName
          }
          const roleFromAttrKey: Record<string, GraphAttrRole> = {
            xAttributeName: "x",
            yAttributeName: "y",
            y2AttributeName: "rightNumeric",
            rightNumericAttributeName: "rightNumeric",
            captionAttributeName: "caption",
            legendAttributeName: "legend",
            topSplitAttributeName: "topSplit",
            rightSplitAttributeName: "rightSplit"
          }

          let layerIndex = 0
          const layers: Array<IGraphPointLayerModelSnapshot> = []
          let firstDataSet: IDataSet | undefined
          let firstMetaData: ISharedCaseMetadata | undefined
          getSharedDataSets(document).forEach(sharedDataSet => {
            const dataset = sharedDataSet.dataSet
            const metadata = getCaseMetadata(dataset.id)
            if (metadata) {
              if (!firstDataSet) {
                firstDataSet = dataset
                firstMetaData = metadata
              }
              const _attributeDescriptions: Partial<Record<GraphAttrRole, IAttributeDescriptionSnapshot>> = {}
              const _yAttributeDescriptions: IAttributeDescriptionSnapshot[] = []
              let hiddenCases: string[] = []
              if (dataset.name === _dataContext) {
                for (const attributeType in attributeNames) {
                  const attributeName = attributeNames[attributeType]
                  if (attributeName) {
                    const attribute = dataset.getAttributeByName(attributeName)
                    if (attribute) {
                      const attributeRole = roleFromAttrKey[attributeType]
                      if (attributeRole) {
                        _attributeDescriptions[attributeRole] = { attributeID: attribute.id, type: attribute.type }
                      }
                    }
                  }
                }

                if (yAttributeName) {
                  const yAttribute = dataset.getAttributeByName(yAttributeName)
                  if (yAttribute) {
                    _yAttributeDescriptions.push({ attributeID: yAttribute.id, type: yAttribute.type })
                  }
                }

                if (showOnlyLastCase) {
                  hiddenCases = dataset.cases.map(aCase => aCase.__id__).slice(0, dataset.cases.length - 1)
                }
              }

              layers.push({
                dataConfiguration: {
                  type: kGraphDataConfigurationType,
                  dataset: dataset.id,
                  hiddenCases,
                  metadata: metadata.id,
                  _attributeDescriptions,
                  _yAttributeDescriptions
                },
                layerIndex: layerIndex++,
                type: kGraphPointLayerType
              })
            }
          })

          // Create a GraphContentModel, call syncModelWithAttributeConfiguration to set up its primary role,
          // plot type, and axes properly, then use its snapshot
          const graphContent: IGraphContentModelSnapshot = {
            type: kGraphTileType,
            layers,
            showOnlyLastCase,
            showParentToggles
          }
          const graphModel = GraphContentModel.create(graphContent)
          syncModelWithAttributeConfiguration(graphModel, new GraphLayout(), firstDataSet, firstMetaData)

          // Layers will get mangled in the model because it's not in the same tree as the dataset,
          // so we use the constructed layers here
          content = { ...getSnapshot(graphModel), layers } as ITileContentSnapshotWithType

        // Map
        } else if (type === kV2MapType) {
          const { center: _center, dataContext: _dataContext, legendAttributeName, zoom } = values as V2Map
          const dataContext = _dataContext ? getDataSet(_dataContext) : undefined
          const legendAttributeId = legendAttributeName
            ? dataContext?.getAttributeByName(legendAttributeName)?.id : undefined
          const layers:
            Array<IMapBaseLayerModelSnapshot | IMapPolygonLayerModelSnapshot | IMapPointLayerModelSnapshot> = []
          let layerIndex = 0
          getSharedDataSets(document).forEach(sharedDataSet => {
            const dataset = sharedDataSet.dataSet
            const metadata = getCaseMetadata(dataset.id)
            if (metadata) {
              const LayerTypes = [kMapPointLayerType, kMapPolygonLayerType] as const
              type LayerType = typeof LayerTypes[number]
              const addLayer = (_type: LayerType, _attributeDescriptions: AttributeDescriptionsMapSnapshot) => {
                layers.push({
                  dataConfiguration: {
                    _attributeDescriptions,
                    dataset: dataset.id,
                    metadata: metadata.id,
                    type: kDataConfigurationType
                  },
                  layerIndex: layerIndex++,
                  type: _type
                })
              }

              // Point Layer
              if (datasetHasLatLongData(dataset)) {
                const { latId, longId } = latLongAttributesFromDataSet(dataset)
                const _attributeDescriptions: AttributeDescriptionsMapSnapshot = {
                  lat: { attributeID: latId },
                  long: { attributeID: longId }
                }
                if (dataset.id === dataContext?.id && legendAttributeId) {
                  _attributeDescriptions.legend = { attributeID: legendAttributeId }
                }
                addLayer(kMapPointLayerType, _attributeDescriptions)

              // Polygon Layer
              } else if (datasetHasBoundaryData(dataset)) {
                const _attributeDescriptions: AttributeDescriptionsMapSnapshot = {
                  polygon: { attributeID: boundaryAttributeFromDataSet(dataset) }
                }
                addLayer(kMapPolygonLayerType, _attributeDescriptions)
              }
            }
          })

          const center = _center ? { lat: _center[0], lng: _center[1] } : undefined
          const mapContent: IMapModelContentSnapshot = {
            type: kMapTileType,
            center,
            layers,
            zoom
          }
          content = mapContent as ITileContentSnapshotWithType
          // If the center or zoom are specified, we need to prevent CODAP from automatically focusing the map
          if (center || zoom != null) extraOptions.transitionComplete = true

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

        // TODO Handle other types:
        // text
        // guide
        // image view

        // Create the tile
        const title = _title ?? name
        const options = { cannotClose, content, ...dimensions, title, ...extraOptions }
        const tile = document.content?.createOrShowTile(kComponentTypeV2ToV3Map[type], options)
        if (!tile) return componentNotCreatedResult

        // TODO Handle position

        return {
          success: true,
          values: {
            id: toV2Id(tile.id),
            title: tile.title,
            type
          }
        }
      }

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
