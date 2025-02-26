import { AttributeType } from "../../../../models/data/attribute-types"
import { AxisPlace } from "../../../axis/axis-types"
import { IAxisModel } from "../../../axis/models/axis-model"
import { IGraphDataConfigurationModel } from "../../models/graph-data-configuration-model"
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
    showDisplayConfig(dataConfig: IGraphDataConfigurationModel): boolean {
      const caseDataArray = dataConfig.getCaseDataArray(0) ?? []
      return caseDataArray.length > 0
    },
    get showDisplayTypeSelection() {
      return true
    }
  }))
