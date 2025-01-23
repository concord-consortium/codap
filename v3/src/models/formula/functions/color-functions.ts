import { FValue } from "../formula-types"
import { colord } from "colord"

const isValidPercentage = (value: any) =>
  (typeof value === 'number' && value >=0 && value <= 1) ||
  (typeof value === 'string' && /^-?\d+(?:\.\d+)?%$/.test(value))

  const isValidAngle = (value: any) =>
    typeof value === 'number' ||
    (typeof value === 'string' && /^(?:-?\d+(?:\.\d+)?(?:deg|rad|grad|turn)?)$/.test(value))

export const colorFunctions = {
  // rgb(red, green, blue)
  rgb: {
    numOfRequiredArguments: 3,
    evaluate: (...args: FValue[]) => {
        if (args.some(a => typeof a !== "number")) return ""
        return `rgb(${args.join(", ")})`
    }
  },

  // rgba(...args)
  rgba: {
    numOfRequiredArguments: 4,
    evaluate: (...args: FValue[]) => {
      if (!isValidPercentage(args[3])) return ""
      if (args.slice(0, 3).some(a => typeof a !== "number")) return ""
      return `rgba(${args.join(", ")})`}
  },

  // hsl(hue, saturation, lightness)
  hsl: {
    numOfRequiredArguments: 3,
    evaluate: (...args: FValue[]) => {
      // check args(0) is a number or a string that includes (deg, rad, grad, turn)
      // check args(1) and args(2) are numbers between 0 and 1, or strings that include (%)
      if (!isValidAngle(args[0]) || !isValidPercentage(args[1]) || !isValidPercentage(args[2])) {
        return ""
      }
      const hue = args[0]
      const saturation = typeof args[1] === 'number' ? `${args[1] * 100}%` : args[1]
      const lightness = typeof args[2] === 'number' ? `${args[2] * 100}%` : args[2]
      const hslString = `hsl(${hue}, ${saturation}, ${lightness})`
      return colord(hslString).isValid() ? colord(hslString).toHex() : ""
    },
  },
  // hsla(hue, saturation, lightness, alpha)
  hsla: {
    numOfRequiredArguments: 4,
    evaluate: (...args: FValue[]) => {
      if (!isValidAngle(args[0]) || !isValidPercentage(args[1]) || !isValidPercentage(args[2]) ||
            !isValidPercentage(args[3])) {
        return ""
      }
      const hue = args[0]
      const saturation = typeof args[1] === 'number' ? `${args[1] * 100}%` : args[1]
      const lightness = typeof args[2] === 'number' ? `${args[2] * 100}%` : args[2]
      const alpha = args[3]
      const hslaString = `hsla(${hue}, ${saturation}, ${lightness}, ${alpha})`
      return colord(hslaString).isValid() ? colord(hslaString).toHex() : ""
    }
  },

  // darken(color, percentage)
  darken: {
    numOfRequiredArguments: 2,
    evaluate: (...args: FValue[]) => {
      const [color, percentage] = args
      if (typeof color !== "string" || !colord(color).isValid() || !isValidPercentage(percentage)) return ""
      const darkenedColor = colord(color).darken(parseFloat(percentage.toString()) / 100).toHex()
      return darkenedColor
    }
  },

  // darken(color, percentage)
  lighten: {
    numOfRequiredArguments: 2,
    evaluate: (...args: FValue[]) => {
      const [color, percentage] = args
      if (typeof color !== "string" || !colord(color).isValid() || !isValidPercentage(percentage)) return ""
      const lightenedColor = colord(color).lighten(parseFloat(percentage.toString()) / 100).toHex()
      return lightenedColor
    }
  }
}
