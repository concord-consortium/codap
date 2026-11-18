import {
  getHotSpotRampGradient, getHotSpotRampInterpolator, HotSpotColorRamps, isHotSpotColorRamp,
  kDefaultHotSpotColorRamp, kDefaultHotSpotHighColor, kDefaultHotSpotLowColor
} from "./hot-spot-color-ramps"

describe("hot spot color ramps", () => {
  const low = kDefaultHotSpotLowColor, high = kDefaultHotSpotHighColor

  it("lists the ramps in menu order, with heat as the default", () => {
    expect(HotSpotColorRamps).toEqual(["heat", "viridis", "cividis", "monochrome", "custom"])
    expect(kDefaultHotSpotColorRamp).toBe("heat")
    expect(low).toBe("#fff3a3")
    expect(high).toBe("#5b1a8c")
  })

  it("recognizes ramp names", () => {
    expect(isHotSpotColorRamp("viridis")).toBe(true)
    expect(isHotSpotColorRamp("rainbow")).toBe(false)
    expect(isHotSpotColorRamp(undefined)).toBe(false)
  })

  it("uses d3's inferno for heat", () => {
    const heat = getHotSpotRampInterpolator("heat", low, high)
    expect([heat(0), heat(0.5), heat(1)]).toEqual(["#000004", "#bc3754", "#fcffa4"])
  })

  it("uses d3's viridis and cividis", () => {
    const viridis = getHotSpotRampInterpolator("viridis", low, high)
    expect([viridis(0), viridis(0.5), viridis(1)]).toEqual(["#440154", "#21918c", "#fde725"])
    const cividis = getHotSpotRampInterpolator("cividis", low, high)
    expect([cividis(0), cividis(1)]).toEqual(["rgb(0, 32, 81)", "rgb(253, 234, 69)"])
  })

  it("runs from black to white for monochrome, ignoring the custom colors", () => {
    const monochrome = getHotSpotRampInterpolator("monochrome", low, high)
    expect([monochrome(0), monochrome(128 / 255), monochrome(1)])
      .toEqual(["rgb(0, 0, 0)", "rgb(128, 128, 128)", "rgb(255, 255, 255)"])
  })

  it("interpolates the custom ramp in CIELAB, not RGB", () => {
    const custom = getHotSpotRampInterpolator("custom", low, high)
    expect(custom(0)).toBe("rgb(255, 243, 163)")
    expect(custom(1)).toBe("rgb(91, 26, 140)")
    // the RGB midpoint would be rgb(173, 135, 152)
    expect(custom(0.5)).toBe("rgb(178, 133, 156)")
    // the RGB midpoint of blue and yellow would be gray
    expect(getHotSpotRampInterpolator("custom", "#0000ff", "#ffff00")(0.5)).toBe("rgb(193, 137, 172)")
  })

  it("interpolates the custom ramp's alpha linearly", () => {
    expect(getHotSpotRampInterpolator("custom", "#ff000000", "#ff0000ff")(0.5)).toBe("rgba(255, 0, 0, 0.5)")
  })

  it("builds a CSS gradient for a preview strip", () => {
    expect(getHotSpotRampGradient("monochrome", low, high, 3))
      .toBe("linear-gradient(to right, rgb(0, 0, 0), rgb(128, 128, 128), rgb(255, 255, 255))")
    const heat = getHotSpotRampGradient("heat", low, high)
    expect(heat.startsWith("linear-gradient(to right, #000004, ")).toBe(true)
    expect(heat.endsWith(", #fcffa4)")).toBe(true)
    expect(heat.match(/#/g)).toHaveLength(9)
  })
})
