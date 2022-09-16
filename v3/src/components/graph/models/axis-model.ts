import { Instance, types } from "mobx-state-tree"

export const AxisPlaces = ["bottom", "left", "right", "top"] as const
export type AxisPlace = typeof AxisPlaces[number]

export type AxisOrientation = "horizontal" | "vertical"

export const AxisModel = types.model("AxisModel", {
  type: types.optional(types.string, () => {throw "type must be overridden"}),
  place: types.enumeration([...AxisPlaces])
})
  .volatile(self => ({
    transitionDuration: 0
  }))
.views(self => ({
  get orientation(): AxisOrientation {
    return self.place === "left" || self.place === "right"
            ? "vertical" : "horizontal"
  }
}))
  .actions(self => ({
    setTransitionDuration(duration:number) {
      self.transitionDuration = duration
    }
  }))
export interface IAxisModel extends Instance<typeof AxisModel> {}

export const ScaleTypes = ["linear", "log"] as const
export type ScaleType = typeof ScaleTypes[number]

export const CategoricalAxisModel = AxisModel
  .named("CategoricalAxisModel")
  .props({
    type: "categorical",
    // ¯\_(ツ)_/¯
  })
export interface ICategoricalAxisModel extends Instance<typeof CategoricalAxisModel> {}

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
    setScale(scale: ScaleType) {
      self.scale = scale
    },
    setDomain(min: number, max: number) {
      self.min = min
      self.max = max
    }
  }))
export interface INumericAxisModel extends Instance<typeof NumericAxisModel> {}

export const AxisModelUnion = types.union(CategoricalAxisModel, NumericAxisModel)
export type IAxisModelUnion = ICategoricalAxisModel | INumericAxisModel
