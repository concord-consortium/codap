import { format } from "d3-format"
import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { AttributeType } from "../../../../models/data/attribute-types"
import { Formula } from "../../../../models/formula/formula"
import { t } from "../../../../utilities/translation/translate"
import { AxisPlace } from "../../../axis/axis-types"
import { IAxisModel } from "../../../axis/models/axis-model"
import { PointDisplayType } from "../../../data-display/data-display-types"
import { BreakdownTypes } from "../../graphing-types"
import { DotChartModel } from "../dot-chart/dot-chart-model"
import { IBarTipTextProps, IPlotModel, typesPlotType } from "../plot-model"

const float1 = format('.1~f')

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
    get hasPointsFusedIntoBars(): boolean {
      return true
    },
    get hasCountAxis(): boolean {
      return true
    },
    get hasDraggableNumericAxis() {
      return true
    },
    get hasExpression() {
      return !!self.expression && !self.expression.empty
    },
    getValidSecondaryAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      return self.getValidCountAxis(place, attrType, axisModel)
    },
    get showZeroLine() {
      return true
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
      const attrArray = [ firstCount, secondCount, caseCategoryString, percent, caseLegendCategoryString ]
      const translationKey = legendAttrId
        ? firstCount === 1 ? "DG.BarChartModel.cellTipSingular" : "DG.BarChartModel.cellTipPlural"
        : firstCount === 1 ? "DG.BarChartModel.cellTipNoLegendSingular" : "DG.BarChartModel.cellTipNoLegendPlural"
      return t(translationKey, {vars: attrArray})
    }
  }))
export interface IBarChartModel extends Instance<typeof BarChartModel> {}
export interface IBarChartSnapshot extends SnapshotIn<typeof BarChartModel> {}
export function isBarChartModel(model: IPlotModel): model is IBarChartModel {
  return model.type === "barChart"
}
