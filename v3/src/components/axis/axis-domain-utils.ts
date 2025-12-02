import { extent } from "d3"
import { isInteger } from "lodash"
import { goodTickValue } from "../../utilities/math-utils"
import { IAxisDomainOptions } from "./axis-types"
import { IBaseNumericAxisModel } from "./models/base-numeric-axis-models"
import { isAnyNumericAxisModel, isDateAxisModel } from "./models/numeric-axis-models"

/**
 * This function closely follows V2's CellLinearAxisModel:_computeBoundsAndTickGap
 */
export function computeNiceNumericBounds(min: number, max: number): { min: number, max: number } {

  const kAddend = 5,  // amount to extend scale
    kFactor = 2.5,
    bounds = {min, max}
  if (min === max && min === 0) {
    bounds.min = -10
    bounds.max = 10
  } else if (min === max && isInteger(min)) {
    bounds.min -= kAddend
    bounds.max += kAddend
  } else if (min === max) {
    bounds.min = bounds.min + 0.1 * Math.abs(bounds.min)
    bounds.max = bounds.max - 0.1 * Math.abs(bounds.max)
  } else if (min > 0 && max > 0 && min <= max / kFactor) {  // Snap to zero
    bounds.min = 0
  } else if (min < 0 && max < 0 && max >= min / kFactor) {  // Snap to zero
    bounds.max = 0
  }
  const tickGap = goodTickValue(bounds.min, bounds.max)
  if (tickGap !== 0) {
    bounds.min = (Math.floor(bounds.min / tickGap) - 0.5) * tickGap
    bounds.max = (Math.floor(bounds.max / tickGap) + 1.5) * tickGap
  } else {
    bounds.min -= 1
    bounds.max += 1
  }
  return bounds
}

export function setNiceDomain(values: number[], axisModel: IBaseNumericAxisModel, options?: IAxisDomainOptions) {
  if (values.length === 0) return // leave things as they are
  if (isDateAxisModel(axisModel)) {
    const [minDateAsSecs, maxDateAsSecs] = extent(values, d => d) as [number, number],
      addend = 0.1 * Math.abs(maxDateAsSecs - minDateAsSecs)
    axisModel.setDomain(minDateAsSecs - addend, maxDateAsSecs + addend)
  }
  else if (isAnyNumericAxisModel(axisModel)) {
    const [minValue, maxValue] = extent(values, d => d) as [number, number]
    let {min: niceMin, max: niceMax} = computeNiceNumericBounds(minValue, maxValue)
    // When clamping, the domain should start at 0 unless there are negative values.
    if (options?.clampPosMinAtZero) {
      if (minValue >= 0) {
        niceMin = 0
      }
      else if (maxValue <= 0) {
        niceMax = 0
      }
      axisModel.setAllowRangeToShrink(true)
    }
    axisModel.setDomain(niceMin, niceMax)
  }
}
