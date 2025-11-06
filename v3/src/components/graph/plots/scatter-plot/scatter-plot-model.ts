import { AttributeType } from "../../../../models/data/attribute-types"
import { AxisPlace } from "../../../axis/axis-types"
import { IAxisModel } from "../../../axis/models/axis-model"
import { PlotModel, typesPlotType } from "../plot-model"

export const ScatterPlotModel = PlotModel
  .named("ScatterPlotModel")
  .props({
    type: typesPlotType("scatterPlot")
  })
  .views(self => ({
    get hasDraggableNumericAxis() {
      return true
    },
    get isBivariateNumeric() {
      return true
    },
    getValidPrimaryAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      return self.getValidNumericDateOrQualitativeAxis(place, attrType, axisModel)
    },
    getValidSecondaryAxis(place: AxisPlace, attrType?: AttributeType, axisModel?: IAxisModel): IAxisModel {
      return self.getValidNumericDateOrQualitativeAxis(place, attrType, axisModel)
    },
    get showGridLines() {
      return true
    }
  }))
