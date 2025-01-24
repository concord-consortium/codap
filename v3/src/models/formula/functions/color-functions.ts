import { parseColorToHex } from "../../../utilities/color-utils"
import { FValue } from "../formula-types"
import { AnyColor, Colord, colord } from "colord"

type ColorFValue = AnyColor | Colord | string

const isValidPercentage = (value: any) =>
  (typeof value === 'number' && value >=0 && value <= 100)

const isValidAngle = (value: any) =>
  typeof value === 'number' ||
  (typeof value === 'string' && /^(?:-?\d+(?:\.\d+)?(?:deg|turn)?)$/.test(value))

const isValidRgbValue = (value: any) => typeof value === "number" && value >= 0 && value <= 255

export const colorFunctions = {
  // rgb(red, green, blue, alpha (optional))
  rgb: {
    numOfRequiredArguments: 3,
    evaluate: (...args: FValue[]) => {
      if (args.length < 3 || args.length > 4) return ""

      let [r, g, b, a] = args

      if (!isValidRgbValue(r) || !isValidRgbValue(g) || !isValidRgbValue(b)) return ""
      if (a !== undefined) {
        if (typeof a === 'number' && a > 1) {
          a = a / 100
        }
        if (!isValidPercentage(a)) return ""
      }
      const rgbString = a !== undefined ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`
      return colord(rgbString).isValid() ? colord(rgbString).toHex() : ""
    }
  },

  // hsl(hue, saturation, lightness, alpha (optional))
  hsl: {
    numOfRequiredArguments: 3,
    evaluate: (...args: FValue[]) => {
      if (args.length < 3 || args.length > 4) return ""

      if (!isValidAngle(args[0]) || !isValidPercentage(args[1]) || !isValidPercentage(args[2]) ||
          (args.length === 4 && !isValidPercentage(args[3]))) {
        return ""
      }

      const hue = args[0]
      const saturation = typeof args[1] === 'number' ? `${args[1] < 1 ? args[1] * 100 : args[1]}%` : args[1]
      const lightness = typeof args[2] === 'number' ? `${args[2] < 1 ? args[2] * 100 : args[2]}%` : args[2]
      let alpha = args.length === 4 ? args[3] : undefined
      if (alpha !== undefined) {
        alpha = isValidPercentage(alpha) && typeof alpha === "number" ? alpha > 1 ? alpha / 100 : alpha : ""
      }

      const hslString = alpha !== undefined
        ? `hsla(${hue}, ${saturation}, ${lightness}, ${alpha})`
        : `hsl(${hue}, ${saturation}, ${lightness})`

      return colord(hslString).isValid() ? colord(hslString).toHex() : ""
    }
  },

  // darken(color, percentage)
  darken: {
    numOfRequiredArguments: 2,
    evaluate: (...args: FValue[]) => {
      const [color, percentage] = args as [ColorFValue, FValue]
      const colorVal = typeof color === "string" ?  parseColorToHex(color, { colorNames: true }) : color
      if (typeof colorVal !== "string" || !colord(colorVal).isValid() || !isValidPercentage(percentage)) return ""
      const percentageVal = typeof percentage === "number" ? percentage > 1 ? percentage / 100 : percentage : 0
      const darkenedColor = colord(colorVal).darken(percentageVal).toHex()
      return darkenedColor
    }
  },

  // darken(color, percentage)
  lighten: {
    numOfRequiredArguments: 2,
    evaluate: (...args: FValue[]) => {
      const [color, percentage] = args as [ColorFValue, FValue]
      const colorVal = typeof color === "string" ?  parseColorToHex(color, { colorNames: true }) : color
      if (typeof colorVal !== "string" || !colord(colorVal).isValid() || !isValidPercentage(percentage)) return ""
      const percentageVal = typeof percentage === "number" ? percentage > 1 ? percentage / 100 : percentage : 0
      const lightenedColor = colord(colorVal).lighten(percentageVal).toHex()
      return lightenedColor
    }
  }
}
