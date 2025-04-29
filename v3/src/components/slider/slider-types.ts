export const kSliderClass = "slider-wrapper"
export const kSliderClassSelector = `.${kSliderClass}`

export const kDefaultSliderWidth = 300
export const kDefaultSliderHeight = 200
export const kSliderWidthLayoutAdj = 4

export const kDefaultSliderAxisTop = 0
export const kDefaultSliderAxisHeight = 24
export const kDefaultSliderPadding = 10

export const kDefaultSliderAxisMin = -0.5
export const kDefaultSliderAxisMax = 11.5

// values are translation string keys; indices are v2 values
export const AnimationDirections = ["backAndForth", "lowToHigh", "highToLow"] as const
export type AnimationDirection = typeof AnimationDirections[number]
export const kDefaultAnimationDirection = "lowToHigh"
export const kDefaultDateMultipleOfUnit = "day"

// values are translation string keys; indices are v2 values
export const AnimationModes = ["nonStop", "onceOnly"] as const
export type AnimationMode = typeof AnimationModes[number]
export const kDefaultAnimationMode = "onceOnly"

export const kDefaultAnimationRate = 20 // frames/second

export const kAnimationDefaults = {
  animationMode: kDefaultAnimationMode,
  animationDirection: kDefaultAnimationDirection,
  animationRate: kDefaultAnimationRate
}

export const SliderScaleTypes = ["numeric", "date"] as const
export type ISliderScaleType = typeof SliderScaleTypes[number]
export const kDefaultSliderScaleType = "numeric"
export function isSliderScaleType(value: any): value is ISliderScaleType {
  return SliderScaleTypes.includes(value)
}

export type FixValueFn = (value: number) => number
