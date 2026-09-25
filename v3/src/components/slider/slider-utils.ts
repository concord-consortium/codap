import { debugLog, DEBUG_PLUGINS } from "../../lib/debug"
import { DateUnit, unitsStringToMilliseconds } from "../../utilities/date-utils"

export const kDefaultSliderName = "v1"
export const kDefaultSliderValue = .5

export function valueChangeNotification(value: number, name?: string) {
  const action = "notify"
  const resource = `global[${name ?? ""}]`
  const values = { globalValue: value }
  return { message: { action, resource, values }, callback: (response: any) =>
    debugLog(DEBUG_PLUGINS, `Reply to ${action} ${resource}:`, JSON.stringify(response))
  }
}

// Combines the handle values React Aria reports with the model's current range. React Stately rounds every
// controlled value to its step grid, so only the moving handle comes from `values`; the other end keeps the
// model's exact value. A moving handle that closes to within 1.5 steps of the other collapses the range onto
// the stationary end (the model then snaps it to the data); 1.5 because grid rounding can leave a gap a hair
// over one step, and a handle *leaving* a collapsed range (e.g. an arrow key) doesn't collapse it.
export function rangeFromHandles(values: number[], current: readonly [number, number],
                                 activeIndex: number | undefined, step: number): [number, number] {
  const [currentLow, currentHigh] = current
  const low = activeIndex === 1 ? currentLow : values[0]
  const high = activeIndex === 0 ? currentHigh : values[1]
  const isClosing = high - low < currentHigh - currentLow
  if (activeIndex != null && isClosing && high - low <= 1.5 * step) {
    const stationary = activeIndex === 0 ? currentHigh : currentLow
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
// else the axis resolution; range bounds ignore the restriction, so a range slider steps by the resolution.
export function sliderStep(slider: ISliderStepSource, resolution: number | undefined) {
  if (!slider.isRangeSlider && slider.scaleType === "date") {
    return (slider.multipleOf ?? 1) * unitsStringToMilliseconds(slider.dateMultipleOfUnit ?? "day") / 1000
  }
  return (!slider.isRangeSlider && slider.multipleOf) || resolution || 1
}
