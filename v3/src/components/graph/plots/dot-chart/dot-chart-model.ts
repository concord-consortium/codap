import { AttributeType } from "../../../../models/data/attribute-types"
import { AxisPlace } from "../../../axis/axis-types"
import { IAxisModel } from "../../../axis/models/axis-model"
import { ICountAdornmentValues, ICountAdornmentValuesProps, PlotModel, typesPlotType } from "../plot-model"

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
      return self.getValidCategoricalOrColorAxis(place, attrType, axisModel)
    },
    get showDisplayConfig(): boolean {
      return !!self.dataConfiguration?.hasExactlyOneCategoricalAxis
    },
    get showFusePointsIntoBars() {
      return true
    }
  }))
  .views(self => ({
    countAdornmentValues({cellKey, percentType}: ICountAdornmentValuesProps): ICountAdornmentValues {
      const dataConfig = self.dataConfiguration
      const showMeasuresForSelection = !!dataConfig?.showMeasuresForSelection,
        totalNumberOfCases = dataConfig?.allPlottedCases().length ?? 0,
        totalNumSelected = dataConfig?.selection.length ?? 0,
        totNumInSubPlot = dataConfig?.subPlotCases(cellKey).length ?? 0,
        numSelInSubPlot = dataConfig?.filterCasesForDisplay(dataConfig?.subPlotCases(cellKey)).length ?? 0,
        categoricalAttrCount = dataConfig?.categoricalAttrCount ?? 0,
        hasPercentTypeOptions = categoricalAttrCount > 1,
        rowCases = dataConfig?.filterCasesForDisplay(dataConfig?.rowCases(cellKey)) ?? [],
        columnCases = dataConfig?.filterCasesForDisplay(dataConfig?.columnCases(cellKey)) ?? []
      const divisor = hasPercentTypeOptions && percentType === "row" ? rowCases.length
        : hasPercentTypeOptions && percentType === "column" ? columnCases.length
          : showMeasuresForSelection ? totalNumSelected : totalNumberOfCases
      const theValue = {numerator: 0, denominator: 1}
      if (showMeasuresForSelection) {
        theValue.numerator = numSelInSubPlot
        theValue.denominator = divisor
      } else {
        theValue.numerator = totNumInSubPlot
        theValue.denominator = divisor
      }
      return {
        numHorizontalRegions: dataConfig?.numberOfHorizontalRegions ?? 1,
        values: [theValue]
      }
    }
  }))
