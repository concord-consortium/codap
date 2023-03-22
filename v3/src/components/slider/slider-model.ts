import { Instance, types} from "mobx-state-tree"
import { NumericAxisModel } from "../axis/models/axis-model"
import { GlobalValue } from "../../models/global/global-value"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { kSliderTileType } from "./slider-defs"
import { EAnimationDirection, EAnimationMode, kDefaultAnimationDirection, kDefaultAnimationMode } from "./slider-types"
import t from "../../utilities/translation/translate"

export function animationDirectionString(direction: EAnimationDirection) {
  const str = EAnimationDirection[direction]
  return str ? t(`DG.Slider.${EAnimationDirection[direction]}`) : undefined
}

export function animationModeString(mode: EAnimationMode) {
  const str = EAnimationMode[mode]
  return str ? t(`DG.Slider.${EAnimationMode[mode]}`) : undefined
}

export const SliderModel = TileContentModel
  .named("SliderModel")
  .props({
    type: types.optional(types.literal(kSliderTileType), kSliderTileType),
    globalValue: GlobalValue,
    multipleOf: types.maybe(types.number),
    direction: types.maybe(types.number), // EAnimationDirection
    mode: types.maybe(types.number),      // EAnimationMode
    maxRate: types.maybe(types.number),   // animation ticks per second
    axis: types.optional(NumericAxisModel, {
      type: 'numeric',
      scale: 'linear',
      place: 'bottom',
      min: 0,
      max: 12
    }),
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
    get animationDirection(): EAnimationDirection {
      return self.direction ?? kDefaultAnimationDirection
    },
    get animationMode(): EAnimationMode {
      return self.mode ?? kDefaultAnimationMode
    },
    get increment() {
      // TODO: implement v2 algorithm which determines default increment from axis bounds
      return self.multipleOf || 0.1
    },
    get animationRate() {
      return self.maxRate ?? 20 // default frames/second
    }
  }))
  .actions(self => ({
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
      self.multipleOf = Math.abs(n)
    },
    setAnimationRate(n: number) {
      self.maxRate = Math.abs(n)
    },
    setAnimationDirection(direction: EAnimationDirection) {
      self.direction = direction
    },
    setAnimationMode(mode: EAnimationMode) {
      self.mode = mode
    }
  }))

export interface ISliderModel extends Instance<typeof SliderModel> {}

export function isSliderModel(model?: ITileContentModel): model is ISliderModel {
  return model?.type === kSliderTileType
}
