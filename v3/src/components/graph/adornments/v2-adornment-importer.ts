import { IDataSetMetadata } from "../../../models/shared/data-set-metadata"
import { ISharedDataSet } from "../../../models/shared/shared-data-set"
import { safeJsonParse } from "../../../utilities/js-utils"
import {
  ICodapV2MultipleLSRLAdornments, ICodapV2PlotModel, ICodapV2UnivariateAdornment, isV2ScatterPlotModel
} from "../../../v2/codap-v2-types"
import {
  GraphAttributeDescriptionsMapSnapshot, IAttributeDescriptionSnapshot
} from "../../data-display/models/data-configuration-model"
import { kMain } from "../../data-display/data-display-types"
import { updateCellKey } from "./utilities/adornment-utils"
import { kCountType } from "./count/count-adornment-types"
import { kLSRLType } from "./lsrl/lsrl-adornment-types"
import { kMovableLineType } from "./movable-line/movable-line-adornment-types"
import { kMovablePointType } from "./movable-point/movable-point-adornment-types"
import { kMovableValueType } from "./movable-value/movable-value-adornment-types"
import { IPointModelSnapshot } from "./point-model"
import { kPlottedFunctionType } from "./plotted-function/plotted-function-adornment-types"
import { kBoxPlotType } from "./univariate-measures/box-plot/box-plot-adornment-types"
import { kMeanAbsoluteDeviationType }
  from "./univariate-measures/mean-absolute-deviation/mean-absolute-deviation-adornment-types"
import { kMeanType } from "./univariate-measures/mean/mean-adornment-types"
import { kMedianType } from "./univariate-measures/median/median-adornment-types"
import { kPlottedValueType } from "./univariate-measures/plotted-value/plotted-value-adornment-types"
import { kStandardDeviationType } from "./univariate-measures/standard-deviation/standard-deviation-adornment-types"
import { kStandardErrorType } from "./univariate-measures/standard-error/standard-error-adornment-types"
import { kNormalCurveType } from "./univariate-measures/normal-curve/normal-curve-adornment-types"
import { IMovablePointAdornmentModelSnapshot } from "./movable-point/movable-point-adornment-model"
import { IMeasureInstanceSnapshot } from "./univariate-measures/univariate-measure-adornment-model"
import { IMovableLineAdornmentModelSnapshot, IMovableLineInstanceSnapshot }
  from "./movable-line/movable-line-adornment-model"
import { ILSRLAdornmentModelSnapshot } from "./lsrl/lsrl-adornment-model"
import { IBoxPlotAdornmentModelSnapshot } from "./univariate-measures/box-plot/box-plot-adornment-model"
import { ICountAdornmentModelSnapshot } from "./count/count-adornment-model"
import { IMeanAdornmentModelSnapshot } from "./univariate-measures/mean/mean-adornment-model"
import { IMeanAbsoluteDeviationAdornmentModelSnapshot }
  from "./univariate-measures/mean-absolute-deviation/mean-absolute-deviation-adornment-model"
import { IMedianAdornmentModelSnapshot } from "./univariate-measures/median/median-adornment-model"
import { IMovableValueAdornmentModelSnapshot } from "./movable-value/movable-value-adornment-model"
import { IPlottedFunctionAdornmentModelSnapshot } from "./plotted-function/plotted-function-adornment-model"
import { IPlottedValueAdornmentModelSnapshot } from "./univariate-measures/plotted-value/plotted-value-adornment-model"
import { IStandardDeviationAdornmentModelSnapshot }
  from "./univariate-measures/standard-deviation/standard-deviation-adornment-model"
import { IStandardErrorAdornmentModelSnapshot }
  from "./univariate-measures/standard-error/standard-error-adornment-model"
import { INormalCurveAdornmentModelSnapshot } from "./univariate-measures/normal-curve/normal-curve-adornment-model"
import { ILineLabelInstanceSnapshot } from "./line-label-instance"

export interface IAdornmentImporterProps {
  data?: ISharedDataSet
  metadata?: IDataSetMetadata
  plotModels: ICodapV2PlotModel[]
  attributeDescriptions: GraphAttributeDescriptionsMapSnapshot
  yAttributeDescriptions: IAttributeDescriptionSnapshot[]
}

interface IInstanceKeyProps {
  index: number
  xAttrId?: string
  xCats: string[]
  yAttrId?: string
  yCats: string[]
  topAttrId?: string
  topCats: string[]
  rightAttrId?: string
  rightCats: string[]
}

interface IInstanceKeysForAdornmentsProps {
  data?: ISharedDataSet
  metadata?: IDataSetMetadata
  attributeDescriptions: GraphAttributeDescriptionsMapSnapshot
  yAttributeDescriptions: IAttributeDescriptionSnapshot[]
}

interface IUnivariateMeasureInstancesProps {
  splitAttrId?: string
  xCats: string[]
  yCats: string[]
  instanceKeys?: string[]
}
function univariateMeasureInstances(adornment: ICodapV2UnivariateAdornment, props: IUnivariateMeasureInstancesProps) {
  const { splitAttrId, xCats, yCats, instanceKeys } = props
  const splitIndicesMap = new Map<string, number>()

  const xCellCount = xCats.length
  const yCellCount = yCats.length

  // v2 stores the label coordinates in the equationCoordsArray in category order.
  const measures: Record<string, IMeasureInstanceSnapshot> = {}
  instanceKeys?.forEach((key: string) => {
    let splitIndex
    const parsedKey = safeJsonParse(key)
    if (parsedKey && splitAttrId && parsedKey[splitAttrId] != null) {
      splitIndex = splitIndicesMap.get(parsedKey[splitAttrId])
      if (splitIndex == null) {
        splitIndex = splitIndicesMap.size
        splitIndicesMap.set(parsedKey[splitAttrId], splitIndex)
      }
    }
    else {
      splitIndex = 0
    }
    // v2 coords represent proportional position of top-left corner of label in _plot_ coordinates.
    // v3 renders labels in _cell_ coordinates, so we need to convert the v2 coords to cell coords.
    function mapPlotProportionToCellProportion(proportion: number, cellCount: number) {
      const cellProportion = 1 / cellCount
      // Think of the proportion as an absolute position in [0, 1] corresponding to the plot bounds.
      // If there are three cells, mod maps position into [0, 0.33] corresponding to the cell bounds.
      // Multiplication maps position from [0, 0.33] back to [0, 1], corresponding to proportional position in cell.
      return proportion % cellProportion * cellCount
    }
    // v2 occasionally stored `proportionCenterX`/`proportionCenterY` instead of `proportionX`/`proportionY`.
    // For now, we treat them identically.
    const equationCoords = adornment.equationCoordsArray?.[splitIndex]
    const x = equationCoords
                ? "proportionX" in equationCoords
                  ? mapPlotProportionToCellProportion(equationCoords.proportionX, xCellCount)
                  : "proportionCenterX" in equationCoords
                    ? mapPlotProportionToCellProportion(equationCoords.proportionCenterX, xCellCount)
                    : NaN
                : NaN
    const y = equationCoords
                ? "proportionY" in equationCoords
                  ? mapPlotProportionToCellProportion(equationCoords.proportionY, yCellCount)
                  : "proportionCenterY" in equationCoords
                    ? mapPlotProportionToCellProportion(equationCoords.proportionCenterY, yCellCount)
                    : NaN
                : NaN
    const labelCoords = isFinite(x) && isFinite(y) ? { x, y } : undefined
    measures[key] = { labelCoords }
  })

  return measures
}

// v2 ignores top and right split attributes when serializing adornments
const v2SplitAttrId = (
  attributeDescriptions: GraphAttributeDescriptionsMapSnapshot,
  yAttributeDescriptions: IAttributeDescriptionSnapshot[]
) => {
  if (attributeDescriptions.x?.type === "categorical") return attributeDescriptions.x.attributeID
  if (attributeDescriptions.y?.type === "categorical") return attributeDescriptions.y.attributeID
  if (yAttributeDescriptions.length && yAttributeDescriptions[0].type === "categorical") {
    return yAttributeDescriptions[0].attributeID
  }
}

const instanceKey = (props: IInstanceKeyProps) => {
  // TODO: The code below is largely a copy of GraphDataConfigurationModel's cellKey view. It would be better
  // to utilize that view instead of duplicating code here. There isn't a straightforward way to do that as part of
  // the import process. We'd need to first add the associated graph data configuration to the MobX state tree of the
  // V3 document we're creating to get accurate data from the view. That would require temporarily adding the data
  // config to the tree before importing the graph and adornments so we could access the view, and then removing it
  // before completing the import.
  const { index, xAttrId, xCats, yAttrId, yCats, topAttrId, topCats, rightAttrId, rightCats } = props
  const rightCatCount = rightCats.length || 1
  const yCatCount = yCats.length || 1
  const xCatCount = xCats.length || 1
  let cellKey: Record<string, string> = {}
  const topIndex = Math.floor(index / (rightCatCount * yCatCount * xCatCount))
  const topCat = topCats[topIndex]
  cellKey = updateCellKey(cellKey, topAttrId, topCat)
  const rightIndex = Math.floor(index / (yCatCount * xCatCount)) % rightCatCount
  const rightCat = rightCats[rightIndex]
  cellKey = updateCellKey(cellKey, rightAttrId, rightCat)
  const yCat = yCats[index % yCatCount]
  cellKey = updateCellKey(cellKey, yAttrId, yCat)
  const xCat = xCats[index % xCatCount]
  cellKey = updateCellKey(cellKey, xAttrId, xCat)
  return JSON.stringify(cellKey)
}

type GetAttributeInfoResult = [Maybe<string>, string[]]
function getAttributeInfo(
  data: ISharedDataSet, metadata?: IDataSetMetadata, attributeDesc?: IAttributeDescriptionSnapshot, defaultCat = ""
): GetAttributeInfoResult {
  const { attributeID: id, type } = attributeDesc || {}
  let categories = [defaultCat]
  if (id && type === "categorical") {
    const attr = data.dataSet.getAttribute(id)
    categories = metadata?.getCategorySet(id)?.valuesArray.slice() ?? [...new Set(attr?.strValues)]
  }
  return [id, categories]
}

const instanceKeysForAdornments = (props: IInstanceKeysForAdornmentsProps) => {
  // TODO: The code below duplicates code in GraphDataConfigurationModel's getCategoriesOptions and getAllCellKeys
  // views. It would be better to utilize those views instead but there isn't a straightforward way to do that as
  // part of the import process. We'd need to first add the associated graph data configuration to the MobX state
  // tree of the V3 document we're creating to get accurate data from the view. That would require temporarily adding
  // the data config to the tree before importing the graph and adornments so we could access the view, and then
  // removing it before completing the import.
  const { data, metadata, attributeDescriptions, yAttributeDescriptions } = props
  if (!data || !attributeDescriptions || !yAttributeDescriptions) {
    // legendCats default to [kMain], others default to [""] for cell key computations
    return { instanceKeys: ["{}"], xCats: [""], yCats: [""], topCats: [""], rightCats: [""], legendCats: [kMain] }
  }
  const [xAttrId, xCats] = getAttributeInfo(data, metadata, attributeDescriptions.x)
  const [yAttrId, yCats] = getAttributeInfo(data, metadata, yAttributeDescriptions[0])
  // legendCats default to [kMain], others default to [""] for cell key computations
  const [_legendAttrId, legendCats] = getAttributeInfo(data, metadata, attributeDescriptions.legend, kMain)
  const [topAttrId, topCats] = getAttributeInfo(data, metadata, attributeDescriptions.topSplit)
  const [rightAttrId, rightCats] = getAttributeInfo(data, metadata, attributeDescriptions.rightSplit)
  const columnCount = topCats.length * xCats.length
  const rowCount = rightCats.length * yCats.length
  const totalCount = rowCount * columnCount
  const instanceKeys: string[] = []
  for (let i = 0; i < totalCount; ++i) {
    const cellKeyProps = {
      index: i,
      xAttrId,
      yAttrId,
      topAttrId,
      rightAttrId,
      xCats,
      yCats,
      topCats,
      rightCats
    }
    instanceKeys.push(instanceKey(cellKeyProps))
  }
  return { instanceKeys, xCats, yCats, legendCats, topCats, rightCats }
}

type ImportableAdornmentSnapshots = IBoxPlotAdornmentModelSnapshot |
  ICountAdornmentModelSnapshot | ILSRLAdornmentModelSnapshot | IMeanAdornmentModelSnapshot |
  IMeanAbsoluteDeviationAdornmentModelSnapshot | IMedianAdornmentModelSnapshot |
  IMovableValueAdornmentModelSnapshot | IMovablePointAdornmentModelSnapshot |
  IMovableLineAdornmentModelSnapshot | INormalCurveAdornmentModelSnapshot |
  IPlottedFunctionAdornmentModelSnapshot | IPlottedValueAdornmentModelSnapshot |
  IStandardDeviationAdornmentModelSnapshot | IStandardErrorAdornmentModelSnapshot

export const v2AdornmentImporter = ({
  data, metadata, plotModels, attributeDescriptions, yAttributeDescriptions
}: IAdornmentImporterProps) => {
  const instanceKeysForAdornmentsProps = {data, metadata, attributeDescriptions, yAttributeDescriptions}
  const { instanceKeys, xCats, yCats, legendCats } = instanceKeysForAdornments(instanceKeysForAdornmentsProps)
  const splitAttrId = v2SplitAttrId(attributeDescriptions, yAttributeDescriptions)
  // the first plot model contains all relevant adornments
  const firstPlotModel = plotModels?.[0]
  const plotModelStorage = firstPlotModel.plotModelStorage
  const scatterPlotStorage = isV2ScatterPlotModel(firstPlotModel) ? firstPlotModel.plotModelStorage : undefined
  const v2Adornments = plotModelStorage.adornments
  const showSquaresOfResiduals = scatterPlotStorage?.areSquaresVisible ?? false
  const showMeasureLabels = plotModelStorage.showMeasureLabels
  let showConnectingLines = false
  const v3Adornments: ImportableAdornmentSnapshots[] = []
  let interceptLocked = false

  // In v2 file format, movable values "turn off" the count adornment, so we need to check
  // the count and movable value adornments to determine how to import the count adornment.
  const multipleMovableValues = v2Adornments?.multipleMovableValues
  const isShowingMovableValues = !!multipleMovableValues?.isVisible &&
                                  (!!multipleMovableValues?.values?.length ||
                                    !!multipleMovableValues?.valueModels?.length)
  const isShowingMovableValueCounts = isShowingMovableValues && !!multipleMovableValues?.isShowingCount
  const isShowingMovableValuePercents = isShowingMovableValues && !!multipleMovableValues?.isShowingPercent

  // COUNT/PERCENT
  const countAdornment = v2Adornments?.plottedCount
  const percentTypeMap: Record<string, string> = { 0: "cell", 1: "row", 2: "column" }
  if (countAdornment) {
    const countAdornmentImport: ICountAdornmentModelSnapshot = {
      isVisible: countAdornment.isVisible || isShowingMovableValueCounts || isShowingMovableValuePercents,
      percentType: countAdornment.percentKind != null ? percentTypeMap[countAdornment.percentKind] : undefined,
      showCount: countAdornment.isShowingCount || isShowingMovableValueCounts,
      showPercent: countAdornment.isShowingPercent || isShowingMovableValuePercents,
      type: kCountType
    }
    v3Adornments.push(countAdornmentImport)
  }

  // CONNECTING LINES
  const connectingLinesAdornment = v2Adornments?.connectingLine
  if (connectingLinesAdornment?.isVisible) {
    showConnectingLines = true
  }

  // MOVABLE POINT
  const movablePointAdornment = scatterPlotStorage?.movablePointStorage
  if (movablePointAdornment) {
    const points: Record<string, IPointModelSnapshot> = {}
    instanceKeys?.forEach((key: string) => {
      points[key] = movablePointAdornment.coordinates
    })
    const movablePointAdornmentImport: IMovablePointAdornmentModelSnapshot = {
      isVisible: movablePointAdornment.isVisible,
      points,
      type: kMovablePointType
    }
    v3Adornments.push(movablePointAdornmentImport)
  }

  // MOVABLE LINE
  const movableLineAdornment = scatterPlotStorage?.movableLineStorage
  if (movableLineAdornment) {
    const { equationCoords, intercept, slope, isVertical, xIntercept } = movableLineAdornment
    const lines: Record<string, IMovableLineInstanceSnapshot> = {}
    instanceKeys?.forEach((key: string) => {
      const lineInstance: IMovableLineInstanceSnapshot = {
        equationCoords: equationCoords
                          ? {
                              x: equationCoords.proportionCenterX,
                              y: equationCoords.proportionCenterY
                            }
                          : undefined,
        // v2 coordinates are idiosyncratic at times
        isV2Coords: equationCoords ? true : undefined,
        intercept: isVertical ? xIntercept : intercept,
        slope: isVertical ? Infinity : slope
      }
      lines[key] = lineInstance
    })
    const movableLineAdornmentImport: IMovableLineAdornmentModelSnapshot = {
      isVisible: movableLineAdornment.isVisible,
      lines,
      type: kMovableLineType
    }
    interceptLocked = movableLineAdornment.isInterceptLocked
    v3Adornments.push(movableLineAdornmentImport)
  }

  // LSRL
  // lsrLineStorage is presumably a legacy format that predates multipleLSRLsStorage
  // it does not appear to be imported by v2
  const { lsrLineStorage, multipleLSRLsStorage } = scatterPlotStorage ?? {}
  const lsrlAdornment: Maybe<ICodapV2MultipleLSRLAdornments> = multipleLSRLsStorage ??
                          (lsrLineStorage
                            ? {
                                isVisible: lsrLineStorage.isVisible,
                                isInterceptLocked: lsrLineStorage.isInterceptLocked,
                                lsrls: [lsrLineStorage]
                              }
                            : undefined)
  if (lsrlAdornment) {
    const labels: Record<string, Record<string, ILineLabelInstanceSnapshot>> = {}
    instanceKeys?.forEach((key: string) => {
      const labelInstances: Record<string, ILineLabelInstanceSnapshot> = {}
      lsrlAdornment.lsrls?.forEach((lsrl, index) => {
        const category = legendCats[index]
        const { equationCoords: inEquationCoords } = lsrl
        labelInstances[category] = inEquationCoords
                                    ? {
                                        equationCoords: {
                                          x: inEquationCoords.proportionCenterX,
                                          y: inEquationCoords.proportionCenterY
                                        },
                                        // v2 coordinates are idiosyncratic at times
                                        isV2Coords: true
                                      }
                                    : {}
      })
      labels[key] = labelInstances
    })
    const lsrlAdornmentImport: ILSRLAdornmentModelSnapshot = {
      isVisible: lsrlAdornment.isVisible,
      showConfidenceBands: lsrlAdornment.showConfidenceBands,
      type: kLSRLType,
      labels
    }
    interceptLocked = lsrlAdornment.isInterceptLocked // Just noting V3 doesn't track intercept locked at this level
    v3Adornments.push(lsrlAdornmentImport)
  }

  // MEAN
  const meanAdornment = v2Adornments?.plottedMean
  if (meanAdornment) {
    const measures = univariateMeasureInstances(meanAdornment, { splitAttrId, xCats, yCats, instanceKeys })
    const meanAdornmentImport: IMeanAdornmentModelSnapshot = {
      isVisible: meanAdornment.isVisible,
      measures,
      type: kMeanType
    }
    v3Adornments.push(meanAdornmentImport)
  }

  // MEDIAN
  const medianAdornment = v2Adornments?.plottedMedian
  if (medianAdornment) {
    const measures = univariateMeasureInstances(medianAdornment, { splitAttrId, xCats, yCats, instanceKeys })
    const medianAdornmentImport: IMedianAdornmentModelSnapshot = {
      isVisible: medianAdornment.isVisible,
      measures,
      type: kMedianType
    }
    v3Adornments.push(medianAdornmentImport)
  }

  // STANDARD DEVIATION
  const stDevAdornment = v2Adornments?.plottedStDev
  if (stDevAdornment) {
    const measures = univariateMeasureInstances(stDevAdornment, { splitAttrId, xCats, yCats, instanceKeys })
    const stDevAdornmentImport: IStandardDeviationAdornmentModelSnapshot = {
      isVisible: stDevAdornment.isVisible,
      measures,
      type: kStandardDeviationType
    }
    v3Adornments.push(stDevAdornmentImport)
  }

  // STANDARD ERROR
  const stErrAdornment = v2Adornments?.plottedStErr
  if (stErrAdornment) {
    const measures = univariateMeasureInstances(stErrAdornment, { splitAttrId, xCats, yCats, instanceKeys })
    const stErrAdornmentImport: IStandardErrorAdornmentModelSnapshot = {
      isVisible: stErrAdornment.isVisible,
      measures,
      _numStErrs: stErrAdornment.numberOfStdErrs,
      type: kStandardErrorType
    }
    v3Adornments.push(stErrAdornmentImport)
  }

  // MEAN ABSOLUTE DEVIATION
  const madAdornment = v2Adornments?.plottedMad
  if (madAdornment) {
    const measures = univariateMeasureInstances(madAdornment, { splitAttrId, xCats, yCats, instanceKeys })
    const madAdornmentImport: IMeanAbsoluteDeviationAdornmentModelSnapshot = {
      isVisible: madAdornment.isVisible,
      measures,
      type: kMeanAbsoluteDeviationType
    }
    v3Adornments.push(madAdornmentImport)
  }

  // BOX PLOT
  const boxPlotAdornment = v2Adornments?.plottedBoxPlot
  if (boxPlotAdornment) {
    const measures = univariateMeasureInstances(boxPlotAdornment, { splitAttrId, xCats, yCats, instanceKeys })
    const boxPlotAdornmentImport: IBoxPlotAdornmentModelSnapshot = {
      isVisible: boxPlotAdornment.isVisible,
      measures,
      showOutliers: boxPlotAdornment.showOutliers,
      showICI: boxPlotAdornment.showICI,
      type: kBoxPlotType
    }
    v3Adornments.push(boxPlotAdornmentImport)
  }

  // NORMAL CURVE
  const normalCurveAdornment = v2Adornments?.plottedNormal
  if (normalCurveAdornment) {
    const measures = univariateMeasureInstances(normalCurveAdornment, { splitAttrId, xCats, yCats, instanceKeys })
    const normalCurveAdornmentImport: INormalCurveAdornmentModelSnapshot = {
      isVisible: normalCurveAdornment.isVisible,
      measures,
      type: kNormalCurveType
    }
    v3Adornments.push(normalCurveAdornmentImport)
  }

  // MOVABLE VALUES
  const movableValuesAdornment = v2Adornments?.multipleMovableValues
  if (movableValuesAdornment) {
    const values: Record<string, number[]> = {}
    instanceKeys?.forEach((key: string) => {
      const parsedKey = safeJsonParse(key)
      const plotValues: number[] = []

      movableValuesAdornment.valueModels?.forEach((valueModel) => {
        const value = !splitAttrId
                        ? valueModel.values._main
                        : valueModel.values[parsedKey[splitAttrId]]
        plotValues.push(value)
      })
      // Old files store the values in a value property with the form
      // "values":[{"isVisible":true,"value":15}]},
      movableValuesAdornment.values?.forEach((value) => {
        plotValues.push(value.value)
      })

      values[key] = plotValues
    })
    const movableValuesAdornmentImport: IMovableValueAdornmentModelSnapshot = {
      isVisible: movableValuesAdornment.isVisible,
      type: kMovableValueType,
      values
    }
    v3Adornments.push(movableValuesAdornmentImport)
  }

  // PLOTTED VALUES
  const plottedValueAdornment = v2Adornments?.plottedValue
  if (plottedValueAdornment) {
    const formula = {
      display: plottedValueAdornment.expression,
      canonical: plottedValueAdornment.expression
    }
    const plottedValueAdornmentImport: IPlottedValueAdornmentModelSnapshot = {
      formula,
      isVisible: plottedValueAdornment.isVisible,
      type: kPlottedValueType
    }
    v3Adornments.push(plottedValueAdornmentImport)
  }

  // PLOTTED FUNCTION
  const plottedFunctionAdornment = v2Adornments?.plottedFunction
  if (plottedFunctionAdornment) {
    const formula = {
      display: plottedFunctionAdornment.expression,
      canonical: plottedFunctionAdornment.expression
    }
    const plottedFunctionAdornmentImport: IPlottedFunctionAdornmentModelSnapshot = {
      formula,
      isVisible: plottedFunctionAdornment.isVisible,
      type: kPlottedFunctionType
    }
    v3Adornments.push(plottedFunctionAdornmentImport)
  }

  return {
    adornments: v3Adornments,
    interceptLocked,
    showConnectingLines,
    showMeasureLabels,
    showSquaresOfResiduals
  }
}
