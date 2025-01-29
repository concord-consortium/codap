import { IAttribute } from "../../../models/data/attribute"
import { ISharedDataSet } from "../../../models/shared/shared-data-set"
import { safeJsonParse } from "../../../utilities/js-utils"
import {
  ICodapV2MultipleLSRLAdornments, ICodapV2PlotModel, ICodapV2UnivariateAdornment
} from "../../../v2/codap-v2-types"
import {
  GraphAttributeDescriptionsMapSnapshot, IAttributeDescriptionSnapshot
} from "../../data-display/models/data-configuration-model"
import { updateCellKey } from "./adornment-utils"
import { kCountType } from "./count/count-adornment-types"
import { kLSRLType } from "./lsrl/lsrl-adornment-types"
import { kMovableLineType } from "./movable-line/movable-line-adornment-types"
import { kMovablePointType } from "./movable-point/movable-point-adornment-types"
import { kMovableValueType } from "./movable-value/movable-value-adornment-types"
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
import { IPointModelSnapshot } from "./adornment-models"
import { IMeasureInstanceSnapshot } from "./univariate-measures/univariate-measure-adornment-model"
import { IMovableLineAdornmentModelSnapshot, IMovableLineInstanceSnapshot }
  from "./movable-line/movable-line-adornment-model"
import { ILSRLAdornmentModelSnapshot, ILSRLInstanceSnapshot } from "./lsrl/lsrl-adornment-model"
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

interface IProps {
  data?: ISharedDataSet
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
  attributeDescriptions: GraphAttributeDescriptionsMapSnapshot
  yAttributeDescriptions: IAttributeDescriptionSnapshot[]
}

const univariateMeasureInstances = (adornment: ICodapV2UnivariateAdornment, instanceKeys?: string[]) => {
  // TODO_V2_IMPORT: [Story **#188695360**] most documents with an equationCoordsArray have multiple items in the array
  // we are only looking at the first item here
  const equationCoordsV2 = adornment.equationCoordsArray?.[0]

  // TODO_V2_IMPORT: [Story: **#188695677**] 93 files in cfm-shared have equationCoordsArray with values with
  // proportionCenterX and proportionCenterY instead of proportionX and proportionY.
  // For now we are just skipping those and treating them as undefined
  // example doc: cfm-shared/1caDhoHFlpuNQgSfOdhh/file.json
  const equationCoords = (equationCoordsV2 && ("proportionX" in equationCoordsV2))
    ? equationCoordsV2
    : { proportionX: NaN, proportionY: NaN }
  const measures: Record<string, IMeasureInstanceSnapshot> = {}
  instanceKeys?.forEach((key: string) => {
    const { proportionX, proportionY } = equationCoords
    const labelCoords = isFinite(proportionX) && isFinite(proportionY)
      ? { x: proportionX, y: proportionY }
      : undefined
    const measureInstance = { labelCoords }
    measures[key] = measureInstance
  })

  return measures
}

// v2 ignores top and right split attributes when serializing adornments
const firstSplitAttrId = (
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

const instanceKeysForAdornments = (props: IInstanceKeysForAdornmentsProps) => {
  // TODO: The code below duplicates code in GraphDataConfigurationModel's getCategoriesOptions and getAllCellKeys
  // views. It would be better to utilize those views instead but there isn't a straightforward way to do that as
  // part of the import process. We'd need to first add the associated graph data configuration to the MobX state
  // tree of the V3 document we're creating to get accurate data from the view. That would require temporarily adding
  // the data config to the tree before importing the graph and adornments so we could access the view, and then
  // removing it before completing the import.
  const { data, attributeDescriptions, yAttributeDescriptions } = props
  if (!data || !attributeDescriptions || !yAttributeDescriptions) return ["{}"]
  const { attributeID: xAttrId, type: xAttrType } = attributeDescriptions.x ?? { attributeID: null, type: null }
  const { attributeID: topAttrId } = attributeDescriptions.topSplit ?? { attributeID: null }
  const { attributeID: rightAttrId } = attributeDescriptions.rightSplit ?? { attributeID: null }
  const { attributeID: yAttrId, type: yAttrType } = yAttributeDescriptions[0] ?? { attributeID: null }
  const xAttr = data.dataSet.attributes.find((attr: IAttribute) => attr.id === xAttrId)
  const xCats = xAttr && xAttrType !== "numeric" ? [...new Set(xAttr.strValues)] as string[] : [""]
  const yAttr = data.dataSet.attributes.find((attr: IAttribute) => attr.id === yAttrId)
  const yCats = yAttr && yAttrType !== "numeric" ? [...new Set(yAttr.strValues)] as string[] : [""]
  const topAttr = data.dataSet.attributes.find((attr: IAttribute) => attr.id === topAttrId)
  const topCats = topAttr ? [...new Set(topAttr.strValues)] as string[] : [""]
  const topCatCount = topCats.length || 1
  const rightAttr = data.dataSet.attributes.find((attr: IAttribute) => attr.id === rightAttrId)
  const rightCats = rightAttr ? [...new Set(rightAttr.strValues)] as string[] : [""]
  const rightCatCount = rightCats.length || 1
  const yCatCount = yCats.length || 1
  const xCatCount = xCats.length || 1
  const columnCount = topCatCount * xCatCount
  const rowCount = rightCatCount * yCatCount
  const totalCount = rowCount * columnCount
  const instanceKeys: string[] = []
  for (let i = 0; i < totalCount; ++i) {
    const cellKeyProps = {
      index: i,
      xAttrId: xAttr?.id,
      yAttrId: yAttr?.id,
      topAttrId: topAttr?.id,
      rightAttrId: rightAttr?.id,
      xCats,
      yCats,
      topCats,
      rightCats
    }
    instanceKeys.push(instanceKey(cellKeyProps))
  }
  return instanceKeys
}

type ImportableAdornmentSnapshots = IBoxPlotAdornmentModelSnapshot |
  ICountAdornmentModelSnapshot | ILSRLAdornmentModelSnapshot | IMeanAdornmentModelSnapshot |
  IMeanAbsoluteDeviationAdornmentModelSnapshot | IMedianAdornmentModelSnapshot |
  IMovableValueAdornmentModelSnapshot | IMovablePointAdornmentModelSnapshot |
  IMovableLineAdornmentModelSnapshot | INormalCurveAdornmentModelSnapshot |
  IPlottedFunctionAdornmentModelSnapshot | IPlottedValueAdornmentModelSnapshot |
  IStandardDeviationAdornmentModelSnapshot | IStandardErrorAdornmentModelSnapshot

export const v2AdornmentImporter = ({data, plotModels, attributeDescriptions, yAttributeDescriptions}: IProps) => {
  const instanceKeys = instanceKeysForAdornments({data, attributeDescriptions, yAttributeDescriptions})
  const plotModelStorage = plotModels?.[0].plotModelStorage
  const v2Adornments = plotModelStorage.adornments
  const showSquaresOfResiduals = plotModelStorage.areSquaresVisible
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
  const movablePointAdornment = plotModelStorage.movablePointStorage
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
  const movableLineAdornment = plotModelStorage.movableLineStorage
  if (movableLineAdornment) {
    const equationCoords = movableLineAdornment.equationCoords
    const lines: Record<string, IMovableLineInstanceSnapshot> = {}
    instanceKeys?.forEach((key: string) => {
      const lineInstance = {
        // TODO_V2_IMPORT: [Story: **#188695677**] equationCoords are not handled correctly, the model stores x and y
        // but the loaded equationCoords have proportionCenterX and proportionCenterY
        equationCoords: equationCoords ?? undefined, // The V2 default is null, but we want undefined
        intercept: movableLineAdornment.intercept,
        slope: movableLineAdornment.slope
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
  const { lsrLineStorage, multipleLSRLsStorage } = plotModelStorage
  const lsrlAdornment: Maybe<ICodapV2MultipleLSRLAdornments> = multipleLSRLsStorage ??
                          (lsrLineStorage
                            ? {
                                isVisible: lsrLineStorage.isVisible,
                                isInterceptLocked: lsrLineStorage.isInterceptLocked,
                                lsrls: [lsrLineStorage]
                              }
                            : undefined)
  if (lsrlAdornment) {
    const lines: Record<string, ILSRLInstanceSnapshot[]> = {}
    instanceKeys?.forEach((key: string) => {
      const lsrlInstances: ILSRLInstanceSnapshot[] = []
      lsrlAdornment.lsrls?.forEach((lsrl) => {
        const lsrlInstance = {
          // TODO_V2_IMPORT: [Story: **#188695677**] equationCoords are not handled correctly, the model stores x and y
          // but the loaded equationCoords have proportionCenterX and proportionCenterY
          equationCoords: lsrl.equationCoords ?? undefined // The V2 default is null, but we want undefined
        }
        lsrlInstances.push(lsrlInstance)
      })
      lines[key] = lsrlInstances
    })
    const lsrlAdornmentImport: ILSRLAdornmentModelSnapshot = {
      isVisible: lsrlAdornment.isVisible,
      showConfidenceBands: lsrlAdornment.showConfidenceBands,
      type: kLSRLType,
      lines
    }
    interceptLocked = lsrlAdornment.isInterceptLocked
    v3Adornments.push(lsrlAdornmentImport)
  }

  // MEAN
  const meanAdornment = v2Adornments?.plottedMean
  if (meanAdornment) {
    const measures = univariateMeasureInstances(meanAdornment, instanceKeys)
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
    const measures = univariateMeasureInstances(medianAdornment, instanceKeys)
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
    const measures = univariateMeasureInstances(stDevAdornment, instanceKeys)
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
    const measures = univariateMeasureInstances(stErrAdornment, instanceKeys)
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
    const measures = univariateMeasureInstances(madAdornment, instanceKeys)
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
    const measures = univariateMeasureInstances(boxPlotAdornment, instanceKeys)
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
    const measures = univariateMeasureInstances(normalCurveAdornment, instanceKeys)
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
    const splitAttrId = firstSplitAttrId(attributeDescriptions, yAttributeDescriptions)
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

      // [Story: #188699857] TODO_V2_IMPORT: both valueModels and values might have `isVisible: false`
      // we are currently just ignoring that
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
