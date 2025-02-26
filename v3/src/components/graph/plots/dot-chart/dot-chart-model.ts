import { AttributeType } from "../../../../models/data/attribute-types"
import { AxisPlace } from "../../../axis/axis-types"
import { IAxisModel } from "../../../axis/models/axis-model"
import { PlotModel, typesPlotType } from "../plot-model"

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
    showDisplayConfig(): boolean {
      return !!self.dataConfiguration?.hasExactlyOneCategoricalAxis
    },
    get showFusePointsIntoBars() {
      return true
    }
  }))
