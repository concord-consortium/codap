import { reaction } from "mobx"
import { addDisposer, Instance, types} from "mobx-state-tree"
import { NumericAxisModel } from "../axis/models/axis-model"
import { GlobalValue } from "../../models/global/global-value"
import { IGlobalValueManager, kGlobalValueManagerType } from "../../models/global/global-value-manager"
import { ISharedModel } from "../../models/shared/shared-model"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { kSliderTileType } from "./slider-defs"
import {
  AnimationDirection, AnimationDirections, AnimationMode, AnimationModes,
  kDefaultAnimationDirection, kDefaultAnimationMode, kDefaultAnimationRate
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
    axis: types.optional(NumericAxisModel, { place: 'bottom', min: 0, max: 12 })
  })
  .views(self => ({
    get name() {
      return self.globalValue.name
    },
    get value() {
      return self.globalValue.value
    },
    get domain() {
      return self.axis.domain
    },
    get increment() {
      // TODO: implement v2 algorithm which determines default increment from axis bounds
      return self.multipleOf || 0.1
    },
    get animationRate() {
      return self._animationRate
      // return self._animationRate ?? kDefaultAnimationRate
    },
    get globalValueManager() {
      const sharedModelManager = getSharedModelManager(self)
      const sharedModels = sharedModelManager?.getSharedModelsByType(kGlobalValueManagerType)
      return sharedModels?.[0] as IGlobalValueManager | undefined
    }
  }))
  .actions(self => ({
    afterAttach() {
      // register our link to the global value manager when we're attached to the document
      addDisposer(self, reaction(
        () => {
          const sharedModelManager = getSharedModelManager(self)
          const globalValueManager = self.globalValueManager
          return { sharedModelManager, globalValueManager }
        },
        ({ sharedModelManager, globalValueManager }) => {
          if (sharedModelManager?.isReady) {
            // once we're added to the document, update the shared model reference
            globalValueManager && sharedModelManager.addTileSharedModel(self, globalValueManager)
          }
        }, { fireImmediately: true }
      ))
    },
    beforeDestroy() {
      // destroying the slider component removes the underlying global value
      self.globalValueManager?.removeValue(self.globalValue)
    },
    updateAfterSharedModelChanges(sharedModel?: ISharedModel) {
      // nothing to do
    },
    setName(name: string) {
      self.globalValue.setName(name)
    },
    setValue(n: number) {
      if (self.multipleOf) {
        n = Math.round(n / self.multipleOf) * self.multipleOf
      }
      self.globalValue.setValue(n)
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
    // setAnimationRate(rate: number) {
    setAnimationRate(rate: number | undefined) {
      if (rate) {
        // no need to store the default value
        self._animationRate = rate === kDefaultAnimationRate ? undefined : Math.abs(rate)
      }
    }
  }))

export interface ISliderModel extends Instance<typeof SliderModel> {}

export function isSliderModel(model?: ITileContentModel): model is ISliderModel {
  return model?.type === kSliderTileType
}
