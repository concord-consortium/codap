import { colord } from "colord"
import { interpolateCividis, interpolateInferno, interpolateLab, interpolateRgb, interpolateViridis, rgb } from "d3"

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

/**
 * Linear in CIELAB, so equal steps look about equally different, with linear alpha.
 * The color and the alpha are interpolated separately because d3 discards the color of a fully
 * transparent end, which would leave the whole ramp the other end's color.
 */
function interpolateCustomRamp(lowColor: string, highColor: string): ColorInterpolator {
  const low = colord(lowColor).toRgb()
  const high = colord(highColor).toRgb()
  const interpolateColor = interpolateLab(rgb(low.r, low.g, low.b), rgb(high.r, high.g, high.b))
  return t => rgb(interpolateColor(t)).copy({ opacity: low.a + t * (high.a - low.a) }).formatRgb()
}

/** Returns the ramp's colors. Only the custom ramp uses lowColor and highColor. */
export function getHotSpotRampInterpolator(
  colorRamp: HotSpotColorRamp, lowColor: string, highColor: string
): ColorInterpolator {
  switch (colorRamp) {
    case "heat": return interpolateInferno
    case "viridis": return interpolateViridis
    case "cividis": return interpolateCividis
    case "monochrome": return kMonochromeInterpolator
    case "custom": return interpolateCustomRamp(lowColor, highColor)
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
