import { format } from "d3-format"
import { comparer, observable, reaction } from "mobx"
import { addDisposer, Instance, SnapshotIn, types } from "mobx-state-tree"
import { errorResult } from "../../../../data-interactive/handlers/di-results"
import { AttributeType } from "../../../../models/data/attribute-types"
import { Formula } from "../../../../models/formula/formula"
import { t } from "../../../../utilities/translation/translate"
import { AxisPlace } from "../../../axis/axis-types"
import { setNiceDomain } from "../../../axis/axis-domain-utils"
import { IAxisModel } from "../../../axis/models/axis-model"
import { isAnyNumericAxisModel, isNumericAxisModel } from "../../../axis/models/numeric-axis-models"
import { GraphAttrRole, PointDisplayType } from "../../../data-display/data-display-types"
import { BreakdownType, BreakdownTypes, GraphCellKey, isBreakdownType } from "../../graphing-types"
import { DotChartModel } from "../dot-chart/dot-chart-model"
import { IBarTipTextProps, IPlotModel, typesPlotType } from "../plot-model"

export interface IBarSpec {
  value: number
  numCases: number
}
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
    fallbackBreakdownType: self.breakdownType === "percent" ? "percent" : "count" as Exclude<BreakdownType, "formula">,
    barSpecs: observable.map<string, IBarSpec>()
  }))
  .actions(self => ({
    setBreakdownType(type: BreakdownType) {
      const typeDidChange = self.breakdownType !== type
      self.breakdownType = type
      if (type !== 'formula') self.fallbackBreakdownType = type
      if (typeDidChange) {
        self.graphApi?.setSecondaryAxisModel(
          self.getValidSecondaryAxis(self.dataConfiguration?.secondaryRole === "x" ? "bottom" : "left")
        )
      }
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
    setBarSpec(key: GraphCellKey, value: number, numCases: number) {
      self.barSpecs.set(JSON.stringify(key), { value, numCases })
    },
    clearBarSpecs() {
      self.barSpecs.clear()
    },
    replaceBarSpecs(newSpecs: Map<string, IBarSpec>) {
      self.barSpecs.replace(newSpecs)
    }
  }))
  .views(self => {
    const baseMaxCellPercent = self.maxCellPercent
    const baseGetApiProps = self.getApiProps
    return {
      maxCellPercent(): number {
        // Override base class to handle situation in which there is a legend
        return self.dataConfiguration?.attributeID("legend") ? 100 : baseMaxCellPercent()
      },
      getApiProps(): Record<string, unknown> {
        const barChartFormula = self.formula?.display
        return {
          ...baseGetApiProps(),
          barChartScale: self.breakdownType,
          ...(barChartFormula ? { barChartFormula } : {})
        }
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
    getMinMaxOfFormulaValues(): [number, number] {
      const barSpecs = self.barSpecs
      if (barSpecs.size === 0) {
        return [0, 100]
      }
      let min = Number.MAX_VALUE
      let max = -Number.MAX_VALUE
      barSpecs.forEach(({ value, numCases }) => {
        // Skip cells with no visible cases (e.g., all cases hidden)
        if (numCases === 0) return
        // Skip invalid values (e.g., NaN from formulas with no cases)
        if (!isFinite(value)) return
        if (value < min) {
          min = value
        }
        if (value > max) {
          max = value
        }
      })
      // If no valid values found, return default range
      if (min === Number.MAX_VALUE) {
        return [0, 100]
      }
      return [min, max]
    },
    getValidFormulaAxis(axisModel?: IAxisModel): IAxisModel {
      const secondaryPlace = self.dataConfiguration?.secondaryRole === "x" ? "bottom" : "left"
      const resultAxisModel = self.getValidNumericDateOrQualitativeAxis(secondaryPlace, undefined, axisModel)
      const domain = this.getMinMaxOfFormulaValues()
      isNumericAxisModel(resultAxisModel) &&
        setNiceDomain(domain, resultAxisModel, { clampPosMinAtZero: true })
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
          return self.getValidNumericDateOrQualitativeAxis(place, attrType, axisModel)
      }
    },
    get showZeroLine() {
      return true
    },
    get showBreakdownTypes(): boolean {
      return true
    },
    getBarSpec(key: GraphCellKey): IBarSpec | undefined {
      return self.barSpecs.get(JSON.stringify(key))
    },
    axisLabelClickHandler(role: GraphAttrRole): Maybe<() => void> {
      if (self.breakdownType === "formula" && self.hasExpression && role === self.dataConfiguration?.secondaryRole) {
        return () => {
          self.setFormulaEditorIsOpen(true)
        }
      }
      return undefined
    },
    barTipText(props: IBarTipTextProps) {

      const computeTipForFormulaBar = (caseID: string, category: string) => {
        const barSpec = this.getBarSpec(self.dataConfiguration?.graphCellKeyFromCaseID(caseID) || {})
        if (barSpec) {
          const { value} = barSpec
          return t("DG.ComputedBarChartModel.cellTip", {
            vars: [category, float1(value)]
          })
        }
        return ""
      }

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
      if (self.breakdownType === "formula") {
        return computeTipForFormulaBar(casesInSubPlot[0], casePrimaryValue || "")
      } else {
        const firstCount = legendAttrId ? legendMatchesInSubplot : casesInSubPlot.length
        const secondCount = legendAttrId ? casesInSubPlot.length : totalCases
        const percent = float1(100 * firstCount / secondCount)
        // <n> of <m> <category> (<p>%) are <legend category>
        const vars = [firstCount, secondCount, percent, caseLegendCategoryString]
        // data tips have an additional variable when there's a legend
        caseCategoryString && vars.splice(2, 0, caseCategoryString)
        const translationKey = legendAttrId
          ? firstCount === 1 ? "DG.BarChartModel.cellTipSingular" : "DG.BarChartModel.cellTipPlural"
          : firstCount === 1 ? "DG.BarChartModel.cellTipNoLegendSingular" : "DG.BarChartModel.cellTipNoLegendPlural"
        return t(translationKey, {vars})
      }
    },
    numericValuesForRole(role: GraphAttrRole) {
      // What is returned depends on the breakdown type.
      const dataConfiguration = self.dataConfiguration
      if (!dataConfiguration) return []
      const epRole = dataConfiguration.primaryRole === 'x' ? 'topSplit' : 'rightSplit'
      const esRole = dataConfiguration.primaryRole === 'x' ? 'rightSplit' : 'topSplit'
      switch (self.breakdownType) {
        case "count":
          return [0, dataConfiguration.maxOverAllCells(epRole, esRole)]
        case "percent":
          return [0, dataConfiguration.maxPercentAllCells(epRole, esRole)]
        case "formula":
          return [0, ...this.getMinMaxOfFormulaValues()]
        default:
          return []
      }
    }
  }))
  .actions(self => ({
    afterCreate() {
      addDisposer(self, reaction(
        () => self.getMinMaxOfFormulaValues(),
        (domain) => {
          const secondaryAxis = self.graphApi?.getSecondaryAxisModel()
          if (isAnyNumericAxisModel(secondaryAxis)) {
            setNiceDomain(domain, secondaryAxis, { clampPosMinAtZero: true })
          }
        },
        { name: "BarChartModel.afterCreate.reactToBarSpecMinMaxChanges", equals: comparer.structural }
      ))
    },
    beforeDestroy() {
      self.barSpecs.clear()
    }
  }))
  .actions(self => {
    const baseUpdateApiProps = self.updateApiProps
    return {
      updateApiProps(values: Record<string, unknown>) {
        const baseError = baseUpdateApiProps(values)
        if (baseError) return baseError
        // Handle formula - must be set before scale if both are provided and scale is "formula"
        if (values.barChartFormula && typeof values.barChartFormula === "string") {
          self.setExpression(values.barChartFormula)
        }
        // Handle scale type
        if (values.barChartScale != null) {
          if (isBreakdownType(values.barChartScale)) {
            self.setBreakdownType(values.barChartScale)
          }
          else {
            return errorResult(t("V3.DI.Error.invalidBarChartScale", { vars: [String(values.barChartScale)] }))
          }
        }
      }
    }
  })
export interface IBarChartModel extends Instance<typeof BarChartModel> {}
export interface IBarChartSnapshot extends SnapshotIn<typeof BarChartModel> {}
export function isBarChartModel(model?: IPlotModel): model is IBarChartModel {
  return model?.type === "barChart"
}
