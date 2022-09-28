import {Instance, ISerializedActionCall, types} from "mobx-state-tree"
import {AxisModelUnion, AxisPlace, IAxisModelUnion} from "./axis-model"
import {PlotType, PlotTypes} from "../graphing-types"
import {DataConfigurationModel, GraphAttrPlace, IDataConfigurationModel} from "./data-configuration-model"

export interface GraphProperties {
  axes: Record<string, IAxisModelUnion>
  plotType: PlotType
  config: IDataConfigurationModel
}

export const GraphModel = types
  .model("GraphModel", {
    // keys are AxisPlaces
    axes: types.map(types.maybe(AxisModelUnion)),
    plotType: types.enumeration([...PlotTypes]),
    config: DataConfigurationModel,
    pointSizeMultiplier: 1
  })
  .views(self => ({
    getAxis(place: AxisPlace) {
      return self.axes.get(place)
    },
    getAttributeID(place: GraphAttrPlace) {
      return self.config.attributeID(place) ?? ''
    }
  }))
  .actions(self => ({
    setAxis(place: AxisPlace, axis: IAxisModelUnion) {
      self.axes.set(place, axis)
    },
    setAttributeID(place: GraphAttrPlace, id: string) {
      self.config.setAttribute(place, { attributeID: id })
    },
    setPlotType(type: PlotType) {
      self.plotType = type
    },
    setPointSizeMultiplier(multiplier:number) {
      self.pointSizeMultiplier = multiplier
    },
    setGraphProperties(props: GraphProperties) {
      (Object.keys(props.axes) as AxisPlace[]).forEach(aKey => {
        this.setAxis(aKey, props.axes[aKey])
      })
      self.plotType = props.plotType
      self.config = props.config
    }
  }))

export interface SetAttributeIDAction extends ISerializedActionCall {
  name: "setAttributeID"
  args: [GraphAttrPlace, string]
}

export function isSetAttributeIDAction(action: ISerializedActionCall): action is SetAttributeIDAction {
  return action.name === "setAttributeID"
}

export interface IGraphModel extends Instance<typeof GraphModel> {
}
