import { format } from "d3-format"
import { Instance, types } from "mobx-state-tree"
import { AttributeType } from "../../../models/data/attribute-types"
import { ICase } from "../../../models/data/data-set-types"
import { applyModelChange } from "../../../models/history/apply-model-change"
import { setNiceDomain } from "../../axis/axis-domain-utils"
import { AxisPlace, IAxisDomainOptions, IAxisTicks, TickFormatter } from "../../axis/axis-types"
import { EmptyAxisModel, IAxisModel, isEmptyAxisModel } from "../../axis/models/axis-model"
import { IAxisProviderBase } from "../../axis/models/axis-provider"
import {
  CategoricalAxisModel, ColorAxisModel, isCategoricalAxisModel, isColorAxisModel
} from "../../axis/models/categorical-axis-models"
import {
  CountAxisModel, DateAxisModel, isCountAxisModel, isDateAxisModel, isNumericAxisModel, isPercentAxisModel,
  isQualitativeAxisModel, NumericAxisModel, PercentAxisModel, QualitativeAxisModel
} from "../../axis/models/numeric-axis-models"
import { GraphAttrRole, PointDisplayType } from "../../data-display/data-display-types"
import { PlotType } from "../graphing-types"
import { IGraphDataConfigurationModel } from "../models/graph-data-configuration-model"

export const float1 = format('.1~f')

export interface IPlotGraphApi {
  getSecondaryAxisModel: () => Maybe<IAxisModel>
  setSecondaryAxisModel: (axis?: IAxisModel) => void
}

export interface IBarTipTextProps {
  primaryMatches: ICase[]
  casesInSubPlot: string[]
  casePrimaryValue?: string
  legendAttrID?: string
  caseLegendValue?: string
  topSplitAttrID?: string
  caseTopSplitValue?: string
  rightSplitAttrID?: string
  caseRightSplitValue?: string
}

export interface IRespondToPlotChangeOptions {
  axisProvider: IAxisProviderBase
  primaryPlace: AxisPlace
  secondaryPlace: AxisPlace
  isBinnedPlotChanged?: boolean
  primaryRoleChanged?: boolean
  primaryAttrChanged?: boolean
}

export interface ICountAdornmentValuesProps {
  cellKey: Record<string, string>
  movableValues?: number[]
  primaryAxisDomain?: [min: number, max: number]
  percentType?: "cell" | "row" | "column"
}

export interface INumDenom {
  numerator: number
  denominator: number
  startFraction?: number
  endFraction?: number
}

export interface ICountAdornmentValues {
  numHorizontalRegions: number
  values: INumDenom[]
}

export function typesPlotType(type: PlotType) {
  return types.optional(types.literal(type), type)
}

export const PlotModel = types
  .model("PlotModel", {
    type: types.optional(types.string, () => {
      throw "type must be overridden"
    }),
  })
  .volatile(self => ({
    dataConfiguration: undefined as Maybe<IGraphDataConfigurationModel>,
    graphApi: undefined as Maybe<IPlotGraphApi>
  }))
  .views(self => ({
    get displayType(): PointDisplayType {
      return "points"
    },
    get hasPointsFusedIntoBars(): boolean {
      return false
    },
    get hasCountPercentFormulaAxis(): boolean {
      return false
    },
    get countPercentFormulaAxisLabel(): string {
      throw new Error("countPercentFormulaAxisLabel should not be called for the base class")
    },
    get hasBinnedNumericAxis(): boolean {
      return false
    },
    get hasDraggableNumericAxis(): boolean {
      return false
    },
    get hasExpression(): boolean {
      return false
    },
    get isBinned(): boolean {
      return false
    },
    get isCategorical(): boolean {
      return false
    },
    get isUnivariateNumeric(): boolean {
      return false
    },
    get isBivariateNumeric(): boolean {
      return false
    },
    get showDisplayConfig(): boolean {
      return false
    },
    get showDisplayTypeSelection(): boolean {
      return false
    },
    get showFusePointsIntoBars(): boolean {
      return false
    },
    get showBreakdownTypes(): boolean {
      return false
    },
    get showGridLines(): boolean {
      return false
    },
    get showZeroLine(): boolean {
      return false
    },
    get canShowBoxPlotAndNormalCurve(): boolean {
      return false
    }
  }))
  .views(self => ({
    matchingCasesForAttr(attrId?: string, value?: string, _allCases?: ICase[]) {
      if (!attrId) return []
      const dataset = self.dataConfiguration?.dataset
      const allCases = _allCases ?? dataset?.items
      return allCases?.filter(aCase => dataset?.getStrValue(aCase.__id__, attrId) === value) as ICase[] ?? []
    },
    maxCellCaseCount() {
      const { maxOverAllCells, primaryRole } = self.dataConfiguration || {}
      const primarySplitRole = primaryRole === "x" ? "topSplit" : "rightSplit"
      const secondarySplitRole = primaryRole === "x" ? "rightSplit" : "topSplit"
      return maxOverAllCells?.(primarySplitRole, secondarySplitRole) ?? 0
    },
    maxCellPercent() {
      const { maxPercentAllCells, primaryRole } = self.dataConfiguration || {}
      const primarySplitRole = primaryRole === "x" ? "topSplit" : "rightSplit"
      const secondarySplitRole = primaryRole === "x" ? "rightSplit" : "topSplit"
      return maxPercentAllCells?.(primarySplitRole, secondarySplitRole) ?? 0
    },
    barTipText(props: IBarTipTextProps) {
      return ""
    }
  }))
  .views(self => ({
    get axisDomainOptions(): IAxisDomainOptions {
      return {
        // When displaying bars, the domain should start at 0 unless there are negative values.
        clampPosMinAtZero: self.displayType === "bars"
      }
    },
    axisLabelClickHandler(role: GraphAttrRole): Maybe<() => void> {
      return undefined
    },
    getValidEmptyAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      return isEmptyAxisModel(axisModel)
              ? axisModel
              : EmptyAxisModel.create({ place })
    },
    getValidCategoricalOrColorAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      if (attrType === "color" && isColorAxisModel(axisModel) ||
          attrType === "categorical" && isCategoricalAxisModel(axisModel)) {
        return axisModel
      }
      return attrType === "color"
              ? ColorAxisModel.create({ place })
              : CategoricalAxisModel.create({ place })
    },
    getValidCountAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      const maxCellCaseCount = self.maxCellCaseCount()
      if (isCountAxisModel(axisModel)) {
        // Even though we already have a count axis, it might need its bounds adjusted
        setNiceDomain([0, maxCellCaseCount], axisModel, { clampPosMinAtZero: true })
        return axisModel
      }
      const countAxis = CountAxisModel.create({ place, min: 0, max: maxCellCaseCount })
      setNiceDomain([0, maxCellCaseCount], countAxis, { clampPosMinAtZero: true })
      return countAxis
    },
    getValidPercentAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      const maxCellCasePercent = self.maxCellPercent()
      if (isPercentAxisModel(axisModel)) {
        // Even though we already have a percent axis, it might need its bounds adjusted
        setNiceDomain([0, maxCellCasePercent], axisModel, { clampPosMinAtZero: true })
        return axisModel
      }
      const percentAxis = PercentAxisModel.create({ place, min: 0, max: maxCellCasePercent })
      setNiceDomain([0, maxCellCasePercent], percentAxis, { clampPosMinAtZero: true })
      return percentAxis
    },
    getValidNumericDateOrQualitativeAxis(place: AxisPlace,
                                         attrType?: AttributeType,
                                         axisModel?: IAxisModel): IAxisModel {
      if (attrType === "date" && isDateAxisModel(axisModel) ||
          attrType === "numeric" && isNumericAxisModel(axisModel) ||
          attrType === "qualitative" && isQualitativeAxisModel(axisModel)) {
        return axisModel
      }
      return attrType === "date"
        ? DateAxisModel.create({place, min: 0, max: 1})
        : attrType === "qualitative"
          ? QualitativeAxisModel.create({place, min: 0, max: 100})
          : NumericAxisModel.create({place, min: 0, max: 1})
    },
  }))
  .views(self => ({
    getValidPrimaryAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      return self.getValidEmptyAxis(place, attrType, axisModel)
    },
    getValidSecondaryAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      return self.getValidEmptyAxis(place, attrType, axisModel)
    },
    nonDraggableAxisTicks(formatter: TickFormatter): IAxisTicks {
      return { tickValues: [], tickLabels: [] }
    },
    numericValuesForRole(role: GraphAttrRole) {
      // The default implementation returns the numeric values for the attribute corresponding to the role.
      return self.dataConfiguration?.numericValuesForAttrRole(role) || []
    },
    // This function makes it easy for inherited models to get base model behavior when appropriate
    _countAdornmentValues({ cellKey }: ICountAdornmentValuesProps): ICountAdornmentValues {
      const dataConfig = self.dataConfiguration
      const showMeasuresForSelection = !!dataConfig?.showMeasuresForSelection,
        totalNumberOfCases = dataConfig?.allPlottedCases().length ?? 0,
        totNumInSubPlot = dataConfig?.subPlotCases(cellKey).length ?? 0,
        numSelInSubPlot = dataConfig?.filterCasesForDisplay(dataConfig?.subPlotCases(cellKey)).length ?? 0
      const theValue = {numerator: 0, denominator: 1}
      if (showMeasuresForSelection) {
        theValue.numerator = numSelInSubPlot
        theValue.denominator = totNumInSubPlot
      } else {
        theValue.numerator = totNumInSubPlot
        theValue.denominator = totalNumberOfCases
      }
      return {
        numHorizontalRegions: dataConfig?.numberOfHorizontalRegions ?? 1,
        values: [theValue]
      }
    },
    // Called by CountAdornmentComponent to get the information needed to display counts and percents
    // based on various aspects of the plot. The base class implementation assumes there is only one
    // "region" of interest, but also, for convenience, it returns the number of equal width regions
    // that the plot is divided into.
    // Subclasses will override and handle things like movable values and the bins of a binned dot plot.
    countAdornmentValues({ cellKey }: ICountAdornmentValuesProps): ICountAdornmentValues {
      return this._countAdornmentValues({ cellKey })
  }}))
  .actions(self => ({
    setGraphContext(dataConfiguration: IGraphDataConfigurationModel, api?: IPlotGraphApi) {
      self.dataConfiguration = dataConfiguration
      self.graphApi = api
    },
    respondToPlotChange(options: IRespondToPlotChangeOptions) {
      // derived models may override
    }
  }))
  .actions(applyModelChange)
export interface IPlotModel extends Instance<typeof PlotModel> {}
