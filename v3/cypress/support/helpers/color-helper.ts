interface RgbObject {
  r: number;
  g: number;
  b: number;
}

export const ColorHelper = {
  // a function to parse "rgb(r, g, b)" to an object {r, g, b}
  parseRgbColorToObj(color: any): RgbObject | null {
    const rgbRegex = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i
    const match = color.match(rgbRegex)

    if (match) {
      return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10)
      };
    } else {
      console.warn(`Failed to parse RGB string: "${color}"`)
      return null
    }
  }
}
