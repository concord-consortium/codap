import { debugLog, DEBUG_PLUGINS } from "../../lib/debug"
import { isFeatureEnabled } from "../../models/feature-flags/feature-flag-manager"
import {
  DateUnit, DurationUnit, durationUnits, durationUnitSeconds, unitsStringToMilliseconds
} from "../../utilities/date-utils"
import { SliderType } from "./slider-types"

export const kDefaultSliderName = "v1"
export const kDefaultSliderValue = .5

// whether the type can be offered: variable always, the range types only while their flags are on
export function isSliderTypeAvailable(sliderType: SliderType) {
  switch (sliderType) {
    case "visibility": return isFeatureEnabled("visibilitySlider")
    case "selection": return isFeatureEnabled("selectionSlider")
    default: return true
  }
}

export function valueChangeNotification(value: number, name?: string) {
  const action = "notify"
  const resource = `global[${name ?? ""}]`
  const values = { globalValue: value }
  return { message: { action, resource, values }, callback: (response: any) =>
    debugLog(DEBUG_PLUGINS, `Reply to ${action} ${resource}:`, JSON.stringify(response))
  }
}

// a step is about a pixel of axis, so handles this close look like one point, and they snap together into one
export const kCollapseSnapSteps = 3

// Combines the handle values React Aria reports with the range when the press began (`start`, by default the
// current range). React Stately rounds every controlled value to its step grid, so only the moving handle comes
// from `values`; the other end keeps its exact value from when the press began, which the model may since have
// moved (a collapse is snapped to the data). A moving handle that closes to within kCollapseSnapSteps of the
// other collapses the range onto the stationary end (the model then snaps it to the data). Closing is judged
// against the starting range too: a drag's release reports a handle a step away from the collapsed range the
// drag produced, which against that range would look like widening, and a handle *leaving* a collapsed range
// (e.g. an arrow key) doesn't collapse it.
export function rangeFromHandles(values: number[], current: readonly [number, number],
                                 activeIndex: number | undefined, step: number,
                                 start: readonly [number, number] = current): [number, number] {
  const [startLow, startHigh] = start
  const low = activeIndex === 1 ? startLow : values[0]
  const high = activeIndex === 0 ? startHigh : values[1]
  const isClosing = high - low < startHigh - startLow
  if (activeIndex != null && isClosing && high - low <= kCollapseSnapSteps * step) {
    const stationary = activeIndex === 0 ? startHigh : startLow
    return [stationary, stationary]
  }
  return [low, high]
}

interface ISliderStepSource {
  isRangeSlider: boolean
  scaleType: "numeric" | "date"
  multipleOf?: number
  dateMultipleOfUnit?: DateUnit
}
// The React Aria step. A variable slider steps by its multiples restriction (in its date unit for dates) or
// else the axis resolution. A range slider steps by the resolution: React Stately rounds each handle to the step
// grid, which would move a range's exact ends (playback still steps by the restriction; see nextAnimationValue).
export function sliderStep(slider: ISliderStepSource, resolution: number | undefined) {
  if (!slider.isRangeSlider && slider.scaleType === "date") {
    return (slider.multipleOf ?? 1) * unitsStringToMilliseconds(slider.dateMultipleOfUnit ?? "day") / 1000
  }
  return (!slider.isRangeSlider && slider.multipleOf) || resolution || 1
}

// a date slider's range width is shown in any duration unit but millisecond
export type SliderWidthUnit = Exclude<DurationUnit, "millisecond">
const kSliderWidthUnits = durationUnits.filter((unit): unit is SliderWidthUnit => unit !== "millisecond")

// The three consecutive units offered for a date range's width: the largest unit the span holds at least one of,
// then the next two smaller. A span under a day offers hours, minutes and seconds, so there are always three.
export function getSliderWidthUnitChoices(spanSeconds: number): SliderWidthUnit[] {
  const lastStart = kSliderWidthUnits.length - 3
  const index = kSliderWidthUnits.findIndex(unit => spanSeconds >= durationUnitSeconds(unit))
  const start = index < 0 ? lastStart : Math.min(index, lastStart)
  return kSliderWidthUnits.slice(start, start + 3)
}

// two significant digits, without rounding away integer digits (365, not 370), up to toPrecision's limit of 100
export function formatSliderWidth(width: number) {
  const integerDigits = Math.abs(width) >= 1 ? Math.floor(Math.log10(Math.abs(width))) + 1 : 0
  return String(Number(width.toPrecision(Math.min(100, Math.max(2, integerDigits)))))
}
