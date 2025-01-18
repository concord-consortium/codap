import { FValue } from "../formula-types"


export const colorFunctions = {
  // rgb(red, green, blue)
  rgb: {
    numOfRequiredArguments: 3,
    evaluate: (...args: FValue[]) => {return `rgb(${args.join(", ")})`}
  },

  // rgba(...args)
  rgba: {
    numOfRequiredArguments: 4,
    evaluate: (...args: FValue[]) => {return `rgba(${args.join(", ")})`}
  },

  // hsl(hue, saturation, lightness)
  hsl: {
    numOfRequiredArguments: 3,
    evaluate: (...args: FValue[]) => {return `hsl(${args.join(", ")})`}
  },

  // hsla(hue, saturation, lightness, alpha)
  hsla: {
    numOfRequiredArguments: 4,
    evaluate: (...args: FValue[]) => {return `hsla(${args.join(", ")})`}
  },

  // darken(color, percentage)
  darken: {
    numOfRequiredArguments: 2,
    evaluate: (...args: FValue[]) => {return `darken(${args.join(", ")})`}
  },

  // darken(color, percentage)
  lighten: {
    numOfRequiredArguments: 2,
    evaluate: (...args: FValue[]) => {return `lighten(${args.join(", ")})`}
  }
}
