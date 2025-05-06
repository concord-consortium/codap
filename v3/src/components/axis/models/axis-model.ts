import {Instance, SnapshotIn, types} from "mobx-state-tree"
import {applyModelChange} from "../../../models/history/apply-model-change"
import {AxisOrientation, AxisPlaces, IScaleType, ScaleTypes} from "../axis-types"

export const AxisModelTypes = ["empty", "categorical", "color", "numeric", "percent", "count", "date"] as const
export type AxisModelType = typeof AxisModelTypes[number]

export const axisModelType = (type: AxisModelType) => types.optional(types.literal(type), type)

export const AxisModel = types.model("AxisModel", {
  type: types.optional(types.string, () => {
    throw "type must be overridden"
  }),
  place: types.enumeration([...AxisPlaces]),
  scale: types.optional(types.enumeration([...ScaleTypes]), "ordinal")
})
  .volatile(self => ({
    labelsAreRotated: false,
    transitionDuration: 0
  }))
  .views(self => ({
    get orientation(): AxisOrientation {
      return ['left', 'rightCat', 'rightNumeric'].includes(self.place)
        ? "vertical" : "horizontal"
    },
    get isUpdatingDynamically() {
      return false
    }
  }))
  .actions(self => ({
    setScale(scale: IScaleType) {
      self.scale = scale
    },
    setLabelsAreRotated(rotated: boolean) {
      self.labelsAreRotated = rotated
    },
    setTransitionDuration(duration: number) {
      self.transitionDuration = duration
    }
  }))
  // performs the specified action so that response actions are included and undo/redo strings assigned
  .actions(applyModelChange)

export interface IAxisModel extends Instance<typeof AxisModel> {}
export interface IAxisModelSnapshot extends SnapshotIn<typeof AxisModel> {}

/*
 * axisModelRegistry
 */
const axisModelRegistry = new Map<AxisModelType, typeof AxisModel>()
export const allAxisModels = () => Array.from(axisModelRegistry.values())
export function registerAxisModel(type: AxisModelType, model: typeof AxisModel) {
  axisModelRegistry.set(type, model)
}

/*
 * EmptyAxisModel
 */
export const EmptyAxisModel = AxisModel
  .named("EmptyAxisModel")
  .props({
    type: axisModelType("empty")
  })
export interface IEmptyAxisModel extends Instance<typeof EmptyAxisModel> {}
export interface IEmptyAxisModelSnapshot extends SnapshotIn<typeof EmptyAxisModel> {}

export function isEmptyAxisModel(axisModel?: IAxisModel): axisModel is IEmptyAxisModel {
  return axisModel?.type === "empty"
}

registerAxisModel("empty", EmptyAxisModel)
