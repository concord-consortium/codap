import {Instance, ISerializedActionCall, types} from "mobx-state-tree"
import {AxisPlace} from "../../axis/axis-types"
import {AxisModelUnion, IAxisModelUnion} from "../../axis/models/axis-model"
import {
  hoverRadiusFactor,
  PlotType,
  PlotTypes,
  pointRadiusLogBase,
  pointRadiusMax,
  pointRadiusMin, pointRadiusSelectionAddend
} from "../graphing-types"
import {DataConfigurationModel, GraphAttrRole} from "./data-configuration-model"
import {uniqueId} from "../../../utilities/js-utils"

export interface GraphProperties {
  axes: Record<string, IAxisModelUnion>
  plotType: PlotType
}

export const GraphModel = types
  .model("GraphModel", {
    id: types.optional(types.identifier, () => uniqueId()),
    // keys are AxisPlaces
    axes: types.map(types.maybe(AxisModelUnion)),
    plotType: types.enumeration([...PlotTypes]),
    config: DataConfigurationModel,
    pointSizeMultiplier: 1,
    // Visual properties
    isTransparent: false,
    plotBackgroundColor: types.optional(types.string, 'white'),
    plotBackgroundOpacity: 1,
    showParentToggles: false,
    showMeasuresForSelection: false
  })
  .views(self => ({
    getAxis(place: AxisPlace) {
      return self.axes.get(place)
    },
    getAttributeID(place: GraphAttrRole) {
      return self.config.attributeID(place) ?? ''
    },
    getPointRadius(use:'normal' | 'hover-drag' | 'select' = 'normal') {
      let r = pointRadiusMax
      const numPoints = self.config.cases.length
      // for loop is fast equivalent to radius = max( minSize, maxSize - floor( log( logBase, max( dataLength, 1 )))
      for (let i = pointRadiusLogBase; i <= numPoints; i = i * pointRadiusLogBase) {
        --r
        if (r <= pointRadiusMin) break
      }
      const result = r * self.pointSizeMultiplier
      switch (use) {
        case "normal":
          return result
        case "hover-drag":
          return result * hoverRadiusFactor
        case "select":
          return result + pointRadiusSelectionAddend
      }
    }
  }))
  .actions(self => ({
    setAxis(place: AxisPlace, axis: IAxisModelUnion) {
      self.axes.set(place, axis)
    },
    setAttributeID(role: GraphAttrRole, id: string) {
      self.config.setAttribute(role, { attributeID: id })
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
    },
    setIsTransparent(transparent: boolean) {
      self.isTransparent = transparent
    },
    setPlotBackgroundColor(color: string) {
      self.plotBackgroundColor = color
    },
    setPlotBackgroundOpacity(opacity: number) {
      self.plotBackgroundOpacity = opacity
    },
    setShowParentToggles(show: boolean) {
      self.showParentToggles = show
    },
    setShowMeasuresForSelection(show: boolean) {
      self.showMeasuresForSelection = show
    }
  }))

export interface SetAttributeIDAction extends ISerializedActionCall {
  name: "setAttributeID"
  args: [GraphAttrRole, string]
}

export function isSetAttributeIDAction(action: ISerializedActionCall): action is SetAttributeIDAction {
  return action.name === "setAttributeID"
}

export interface IGraphModel extends Instance<typeof GraphModel> {
}
