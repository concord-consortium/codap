import { SetRequired } from "type-fest"
import { applySnapshot, getSnapshot } from "mobx-state-tree"
import { cloneDeep } from "lodash"
import { V2Slider } from "../../data-interactive/data-interactive-component-types"
import { DIValues } from "../../data-interactive/data-interactive-types"
import { DIComponentHandler } from "../../data-interactive/handlers/component-handler"
import { errorResult } from "../../data-interactive/handlers/di-results"
import { appState } from "../../models/app-state"
import { GlobalValueManager } from "../../models/global/global-value-manager"
import { isDateUnit } from "../../utilities/date-utils"
import { t } from "../../utilities/translation/translate"
import { kSliderTileType, kV2SliderType } from "./slider-defs"
import { ISliderModel, ISliderSnapshot, isSliderModel } from "./slider-model"
import { AnimationDirections, AnimationModes, isSliderScaleType } from "./slider-types"

function validateInput(values: DIValues | undefined, sliderModel?: ISliderModel):
  { error: ReturnType<typeof errorResult>, validatedValues?: never } |
  { error?: never, validatedValues: Partial<ISliderSnapshot> }
{
  if (!values) {
    return {validatedValues: {}}
  }
  const {
    animationDirection: _animationDirection,
    animationMode: _animationMode,
    globalValueName,
    scaleType,
    dateMultipleOfUnit,
  } = values as V2Slider

  const snapshot: Partial<ISliderSnapshot> = {}

  if (globalValueName) {
    const { document } = appState
    const globalManager = document.content?.getFirstSharedModelByType(GlobalValueManager)
    const global = globalManager?.getValueByName(globalValueName)
    if (!global) {
      return {error: errorResult(t("V3.DI.Error.globalNotFound", { vars: [globalValueName] }))}
    }
    snapshot.globalValue = global.id

    // If this is a new slider, or the global is being changed, check for multiple sliders
    if (sliderModel?.globalValue.id !== global.id) {
      // Multiple sliders for one global value are not allowed
      let existingTile = false
      document.content?.tileMap.forEach(sliderTile => {
        if (isSliderModel(sliderTile.content) && sliderTile.content.globalValue.id === global.id) {
          existingTile = true
        }
      })
      if (existingTile) {
        return {error: errorResult(t("V3.DI.Error.noMultipleSliders", { vars: [globalValueName] }))}
      }
    }
  }

  if (dateMultipleOfUnit != null) {
    if (!isDateUnit(dateMultipleOfUnit)) {
      return {error: errorResult(t("V3.DI.Error.unsupportedDateUnit", { vars: [dateMultipleOfUnit] }))}
    }
    snapshot.dateMultipleOfUnit = dateMultipleOfUnit
  }

  if (scaleType != null) {
    if (!isSliderScaleType(scaleType)) {
      return {error: errorResult(t("V3.DI.Error.unsupportedScaleType", { vars: [scaleType] }))}
    }
    snapshot.scaleType = scaleType
  }

  if (_animationDirection != null) {
    const directionNumber = Number(_animationDirection)
    if (isNaN(directionNumber) || directionNumber < 0 || directionNumber >= AnimationDirections.length) {
      return {error: errorResult(t("V3.DI.Error.unsupportedAnimationDirection", { vars: [_animationDirection] }))}
    }
    snapshot.animationDirection = AnimationDirections[directionNumber]
  }

  if (_animationMode != null) {
    const modeNumber = Number(_animationMode)
    if (isNaN(modeNumber) || modeNumber < 0 || modeNumber >= AnimationModes.length) {
      return {error: errorResult(t("V3.DI.Error.unsupportedAnimationMode", { vars: [_animationMode] }))}
    }
    snapshot.animationMode = AnimationModes[modeNumber]
  }

  return { validatedValues: snapshot }
}

export const sliderComponentHandler: DIComponentHandler = {
  create({ values }) {
    const {
      animationRate,
      multipleOf,
      lowerBound,
      upperBound,
    } = values as V2Slider
    const { error, validatedValues } = validateInput(values)
    if (error) {
      return error
    }
    const {
      animationDirection,
      animationMode,
      dateMultipleOfUnit,
      globalValue,
      scaleType,
    } = validatedValues

    if (!globalValue) return {}

    function getAxis(): ISliderSnapshot["axis"] {
      if (lowerBound == null || upperBound == null) {
        return undefined
      }

      const baseAxis: ISliderSnapshot["axis"] =
        { min: lowerBound, max: upperBound, place: "bottom" }
      baseAxis.type = (scaleType || "numeric")
      return baseAxis
    }

    const content: SetRequired<ISliderSnapshot, "type"> = {
      type: kSliderTileType,
      animationDirection,
      animationMode,
      _animationRate: animationRate,
      multipleOf,
      scaleType,
      dateMultipleOfUnit,
      axis: getAxis(),
      globalValue
    }

    return { content }
  },
  get(content) {
    if (isSliderModel(content)) {
      const animationDirection = AnimationDirections.findIndex(value => value === content.animationDirection)
      const animationMode = AnimationModes.findIndex(value => value === content.animationMode)
      return {
        type: kV2SliderType,
        animationDirection,
        animationMode,
        animationRate: content.animationRate,
        multipleOf: content.multipleOf,
        dateMultipleOfUnit: content.dateMultipleOfUnit,
        scaleType: content.scaleType,
        globalValueName: content.globalValue.name,
        lowerBound: content.axis.min,
        upperBound: content.axis.max,
        value: content.globalValue.value
      } as V2Slider
    }
  },

  update(content, values) {
    if (!isSliderModel(content)) return { success: false }

    const {
      animationRate,
      multipleOf,
      lowerBound,
      upperBound,
    } = values as V2Slider

    const { error, validatedValues } = validateInput(values, content)
    if (error) {
      return error
    }

    const {
      scaleType,
    } = validatedValues

    const snapshot = {
      ...cloneDeep(getSnapshot(content)),
      ...validatedValues,
    }

    if (animationRate != null) {
      snapshot._animationRate = animationRate
    }
    if (multipleOf != null) {
      snapshot.multipleOf = multipleOf
    }
    if (scaleType != null) {
      // The scaleType has already been validated, so we can safely use it
      snapshot.axis.type = scaleType
    }
    if (lowerBound != null) {
      snapshot.axis.min = lowerBound
    }
    if (upperBound != null) {
      snapshot.axis.max = upperBound
    }

    applySnapshot(content, snapshot)

    return { success: true }
  }
}
