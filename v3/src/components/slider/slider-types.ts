export const kSliderClass = "slider-wrapper"
export const kSliderClassSelector = `.${kSliderClass}`

export const kDefaultSliderWidth = 300
export const kDefaultSliderHeight = 200
export const kSliderWidthLayoutAdj = 4

export const kDefaultSliderAxisTop = 0
export const kDefaultSliderAxisHeight = 24
export const kDefaultSliderPadding = 10

// values are translation string keys; indices are v2 values
export const AnimationDirections = ["backAndForth", "lowToHigh", "highToLow"] as const
export type AnimationDirection = typeof AnimationDirections[number]
export const kDefaultAnimationDirection = "lowToHigh"

// values are translation string keys; indices are v2 values
export const AnimationModes = ["nonStop", "onceOnly"] as const
export type AnimationMode = typeof AnimationModes[number]
export const kDefaultAnimationMode = "onceOnly"

export const kDefaultAnimationRate = 20 // frames/second

export type FixValueFn = (value: number) => number
