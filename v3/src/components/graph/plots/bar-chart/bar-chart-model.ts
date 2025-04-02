import { format } from "d3-format"
import { IJsonPatch, Instance, SnapshotIn, types } from "mobx-state-tree"
import { AttributeType } from "../../../../models/data/attribute-types"
import { Formula } from "../../../../models/formula/formula"
import { t } from "../../../../utilities/translation/translate"
import { AxisPlace } from "../../../axis/axis-types"
import { IAxisModel, isNumericAxisModel } from "../../../axis/models/axis-model"
import { GraphAttrRole, PointDisplayType } from "../../../data-display/data-display-types"
import { BreakdownType, BreakdownTypes } from "../../graphing-types"
import { DotChartModel } from "../dot-chart/dot-chart-model"
import { IBarTipTextProps, IPlotModel, typesPlotType } from "../plot-model"

const float1 = format('.1~f')

export const BarChartModel = DotChartModel
  .named("BarChartModel")
  .props({
    type: typesPlotType("barChart"),
    breakdownType: types.optional(types.enumeration([...BreakdownTypes]), "count"),
    formula: types.maybe(Formula)
  })
  .volatile(self => ({
    formulaEditorIsOpen: false,
    fallbackBreakdownType: self.breakdownType === "percent" ? "percent" : "count" as Exclude<BreakdownType, "formula">
  }))
  .actions(self => ({
    setBreakdownType(type: BreakdownType) {
      self.breakdownType = type
      if (type !== 'formula') self.fallbackBreakdownType = type
    },
    setExpression(expression: string) {
      if (expression) {
        self.formula = Formula.create({ display: expression })
        this.setBreakdownType("formula")
      } else {
        self.formula = undefined
        this.setBreakdownType(self.fallbackBreakdownType)
      }
    },
    setFormulaEditorIsOpen(isOpen: boolean) {
      self.formulaEditorIsOpen = isOpen
    },
  }))
  .views(self => {
    const baseMaxCellPercent = self.maxCellPercent
    return {
      maxCellPercent(): number {
        // Override base class to handle situation in which there is a legend
        return self.dataConfiguration?.attributeID("legend") ? 100 : baseMaxCellPercent()
      }
    }
  })
  .views(self => ({
    get displayType(): PointDisplayType {
      return "bars"
    },
    get hasPointsFusedIntoBars(): boolean {
      return true
    },
    get hasCountPercentFormulaAxis(): boolean {
      return true
    },
    get countPercentFormulaAxisLabel(): string {
      switch (self.breakdownType) {
        case "count":
          return t("DG.CountAxisView.countLabel")
        case "percent":
          return t("DG.CountAxisView.percentLabel")
        case "formula":
          return self.formula?.display ?? ""
        default:
          return ''
      }
    },
    get hasDraggableNumericAxis() {
      return true
    },
    get hasExpression() {
      return !!self.formula && !self.formula.empty
    },
    getValidFormulaAxis(axisModel?: IAxisModel): IAxisModel {
      const secondaryPlace = self.dataConfiguration?.secondaryRole === "x" ? "bottom" : "left"
      const resultAxisModel = self.getValidNumericOrDateAxis(secondaryPlace, undefined, axisModel)
      // todo: Once we can evaluate the formula, use min and max computed from it
      isNumericAxisModel(resultAxisModel) && resultAxisModel.setDomain(0, 100)
      return resultAxisModel
    },
    getValidSecondaryAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      switch (self.breakdownType) {
        case "count":
          return self.getValidCountAxis(place, attrType, axisModel)
        case "percent":
          return self.getValidPercentAxis(place, attrType, axisModel)
        case "formula":
          return this.getValidFormulaAxis(axisModel)
        default:
          return self.getValidNumericOrDateAxis(place, attrType, axisModel)
      }
    },
    get showZeroLine() {
      return true
    },
    get showBreakdownTypes(): boolean {
      return true
    },
    axisLabelClickHandler(role: GraphAttrRole): Maybe<() => void> {
      if (self.breakdownType === "formula" && self.hasExpression && role === self.dataConfiguration?.secondaryRole) {
        return () => {
          self.setFormulaEditorIsOpen(true)
        }
      }
      return undefined
    },
    get maxCellPercent() {
      // Override base class to handle situation in which there is a legend
      return self.dataConfiguration?.attributeID("legend") ? 100 : self._maxCellPercent
    },
    newSecondaryAxisRequired(patch: IJsonPatch): false | IAxisModel {
      if (patch.path.includes("breakdownType")) {
        const secondaryPlace = self.dataConfiguration?.secondaryRole === "x" ? "bottom" : "left"
        return this.getValidSecondaryAxis(secondaryPlace)
      }
      return false
    },
    barTipText(props: IBarTipTextProps) {
      const { dataset } = self.dataConfiguration ?? {}
      const {
        primaryMatches, casesInSubPlot, casePrimaryValue, legendAttrID: legendAttrId, caseLegendValue,
        topSplitAttrID: topSplitAttrId, caseTopSplitValue, rightSplitAttrID: rightSplitAttrId, caseRightSplitValue
      } = props
      const topSplitMatches = self.matchingCasesForAttr(topSplitAttrId, caseTopSplitValue)
      const rightSplitMatches = self.matchingCasesForAttr(rightSplitAttrId, caseRightSplitValue)
      const bothSplitMatches = topSplitMatches.filter(aCase => rightSplitMatches.includes(aCase))
      const legendMatches = self.matchingCasesForAttr(legendAttrId, caseLegendValue, primaryMatches)
      const totalCases = [
        legendMatches.length,
        bothSplitMatches.length,
        topSplitMatches.length,
        rightSplitMatches.length,
        dataset?.items.length ?? 0
      ].find(length => length > 0) ?? 0
      const legendMatchesInSubplot = legendAttrId
        ? casesInSubPlot.filter(caseId => dataset?.getStrValue(caseId, legendAttrId) === caseLegendValue).length
        :  0
      const caseCategoryString = caseLegendValue ? casePrimaryValue : ""
      const caseLegendCategoryString = caseLegendValue || casePrimaryValue
      const firstCount = legendAttrId ? legendMatchesInSubplot : casesInSubPlot.length
      const secondCount = legendAttrId ? casesInSubPlot.length : totalCases
      const percent = float1(100 * firstCount / secondCount)
      // <n> of <m> <category> (<p>%) are <legend category>
      const vars = [ firstCount, secondCount, percent, caseLegendCategoryString ]
      // data tips have an additional variable when there's a legend
      caseCategoryString && vars.splice(2, 0, caseCategoryString)
      const translationKey = legendAttrId
        ? firstCount === 1 ? "DG.BarChartModel.cellTipSingular" : "DG.BarChartModel.cellTipPlural"
        : firstCount === 1 ? "DG.BarChartModel.cellTipNoLegendSingular" : "DG.BarChartModel.cellTipNoLegendPlural"
      return t(translationKey, {vars})
    }
  }))
export interface IBarChartModel extends Instance<typeof BarChartModel> {}
export interface IBarChartSnapshot extends SnapshotIn<typeof BarChartModel> {}
export function isBarChartModel(model?: IPlotModel): model is IBarChartModel {
  return model?.type === "barChart"
}
