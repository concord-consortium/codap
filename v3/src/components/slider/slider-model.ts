import { reaction } from "mobx"
import { addDisposer, Instance, types} from "mobx-state-tree"
import { NumericAxisModel } from "../axis/models/axis-model"
import { GlobalValue } from "../../models/global/global-value"
import { IGlobalValueManager, kGlobalValueManagerType } from "../../models/global/global-value-manager"
import { withUndoRedoStrings } from "../../models/history/codap-undo-types"
import { ISharedModel } from "../../models/shared/shared-model"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { kSliderTileType } from "./slider-defs"
import {
  AnimationDirection, AnimationDirections, AnimationMode, AnimationModes,
  FixValueFn, kDefaultAnimationDirection, kDefaultAnimationMode, kDefaultAnimationRate
} from "./slider-types"

export const SliderModel = TileContentModel
  .named("SliderModel")
  .props({
    type: types.optional(types.literal(kSliderTileType), kSliderTileType),
    globalValue: types.reference(GlobalValue),
    multipleOf: types.maybe(types.number),
    animationDirection: types.optional(types.enumeration([...AnimationDirections]), kDefaultAnimationDirection),
    animationMode: types.optional(types.enumeration([...AnimationModes]), kDefaultAnimationMode),
    // clients should use animationRate view defined below
    _animationRate: types.maybe(types.number),  // frames per second
    axis: types.optional(NumericAxisModel, { place: 'bottom', min: -0.5, max: 11.5 })
  })
  .volatile(self => ({
    // defined while dragging (or animating?), undefined otherwise
    dynamicValue: undefined as number | undefined
  }))
  .views(self => ({
    get name() {
      return self.globalValue.name
    },
    get value() {
      return self.dynamicValue ?? self.globalValue.value
    },
    get domain() {
      return self.axis.domain
    },
    get isUpdatingDynamically() {
      return self.dynamicValue != null
    },
    get increment() {
      // TODO: implement v2 algorithm which determines default increment from axis bounds
      return self.multipleOf || 0.5
    },
    get animationRate() {
      return self._animationRate ?? kDefaultAnimationRate
    },
    get globalValueManager() {
      const sharedModelManager = getSharedModelManager(self)
      const sharedModels = sharedModelManager?.getSharedModelsByType(kGlobalValueManagerType)
      return sharedModels?.[0] as IGlobalValueManager | undefined
    }
  }))
  .views(self => ({
    constrainValue(value: number) {
      // keep value in bounds of axis min and max when thumbnail is dragged
      const keepValueInBounds = (num: number) => {
        if (num < self.axis.min) return self.axis.min
        else if (num > self.axis.max) return self.axis.max
        else return num
      }

      if (self.multipleOf) {
        value = Math.round(value / self.multipleOf) * self.multipleOf
      }
      return keepValueInBounds(value)
    },
    validateValue(value: number, belowMin: FixValueFn, aboveMax: FixValueFn) {
      if (value < self.axis.min) return belowMin(value)
      if (value > self.axis.max) return aboveMax(value)
      return value
    }
  }))
  .actions(self => ({
    setDynamicValue(value: number) {
      self.dynamicValue = self.constrainValue(value)
    },
    setValue(value: number) {
      self.globalValue.setValue(self.constrainValue(value))
      self.dynamicValue = undefined
    },
  }))
  .actions(self => ({
    setDynamicValueIfDynamic(value: number) {
      // update dynamically if either the slider or the axis is updating dynamically
      if (self.isUpdatingDynamically || self.axis.isUpdatingDynamically) {
        self.setDynamicValue(value)
      }
      else {
        self.setValue(value)
      }
    },
  }))
  .actions(self => ({
    afterCreate() {
      addDisposer(self, reaction(
        () => self.axis.domain,
        ([axisMin, axisMax]) => {
          // keep the thumbnail within axis bounds when axis bounds are changed
          if (self.value < axisMin) self.setDynamicValueIfDynamic(axisMin)
          if (self.value > axisMax) self.setDynamicValueIfDynamic(axisMax)
        }, { name: "SliderModel [axis.domain]" }
      ))
    },
    afterAttachToDocument() {
      // register our link to the global value manager when we're attached to the document
      addDisposer(self, reaction(
        () => {
          const sharedModelManager = getSharedModelManager(self)
          const isReady = sharedModelManager?.isReady
          const globalValueManager = self.globalValueManager
          return { sharedModelManager, isReady, globalValueManager }
        },
        ({ sharedModelManager, isReady, globalValueManager }) => {
          if (sharedModelManager?.isReady) {
            // once we're added to the document, update the shared model reference
            globalValueManager && sharedModelManager.addTileSharedModel(self, globalValueManager)
          }
        }, { name: "SliderModel [sharedModelManager]", fireImmediately: true }
      ))
    },
    beforeDestroy() {
      // destroying the slider component removes the underlying global value
      // unfortunately, removing the global value here invalidates the reference and leads to MST warnings.
      // TODO: figure out a mechanism to remove the slider model and its global value safely
      // for now, the global value stays in the registry when the slider model is removed
      // self.globalValue && self.globalValueManager?.removeValue(self.globalValue)
    },
    updateAfterSharedModelChanges(sharedModel?: ISharedModel) {
      // nothing to do
    },
    setName(name: string) {
      self.globalValue.setName(name)
    },
    setMultipleOf(n: number) {
      if (n) {
        self.multipleOf = Math.abs(n)
      }
    },
    setAnimationDirection(direction: AnimationDirection) {
      self.animationDirection = direction
    },
    setAnimationMode(mode: AnimationMode) {
      self.animationMode = mode
    },
    setAnimationRate(rate: number) {
      if (rate) {
        // no need to store the default value
        self._animationRate = rate === kDefaultAnimationRate ? undefined : Math.abs(rate)
      }
    },
    setAxisMin(n: number) {
      self.axis.min = n
    },
    setAxisMax(n: number) {
      self.axis.max = n
    }
  }))
  .actions(self => ({
    encompassValue(input: number) {
      const tAxis = self.axis
      const tLower = tAxis.min
      const tUpper = tAxis.max
      const tValue = input
      if ((tValue < tLower) || (tValue > tUpper)) {
        if (tValue < tLower) {
          self.setAxisMin(tValue - (tUpper - tValue) / 10)
        } else {
          self.setAxisMax(tValue + (tValue - tLower) / 10)
        }
      }
    },
  }))
.actions(self => ({
  // performs the specified action so that response actions are included and undo/redo strings assigned
  applyUndoableAction<T = unknown>(actionFn: () => T, undoStringKey: string, redoStringKey: string) {
    const result = actionFn()
    withUndoRedoStrings(undoStringKey, redoStringKey)
    return result
  }
}))

export interface ISliderModel extends Instance<typeof SliderModel> {}

export function isSliderModel(model?: ITileContentModel): model is ISliderModel {
  return model?.type === kSliderTileType
}
