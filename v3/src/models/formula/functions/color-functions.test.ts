import { colorFunctions } from "./color-functions"
import { colord } from "colord"

describe("colorFunctions", () => {
  describe("rgb", () => {
    it("should return hex for valid rgb values", () => {
      expect(colorFunctions.rgb.evaluate(255, 0, 0)).toBe("#ff0000")
      expect(colorFunctions.rgb.evaluate(0, 255, 0)).toBe("#00ff00")
      expect(colorFunctions.rgb.evaluate(0, 0, 255)).toBe("#0000ff")
    })

    it("should return hex for valid rgba values", () => {
      expect(colorFunctions.rgb.evaluate(255, 0, 0, 0.5)).toBe("#ff000080")
      expect(colorFunctions.rgb.evaluate(0, 255, 0, 50)).toBe("#00ff0080")
      expect(colorFunctions.rgb.evaluate(0, 0, 255, 0.5)).toBe("#0000ff80")
    })

    it("should return empty string for invalid rgb values", () => {
      expect(colorFunctions.rgb.evaluate(256, 0, 0)).toBe("")
      expect(colorFunctions.rgb.evaluate(0, -1, 0)).toBe("")
      expect(colorFunctions.rgb.evaluate(0, 0, 300)).toBe("")
    })

    it("should return empty string for invalid rgba values", () => {
      expect(colorFunctions.rgb.evaluate(255, 0, 0, "a")).toBe("")
      expect(colorFunctions.rgb.evaluate(0, 255, 0, -0.5)).toBe("")
    })
  })

  describe("hsl", () => {
    it("should return hex for valid hsl values", () => {
      expect(colorFunctions.hsl.evaluate(0, 100, 50)).toBe("#ff0000")
      expect(colorFunctions.hsl.evaluate("120deg", 100, 50)).toBe("#00ff00")
      expect(colorFunctions.hsl.evaluate("0.7turn", 100, 50)).toBe("#3300ff")
    })

    it("should return hex for valid hsla values", () => {
      expect(colorFunctions.hsl.evaluate(0, 100, 50, 0.5)).toBe("#ff000080")
      expect(colorFunctions.hsl.evaluate(120, 100, 50, 50)).toBe("#00ff0080")
      expect(colorFunctions.hsl.evaluate(240, 100, 50, 0.5)).toBe("#0000ff80")
    })

    it("should return empty string for invalid hsl values", () => {
      expect(colorFunctions.hsl.evaluate(0, 101, 50)).toBe("")
      expect(colorFunctions.hsl.evaluate(120, 100, 101)).toBe("")
      expect(colorFunctions.hsl.evaluate(240, 100, -1)).toBe("")
    })

    it("should return empty string for invalid hsla values", () => {
      expect(colorFunctions.hsl.evaluate(0, 100, 50, "a")).toBe("")
      expect(colorFunctions.hsl.evaluate(120, 100, 50, -0.5)).toBe("")
    })
  })

  describe("darken", () => {
    it("should return hex for valid color and percentage", () => {
      expect(colorFunctions.darken.evaluate("#ff0000", 0.5)).toBe(colord("#ff0000").darken(0.5).toHex())
      expect(colorFunctions.darken.evaluate("#ff0000", 50)).toBe(colord("#ff0000").darken(0.5).toHex())
      expect(colorFunctions.darken.evaluate("green", 0.5)).toBe(colord("#00ff00").darken(0.5).toHex())
      expect(colorFunctions.darken.evaluate("rgb(0, 0, 255)", 0.5)).toBe(colord("#0000ff").darken(0.5).toHex())
    })

    it("should return empty string for invalid color or percentage", () => {
      expect(colorFunctions.darken.evaluate("invalid", 0.5)).toBe("")
      expect(colorFunctions.darken.evaluate("#ff0000", "a")).toBe("")
      expect(colorFunctions.darken.evaluate("#00ff00", -0.5)).toBe("")
    })
  })

  describe("lighten", () => {
    it("should return hex for valid color and percentage", () => {
      expect(colorFunctions.lighten.evaluate("#ff0000", 0.5)).toBe(colord("#ff0000").lighten(0.5).toHex())
      expect(colorFunctions.lighten.evaluate("#ff0000", 50)).toBe(colord("#ff0000").lighten(0.5).toHex())
      expect(colorFunctions.lighten.evaluate("green", 0.5)).toBe(colord("#008000").lighten(0.5).toHex())
      expect(colorFunctions.lighten.evaluate("rgb(0, 0, 255)", 0.5)).toBe(colord("#0000ff").lighten(0.5).toHex())
    })

    it("should return empty string for invalid color or percentage", () => {
      expect(colorFunctions.lighten.evaluate("invalid", 0.5)).toBe("")
      expect(colorFunctions.lighten.evaluate("#ff0000", "a")).toBe("")
      expect(colorFunctions.lighten.evaluate("#00ff00", -0.5)).toBe("")
    })
  })
})
