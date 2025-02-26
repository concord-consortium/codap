import { PlotModel, typesPlotType } from "../plot-model"

// default empty plot
export const CasePlotModel = PlotModel
  .named("CasePlotModel")
  .props({
    type: typesPlotType("casePlot")
  })
