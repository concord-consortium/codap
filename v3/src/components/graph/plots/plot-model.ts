import { format } from "d3-format"
import { Instance, types } from "mobx-state-tree"
import { AttributeType } from "../../../models/data/attribute-types"
import { ICase } from "../../../models/data/data-set-types"
import { applyModelChange } from "../../../models/history/apply-model-change"
import { setNiceDomain } from "../../axis/axis-domain-utils"
import { AxisPlace, IAxisDomainOptions, IAxisTicks, TickFormatter } from "../../axis/axis-types"
import {
  CategoricalAxisModel, ColorAxisModel, CountAxisModel, DateAxisModel, EmptyAxisModel, IAxisModel,
  isCategoricalAxisModel, isColorAxisModel,
  isCountAxisModel, isDateAxisModel, isEmptyAxisModel, isNumericAxisModel, NumericAxisModel
} from "../../axis/models/axis-model"
import { PointDisplayType } from "../../data-display/data-display-types"
import { PlotType } from "../graphing-types"
import { IGraphDataConfigurationModel } from "../models/graph-data-configuration-model"

export const float1 = format('.1~f')

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

export interface IResetSettingsOptions {
  isBinnedPlotChanged?: boolean
  primaryRoleChanged?: boolean
  primaryAttrChanged?: boolean
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
  }))
  .views(self => ({
    get displayType(): PointDisplayType {
      return "points"
    },
    get hasPointsFusedIntoBars(): boolean {
      return false
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
    get showDisplayConfig(): boolean {
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
    getValidEmptyAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      return isEmptyAxisModel(axisModel)
              ? axisModel
              : EmptyAxisModel.create({ place })
    },
    getValidColorAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      return isColorAxisModel(axisModel)
              ? axisModel
              : ColorAxisModel.create({ place })
    },
    getValidCategoricalAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      return isCategoricalAxisModel(axisModel)
              ? axisModel
              : CategoricalAxisModel.create({ place })
    },
    getValidCountAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      if (isCountAxisModel(axisModel)) return axisModel
      const maxCellCaseCount = self.maxCellCaseCount()
      const countAxis = CountAxisModel.create({ place, min: 0, max: maxCellCaseCount })
      setNiceDomain([0, maxCellCaseCount], countAxis, { clampPosMinAtZero: true })
      return countAxis
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
    nonDraggableAxisTicks(formatter: TickFormatter): IAxisTicks {
      return { tickValues: [], tickLabels: [] }
    }
  }))
  .actions(self => ({
    setDataConfiguration(dataConfiguration: IGraphDataConfigurationModel) {
      self.dataConfiguration = dataConfiguration
    },
    resetSettings(options?: IResetSettingsOptions) {
      // derived models may override
    }
  }))
  .actions(applyModelChange)
export interface IPlotModel extends Instance<typeof PlotModel> {}
