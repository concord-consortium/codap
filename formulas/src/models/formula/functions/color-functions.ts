import { parseColorToHex } from "../../../utilities/color-utils"
import { FValue } from "../formula-types"
import { AnyColor, Colord, colord } from "colord"

type ColorFValue = AnyColor | Colord | string

const isValidPercentage = (value: FValue): value is number => typeof value === "number" && value >= 0 && value <= 100

const getPercentage = (value: number) => value > 1 ? value / 100 : value

const isValidAngle = (value: FValue): value is number => typeof value === "number"

const isValidHslValue = (value: FValue): value is number => typeof value === "number" && value >= 0 && value <= 100

const isValidRgbValue = (value: FValue): value is number => typeof value === "number" && value >= 0 && value <= 255

export const colorFunctions = {
  // rgb(red, green, blue, alpha (optional))
  rgb: {
    numOfRequiredArguments: 3,
    evaluate: (...args: FValue[]) => {
      if (args.length < 3 || args.length > 4) return ""
      let [r, g, b, a] = args as [FValue, FValue, FValue, Maybe<FValue>]
      if (!isValidRgbValue(r) || !isValidRgbValue(g) || !isValidRgbValue(b)) return ""
      if (a !== undefined) {
        if (typeof a === "number") {
          a = getPercentage(a)
        }
        if (!isValidPercentage(a)) return ""
      }
      const color = colord({ r, g, b, a })
      return color.isValid() ? color.toHex() : ""
    }
  },

  // hsl(hue, saturation, lightness, alpha (optional))
  hsl: {
    numOfRequiredArguments: 3,
    evaluate: (...args: FValue[]) => {
      if (args.length < 3 || args.length > 4) return ""
      let [hue, saturation, lightness, a] = args as [FValue, FValue, FValue, Maybe<FValue>]
      if (!isValidAngle(hue) || !isValidHslValue(saturation) || !isValidHslValue(lightness)) {
        return ""
      }
      if (a !== undefined) {
        if (typeof a === "number") {
          a = getPercentage(a)
        }
        if (!isValidPercentage(a)) return ""
      }
      const h = hue % 360
      const hsl = colord({ h, s: saturation, l: lightness, a })
      return hsl.isValid() ? hsl.toHex() : ""
    }
  },

  // darken(color, percentage)
  darken: {
    numOfRequiredArguments: 2,
    evaluate: (...args: FValue[]) => {
      let [color, percentage] = args as [ColorFValue, number]
      const colorVal = typeof color === "string" ? parseColorToHex(color, { colorNames: true }) : color
      if (colord(colorVal).isValid()) {
        const colorHsl = colord(colorVal).toHsl()
        const hueVal = colorHsl.h
        const saturationVal = colorHsl.s
        const lightnessVal = colorHsl.l
        if (percentage !== undefined && typeof percentage === "number") {
          percentage = getPercentage(percentage)
        }
        if (typeof colorHsl !== "object" || !colord(colorHsl).isValid() || !isValidPercentage(percentage)) return ""
        return colord({h: hueVal, s: saturationVal, l: lightnessVal - (percentage * lightnessVal)}).toHex()
      } else {
        return ""
      }
    }
  },

  // darken(color, percentage)
  lighten: {
    numOfRequiredArguments: 2,
    evaluate: (...args: FValue[]) => {
      let [color, percentage] = args as [ColorFValue, number]
      const colorVal = typeof color === "string" ? parseColorToHex(color, { colorNames: true }) : color
      if (colord(colorVal).isValid()) {
        const colorHsl = colord(colorVal).toHsl()
        const hueVal = colorHsl.h
        const saturationVal = colorHsl.s
        const lightnessVal = colorHsl.l
        if (percentage !== undefined && typeof percentage === "number") {
          percentage = getPercentage(percentage)
        }
        if (typeof colorHsl !== "object" || !colord(colorHsl).isValid() || !isValidPercentage(percentage)) return ""
        return colord({h: hueVal, s: saturationVal, l: lightnessVal + (percentage * (100 - lightnessVal))}).toHex()
      } else {
        return ""
      }
    }
  }
}
