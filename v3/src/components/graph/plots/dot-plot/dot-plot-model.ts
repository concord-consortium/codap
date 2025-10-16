import { inRange } from "lodash"
import { AttributeType } from "../../../../models/data/attribute-types"
import { isFiniteNumber } from "../../../../utilities/math-utils"
import { AxisPlace } from "../../../axis/axis-types"
import { IAxisModel } from "../../../axis/models/axis-model"
import { dataDisplayGetNumericValue } from "../../../data-display/data-display-value-utils"
import { ICountAdornmentValues, ICountAdornmentValuesProps, INumDenom, PlotModel, typesPlotType } from "../plot-model"

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
    get showDisplayConfig(): boolean {
      const caseDataArray = self.dataConfiguration?.getCaseDataArray(0) ?? []
      return caseDataArray.length > 0
    },
    get showDisplayTypeSelection() {
      return true
    },
    get canShowBoxPlotAndNormalCurve(): boolean {
      return true
    }
  }))
  .views(self => ({
    countAdornmentValues({ cellKey, movableValues, primaryAxisDomain }: ICountAdornmentValuesProps):
        ICountAdornmentValues {
      if (!movableValues || movableValues.length === 0 || !primaryAxisDomain) {
        return self._countAdornmentValues({ cellKey })
      }
      movableValues = movableValues.filter(v => inRange(v, primaryAxisDomain[0], primaryAxisDomain[1]))
      const dataConfig = self.dataConfiguration,
        dataset = dataConfig?.dataset,
        showMeasuresForSelection = !!dataConfig?.showMeasuresForSelection,
        subPlotCaseIds = dataConfig?.subPlotCases(cellKey) ?? [],
        totNumInSubPlot = subPlotCaseIds.length,
        numSelInSubPlot = dataConfig?.filterCasesForDisplay(dataConfig?.subPlotCases(cellKey)).length ?? 0,
        primaryAttrId = dataConfig?.attributeID(dataConfig?.primaryRole ?? "x"),
        numericValuesForSubPlot = ((primaryAttrId && dataset)
          ? subPlotCaseIds.filter(id => !showMeasuresForSelection || dataConfig?.selection.includes(id))
            .map(id => dataDisplayGetNumericValue(dataset, id, primaryAttrId, false))
          : []).filter(value => isFiniteNumber(value)),
        [ min, max ] = primaryAxisDomain

      // We iterate through the movableValues computing the count to the left and the fraction position on the axis
      const theValues: INumDenom[] = []
      for (let i = 0; i <= movableValues.length; i++) {
        const prevValue = i === 0 ? -Infinity : movableValues[i - 1],
          thisValue = i < movableValues.length ? movableValues[i] : Infinity,
          startFraction = i === 0 ? 0 : (prevValue - min) / (max - min),
          endFraction = i === movableValues.length ? 1 : (thisValue - min) / (max - min),
          numerator = numericValuesForSubPlot.filter(v => v > prevValue && v <= thisValue).length
        theValues.push({
          numerator,
          denominator: showMeasuresForSelection ? numSelInSubPlot : totNumInSubPlot,
          startFraction, endFraction
        })
      }
      return {
        numHorizontalRegions: dataConfig?.numberOfHorizontalRegions ?? 1,
        values: theValues
      }
    }
  }))
