import { PointDisplayType } from "../../../data-display/data-display-types"
import { DotPlotModel } from "../dot-plot/dot-plot-model"
import { typesPlotType } from "../plot-model"

// bar for each point
export const LinePlotModel = DotPlotModel
  .named("LinePlotModel")
  .props({
    type: typesPlotType("linePlot")
  })
  .views(() => ({
    get displayType(): PointDisplayType {
      return "bars"
    },
    get showZeroLine() {
      return true
    },
    get canShowBoxPlotAndNormalCurve(): boolean {
      return false
    }
  }))
