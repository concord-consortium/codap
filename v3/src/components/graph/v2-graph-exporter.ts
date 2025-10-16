import { colord } from "colord"
import { SetRequired } from "type-fest"
import { AttributeType } from "../../models/data/attribute-types"
import { toV2Id } from "../../utilities/codap-utils"
import { defaultBackgroundColor, removeAlphaFromColor } from "../../utilities/color-utils"
import { V2TileExportFn } from "../../v2/codap-v2-tile-exporters"
import { CodapV2PlotType, guidLink, ICodapV2Adornment, ICodapV2GraphStorage, IGuidLink } from "../../v2/codap-v2-types"
import { IAxisModel } from "../axis/models/axis-model"
import { isAnyCategoricalAxisModel } from "../axis/models/categorical-axis-models"
import { isAnyNumericAxisModel, isCountAxisModel } from "../axis/models/numeric-axis-models"
import { GraphAttrRole } from "../data-display/data-display-types"
import {
  getAdornmentContentInfo, IAdornmentExporterOptions, isCodapV2TopLevelAdornment
} from "./adornments/adornment-content-info"
import { ICountAdornmentModel } from "./adornments/count/count-adornment-model"
import { kCountType } from "./adornments/count/count-adornment-types"
import { IMovableValueAdornmentModel } from "./adornments/movable-value/movable-value-adornment-model"
import { kMovableValueType } from "./adornments/movable-value/movable-value-adornment-types"
import { IGraphContentModel, isGraphContentModel } from "./models/graph-content-model"
import { isBarChartModel } from "./plots/bar-chart/bar-chart-model"
import { isBinnedPlotModel } from "./plots/histogram/histogram-model"

type V2GraphDimension = "x" | "y" | "y2" | "top" | "right" | "legend"

// map from v3 attribute type to v2 numeric attribute type
const v2TypesMap: Partial<Record<AttributeType, number>> = {
  numeric: 1,
  categorical: 2,
  date: 3,
  boundary: 4,
  color: 5
}

// v2 role constants
const v2Roles: Record<string, number> = {
  eInvalid: -1,
  eNone: 0,
  ePrimaryNumeric: 1,
  eSecondaryNumeric: 2,
  ePrimaryCategorical: 3,
  eSecondaryCategorical: 4,
  // eLegendNumeric: 5,
  // eLegendCategorical: 6,
  // eVerticalSplit: 7,      // for attribute in place DG.GraphTypes.EPlace.eTopSplit
  // eHorizontalSplit: 8     // for attribute in place DG.GraphTypes.EPlace.eRightSplit
}

function v2PlotClass(graph: IGraphContentModel): CodapV2PlotType {
  const { plot } = graph

  if (isBarChartModel(plot) && plot.hasExpression) {
    return "DG.ComputedBarChartModel"
  }

  const plotTypeMap: Record<string, CodapV2PlotType> = {
    casePlot: "DG.CasePlotModel",
    dotChart: "DG.DotChartModel",
    barChart: "DG.BarChartModel",
    dotPlot: "DG.DotPlotModel",
    binnedDotPlot: "DG.BinnedPlotModel",
    histogram: "DG.BinnedPlotModel",
    linePlot: "DG.LinePlotModel",
    scatterPlot: "DG.ScatterPlotModel"
  }
  return plotTypeMap[graph.plotType] ?? "DG.CasePlotModel"
}

type AttributeRoleAndType = Partial<ICodapV2GraphStorage>

function getAttrRoleAndType(
  graph: IGraphContentModel, role: GraphAttrRole, dim: V2GraphDimension
): Maybe<AttributeRoleAndType> {
  const { dataset } = graph
  if (dataset) {
    let v2Role = 0
    const type = graph.dataConfiguration.attributeType(role)
    const isPrimary = role === graph.dataConfiguration.primaryRole
    const v2Type = (type && v2TypesMap[type]) ?? v2Roles.eNone
    switch (role) {
      case "x":
      case "y":
        // special case for empty graph
        if (!graph.dataConfiguration.attributeType("x") && !graph.dataConfiguration.attributeType("y")) {
          v2Role = v2Roles.eNone
        }
        else {
          // note: v2 writes out all secondary axis roles as eSecondaryCategorical, even with no attribute
          v2Role = type === "numeric" || type === "date"
                    ? isPrimary ? v2Roles.ePrimaryNumeric : v2Roles.eSecondaryCategorical
                    : isPrimary ? v2Roles.ePrimaryCategorical : v2Roles.eSecondaryCategorical
        }
        break
      case "rightNumeric":
      case "legend":
      case "rightSplit":
      case "topSplit":
        // v2 always writes out 0 for these roles
        v2Role = v2Roles.eNone
        break
    }
    return {
      [`${dim}Role`]: v2Role,
      [`${dim}AttributeType`]: v2Type
    }
  }
}

type V2GraphLinks = ICodapV2GraphStorage["_links_"]

function getAttrLinksForRole(graph: IGraphContentModel, role: GraphAttrRole, prefix: string): V2GraphLinks {
  const { dataset } = graph
  if (dataset) {
    const collectionKey = `${prefix}Coll`
    const attributeKey = `${prefix}Attr`
    const attrId = graph.dataConfiguration.attributeID(role)
    const collection = dataset.getCollectionForAttribute(attrId)
    if (attrId && collection) {
      let attributeLinks: IGuidLink<"DG.Attribute"> | Array<IGuidLink<"DG.Attribute">>
      if (role === "y" && graph.dataConfiguration.yAttributeDescriptionsExcludingY2.length > 1) {
        attributeLinks = graph.dataConfiguration.yAttributeDescriptionsExcludingY2
                          .map(({ attributeID }) => guidLink("DG.Attribute", toV2Id(attributeID)))
      }
      else {
        attributeLinks = guidLink("DG.Attribute", toV2Id(attrId))
      }
      return {
        [collectionKey]: guidLink("DG.Collection", toV2Id(collection.id)),
        [attributeKey]: attributeLinks
      }
    }
  }
  return {}
}

function getLinks(graph: IGraphContentModel): ICodapV2GraphStorage["_links_"] {
  const { dataset } = graph
  if (dataset) {
    return {
      context: guidLink("DG.DataContextRecord", toV2Id(dataset.id)),
      hiddenCases: graph.dataConfiguration.hiddenCases.map(hiddenCase => guidLink("DG.Case", toV2Id(hiddenCase))),
      ...getAttrLinksForRole(graph, "x", "x"),
      ...getAttrLinksForRole(graph, "y", "y"),
      ...getAttrLinksForRole(graph, "rightNumeric", "y2"),
      ...getAttrLinksForRole(graph, "rightSplit", "right"),
      ...getAttrLinksForRole(graph, "topSplit", "top"),
      ...getAttrLinksForRole(graph, "legend", "legend")
    }
  }
  return {}
}

type AxisClassAndBounds = Partial<ICodapV2GraphStorage>

function getAxisClassAndBounds(
  graph: IGraphContentModel, dim: V2GraphDimension, axis?: IAxisModel, isPrimary = false
): AxisClassAndBounds {
  let axisClass = "DG.AxisModel"
  let axisBounds: Record<string, number> = {}

  if (isAnyNumericAxisModel(axis)) {
    axisClass = isCountAxisModel(axis)
                  ? graph.plot.hasExpression
                    ? "DG.FormulaAxisModel"
                    : "DG.CountAxisModel"
                  : isPrimary && graph.plot.type === "binnedDotPlot"
                    ? "DG.BinnedAxisModel"
                    : "DG.CellLinearAxisModel"
    axisBounds = {
      [`${dim}LowerBound`]: axis.min,
      [`${dim}UpperBound`]: axis.max
    }
  }
  else if (isAnyCategoricalAxisModel(axis) || ["top", "right"].includes(dim)) {
    axisClass = "DG.CellAxisModel"
  }

  return {
    [`${dim}AxisClass`]: axisClass,
    ...axisBounds
  }
}

function getPlotModels(graph: IGraphContentModel): Partial<ICodapV2GraphStorage> {
  const {
    adornmentsStore, plot,
    dataConfiguration: { categoricalAttrs, showMeasuresForSelection = false }
  } = graph
  const xAttrType = graph.dataConfiguration.attributeType("x")
  const xCategories = xAttrType === "categorical" ? graph.dataConfiguration.categoryArrayForAttrRole("x") : [""]
  const yAttrType = graph.dataConfiguration.attributeType("y")
  const yCategories = yAttrType === "categorical" ? graph.dataConfiguration.categoryArrayForAttrRole("y") : [""]
  const legendCategories = graph.dataConfiguration.categoryArrayForAttrRole("legend")
  const countAdornment = adornmentsStore.findAdornmentOfType<ICountAdornmentModel>(kCountType)
  const movableValuesAdornment = adornmentsStore.findAdornmentOfType<IMovableValueAdornmentModel>(kMovableValueType)
  const isInterceptLocked = adornmentsStore.interceptLocked
  const isShowingCount = !!countAdornment?.isVisible && countAdornment.showCount
  const isShowingPercent = !!countAdornment?.isVisible && countAdornment.showPercent
  const isShowingMovableValues = !!movableValuesAdornment?.isVisible && movableValuesAdornment.hasValues
  const showSumSquares = !!adornmentsStore.showSquaresOfResiduals
  const breakdownType = isBarChartModel(plot)
                          ? { breakdownType: plot.breakdownType === "percent" ? 1 : 0 }
                          : undefined
  const expression = isBarChartModel(plot) && plot.formula && !plot.formula.empty
                      ? { expression: plot.formula.display }
                      : undefined
  const _binDetails = isBinnedPlotModel(plot) ? plot.binDetails() : undefined
  const { binAlignment: alignment, binWidth: width, totalNumberOfBins } = _binDetails ?? {}
  const binDetails = _binDetails ? { alignment, width, totalNumberOfBins } : undefined
  const dotsAreFused = plot.isBinned ? { dotsAreFused: plot.type === "histogram" } : undefined
  const options: IAdornmentExporterOptions = {
    categoricalAttrs, xCategories, yCategories, legendCategories, isInterceptLocked, isShowingCount,
    isShowingPercent, isShowingMovableValues, showMeasuresForSelection, showSumSquares
  }
  const adornmentStorages = graph.adornmentsStore.adornments.map(adornment => {
    const adornmentInfo = getAdornmentContentInfo(adornment.type)
    return adornmentInfo.exporter?.(adornment, options)
  })
  // `connectingLine` is represented as an adornment in v2, but as a graph-wide property in v3
  const connectingLine: ICodapV2Adornment = {
    isVisible: graph.adornmentsStore.showConnectingLines,
    enableMeasuresForSelection: showMeasuresForSelection
  }
  const topAdornments = adornmentStorages.filter(adornment => isCodapV2TopLevelAdornment(adornment))
  const connectingLineAdornment = connectingLine.isVisible ? { connectingLine } : {}
  const nestedAdornmentStorages = adornmentStorages.filter(adornment => !isCodapV2TopLevelAdornment(adornment))
  const nestedAdornments = Object.assign({}, connectingLineAdornment, ...nestedAdornmentStorages)
  const areSquaresVisible = adornmentsStore.showSquaresOfResiduals ? { areSquaresVisible: true } : undefined
  const showMeasureLabels = adornmentsStore.showMeasureLabels ? { showMeasureLabels: true } : undefined
  const storage: SetRequired<Partial<ICodapV2GraphStorage>, "plotModels"> = {
    plotModels: [{
      plotClass: v2PlotClass(graph),
      plotModelStorage: {
        // in v2, every plot model has the exact same nested adornments
        adornments: nestedAdornments,
        // in v2 only the first plot model has the top-level adornments
        ...Object.assign({}, ...topAdornments),
        ...areSquaresVisible,
        ...showMeasureLabels,
        ...breakdownType,
        ...expression,
        ...binDetails,
        ...dotsAreFused,
        verticalAxisIsY2: false
      }
    }]
  }
  // in v2, additional Y attributes are represented as additional plot models
  for (let y = 1; y < graph.dataConfiguration.yAttributeDescriptionsExcludingY2.length; y++) {
    storage.plotModels.push({
      plotClass: "DG.ScatterPlotModel",
      plotModelStorage: {
        // in v2, every plot model has the exact same nested adornments
        adornments: nestedAdornments,
        // in v2 only the first plot model has the top-level adornments
        verticalAxisIsY2: false
      }
    })
  }
  // in v2, a rightNumeric attribute is represented as an additional plot model
  if (graph.getAttributeID("rightNumeric")) {
    storage.plotModels.push({
      plotClass: "DG.ScatterPlotModel",
      plotModelStorage: {
        // in v2, every plot model has the exact same nested adornments
        adornments: nestedAdornments,
        // in v2 only the first plot model has the top-level adornments
        verticalAxisIsY2: true
      }
    })
  }
  return storage
}

const getTransparency = (color: string) => {
  const rgbaColor = colord(color).toRgb()
  return rgbaColor.a
}

// v2 uses color names for default stroke colors
const strokeColorStr = (color: string) => {
  const colorHex = removeAlphaFromColor(color).toLowerCase()
  return colorHex === "#ffffff" ? "white"
            : colorHex === "#d3d3d3" ? "lightgrey"
            : colorHex
}

export const v2GraphExporter: V2TileExportFn = ({ tile }) => {
  const graph = isGraphContentModel(tile.content) ? tile.content : undefined
  if (!graph) return

  const componentStorage: Partial<ICodapV2GraphStorage> = {
    _links_: getLinks(graph),
    displayOnlySelected: !!graph.dataConfiguration.displayOnlySelectedCases,
    ...(graph.dataConfiguration.showMeasuresForSelection ? { enableMeasuresForSelection: true } : {}),
    pointColor: removeAlphaFromColor(graph.pointDescription.pointColor),
    transparency: getTransparency(graph.pointDescription.pointColor),
    strokeColor: graph.pointDescription.pointStrokeSameAsFill
                    ? "white" // v2 uses white for stroke when stroke is same as fill
                    : strokeColorStr(graph.pointDescription.pointStrokeColor),
    strokeTransparency: graph.pointDescription.pointStrokeSameAsFill
                          ? 0.4 : getTransparency(graph.pointDescription.pointStrokeColor),
    pointSizeMultiplier: graph.pointDescription.pointSizeMultiplier,
    strokeSameAsFill: graph.pointDescription.pointStrokeSameAsFill,
    plotBackgroundColor: graph.plotBackgroundColor === defaultBackgroundColor
                              ? null : removeAlphaFromColor(graph.plotBackgroundColor),
    plotBackgroundOpacity: getTransparency(graph.plotBackgroundColor),
    plotBackgroundImage: graph.plotBackgroundImage,
    plotBackgroundImageLockInfo: graph.plotBackgroundImageLockInfo,
    isTransparent: graph.isTransparent,
    enableNumberToggle: graph.showParentToggles,
    numberToggleLastMode: graph.showOnlyLastCase,
    numberOfLegendQuantiles: graph.numberOfLegendQuantiles,
    legendQuantilesAreLocked: graph.legendQuantilesAreLocked,
    // attribute roles and types
    ...getAttrRoleAndType(graph, "x", "x"),
    ...getAttrRoleAndType(graph, "y", "y"),
    ...getAttrRoleAndType(graph, "rightNumeric", "y2"),
    ...getAttrRoleAndType(graph, "rightSplit", "right"),
    ...getAttrRoleAndType(graph, "topSplit", "top"),
    ...getAttrRoleAndType(graph, "legend", "legend"),
    // axis classes and bounds
    ...getAxisClassAndBounds(graph, "x", graph.axes.get("bottom"), graph.primaryPlace === "bottom"),
    ...getAxisClassAndBounds(graph, "y", graph.axes.get("left"), graph.primaryPlace === "left"),
    ...getAxisClassAndBounds(graph, "y2", graph.axes.get("rightNumeric")),
    ...getAxisClassAndBounds(graph, "top", graph.axes.get("topSplit")),
    ...getAxisClassAndBounds(graph, "right", graph.axes.get("rightSplit")),
    // plot models
    ...getPlotModels(graph)
  }

  return { type: "DG.GraphView", componentStorage }
}
