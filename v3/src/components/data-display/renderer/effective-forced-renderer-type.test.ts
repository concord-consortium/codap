import { computeEffectiveForcedRendererType } from "./effective-forced-renderer-type"

describe("computeEffectiveForcedRendererType", () => {
  it("returns 'canvas' when accel is disabled, regardless of debug override", () => {
    expect(computeEffectiveForcedRendererType(true, null)).toBe("canvas")
    expect(computeEffectiveForcedRendererType(true, "webgl")).toBe("canvas")
    expect(computeEffectiveForcedRendererType(true, "canvas")).toBe("canvas")
  })

  it("returns the debug override when accel is not disabled", () => {
    expect(computeEffectiveForcedRendererType(false, "webgl")).toBe("webgl")
    expect(computeEffectiveForcedRendererType(false, "canvas")).toBe("canvas")
    expect(computeEffectiveForcedRendererType(undefined, "webgl")).toBe("webgl")
  })

  it("returns null (default behavior) when accel is not disabled and no debug override", () => {
    expect(computeEffectiveForcedRendererType(false, null)).toBe(null)
    expect(computeEffectiveForcedRendererType(undefined, null)).toBe(null)
  })
})
