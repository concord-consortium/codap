import { AttributeType } from "../../../../models/data/attribute-types"
import { AxisPlace } from "../../../axis/axis-types"
import { IAxisModel } from "../../../axis/models/axis-model"
import { PlotModel, typesPlotType } from "../plot-model"

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
