import { Colord, colord, getFormat as getColorFormat } from "colord"
import namesPlugin from "colord/plugins/names"
import type { Parsers, RgbaColor } from "colord/types"

/*
  The following list of 20 colors are maximally visually distinct from each other.
  See http://eleanormaclure.files.wordpress.com/2011/03/colour-coding.pdf
  and https://stackoverflow.com/questions/470690/how-to-automatically-generate-n-distinct-colors

  The first seven are also visually distinct for people with defective color vision
   */
export const kellyColors = [
  '#ff6800', '#803e75', '#a6bdd7', '#ffb300',
  '#c10020', '#cea262', '#817066', '#007d34',
  '#00538a', '#f13a13', '#53377a', '#ff8e00',
  '#b32851', '#f4c800', '#7f180d', '#93aa00',
  '#593315', '#232c16', '#ff7a5c', '#f6768e'
]

export const defaultPointColor = '#e6805b',
  defaultSelectedColor = '#4682b4',
  defaultStrokeWidth = 1,
  defaultStrokeOpacity = 0.4,
  missingColor = '#888888',
  transparentColor = '#ffffff00',
  defaultStrokeColor = '#ffffff',
  defaultSelectedStroke = '#ff0000',
  defaultSelectedStrokeWidth = 2,
  defaultSelectedStrokeOpacity = 1,
  defaultBackgroundColor = '#ffffff'

/*
  The colord library maintains a single global list of parsers, so there's no built-in
  way to maintain two different sets of parsers to accommodate the loose and strict
  parsing required by CODAP. Therefore, we configure the colord library for the strict
  set of colors and make use of the additional plugins to handle the loose formatting,
  particularly the color names. To do so, we initialize the names plugin with a pointer
  to our own array of parsers and then extract the parse function itself from the array.
 */
const parsers: Parsers = {
  string: [],
  object: [],
}
// Initialize the names plugin, passing a pointer to our own parser arrays.
namesPlugin(Colord, parsers)
// Extract the parsing function that the plugin installed into the parser arrays.
const parseColorName = parsers.string[0][0]

export interface ParseColorOptions {
  colorNames?: boolean
  alpha?: number
}

/**
 * parseColor
 *
 * @param str string to be parsed for its color
 * @param options { colorNames?: boolean } whether or not to recognize color names when parsing
 * @returns canonicalized color name or string or empty string
 */
export function parseColor(str: string, options?: ParseColorOptions) {
  // if it's a valid color name, return it
  if (options?.colorNames && parseColorName(str)) return str.toLowerCase()
  // if it's a valid color string, return its hex equivalent
  return getColorFormat(str) ? colord(str).toHex() : ""
}

/**
 * parseColorToHex
 *
 * @param str string to be parsed for its color
 * @param options { colorNames?: boolean, alpha: number } whether to recognize color names; optional alpha value
 * @returns canonicalized color string or empty string
 */
export function parseColorToHex(str: string, options?: ParseColorOptions) {
  let parsed: RgbaColor | null = null
    // Check if the input is a valid color name
    if (options?.colorNames) {
      parsed = parseColorName(str)
    }

    // If not a named color, attempt to parse as a regular color string
    if (!parsed && getColorFormat(str)) {
      parsed = colord(str).toRgb()
    }

    // If color is parsed successfully, apply optional alpha value
    if (parsed) {
      if (options?.alpha !== undefined) {
        parsed.a = options.alpha
      }
      return colord(parsed).toHex()
    }

    // Return empty string if no valid color is found
    return ""
}

export function getAlpha(color: string) {
  const rgbaColor = colord(color).toRgb()
  return rgbaColor.a
}

// remove the alpha channel from a hex color string
export function removeAlphaFromColor(colorStr: string)  {
  const colorHex = parseColorToHex(colorStr, { colorNames: true })
  if (colorHex.length === 9) return colorHex.slice(0, 7)
  return colorStr
}

/*
 * TinyColor class, tinycolor function
 *
 * v2 used a library called tinycolor to handle color values.
 * This class and function emulate the parts of tinycolor required.
 */
export class TinyColor {
  color: Colord

  constructor(color: string) {
    this.color = colord(color)
  }

  toString(format: string) {
    switch (format) {
      case "rgb": return this.color.toRgbString()
    }
    return this.color.toHex()
  }
}
export function tinycolor(color: string) {
  return new TinyColor(color)
}

// Returns a color that is between color1 and color2
export function interpolateColors(color1: string, color2: string, percentage: number) {
  const rgb1 = colord(color1).toRgb()
  const rgb2 = colord(color2).toRgb()
  const rRange = rgb2.r - rgb1.r
  const gRange = rgb2.g - rgb1.g
  const bRange = rgb2.b - rgb1.b
  const r = rgb1.r + percentage * rRange
  const g = rgb1.g + percentage * gRange
  const b = rgb1.b + percentage * bRange
  return colord({ r, g, b }).toHex()
}

// Create a very light, low-saturation version of a base color. The defaults are used for default color ranges.
export function lowColorFromBase(baseColor: string, lightness = 0.92, satScale = 0.5) {
  const c = colord(baseColor)
  if (!c.isValid()) return "#f0f4f8"

  const hsl = c.toHsl()
  const newHsl = {
    h: hsl.h,
    s: Math.min(100, hsl.s * satScale),
    l: lightness * 100
  }

  const tinted = colord(newHsl)
  const hex = tinted.toHex()
  // Avoid pure white fallback
  return hex.toLowerCase() === "#ffffff" ? "#f7f9fb" : hex
}

// Returns an array of five colors transitioning between color1 and color2
export function getChoroplethColors(color1: string, color2: string) {
  const midColor = (percentage: number) => interpolateColors(color1, color2, percentage)
  return [color1, midColor(.25), midColor(.5), midColor(.75), color2]
}
