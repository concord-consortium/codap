import { getSnapshot } from "mobx-state-tree"
import { V2GetGraph, V2Graph } from "../../data-interactive/data-interactive-component-types"
import { DIValues } from "../../data-interactive/data-interactive-types"
import { DIComponentHandler } from "../../data-interactive/handlers/component-handler"
import { errorResult } from "../../data-interactive/handlers/di-results"
import { appState } from "../../models/app-state"
import { IAttribute } from "../../models/data/attribute"
import { IDataSet } from "../../models/data/data-set"
import { ISharedCaseMetadata } from "../../models/shared/shared-case-metadata"
import { getSharedCaseMetadataFromDataset, getSharedDataSets } from "../../models/shared/shared-data-utils"
import { ITileContentModel, ITileContentSnapshotWithType } from "../../models/tiles/tile-content"
import { toV2Id, toV3AttrId, toV3CaseId, toV3DataSetId } from "../../utilities/codap-utils"
import { t } from "../../utilities/translation/translate"
import { AxisPlace } from "../axis/axis-types"
import { isNumericAxisModel } from "../axis/models/axis-model"
import { attrRoleToGraphPlace, GraphAttrRole, isPointDisplayType } from "../data-display/data-display-types"
import { IAttributeDescriptionSnapshot } from "../data-display/models/data-configuration-model"
import { kGraphTileType } from "./graph-defs"
import { GraphContentModel, IGraphContentModelSnapshot, isGraphContentModel } from "./models/graph-content-model"
import { IGraphDataConfigurationModel, kGraphDataConfigurationType } from "./models/graph-data-configuration-model"
import { GraphLayout } from "./models/graph-layout"
import { syncModelWithAttributeConfiguration } from "./models/graph-model-utils"
import { IGraphPointLayerModelSnapshot, kGraphPointLayerType } from "./models/graph-point-layer-model"

interface AttributeInfo {
  id?: string | null
  name?: string | null
}
function packageAttribute(id?: string | null, name?: string | null): Maybe<AttributeInfo> {
  if (id || id === null || name || name === null) {
    return { id, name }
  }
}
function getAttributeInfo(values?: DIValues): Record<string, Maybe<AttributeInfo>> {
  const {
    captionAttributeID, captionAttributeName, legendAttributeID, legendAttributeName, rightNumericAttributeID,
    rightNumericAttributeName, rightSplitAttributeID, rightSplitAttributeName, topSplitAttributeID,
    topSplitAttributeName, xAttributeID, xAttributeName, y2AttributeID, y2AttributeName
  } = values as V2Graph
  return {
    caption: packageAttribute(captionAttributeID, captionAttributeName),
    legend: packageAttribute(legendAttributeID, legendAttributeName),
    rightNumeric: packageAttribute(rightNumericAttributeID, rightNumericAttributeName),
    rightSplit: packageAttribute(rightSplitAttributeID, rightSplitAttributeName),
    topSplit: packageAttribute(topSplitAttributeID, topSplitAttributeName),
    x: packageAttribute(xAttributeID, xAttributeName),
    y2: packageAttribute(y2AttributeID, y2AttributeName)
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
      filterFormula, hiddenCases: _hiddenCases, numberToggleLastMode: showOnlyLastCase, pointColor, pointConfig,
      pointsFusedIntoBars, pointSize, showMeasuresForSelection, strokeColor, strokeSameAsFill, transparent,
      yAttributeID, yAttributeName
    } = values as V2Graph
    const attributeInfo = getAttributeInfo(values)

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
        let hiddenCases = _hiddenCases?.map(id => toV3CaseId(id)) ?? []
        if (dataset.name === _dataContext) {
          provisionalDataSet = dataset
          provisionalMetadata = metadata
          for (const attributeType in attributeInfo) {
            const attribute = getAttributeFromInfo(dataset, attributeInfo[attributeType])
            if (attribute) {
              const attributeRole = roleFromAttrKey[attributeType]
              if (attributeRole) {
                _attributeDescriptions[attributeRole] = { attributeID: attribute.id, type: attribute.type }
              }
            }
          }

          let yAttribute: Maybe<IAttribute>
          if (yAttributeID != null) {
            yAttribute = dataset.getAttribute(toV3AttrId(yAttributeID))
          }
          if (!yAttribute && yAttributeName != null) {
            yAttribute = dataset.getAttributeByName(yAttributeName)
          }
          if (yAttribute) {
            _yAttributeDescriptions.push({ attributeID: yAttribute.id, type: yAttribute.type })
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
    })

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
      pointDisplayType: pointConfig && isPointDisplayType(pointConfig) ? pointConfig : undefined,
      pointsFusedIntoBars,
      showMeasuresForSelection,
      showOnlyLastCase,
      showParentToggles,
      type: kGraphTileType
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
    return { content: { ...getSnapshot(graphModel), layers: finalLayers } as ITileContentSnapshotWithType }
  },

  get(content: ITileContentModel) {
    if (isGraphContentModel(content)) {
      const dataset = content.dataset
      const dataContext = dataset?.name
      const { dataConfiguration } = content.graphPointLayerModel
      const { showParentToggles: enableNumberToggle, showOnlyLastCase: numberToggleLastMode } = content

      const captionAttributeID = dataConfiguration.attributeDescriptionForRole("caption")?.attributeID
      const captionAttributeName = captionAttributeID ? dataset?.getAttribute(captionAttributeID)?.name : undefined

      const legendAttributeID = dataConfiguration.attributeDescriptionForRole("legend")?.attributeID
      const legendAttributeName = legendAttributeID ? dataset?.getAttribute(legendAttributeID)?.name : undefined

      const rightSplitAttributeID = dataConfiguration.attributeDescriptionForRole("rightSplit")?.attributeID
      const rightSplitAttributeName = rightSplitAttributeID
        ? dataset?.getAttribute(rightSplitAttributeID)?.name
        : undefined

      const topSplitAttributeID = dataConfiguration.attributeDescriptionForRole("topSplit")?.attributeID
      const topSplitAttributeName = topSplitAttributeID ? dataset?.getAttribute(topSplitAttributeID)?.name : undefined

      const xAttributeID = dataConfiguration.attributeDescriptionForRole("x")?.attributeID
      const xAttributeName = xAttributeID ? dataset?.getAttribute(xAttributeID)?.name : undefined
      const xAxis = content.getAxis("bottom")
      const xNumericAxis = isNumericAxisModel(xAxis) ? xAxis : undefined
      const xLowerBound = xNumericAxis?.min
      const xUpperBound = xNumericAxis?.max

      const yAttributeID = dataConfiguration.attributeDescriptionForRole("y")?.attributeID
      const yAttributeName = yAttributeID ? dataset?.getAttribute(yAttributeID)?.name : undefined
      const yAxis = content.getAxis("left")
      const yNumericAxis = isNumericAxisModel(yAxis) ? yAxis : undefined
      const yLowerBound = yNumericAxis?.min
      const yUpperBound = yNumericAxis?.max

      const y2AttributeID = dataConfiguration.attributeDescriptionForRole("rightNumeric")?.attributeID
      const y2AttributeName = y2AttributeID ? dataset?.getAttribute(y2AttributeID)?.name : undefined
      const y2Axis = content.getAxis("rightNumeric")
      const y2NumericAxis = isNumericAxisModel(y2Axis) ? y2Axis : undefined
      const y2LowerBound = y2NumericAxis?.min
      const y2UpperBound = y2NumericAxis?.max

      const { pointDescription, pointsFusedIntoBars, showMeasuresForSelection } = content
      const { displayOnlySelectedCases } = dataConfiguration
      const filterFormula = dataConfiguration.filterFormula?.display
      const hiddenCases = dataConfiguration.hiddenCases.map(id => toV2Id(id))
      const pointConfig = content.pointDisplayType
      const pointSize = pointDescription.pointSizeMultiplier
      const strokeColor = pointDescription.pointStrokeColor
      const { pointColor } = pointDescription
      const strokeSameAsFill = pointDescription.pointStrokeSameAsFill
      const backgroundColor = content.plotBackgroundColor
      const transparent = content.isTransparent

      return {
        backgroundColor, dataContext, displayOnlySelectedCases, enableNumberToggle, filterFormula, hiddenCases,
        numberToggleLastMode, pointColor, pointConfig, pointsFusedIntoBars, pointSize, showMeasuresForSelection,
        strokeColor, strokeSameAsFill, transparent, captionAttributeID, captionAttributeName, legendAttributeID,
        legendAttributeName, rightSplitAttributeID, rightSplitAttributeName, topSplitAttributeID, topSplitAttributeName,
        xAttributeID, xAttributeName, xLowerBound, xUpperBound,
        yAttributeID, yAttributeName, yLowerBound, yUpperBound,
        y2AttributeID, y2AttributeName, y2LowerBound, y2UpperBound
      }
    }
  },

  update(content: ITileContentModel, values: DIValues) {
    if (!isGraphContentModel(content)) return { success: false }

    const {
      backgroundColor, dataContext: _dataContext, displayOnlySelectedCases, enableNumberToggle: showParentToggles,
      filterFormula, hiddenCases, numberToggleLastMode: showOnlyLastCase, pointColor, pointConfig, pointsFusedIntoBars,
      pointSize, showMeasuresForSelection, strokeColor, strokeSameAsFill, transparent, xLowerBound, xUpperBound,
      yAttributeID, yAttributeName, yLowerBound, yUpperBound, y2LowerBound, y2UpperBound
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
      dataSet = content.dataset ?? getSharedDataSets(appState.document)[0].dataSet
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
    if (yAttributeID !== undefined) {
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

    // Update lower and upper bounds
    const updateBounds = (place: AxisPlace, lower?: number, upper?: number) => {
      if (lower != null || upper != null) {
        const axis = content.getAxis(place)
        if (isNumericAxisModel(axis)) {
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
    if (displayOnlySelectedCases != null) dataConfiguration.setDisplayOnlySelectedCases(displayOnlySelectedCases)
    if (filterFormula != null) dataConfiguration.setFilterFormula(filterFormula)
    if (hiddenCases != null) dataConfiguration.setHiddenCases(hiddenCases.map(id => toV3CaseId(id)))
    if (pointColor != null) pointDescription.setPointColor(pointColor)
    if (pointConfig != null && isPointDisplayType(pointConfig)) content.setPointConfig(pointConfig)
    if (pointsFusedIntoBars != null) content.setPointsFusedIntoBars(pointsFusedIntoBars)
    if (pointSize != null) pointDescription.setPointSizeMultiplier(pointSize)
    if (showMeasuresForSelection != null) content.setShowMeasuresForSelection(showMeasuresForSelection)
    if (showParentToggles != null) content.setShowParentToggles(showParentToggles)
    if (showOnlyLastCase != null) content.setShowOnlyLastCase(showOnlyLastCase)
    if (strokeColor != null) pointDescription.setPointStrokeColor(strokeColor)
    if (strokeSameAsFill != null) pointDescription.setPointStrokeSameAsFill(strokeSameAsFill)
    if (transparent != null) content.setIsTransparent(transparent)

    return { success: true }
  }
}
