import {Instance, types} from "mobx-state-tree"
import {AxisPlace, AxisPlaces} from "../axis-types"

export function otherPlace(aPlace: AxisPlace): AxisPlace {
  return aPlace === 'bottom' ? 'left' : 'bottom'
}

export type AxisOrientation = "horizontal" | "vertical"

export const ScaleTypes = ["linear", "log", "ordinal", "band"] as const
export type IScaleType = typeof ScaleTypes[number]

export const AxisModel = types.model("AxisModel", {
  type: types.optional(types.string, () => {
    throw "type must be overridden"
  }),
  place: types.enumeration([...AxisPlaces]),
  scale: types.optional(types.enumeration([...ScaleTypes]), "ordinal"),
})
  .volatile(self => ({
    transitionDuration: 0
  }))
  .views(self => ({
    get orientation(): AxisOrientation {
      return ['left', 'rightCat', 'rightNumeric'].includes(self.place)
        ? "vertical" : "horizontal"
    },
    get isNumeric() {
      return ["linear", "log"].includes(self.scale)
    }
  }))
  .actions(self => ({
    setScale(scale: IScaleType) {
      self.scale = scale
    },
    setTransitionDuration(duration: number) {
      self.transitionDuration = duration
    }
  }))

export interface IAxisModel extends Instance<typeof AxisModel> {
}

export const EmptyAxisModel = AxisModel
  .named("EmptyAxisModel")
  .props({
    type: "empty",
    min: 0,
    max: 0
  })

export interface IEmptyAxisModel extends Instance<typeof CategoricalAxisModel> {
}

export const CategoricalAxisModel = AxisModel
  .named("CategoricalAxisModel")
  .props({
    type: "categorical",
    scale: "band"
  })

export interface ICategoricalAxisModel extends Instance<typeof CategoricalAxisModel> {
}

export const NumericAxisModel = AxisModel
  .named("NumericAxisModel")
  .props({
    type: "numeric",
    scale: types.optional(types.enumeration([...ScaleTypes]), "linear"),
    min: types.number,
    max: types.number
  })
  .views(self => ({
    get domain() {
      return [self.min, self.max] as const
    }
  }))
  .actions(self => ({
    setDomain(min: number, max: number) {
      // If we're close enough to zero on either end, we snap to it
      const snapFactor = 100
      if ((max > 0) && (Math.abs(min) <= max / snapFactor)) {
        min = 0
      } else if ((min < 0) && (Math.abs(max) < Math.abs(min / snapFactor))) {
        max = 0
      }
      self.min = min
      self.max = max
    }
  }))

export interface INumericAxisModel extends Instance<typeof NumericAxisModel> {
}

export function isNumericAxisModel(axisModel: IAxisModel): axisModel is INumericAxisModel {
  return axisModel.isNumeric
}

export const AxisModelUnion = types.union(EmptyAxisModel, CategoricalAxisModel, NumericAxisModel)
export type IAxisModelUnion = IEmptyAxisModel | ICategoricalAxisModel | INumericAxisModel
