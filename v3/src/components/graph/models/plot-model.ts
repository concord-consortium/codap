import {Instance, types} from "mobx-state-tree"
import {typedId} from "../../../utilities/js-utils"

export const PlotModel = types
  .model('PlotModel', {
    // may not need this id
    id: types.optional(types.identifier, () => typedId("PLOT")),
    dataConfigurationID: types.string,
    // keys are PlotAttributeRoles
    attributeIDs: types.map(types.string),
    // keys are PlotAttributeRoles
    axisIDs: types.map(types.string)
  })
  .volatile(self => ({
  }))
  .views(self => ({
    get dataConfiguration() {
      return self.dataConfigurationID // But really we want to return the object, not the ID
    }
  }))
  .actions(self => ({
  }))
export interface IPlotModel extends Instance<typeof PlotModel> {}

export const EmptyPlotModel = PlotModel
  .named('EmptyPlotModel')
  .props({

  })

export const DotPlotModel = PlotModel
  .named('DotPlotModel')
  .props({

  })

export const ScatterPlotModel = PlotModel
  .named('ScatterPlotModel')
  .props({

  })

export const DotChartModel = PlotModel
  .named('DotChartModel')
  .props({

  })

export const PlotModelUnion = types.union(DotPlotModel, ScatterPlotModel, DotChartModel)
