import { interpolateCividis, interpolateInferno, interpolateLab, interpolateRgb, interpolateViridis } from "d3"

/** The hot spot color ramps, in the order the palette's menu lists them */
export const HotSpotColorRamps = ["heat", "viridis", "cividis", "monochrome", "custom"] as const
export type HotSpotColorRamp = typeof HotSpotColorRamps[number]

export const kDefaultHotSpotColorRamp: HotSpotColorRamp = "heat"
export const kDefaultHotSpotLowColor = "#fff3a3"
export const kDefaultHotSpotHighColor = "#5b1a8c"

export function isHotSpotColorRamp(value: unknown): value is HotSpotColorRamp {
  return HotSpotColorRamps.includes(value as HotSpotColorRamp)
}

/** Maps a position in [0, 1], from low density to high, to a CSS color string */
export type ColorInterpolator = (t: number) => string

const kMonochromeInterpolator = interpolateRgb("#000000", "#ffffff")

/** Returns the ramp's colors. Only the custom ramp uses lowColor and highColor. */
export function getHotSpotRampInterpolator(
  colorRamp: HotSpotColorRamp, lowColor: string, highColor: string
): ColorInterpolator {
  switch (colorRamp) {
    case "heat": return interpolateInferno
    case "viridis": return interpolateViridis
    case "cividis": return interpolateCividis
    case "monochrome": return kMonochromeInterpolator
    // Linear in CIELAB, so equal steps look about equally different, with linear alpha.
    case "custom": return interpolateLab(lowColor, highColor)
  }
}

export const kRampGradientStops = 9

/** Returns a CSS linear-gradient of the ramp, running left to right, for a preview strip */
export function getHotSpotRampGradient(
  colorRamp: HotSpotColorRamp, lowColor: string, highColor: string, stops = kRampGradientStops
) {
  const interpolator = getHotSpotRampInterpolator(colorRamp, lowColor, highColor)
  const colors = Array.from({ length: stops }, (_, i) => interpolator(i / (stops - 1)))
  return `linear-gradient(to right, ${colors.join(", ")})`
}
