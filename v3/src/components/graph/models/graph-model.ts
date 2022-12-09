import {Instance, ISerializedActionCall, types} from "mobx-state-tree"
import {createContext, useContext} from "react"
import {AxisModelUnion, AxisPlace, IAxisModelUnion} from "./axis-model"
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
import {defaultPointColor, defaultStrokeColor} from "../../../utilities/color-utils"

export interface GraphProperties {
  axes: Record<string, IAxisModelUnion>
  plotType: PlotType
}

export type BackgroundLockInfo = {
  locked: true,
  xAxisLowerBound: number,
  xAxisUpperBound: number,
  yAxisLowerBound: number,
  yAxisUpperBound: number
}

export const NumberToggleModel = types
  .model('NumberToggleModel', {})

export const GraphModel = types
  .model("GraphModel", {
    id: types.optional(types.identifier, () => uniqueId()),
    // keys are AxisPlaces
    axes: types.map(types.maybe(AxisModelUnion)),
    plotType: types.enumeration([...PlotTypes]),
    config: DataConfigurationModel,
    // Visual properties
    pointColor: types.optional(types.string, defaultPointColor),
    _pointStrokeColor: types.optional(types.string, defaultStrokeColor),
    pointStrokeSameAsFill: types.optional(types.boolean, false),
    plotBackgroundColor: types.optional(types.string, 'white'),
    pointSizeMultiplier: 1,
    isTransparent: false,
    plotBackgroundImageID: types.optional(types.string, ''),
    // todo: how to use this type?
    plotBackgroundLockInfo: types.frozen<BackgroundLockInfo | undefined>(),
    // numberToggleModel: types.optional(types.union(NumberToggleModel, null))
    showParentToggles: false,
    showMeasuresForSelection: false
  })
  .views(self => ({
    get pointStrokeColor() {
      return self.pointStrokeSameAsFill ? self.pointColor : self._pointStrokeColor
    },
    getAxis(place: AxisPlace) {
      return self.axes.get(place)
    },
    getAttributeID(place: GraphAttrRole) {
      return self.config.attributeID(place) ?? ''
    },
    getPointRadius(use: 'normal' | 'hover-drag' | 'select' = 'normal') {
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
      self.config.setAttribute(role, {attributeID: id})
    },
    setPlotType(type: PlotType) {
      self.plotType = type
    },
    setGraphProperties(props: GraphProperties) {
      (Object.keys(props.axes) as AxisPlace[]).forEach(aKey => {
        this.setAxis(aKey, props.axes[aKey])
      })
      self.plotType = props.plotType
    },
    setPointColor(color: string) {
      self.pointColor = color
    },
    setPointStrokeColor(color: string) {
      self._pointStrokeColor = color
    },
    setPointStrokeSameAsFill(isTheSame: boolean) {
      self.pointStrokeSameAsFill = isTheSame
    },
    setPlotBackgroundColor(color: string) {
      self.plotBackgroundColor = color
    },
    setPointSizeMultiplier(multiplier: number) {
      self.pointSizeMultiplier = multiplier
    },
    setIsTransparent(transparent: boolean) {
      self.isTransparent = transparent
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

export interface SetGraphVisualPropsAction extends ISerializedActionCall {
  name: "setGraphVisualProps"
  args: [string | number | boolean]
}

export function isGraphVisualPropsAction(action: ISerializedActionCall): action is SetGraphVisualPropsAction {
  return ['setPointColor', 'setPointStrokeColor', 'setPointStrokeSameAsFill', 'setPlotBackgroundColor',
    'setPointSizeMultiplier', 'setIsTransparent'].includes(action.name)
}

export interface IGraphModel extends Instance<typeof GraphModel> {
}

export const GraphModelContext = createContext<IGraphModel>({} as IGraphModel)

export const useGraphModelContext = () => useContext(GraphModelContext)
