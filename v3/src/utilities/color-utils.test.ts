import { parseColor, parseColorToHex } from "@concord-consortium/codap-utilities/color-utils"

describe("Color utilities", () => {
  it("parseColor works as expected without color names", () => {
    // ignores invalid values
    expect(parseColor("")).toBe("")
    expect(parseColor("foo")).toBe("")
    expect(parseColor("rgb()")).toBe("")

    // ignores color names when not configured to support them
    expect(parseColor("red")).toBe("")
    expect(parseColor("TOMATO")).toBe("")
    expect(parseColor("papayaWhip")).toBe("")

    // supports hex
    expect(parseColor("#ff0000")).toBe("#ff0000")
    expect(parseColor("#00ff0080")).toBe("#00ff0080")
    expect(parseColor("#00f")).toBe("#0000ff")
    expect(parseColor("#00f8")).toBe("#0000ff87")

    // supports rgb()
    expect(parseColor("rgb(0, 255, 0)")).toBe("#00ff00")
    expect(parseColor("rgb(0, 255, 0, 0.5)")).toBe("#00ff0080")
    // clamps out-of-range values to valid range
    expect(parseColor("rgb(0, 500, 0)")).toBe("#00ff00")

    // supports hsl()
    expect(parseColor("hsl(100, 50%, 50%)")).toBe("#6abf40")
    expect(parseColor("hsl(100, 50%, 50%, 0.5)")).toBe("#6abf4080")
    // projects out-of-range hue to valid range
    expect(parseColor("hsl(460, 50%, 50%)")).toBe("#6abf40")
  })
  it("parseColor works as expected with color names", () => {
    // ignores invalid values
    expect(parseColor("", { colorNames: true })).toBe("")
    expect(parseColor("foo", { colorNames: true })).toBe("")
    expect(parseColor("rgb()", { colorNames: true })).toBe("")

    // returns color names when configured to support them
    expect(parseColor("red", { colorNames: true })).toBe("red")
    expect(parseColor("TOMATO", { colorNames: true })).toBe("tomato")
    expect(parseColor("papayaWhip", { colorNames: true })).toBe("papayawhip")

    // supports hex
    expect(parseColor("#ff0000", { colorNames: true })).toBe("#ff0000")
    expect(parseColor("#00ff0080", { colorNames: true })).toBe("#00ff0080")
    expect(parseColor("#00f", { colorNames: true })).toBe("#0000ff")
    expect(parseColor("#00f8", { colorNames: true })).toBe("#0000ff87")

    // supports rgb()
    expect(parseColor("rgb(0, 255, 0)", { colorNames: true })).toBe("#00ff00")
    expect(parseColor("rgb(0, 255, 0, 0.5)", { colorNames: true })).toBe("#00ff0080")
    // clamps out-of-range values to valid range
    expect(parseColor("rgb(0, 500, 0)", { colorNames: true })).toBe("#00ff00")

    // supports hsl()
    expect(parseColor("hsl(100, 50%, 50%)", { colorNames: true })).toBe("#6abf40")
    expect(parseColor("hsl(100, 50%, 50%, 0.5)", { colorNames: true })).toBe("#6abf4080")
    // projects out-of-range hue to valid range
    expect(parseColor("hsl(460, 50%, 50%)", { colorNames: true })).toBe("#6abf40")
  })

  it("parseColorToHex works as expected without color names", () => {
    // ignores invalid values
    expect(parseColorToHex("")).toBe("")
    expect(parseColorToHex("foo")).toBe("")
    expect(parseColorToHex("rgb()")).toBe("")

    // ignores color names when not configured to support them
    expect(parseColorToHex("red")).toBe("")
    expect(parseColorToHex("TOMATO")).toBe("")
    expect(parseColorToHex("papayaWhip")).toBe("")

    // supports hex
    expect(parseColorToHex("#ff0000")).toBe("#ff0000")
    expect(parseColorToHex("#00ff0080")).toBe("#00ff0080")
    expect(parseColorToHex("#00f")).toBe("#0000ff")
    expect(parseColorToHex("#00f8")).toBe("#0000ff87")

    // supports rgb()
    expect(parseColorToHex("rgb(0, 255, 0)")).toBe("#00ff00")
    expect(parseColorToHex("rgb(0, 255, 0, 0.5)")).toBe("#00ff0080")
    // clamps out-of-range values to valid range
    expect(parseColorToHex("rgb(0, 500, 0)")).toBe("#00ff00")

    // supports hsl()
    expect(parseColorToHex("hsl(100, 50%, 50%)")).toBe("#6abf40")
    expect(parseColorToHex("hsl(100, 50%, 50%, 0.5)")).toBe("#6abf4080")
    // projects out-of-range hue to valid range
    expect(parseColorToHex("hsl(460, 50%, 50%)")).toBe("#6abf40")
  })
  it("parseColorToHex works as expected with color names", () => {
    // ignores invalid values
    expect(parseColorToHex("", { colorNames: true })).toBe("")
    expect(parseColorToHex("foo", { colorNames: true })).toBe("")
    expect(parseColorToHex("rgb()", { colorNames: true })).toBe("")

    // returns color names when configured to support them
    expect(parseColorToHex("red", { colorNames: true })).toBe("#ff0000")
    expect(parseColorToHex("TOMATO", { colorNames: true })).toBe("#ff6347")
    expect(parseColorToHex("papayaWhip", { colorNames: true })).toBe("#ffefd5")

    // supports hex
    expect(parseColorToHex("#ff0000", { colorNames: true })).toBe("#ff0000")
    expect(parseColorToHex("#00ff0080", { colorNames: true })).toBe("#00ff0080")
    expect(parseColorToHex("#00f", { colorNames: true })).toBe("#0000ff")
    expect(parseColorToHex("#00f8", { colorNames: true })).toBe("#0000ff87")

    // supports rgb()
    expect(parseColorToHex("rgb(0, 255, 0)", { colorNames: true })).toBe("#00ff00")
    expect(parseColorToHex("rgb(0, 255, 0, 0.5)", { colorNames: true })).toBe("#00ff0080")
    // clamps out-of-range values to valid range
    expect(parseColorToHex("rgb(0, 500, 0)", { colorNames: true })).toBe("#00ff00")

    // supports hsl()
    expect(parseColorToHex("hsl(100, 50%, 50%)", { colorNames: true })).toBe("#6abf40")
    expect(parseColorToHex("hsl(100, 50%, 50%, 0.5)", { colorNames: true })).toBe("#6abf4080")
    // projects out-of-range hue to valid range
    expect(parseColorToHex("hsl(460, 50%, 50%)", { colorNames: true })).toBe("#6abf40")
  })
})
