import { destroy, getSnapshot } from "mobx-state-tree"
import { V2GetGraph, V2Graph } from "../../data-interactive/data-interactive-component-types"
import { DIValues } from "../../data-interactive/data-interactive-types"
import { DIComponentHandler } from "../../data-interactive/handlers/component-handler"
import { errorResult } from "../../data-interactive/handlers/di-results"
import { appState } from "../../models/app-state"
import { IAttribute } from "../../models/data/attribute"
import { isAttributeType } from "../../models/data/attribute-types"
import { IDataSet } from "../../models/data/data-set"
import { IDataSetMetadata } from "../../models/shared/data-set-metadata"
import { getMetadataFromDataSet, getSharedDataSets } from "../../models/shared/shared-data-utils"
import { ITileContentModel, ITileContentSnapshotWithType } from "../../models/tiles/tile-content"
import { maybeToV2Id, toV2Id, toV3AttrId, toV3CaseId, toV3DataSetId } from "../../utilities/codap-utils"
import { t } from "../../utilities/translation/translate"
import { AxisPlace } from "../axis/axis-types"
import { isAnyNumericAxisModel } from "../axis/models/numeric-axis-models"
import { attrRoleToGraphPlace, GraphAttrRole } from "../data-display/data-display-types"
import { IAttributeDescriptionSnapshot } from "../data-display/models/data-configuration-model"
import { kGraphTileType } from "./graph-defs"
import { GraphContentModel, IGraphContentModelSnapshot, isGraphContentModel } from "./models/graph-content-model"
import { IGraphDataConfigurationModel, kGraphDataConfigurationType } from "./models/graph-data-configuration-model"
import { GraphLayout } from "./models/graph-layout"
import { syncModelWithAttributeConfiguration } from "./models/graph-model-utils"
import { IGraphPointLayerModelSnapshot, kGraphPointLayerType } from "./models/graph-point-layer-model"

interface AttributeInfo {
  id?: number | null
  name?: string | null
  type?: string
}
function packageAttribute(id?: number | null, name?: string | null, type?: string): Maybe<AttributeInfo> {
  if (id || id === null || name || name === null) {
    return { id, name, type }
  }
}
function getAttributeInfo(values?: DIValues): Record<string, Maybe<AttributeInfo>> {
  const {
    captionAttributeID, captionAttributeName, legendAttributeID, legendAttributeName, rightNumericAttributeID,
    rightNumericAttributeName, rightSplitAttributeID, rightSplitAttributeName, topSplitAttributeID,
    topSplitAttributeName, xAttributeID, xAttributeName, xAttributeType, y2AttributeID, y2AttributeName, y2AttributeType
  } = values as V2Graph
  return {
    caption: packageAttribute(captionAttributeID, captionAttributeName),
    legend: packageAttribute(legendAttributeID, legendAttributeName),
    rightNumeric: packageAttribute(rightNumericAttributeID, rightNumericAttributeName),
    rightSplit: packageAttribute(rightSplitAttributeID, rightSplitAttributeName),
    topSplit: packageAttribute(topSplitAttributeID, topSplitAttributeName),
    x: packageAttribute(xAttributeID, xAttributeName, xAttributeType),
    y2: packageAttribute(y2AttributeID, y2AttributeName, y2AttributeType)
  }
}
function getAttributeFromInfo(dataset: IDataSet, info?: AttributeInfo) {
  let attribute: Maybe<IAttribute>
  if (info?.id != null) {
    attribute = dataset.getAttribute(toV3AttrId(info.id))
  }
  if (!attribute && info?.name != null) {
    attribute = dataset.getAttributeByName(info.name)
  }
  return attribute
}
const roleFromAttrKey: Record<string, GraphAttrRole> = {
  x: "x",
  y: "y",
  y2: "rightNumeric",
  rightNumeric: "rightNumeric",
  caption: "caption",
  legend: "legend",
  topSplit: "topSplit",
  rightSplit: "rightSplit"
}

export const graphComponentHandler: DIComponentHandler = {
  create({ values }) {
    const {
      backgroundColor, dataContext: _dataContext, displayOnlySelectedCases, enableNumberToggle: showParentToggles,
      filterFormula, hiddenCases: _hiddenCases, numberToggleLastMode: showOnlyLastCase, pointColor,
      pointSize, showMeasuresForSelection, strokeColor, strokeSameAsFill, transparent,
      yAttributeID, yAttributeIDs, yAttributeName, yAttributeNames, yAttributeType
    } = values as V2Graph
    const attributeInfo = getAttributeInfo(values)

    let layerIndex = 0
    const layers: Array<IGraphPointLayerModelSnapshot> = []
    let provisionalDataSet: IDataSet | undefined
    let provisionalMetadata: IDataSetMetadata | undefined
    const sharedDataSets = getSharedDataSets(appState.document)
    // We currently only support one dataset in a graph, so we find the one specified by plugin
    const sharedDataSet = sharedDataSets.length === 1
                            ? sharedDataSets[0]
                            : sharedDataSets.find(sd => {
                              return _dataContext && sd.dataSet.matchTitleOrNameOrId(_dataContext)
                            })
    if (sharedDataSet) {
      const dataset = sharedDataSet.dataSet
      const metadata = getMetadataFromDataSet(dataset)
      if (metadata) {
        const _attributeDescriptions: Partial<Record<GraphAttrRole, IAttributeDescriptionSnapshot>> = {}
        const _yAttributeDescriptions: IAttributeDescriptionSnapshot[] = []
        let hiddenCases = _hiddenCases?.map(id => toV3CaseId(id)) ?? []
        if (dataset.name === _dataContext) {
          provisionalDataSet = dataset
          provisionalMetadata = metadata
          for (const attributeType in attributeInfo) {
            const attribute = getAttributeFromInfo(dataset, attributeInfo[attributeType])
            if (attribute) {
              const attributeRole = roleFromAttrKey[attributeType]
              if (attributeRole) {
                const _type = attributeInfo[attributeType]?.type
                const type = _type && isAttributeType(_type) ? _type : attribute.type
                _attributeDescriptions[attributeRole] = { attributeID: attribute.id, type }
              }
            }
          }

          const _yAttributeType = isAttributeType(yAttributeType) ? yAttributeType : undefined
          if (yAttributeIDs) {
            yAttributeIDs.forEach(id => {
              const attribute = dataset.getAttribute(toV3AttrId(id))
              if (attribute) _yAttributeDescriptions.push({ attributeID: attribute.id, type: _yAttributeType })
            })
          } else if (yAttributeNames) {
            yAttributeNames.forEach(name => {
              const attribute = dataset.getAttributeByName(name)
              if (attribute) _yAttributeDescriptions.push({ attributeID: attribute.id, type: _yAttributeType })
            })
          } else {
            let yAttribute: Maybe<IAttribute>
            if (yAttributeID != null) {
              yAttribute = dataset.getAttribute(toV3AttrId(yAttributeID))
            }
            if (!yAttribute && yAttributeName != null) {
              yAttribute = dataset.getAttributeByName(yAttributeName)
            }
            if (yAttribute) {
              _yAttributeDescriptions.push({ attributeID: yAttribute.id, type: _yAttributeType })
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
            displayOnlySelectedCases,
            filterFormula: { display: filterFormula },
            hiddenCases,
            metadata: metadata.id,
            _attributeDescriptions,
            _yAttributeDescriptions
          },
          layerIndex: layerIndex++,
          type: kGraphPointLayerType
        })
      }
    }

    // Create a GraphContentModel, call syncModelWithAttributeConfiguration to set up its primary role,
    // plot type, and axes properly, then use its snapshot
    const graphContent: IGraphContentModelSnapshot = {
      isTransparent: transparent,
      layers,
      plotBackgroundColor: backgroundColor,
      pointDescription: {
        _itemColors: pointColor != null ? [pointColor] : undefined,
        _itemStrokeColor: strokeColor,
        _itemStrokeSameAsFill: strokeSameAsFill,
        _pointSizeMultiplier: pointSize
      },
      showOnlyLastCase,
      showParentToggles,
      type: kGraphTileType
    }
    // We use an environment with a provisionalDataSet and Metadata so the dummy model can be set up with
    // them, even though they are not part of the same MST tree.
    const graphModel = GraphContentModel.create(graphContent, { provisionalDataSet, provisionalMetadata })
    graphModel.dataConfiguration.synchronizeFilteredCases()  // kludgy workaround to ensure axis bounds will be correct
    syncModelWithAttributeConfiguration(graphModel, new GraphLayout())

    // Layers will get mangled in the model because it's not in the same tree as the dataset,
    // so we mostly use the constructed layers. However, the primaryRole is determined in the model,
    // so we have to copy that over into the constructed layers. We also make sure all attribute assignments
    // are legal here.
    const finalLayers: Array<IGraphPointLayerModelSnapshot> = []
    for (let i = 0; i < layers.length; i++) {
      const dataConfiguration = graphModel.layers[i].dataConfiguration as IGraphDataConfigurationModel
      dataConfiguration.setShowMeasuresForSelection(showMeasuresForSelection ?? false)
      const { dataset } = dataConfiguration
      if (dataset && dataset.name === _dataContext) {
        // Make sure all attributes can legally fulfill their specified roles
        for (const attributeType in attributeInfo) {
          const attributePackage = attributeInfo[attributeType]
          const attribute = getAttributeFromInfo(dataset, attributePackage)
          if (attribute) {
            const attributeRole = roleFromAttrKey[attributeType]
            const attributePlace = attrRoleToGraphPlace[attributeRole]
            if (attributePlace && !dataConfiguration.placeCanAcceptAttributeIDDrop(
              attributePlace, dataset, attribute.id, { allowSameAttr: true }
            )) {
              return errorResult(
                t("V3.DI.Error.illegalAttributeAssignment", {
                  vars: [attributePackage?.id ?? attributePackage?.name ?? "", attributeRole]
                })
              )
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

    // TODO: There is a race condition that causes a d3 error when we try to
    // add the connecting lines on graph creation. So disabling this feature
    // for now, and we use update graph to enable it.
    // Enable connecting lines after the graph model is fully initialized
    // if (showConnectingLines !== undefined) {
    //     graphModel.adornmentsStore.setShowConnectingLines(showConnectingLines)
    // }

    const result = { content: { ...getSnapshot(graphModel), layers: finalLayers } as ITileContentSnapshotWithType }
    // After we get the snapshot, destroy the model to stop all reactions
    destroy(graphModel)
    return result
  },

  get(content: ITileContentModel): Maybe<V2Graph> {
    if (isGraphContentModel(content)) {
      const dataset = content.dataset
      const dataContext = dataset?.name
      const { dataConfiguration } = content.graphPointLayerModel
      const { showParentToggles: enableNumberToggle, showOnlyLastCase: numberToggleLastMode } = content

      const _captionAttributeID = dataConfiguration.attributeDescriptionForRole("caption")?.attributeID
      const captionAttributeID = maybeToV2Id(_captionAttributeID)
      const captionAttributeName = _captionAttributeID ? dataset?.getAttribute(_captionAttributeID)?.name : undefined

      const _legendAttributeID = dataConfiguration.attributeDescriptionForRole("legend")?.attributeID
      const legendAttributeID = maybeToV2Id(_legendAttributeID)
      const legendAttributeName = _legendAttributeID ? dataset?.getAttribute(_legendAttributeID)?.name : undefined

      const _rightSplitAttributeID = dataConfiguration.attributeDescriptionForRole("rightSplit")?.attributeID
      const rightSplitAttributeID = maybeToV2Id(_rightSplitAttributeID)
      const rightSplitAttributeName = _rightSplitAttributeID
        ? dataset?.getAttribute(_rightSplitAttributeID)?.name
        : undefined

      const _topSplitAttributeID = dataConfiguration.attributeDescriptionForRole("topSplit")?.attributeID
      const topSplitAttributeID = maybeToV2Id(_topSplitAttributeID)
      const topSplitAttributeName = _topSplitAttributeID ? dataset?.getAttribute(_topSplitAttributeID)?.name : undefined

      const xAttribute = dataConfiguration.attributeDescriptionForRole("x")
      const _xAttributeID = xAttribute?.attributeID
      const xAttributeID = maybeToV2Id(_xAttributeID)
      const xAttributeName = _xAttributeID ? dataset?.getAttribute(_xAttributeID)?.name : undefined
      const xAttributeType = xAttribute?.type
      const xAxis = content.getAxis("bottom")
      const xNumericAxis = isAnyNumericAxisModel(xAxis) ? xAxis : undefined
      const xLowerBound = xNumericAxis?.min
      const xUpperBound = xNumericAxis?.max

      const yAttribute = dataConfiguration.attributeDescriptionForRole("y")
      const _yAttributeID = yAttribute?.attributeID
      const yAttributeID = maybeToV2Id(_yAttributeID)
      const yAttributeName = _yAttributeID ? dataset?.getAttribute(_yAttributeID)?.name : undefined
      const yAttributeType = yAttribute?.type
      const yAxis = content.getAxis("left")
      const yNumericAxis = isAnyNumericAxisModel(yAxis) ? yAxis : undefined
      const yLowerBound = yNumericAxis?.min
      const yUpperBound = yNumericAxis?.max

      const y2Attribute = dataConfiguration.attributeDescriptionForRole("rightNumeric")
      const _y2AttributeID = y2Attribute?.attributeID
      const y2AttributeID = maybeToV2Id(_y2AttributeID)
      const y2AttributeName = _y2AttributeID ? dataset?.getAttribute(_y2AttributeID)?.name : undefined
      const y2AttributeType = y2Attribute?.type
      const y2Axis = content.getAxis("rightNumeric")
      const y2NumericAxis = isAnyNumericAxisModel(y2Axis) ? y2Axis : undefined
      const y2LowerBound = y2NumericAxis?.min
      const y2UpperBound = y2NumericAxis?.max

      const yAttributeIDs = dataConfiguration._yAttributeDescriptions
        .map(description => toV2Id(description.attributeID))
      const yAttributeNames = dataConfiguration._yAttributeDescriptions
        .map(description => dataset?.getAttribute(description.attributeID)?.name).filter(name => name != null)

      const { pointDescription } = content
      const { displayOnlySelectedCases, showMeasuresForSelection, primaryRole: primaryAxis } = dataConfiguration
      const filterFormula = dataConfiguration.filterFormula?.display
      const hiddenCases = dataConfiguration.hiddenCases.map(id => toV2Id(id))
      const plotType = content.plotType
      const pointSize = pointDescription.pointSizeMultiplier
      const strokeColor = pointDescription.pointStrokeColor
      const { pointColor } = pointDescription
      const strokeSameAsFill = pointDescription.pointStrokeSameAsFill
      const backgroundColor = content.plotBackgroundColor
      const transparent = content.isTransparent
      const showConnectingLines = content.adornmentsStore.showConnectingLines
      const result: V2Graph = {
        backgroundColor, dataContext, displayOnlySelectedCases, enableNumberToggle, filterFormula, hiddenCases,
        numberToggleLastMode, plotType, pointColor, pointSize, primaryAxis, showConnectingLines,
        showMeasuresForSelection, strokeColor, strokeSameAsFill, transparent, captionAttributeID, captionAttributeName,
        legendAttributeID, legendAttributeName, rightSplitAttributeID, rightSplitAttributeName,
        topSplitAttributeID, topSplitAttributeName, type: "graph",
        xAttributeID, xAttributeName, xAttributeType, xLowerBound, xUpperBound,
        yAttributeID, yAttributeIDs, yAttributeName, yAttributeNames, yAttributeType, yLowerBound, yUpperBound,
        y2AttributeID, y2AttributeName, y2AttributeType, y2LowerBound, y2UpperBound,
        // retrieve plot-specific properties
        ...content.plot.getApiProps()
      }
      return result
    }
  },

  update(content: ITileContentModel, values: DIValues) {
    if (!isGraphContentModel(content)) return { success: false }

    const {
      backgroundColor, dataContext: _dataContext, displayOnlySelectedCases, enableNumberToggle: showParentToggles,
      filterFormula, hiddenCases, numberToggleLastMode: showOnlyLastCase, pointColor, pointSize, pointsAreFusedIntoBars,
      showConnectingLines, showMeasuresForSelection, strokeColor, strokeSameAsFill, transparent,
      xAttributeType, xLowerBound, xUpperBound, yAttributeID, yAttributeIDs, yAttributeName, yAttributeNames,
      yAttributeType, yLowerBound, yUpperBound, y2AttributeType, y2LowerBound, y2UpperBound
    } = values as V2GetGraph
    const attributeInfo = getAttributeInfo(values)
    const { dataConfiguration, pointDescription } = content

    // Determine which dataset to work with
    let dataSet: Maybe<IDataSet>
    if (_dataContext) {
      getSharedDataSets(appState.document).forEach(sharedDataSet => {
        if (sharedDataSet.dataSet.name === _dataContext || sharedDataSet.dataSet.id === toV3DataSetId(_dataContext)) {
          dataSet = sharedDataSet.dataSet
        }
      })
    }
    if (!dataSet) {
      const sharedDataSets = getSharedDataSets(appState.document)
      if (sharedDataSets.length === 0) {
        return  { success: true } // nothing we can do to the graph without a dataset
      }
      dataSet = content.dataset ?? sharedDataSets[0].dataSet
    }

    // Ensure that all specified attributes are legal for their roles before we actually update anything
    // NOTE: This isn't perfect. It compares each new attribute assignment to the current configuration, but
    // other attributes changed at the same time could make an assignment illegal.
    const updatedAttributes: Record<string, IAttribute | null> = {}
    for (const attributeType in attributeInfo) {
      const attributePackage = attributeInfo[attributeType]
      if (attributePackage?.id === null || (attributePackage?.id === undefined && attributePackage?.name === null)) {
        updatedAttributes[attributeType] = null
      } else {
        const attribute = getAttributeFromInfo(dataSet, attributePackage)
        if (attribute) {
          const role = roleFromAttrKey[attributeType]
          const place = attrRoleToGraphPlace[role]
          if (place && !dataConfiguration.placeCanAcceptAttributeIDDrop(
            place, dataSet, attribute.id, { allowSameAttr: true }
          )) {
            return errorResult(
              t("V3.DI.Error.illegalAttributeAssignment", {
                vars: [attributePackage?.id ?? attributePackage?.name ?? "", role]
              })
            )
          }
          updatedAttributes[attributeType] = attribute
        }
      }
    }

    // Actually update dataSet (which will clear any old attribute assignments)
    if (dataSet && dataSet !== content.dataset) {
      content.setDataSet(dataSet.id)
    }

    // Actually update attributes
    for (const attributeType in updatedAttributes) {
      const attribute = updatedAttributes[attributeType]
      const role = roleFromAttrKey[attributeType]
      if (role) {
        if (attribute) {
          dataConfiguration.setAttribute(role, { attributeID: attribute.id })
        } else {
          dataConfiguration.setAttribute(role)
        }
      }
    }

    // Any attribute can be put on the y axis, so we don't check to make sure the attribute is legal first
    // We don't use dataConfiguration.setAttribute() to make the change because that clears additional y attributes
    if (yAttributeIDs != null) {
      content.dataConfiguration.replaceYAttributes(yAttributeIDs.map(id => ({ attributeID: toV3AttrId(id) })))
    } else if (yAttributeNames != null) {
      const descriptions = yAttributeNames.map(name => {
        const attribute = dataSet?.getAttributeByName(name)
        if (attribute) return { attributeID: attribute.id }
      }).filter(desc => !!desc)
      content.dataConfiguration.replaceYAttributes(descriptions)
    } else if (yAttributeID !== undefined) {
      if (yAttributeID) {
        dataConfiguration.replaceYAttribute({ attributeID: toV3AttrId(yAttributeID) }, 0)
      } else {
        dataConfiguration.removeYAttributeAtIndex(0)
      }
    } else if (yAttributeName !== undefined) {
      if (yAttributeName !== null) {
        const attribute = dataSet?.getAttributeByName(yAttributeName)
        if (attribute) dataConfiguration.replaceYAttribute({ attributeID: attribute.id }, 0)
      } else {
        dataConfiguration.removeYAttributeAtIndex(0)
      }
    }

    // Update attribute types
    if (isAttributeType(xAttributeType)) dataConfiguration.setAttributeType("x", xAttributeType)
    if (isAttributeType(yAttributeType)) dataConfiguration.setAttributeType("y", yAttributeType)
    if (isAttributeType(y2AttributeType)) dataConfiguration.setAttributeType("rightNumeric", y2AttributeType)

    // Update lower and upper bounds
    const updateBounds = (place: AxisPlace, lower?: number, upper?: number) => {
      if (lower != null || upper != null) {
        const axis = content.getAxis(place)
        if (isAnyNumericAxisModel(axis)) {
          if (lower != null) axis.setMinimum(lower)
          if (upper != null) axis.setMaximum(upper)
        }
      }
    }
    updateBounds("bottom", xLowerBound, xUpperBound)
    updateBounds("left", yLowerBound, yUpperBound)
    updateBounds("rightNumeric", y2LowerBound, y2UpperBound)

    // Update odd features
    if (backgroundColor != null) content.setPlotBackgroundColor(backgroundColor)
    if (displayOnlySelectedCases) {
      content.displayOnlySelectedCases()
    } else if (displayOnlySelectedCases != null) {
      content.showAllCases()
    }
    if (filterFormula != null) dataConfiguration.setFilterFormula(filterFormula)
    if (hiddenCases != null) dataConfiguration.setHiddenCases(hiddenCases.map(id => toV3CaseId(id)))
    if (pointColor != null) pointDescription.setPointColor(pointColor)
    if (pointSize != null) pointDescription.setPointSizeMultiplier(pointSize)
    if (showConnectingLines != null) content.adornmentsStore.setShowConnectingLines(showConnectingLines)
    if (showMeasuresForSelection != null) dataConfiguration.setShowMeasuresForSelection(showMeasuresForSelection)
    if (showParentToggles != null) content.setShowParentToggles(showParentToggles)
    if (showOnlyLastCase != null) content.setShowOnlyLastCase(showOnlyLastCase)
    if (strokeColor != null) pointDescription.setPointStrokeColor(strokeColor)
    if (strokeSameAsFill != null) pointDescription.setPointStrokeSameAsFill(strokeSameAsFill)
    if (transparent != null) content.setIsTransparent(transparent)
    if (pointsAreFusedIntoBars != null) {
      const pointsCanBeFused = content.pointsCanBeFusedIntoBars
      if (pointsAreFusedIntoBars && !pointsCanBeFused) {
        return errorResult(t("V3.DI.Error.cannotFusePointsIntoBars"))
      }
      content.fusePointsIntoBars(pointsAreFusedIntoBars)
    }

    // delegate to plot to update plot-specific properties
    if (typeof values === "object" && !Array.isArray(values)) {
      const error = content.plot.updateApiProps(values as Record<string, unknown>)
      if (error) return error
    }

    return { success: true }
  }
}
