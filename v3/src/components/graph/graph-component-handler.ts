import { getSnapshot } from "mobx-state-tree"
import { V2Graph } from "../../data-interactive/data-interactive-component-types"
import { DIComponentHandler } from "../../data-interactive/handlers/component-handler"
import { errorResult } from "../../data-interactive/handlers/di-results"
import { appState } from "../../models/app-state"
import { IDataSet } from "../../models/data/data-set"
import { ISharedCaseMetadata } from "../../models/shared/shared-case-metadata"
import { getSharedCaseMetadataFromDataset, getSharedDataSets } from "../../models/shared/shared-data-utils"
import { ITileContentModel, ITileContentSnapshotWithType } from "../../models/tiles/tile-content"
import { t } from "../../utilities/translation/translate"
import { isNumericAxisModel } from "../axis/models/axis-model"
import { attrRoleToGraphPlace, GraphAttrRole } from "../data-display/data-display-types"
import { IAttributeDescriptionSnapshot } from "../data-display/models/data-configuration-model"
import { kGraphTileType } from "./graph-defs"
import { GraphContentModel, IGraphContentModelSnapshot, isGraphContentModel } from "./models/graph-content-model"
import { IGraphDataConfigurationModel, kGraphDataConfigurationType } from "./models/graph-data-configuration-model"
import { GraphLayout } from "./models/graph-layout"
import { syncModelWithAttributeConfiguration } from "./models/graph-model-utils"
import { IGraphPointLayerModelSnapshot, kGraphPointLayerType } from "./models/graph-point-layer-model"

export const graphComponentHandler: DIComponentHandler = {
  create({ values }) {
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
    let provisionalDataSet: IDataSet | undefined
    let provisionalMetadata: ISharedCaseMetadata | undefined
    getSharedDataSets(appState.document).forEach(sharedDataSet => {
      const dataset = sharedDataSet.dataSet
      const metadata = getSharedCaseMetadataFromDataset(dataset)
      if (metadata) {
        const _attributeDescriptions: Partial<Record<GraphAttrRole, IAttributeDescriptionSnapshot>> = {}
        const _yAttributeDescriptions: IAttributeDescriptionSnapshot[] = []
        let hiddenCases: string[] = []
        if (dataset.name === _dataContext) {
          provisionalDataSet = dataset
          provisionalMetadata = metadata
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
            hiddenCases = dataset.itemIds.slice(0, dataset.itemIds.length - 1)
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
    // We use an environment with a provisionalDataSet and Metadata so the dummy model can be set up with
    // them, even though they are not part of the same MST tree.
    const graphModel = GraphContentModel.create(graphContent, { provisionalDataSet, provisionalMetadata })
    syncModelWithAttributeConfiguration(graphModel, new GraphLayout())

    // Layers will get mangled in the model because it's not in the same tree as the dataset,
    // so we mostly use the constructed layers. However, the primaryRole is determined in the model,
    // so we have to copy that over into the constructed layers. We also make sure all attribute assignments
    // are legal here.
    const finalLayers: Array<IGraphPointLayerModelSnapshot> = []
    for (let i = 0; i < layers.length; i++) {
      const dataConfiguration = graphModel.layers[i].dataConfiguration as IGraphDataConfigurationModel
      const { dataset } = dataConfiguration
      if (dataset && dataset.name === _dataContext) {
        // Make sure all attributes can legally fulfill their specified roles
        for (const attributeType in attributeNames) {
          const attributeName = attributeNames[attributeType]
          if (attributeName) {
            const attribute = dataset.getAttributeByName(attributeName)
            if (attribute) {
              const attributeRole = roleFromAttrKey[attributeType]
              const attributePlace = attrRoleToGraphPlace[attributeRole]
              if (attributePlace && !dataConfiguration.placeCanAcceptAttributeIDDrop(
                attributePlace, dataset, attribute.id, { allowSameAttr: true }
              )) {
                return errorResult(
                  t("V3.DI.Error.illegalAttributeAssignment", { vars: [attributeName, attributeRole] })
                )
              }
            }
          }
        }
      }

      // Use the primaryRole found by syncModelWithAttributeConfiguration
      const primaryRole = dataConfiguration.primaryRole
      const currentLayer = layers[i]
      const currentDataConfiguration = currentLayer.dataConfiguration
      finalLayers.push({
        ...currentLayer,
        dataConfiguration: {
          ...currentDataConfiguration,
          primaryRole
        }
      })
    }
    return { ...getSnapshot(graphModel), layers: finalLayers } as ITileContentSnapshotWithType
  },
  get(content: ITileContentModel) {
    if (isGraphContentModel(content)) {
      const dataset = content.dataset
      const dataContext = dataset?.name
      const { dataConfiguration } = content.graphPointLayerModel
      const { showParentToggles: enableNumberToggle, showOnlyLastCase: numberToggleLastMode } = content

      const captionAttributeId = dataConfiguration.attributeDescriptionForRole("caption")?.attributeID
      const captionAttributeName = captionAttributeId ? dataset?.getAttribute(captionAttributeId)?.name : undefined

      const legendAttributeId = dataConfiguration.attributeDescriptionForRole("legend")?.attributeID
      const legendAttributeName = legendAttributeId ? dataset?.getAttribute(legendAttributeId)?.name : undefined

      const rightSplitId = dataConfiguration.attributeDescriptionForRole("rightSplit")?.attributeID
      const rightSplitAttributeName = rightSplitId ? dataset?.getAttribute(rightSplitId)?.name : undefined

      const topSplitId = dataConfiguration.attributeDescriptionForRole("topSplit")?.attributeID
      const topSplitAttributeName = topSplitId ? dataset?.getAttribute(topSplitId)?.name : undefined

      const xAttributeId = dataConfiguration.attributeDescriptionForRole("x")?.attributeID
      const xAttributeName = xAttributeId ? dataset?.getAttribute(xAttributeId)?.name : undefined
      const xAxis = content.getAxis("bottom")
      const xNumericAxis = isNumericAxisModel(xAxis) ? xAxis : undefined
      const xLowerBound = xNumericAxis?.min
      const xUpperBound = xNumericAxis?.max

      const yAttributeId = dataConfiguration.attributeDescriptionForRole("y")?.attributeID
      const yAttributeName = yAttributeId ? dataset?.getAttribute(yAttributeId)?.name : undefined
      const yAxis = content.getAxis("left")
      const yNumericAxis = isNumericAxisModel(yAxis) ? yAxis : undefined
      const yLowerBound = yNumericAxis?.min
      const yUpperBound = yNumericAxis?.max

      const y2AttributeId = dataConfiguration.attributeDescriptionForRole("rightNumeric")?.attributeID
      const y2AttributeName = y2AttributeId ? dataset?.getAttribute(y2AttributeId)?.name : undefined
      const y2Axis = content.getAxis("rightNumeric")
      const y2NumericAxis = isNumericAxisModel(y2Axis) ? y2Axis : undefined
      const y2LowerBound = y2NumericAxis?.min
      const y2UpperBound = y2NumericAxis?.max

      return {
        dataContext, enableNumberToggle, numberToggleLastMode,
        captionAttributeName, legendAttributeName,
        rightSplitAttributeName, topSplitAttributeName,
        xAttributeName, xLowerBound, xUpperBound,
        yAttributeName, yLowerBound, yUpperBound,
        y2AttributeName, y2LowerBound, y2UpperBound
      }
    }
  }
}
