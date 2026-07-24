import { getChoroplethColors, interpolateColors, parseColor, parseColorToHex } from "./color-utils"

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

  it("interpolateColors interpolates RGB and alpha", () => {
    // RGB interpolation between two opaque colors
    expect(interpolateColors("#000000", "#ffffff", 0)).toBe("#000000")
    expect(interpolateColors("#000000", "#ffffff", 1)).toBe("#ffffff")
    expect(interpolateColors("#000000", "#ffffff", 0.5)).toBe("#808080")

    // Opaque endpoints stay opaque (no 8-digit hex suffix introduced)
    expect(interpolateColors("#ff0000", "#0000ff", 0.5)).toBe("#800080")

    // Alpha interpolates linearly alongside RGB (CODAP-1385)
    // fully opaque -> fully transparent at midpoint = 50% alpha
    expect(interpolateColors("#ff0000ff", "#ff000000", 0.5)).toBe("#ff000080")
    // both endpoints transparent: midpoint alpha lies between them
    expect(interpolateColors("#ff000000", "#ff0000ff", 0.25)).toBe("#ff000040")
    // alpha-only difference is preserved at the endpoints
    expect(interpolateColors("#ff0000ff", "#ff000000", 0)).toBe("#ff0000")
    expect(interpolateColors("#ff0000ff", "#ff000000", 1)).toBe("#ff000000")
  })

  it("getChoroplethColors propagates alpha across all five stops", () => {
    // With opaque endpoints, every stop is opaque (6-digit hex)
    const opaque = getChoroplethColors("#000000", "#ffffff")
    expect(opaque).toHaveLength(5)
    opaque.forEach(c => expect(c).toMatch(/^#[0-9a-f]{6}$/))

    // CODAP-1385: when an endpoint has transparency, alpha must interpolate across stops
    // rather than only changing the endpoint quintile.
    const fading = getChoroplethColors("#ff0000ff", "#ff000000")
    expect(fading).toEqual(["#ff0000ff", "#ff0000bf", "#ff000080", "#ff000040", "#ff000000"])
  })
})
