export const kSliderClass = "slider-wrapper"
export const kSliderClassSelector = `.${kSliderClass}`

export const kDefaultSliderWidth = 300
export const kDefaultSliderHeight = 200

export const kDefaultSliderAxisTop = 0
export const kDefaultSliderAxisHeight = 24
export const kDefaultSliderPadding = 10

export enum EAnimationDirection {
  // note that these keys match the translation string keys
  backAndForth,
  lowToHigh,
  highToLow
}
export const kDefaultAnimationDirection = EAnimationDirection.lowToHigh

export enum EAnimationMode {
  // note that these keys match the translation string keys
  nonStop,
  onceOnly
}
export const kDefaultAnimationMode = EAnimationMode.onceOnly

export function isValidAnimationDirection(direction: number) {
  return EAnimationDirection[direction] != null
}

export function isValidAnimationMode(mode: number) {
  return EAnimationMode[mode] != null
}
