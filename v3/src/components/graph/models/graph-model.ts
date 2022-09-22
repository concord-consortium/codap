import {Instance, types} from "mobx-state-tree"
import {AxisModelUnion, AxisPlace, IAxisModelUnion} from "./axis-model"
import {PlotType, PlotTypes} from "../graphing-types"

export interface GraphProperties {
  axes: {[key:string]:IAxisModelUnion}
  plotType: PlotType
  attributeIDs: {[key:string]:string}
  cases: string[]
}

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
    },
    setGraphProperties( props: GraphProperties) {
      Object.keys( props.axes).forEach(aKey => {
        // Why doesn't self.setAxis work here?
        self.axes.set(aKey, props.axes[aKey])
      })
      self.plotType = props.plotType
      Object.keys(props.attributeIDs).forEach(aKey => {
        self.attributeIDs.set(aKey, props.attributeIDs[aKey])
      })
      self.cases = props.cases
    }
  }))

export interface IGraphModel extends Instance<typeof GraphModel> {
}
