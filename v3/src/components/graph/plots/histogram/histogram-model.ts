import { Instance } from "mobx-state-tree"
import { AttributeType } from "../../../../models/data/attribute-types"
import { ICase } from "../../../../models/data/data-set-types"
import { t } from "../../../../utilities/translation/translate"
import { isFiniteNumber } from "../../../../utilities/math-utils"
import { AxisPlace } from "../../../axis/axis-types"
import { IAxisModel } from "../../../axis/models/axis-model"
import { GraphAttrRole, PointDisplayType } from "../../../data-display/data-display-types"
import { dataDisplayGetNumericValue } from "../../../data-display/data-display-value-utils"
import { BinnedDotPlotModel, IBinnedDotPlotModel } from "../binned-dot-plot/binned-dot-plot-model"
import { float1, IBarTipTextProps, IPlotModel, typesPlotType } from "../plot-model"

export const HistogramModel = BinnedDotPlotModel
  .named("HistogramModel")
  .props({
    type: typesPlotType("histogram")
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
      return t("DG.CountAxisView.countLabel")
    },
    get hasBinnedNumericAxis(): boolean {
      return false
    },
    get hasDraggableNumericAxis() {
      return true
    },
    getValidSecondaryAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      return self.getValidCountAxis(place, attrType, axisModel)
    },
    get showGridLines() {
      return true
    },
    get canShowBoxPlotAndNormalCurve(): boolean {
      return true
    }
  }))
  .views(self => ({
    matchingCasesForAttr(attrID?: string, value?: string, _allCases?: ICase[]) {
      if (!attrID) return []
      const dataset = self.dataConfiguration?.dataset
      const allCases = _allCases ?? dataset?.items
      const { binWidth, minBinEdge } = self.binDetails()
      if (binWidth != null) {
        const binIndex = Math.floor((Number(value) - minBinEdge) / binWidth)
        return allCases?.filter(aCase => {
          const caseValue = dataDisplayGetNumericValue(dataset, aCase.__id__, attrID) ?? 0
          const bin = Math.floor((caseValue - minBinEdge) / binWidth)
          return bin === binIndex
        }) as ICase[] ?? []
      }
      return []
    },
    barTipText(props: IBarTipTextProps) {

      const roundToPrecision = (num: number, p: number) => {
        const factor = 10 ** p
        return Math.round(num * factor) / factor
      }

      const {
        primaryMatches, casesInSubPlot, casePrimaryValue, topSplitAttrID: topSplitAttrId, caseTopSplitValue,
        rightSplitAttrID: rightSplitAttrId, caseRightSplitValue
      } = props
      const dataset = self.dataConfiguration?.dataset
      const primaryAttributeID = self.dataConfiguration?.primaryAttributeID || ""
      const primaryAttribute = dataset?.getAttribute(primaryAttributeID)
      const precision = isFiniteNumber(primaryAttribute?.precision) ? primaryAttribute?.precision : 2
      const allMatchingCases = primaryMatches.filter(aCaseID => {
        if (topSplitAttrId) {
          const topSplitVal = dataset?.getStrValue(aCaseID.__id__, topSplitAttrId)
          if (topSplitVal !== caseTopSplitValue) return false
        }
        if (rightSplitAttrId) {
          const rightSplitVal = dataset?.getStrValue(aCaseID.__id__, rightSplitAttrId)
          if (rightSplitVal !== caseRightSplitValue) return false
        }
        return true
      })
      const { binWidth, minBinEdge } = self.binDetails()
      if (binWidth != null) {
        const binIndex = Math.floor((Number(casePrimaryValue) - minBinEdge) / binWidth)
        const firstCount = allMatchingCases.length
        const secondCount = casesInSubPlot.length
        const percent = float1(100 * firstCount / secondCount)
        const minBinValue = roundToPrecision(minBinEdge + binIndex * binWidth, precision)
        const maxBinValue = roundToPrecision(minBinEdge + (binIndex + 1) * binWidth, precision)
        // "<n> of <total> (<p>%) are ≥ L and < U"
        const attrArray = [firstCount, secondCount, percent, minBinValue, maxBinValue]
        const translationKey = firstCount === 1
          ? "DG.HistogramView.barTipNoLegendSingular"
          : "DG.HistogramView.barTipNoLegendPlural"
        return t(translationKey, {vars: attrArray})
      }
    },
    numericValuesForRole(role: GraphAttrRole) {
      if (self.dataConfiguration?.secondaryRole === role) {
        return [0, self.maxCellCaseCount()]
      }
      return self.dataConfiguration?.numericValuesForAttrRole(role) || []
    }
  }))
export interface IHistogramModel extends Instance<typeof HistogramModel> {}

export function isBinnedPlotModel(model?: IPlotModel): model is IBinnedDotPlotModel | IHistogramModel {
  return !!model && ["binnedDotPlot", "histogram"].includes(model.type)
}
