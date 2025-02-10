import { Colord, colord, getFormat as getColorFormat } from "colord"
import namesPlugin from "colord/plugins/names"
import type { Parsers } from "colord/types"

/*
  The following list of 20 colors are maximally visually distinct from each other.
  See http://eleanormaclure.files.wordpress.com/2011/03/colour-coding.pdf
  and https://stackoverflow.com/questions/470690/how-to-automatically-generate-n-distinct-colors

  The first seven are also visually distinct for people with defective color vision
   */
export const kellyColors = [
  '#FF6800', '#803E75', '#A6BDD7', '#FFB300',
  '#C10020', '#CEA262', '#817066', '#007D34',
  '#00538A', '#F13A13', '#53377A', '#FF8E00',
  '#B32851', '#F4C800', '#7F180D', '#93AA00',
  '#593315', '#232C16', '#FF7A5C', '#F6768E'
]

export const defaultPointColor = '#E6805B',
  defaultSelectedColor = '#4682B4',
  defaultStrokeWidth = 1,
  defaultStrokeOpacity = 0.4,
  missingColor = '#888888',
  defaultStrokeColor = '#FFFFFF',
  defaultSelectedStroke = '#FF0000',
  defaultSelectedStrokeWidth = 2,
  defaultSelectedStrokeOpacity = 1,
  defaultBackgroundColor = '#FFFFFF'

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
 * @param options { colorNames?: boolean } whether or not to recognize color names when parsing
 * @returns canonicalized color string or empty string
 */
export function parseColorToHex(str: string, options?: ParseColorOptions) {
  // if it's a valid color name, return its hex equivalent
  if (options?.colorNames) {
    const parsed = parseColorName(str)
    if (parsed) return colord(parsed).toHex()
  }
  // if it's a valid color string, return its hex equivalent
  return getColorFormat(str) ? colord(str).toHex() : ""
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

// Returns an array of five colors transitioning between color1 and color2
export function getCholorplethColors(color1: string, color2: string) {
  const midColor = (percentage: number) => interpolateColors(color1, color2, percentage)
  return [color1, midColor(.25), midColor(.5), midColor(.75), color2]
}
