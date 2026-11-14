import { extent } from "d3"
import { isInteger } from "lodash"
import { goodTickValue } from "../../utilities/math-utils"
import { IAxisDomainOptions } from "./axis-types"
import { IBaseNumericAxisModel } from "./models/base-numeric-axis-model"
import { IDateAxisModel, isAnyNumericAxisModel, isDateAxisModel } from "./models/numeric-axis-models"

const kSecondsPerDay = 24 * 60 * 60
// With no dates to fit, a date axis shows the ten days ending now, as in V2
const kNoDatesSpanSeconds = 10 * kSecondsPerDay
// How far a date axis extends each way from a lone date, as in V2
const kLoneDatePadSeconds = 5 * kSecondsPerDay

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

function setNiceDateDomain(values: number[], axisModel: IDateAxisModel, options?: IAxisDomainOptions) {
  if (values.length === 0) {
    // Only a refit that may shrink the axis replaces its range when there is nothing to fit.
    if (options?.growOnly || !axisModel.allowRangeToShrink) return
    const nowSecs = Date.now() / 1000
    axisModel.setDomain(nowSecs - kNoDatesSpanSeconds, nowSecs)
    // Let the first dates to arrive fit the axis, as the first numbers fit a numeric axis.
    axisModel.setAllowRangeToShrink(true)
    return
  }
  const [minDateAsSecs, maxDateAsSecs] = extent(values, d => d) as [number, number],
    addend = minDateAsSecs === maxDateAsSecs ? kLoneDatePadSeconds : 0.1 * (maxDateAsSecs - minDateAsSecs)
  axisModel.setDomain(minDateAsSecs - addend, maxDateAsSecs + addend)
}

export function setNiceDomain(values: number[], axisModel: IBaseNumericAxisModel, options?: IAxisDomainOptions) {
  if (isDateAxisModel(axisModel)) {
    setNiceDateDomain(values, axisModel, options)
    return
  }
  if (values.length === 0) return // leave things as they are
  if (isAnyNumericAxisModel(axisModel)) {
    const [minValue, maxValue] = extent(values, d => d) as [number, number]
    let {min: niceMin, max: niceMax} = computeNiceNumericBounds(minValue, maxValue)
    if (options?.clampPosMinAtZero) {
      // When clamping, the domain should start at 0 unless there are negative values.
      if (minValue >= 0) {
        niceMin = 0
      }
      else if (maxValue <= 0) {
        niceMax = 0
      }
      // Allowing the range to shrink refits the axis tightly to the data. Grow-only callers must
      // not do this, or a larger user/plugin-set bound would be silently discarded on a data change;
      // leaving allowRangeToShrink false lets setDomain's grow-only clamp preserve that bound.
      if (!options.growOnly) {
        axisModel.setAllowRangeToShrink(true)
      }
    }
    else if (!axisModel.allowRangeToShrink) {
      // Don't widen a bound on a side where the data doesn't exceed it. This lets plugin-set
      // bounds survive subsequent data additions (CODAP-1421) and mirrors V2's setDataMinAndMax,
      // which leaves bounds alone when current bounds already encompass the data. We compare
      // against the current domain (which accounts for any dynamic bounds, e.g. during a drag)
      // rather than the static min/max, matching the reference used in use-sub-axis and setDomain.
      const [domainMin, domainMax] = axisModel.domain
      if (minValue >= domainMin) niceMin = domainMin
      if (maxValue <= domainMax) niceMax = domainMax
      if (niceMin === domainMin && niceMax === domainMax) return
    }
    axisModel.setDomain(niceMin, niceMax)
  }
}
