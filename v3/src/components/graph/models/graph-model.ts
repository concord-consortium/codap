import {Instance, types} from "mobx-state-tree"
import {AxisModelUnion, AxisPlace, IAxisModelUnion} from "./axis-model"
import {PlotType, PlotTypes} from "../graphing-types"

// export const PlotAttributeRoles = ["primary", "secondary", "legend", "verticalSplit", "horizontalSplit"] as const
// export type PlotAttributeRole = typeof PlotAttributeRoles[number]

export const GraphModel = types
  .model("GraphModel", {
    // keys are AxisPlaces
    axes: types.map(types.maybe(AxisModelUnion)),
    plotType: types.enumeration(PlotTypes.slice()),
    // keys are AxisPlaces
    attributeIDs: types.map(types.string),
  })
  .volatile(self => ({
    cases: [] as string[]
  }))
  .views(self => ({
    getAxis(place: AxisPlace) {
      return self.axes.get(place)
    },
    getAttributeID(place: AxisPlace) {
      return self.attributeIDs.get(place) ?? ''
    }
  }))
  .actions(self => ({
    setAxis(place: AxisPlace, axis: IAxisModelUnion) {
      self.axes.set(place, axis)
    },
    setAttributeID(place: AxisPlace, id: string) {
      self.attributeIDs.set(place, id)
    },
    setPlotType(type: PlotType) {
      self.plotType = type
    },
    setCases(cases: string[]) {
      self.cases = cases
    }
  }))

export interface IGraphModel extends Instance<typeof GraphModel> {
}
