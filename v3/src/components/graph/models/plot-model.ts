import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { Formula } from "../../../models/formula/formula"
import {
  CategoricalAxisModel, DateAxisModel, EmptyAxisModel, IAxisModel, isCategoricalAxisModel, isDateAxisModel,
  isEmptyAxisModel, isNumericAxisModel, NumericAxisModel
} from "../../axis/models/axis-model"
import { PointDisplayType } from "../../data-display/data-display-types"
import { BreakdownTypes, PlotType } from "../graphing-types"
import { AxisPlace, IAxisDomainOptions } from "../../axis/axis-types"
import { AttributeType } from "../../../models/data/attribute-types"

function typesPlotType(type: PlotType) {
  return types.optional(types.literal(type), type)
}

export const PlotModel = types
  .model("PlotModel", {
    type: types.optional(types.string, () => {
      throw "type must be overridden"
    }),
  })
  .views(self => ({
    get displayType(): PointDisplayType {
      return "points"
    },
    get hasCountAxis(): boolean {
      return false
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
    get showDisplayTypeSelection(): boolean {
      return false
    },
    get showFusePointsIntoBars(): boolean {
      return false
    },
    get showGridLines(): boolean {
      return false
    },
    get showZeroLine(): boolean {
      return false
    }
  }))
  .views(self => ({
    get axisDomainOptions(): IAxisDomainOptions {
      return {
        // When displaying bars, the domain should start at 0 unless there are negative values.
        clampPosMinAtZero: self.displayType === "bars"
      }
    },
    getValidEmptyAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      return isEmptyAxisModel(axisModel)
              ? axisModel
              : EmptyAxisModel.create({ place })
    },
    getValidCategoricalAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      return isCategoricalAxisModel(axisModel)
              ? axisModel
              : CategoricalAxisModel.create({ place })
    },
    getValidNumericAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      // count axis
      return isNumericAxisModel(axisModel)
              ? axisModel
              : NumericAxisModel.create({ place, min: 0, max: 1 })
    },
    getValidNumericOrDateAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      if (attrType === "date" && isDateAxisModel(axisModel) ||
          attrType === "numeric" && isNumericAxisModel(axisModel)) {
        return axisModel
      }
      return attrType === "date"
              ? DateAxisModel.create({ place, min: 0, max: 1 })
              : NumericAxisModel.create({ place, min: 0, max: 1 })
    },
  }))
  .views(self => ({
    getValidPrimaryAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      return self.getValidEmptyAxis(place, attrType, axisModel)
    },
    getValidSecondaryAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      return self.getValidEmptyAxis(place, attrType, axisModel)
    },
  }))
export interface IPlotModel extends Instance<typeof PlotModel> {}

// default empty plot
export const CasePlotModel = PlotModel
  .named("CasePlotModel")
  .props({
    type: typesPlotType("casePlot")
  })

// categorical plots
export const DotChartModel = PlotModel
  .named("DotChartModel")
  .props({
    type: typesPlotType("dotChart")
  })
  .views(self => ({
    get isCategorical() {
      return true
    },
    getValidPrimaryAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      return self.getValidCategoricalAxis(place, attrType, axisModel)
    },
    get showFusePointsIntoBars() {
      return true
    }
  }))

export const BarChartModel = DotChartModel
  .named("BarChartModel")
  .props({
    type: typesPlotType("barChart"),
    breakdownType: types.maybe(types.enumeration([...BreakdownTypes])),
    expression: types.maybe(Formula)
  })
  .views(self => ({
    get displayType(): PointDisplayType {
      return "bars"
    },
    get hasCountAxis(): boolean {
      return true
    },
    get hasExpression() {
      return !!self.expression && !self.expression.empty
    },
    getValidSecondaryAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      // count axis
      return self.getValidNumericAxis(place, attrType, axisModel)
    },
    get showZeroLine() {
      return false
    }
  }))
export interface IBarChartModel extends Instance<typeof BarChartModel> {}
export interface IBarChartSnapshot extends SnapshotIn<typeof BarChartModel> {}
export function isBarChartModel(model: IPlotModel): model is IBarChartModel {
  return model.type === "barChart"
}

// univariate numeric plots
export const DotPlotModel = PlotModel
  .named("DotPlotModel")
  .props({
    type: typesPlotType("dotPlot")
  })
  .views(self => ({
    get hasDraggableNumericAxis() {
      return true
    },
    get isUnivariateNumeric() {
      return true
    },
    getValidPrimaryAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      return self.getValidNumericOrDateAxis(place, attrType, axisModel)
    },
    get showDisplayTypeSelection() {
      return true
    }
  }))

export const BinnedDotPlotModel = DotPlotModel
  .named("BinnedDotPlotModel")
  .props({
    type: typesPlotType("binnedDotPlot")
  })
  .views(self => ({
    get hasBinnedNumericAxis(): boolean {
      return true
    },
    get hasDraggableNumericAxis() {
      return false
    },
    get isBinned() {
      return true
    },
    get showFusePointsIntoBars() {
      return true
    }
  }))

export const HistogramModel = BinnedDotPlotModel
  .named("HistogramModel")
  .props({
    type: typesPlotType("histogram")
  })
  .views(self => ({
    get displayType(): PointDisplayType {
      return "bars"
    },
    get hasCountAxis(): boolean {
      return true
    },
    get hasBinnedNumericAxis(): boolean {
      return false
    },
    get hasDraggableNumericAxis() {
      return true
    },
    getValidSecondaryAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      // count axis
      return self.getValidNumericAxis(place, attrType, axisModel)
    },
    get showGridLines() {
      return true
    }
  }))

// bar for each point
export const LinePlotModel = DotPlotModel
  .named("LinePlotModel")
  .props({
    type: typesPlotType("linePlot")
  })
  .views(self => ({
    get displayType(): PointDisplayType {
      return "bars"
    }
  }))

// bivariate numeric plots
export const ScatterPlotModel = PlotModel
  .named("ScatterPlotModel")
  .props({
    type: typesPlotType("scatterPlot")
  })
  .views(self => ({
    get hasDraggableNumericAxis() {
      return true
    },
    get isBivariateNumeric() {
      return true
    },
    getValidPrimaryAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      return self.getValidNumericOrDateAxis(place, attrType, axisModel)
    },
    getValidSecondaryAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      return self.getValidNumericOrDateAxis(place, attrType, axisModel)
    },
    get showGridLines() {
      return true
    }
  }))

export const PlotModelUnion = types.union(CasePlotModel, DotChartModel, BarChartModel, DotPlotModel,
                                          BinnedDotPlotModel, HistogramModel, LinePlotModel, ScatterPlotModel)
export type IPlotModelUnion = Instance<typeof PlotModelUnion>
export type IPlotModelUnionSnapshot = SnapshotIn<typeof PlotModelUnion>
