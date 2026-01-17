import { PixiPoints } from "../pixi/pixi-points"
import { NullPointRenderer } from "./null-point-renderer"
import { PixiPointRenderer } from "./pixi-point-renderer"
import {
  getCanvas,
  hasWebGLCapability,
  isPixiPointRenderer,
  isPixiPoints,
  isPointRenderer,
  toPixiPointsArray
} from "./point-renderer-compat"
import { PointRendererBase } from "./point-renderer-base"

// Mock PixiPoints to avoid WebGL initialization issues in tests
jest.mock("../pixi/pixi-points", () => {
  class MockPixiPoints {
    renderer = null
    canvas = null
  }
  return {
    PixiPoints: MockPixiPoints
  }
})

describe("point-renderer-compat", () => {
  describe("isPixiPoints", () => {
    it("returns true for PixiPoints instance", () => {
      const pixiPoints = new PixiPoints()
      expect(isPixiPoints(pixiPoints)).toBe(true)
    })

    it("returns false for NullPointRenderer", () => {
      const renderer = new NullPointRenderer()
      expect(isPixiPoints(renderer)).toBe(false)
    })

    it("returns false for PixiPointRenderer", () => {
      const renderer = new PixiPointRenderer()
      expect(isPixiPoints(renderer)).toBe(false)
    })

    it("returns false for undefined", () => {
      expect(isPixiPoints(undefined)).toBe(false)
    })
  })

  describe("isPointRenderer", () => {
    it("returns true for NullPointRenderer", () => {
      const renderer = new NullPointRenderer()
      expect(isPointRenderer(renderer)).toBe(true)
    })

    it("returns true for PixiPointRenderer", () => {
      const renderer = new PixiPointRenderer()
      expect(isPointRenderer(renderer)).toBe(true)
    })

    it("returns false for PixiPoints", () => {
      const pixiPoints = new PixiPoints()
      expect(isPointRenderer(pixiPoints)).toBe(false)
    })

    it("returns false for undefined", () => {
      expect(isPointRenderer(undefined)).toBe(false)
    })
  })

  describe("isPixiPointRenderer", () => {
    it("returns true for PixiPointRenderer", () => {
      const renderer = new PixiPointRenderer()
      expect(isPixiPointRenderer(renderer)).toBe(true)
    })

    it("returns false for NullPointRenderer", () => {
      const renderer = new NullPointRenderer()
      expect(isPixiPointRenderer(renderer)).toBe(false)
    })

    it("returns false for PixiPoints", () => {
      const pixiPoints = new PixiPoints()
      expect(isPixiPointRenderer(pixiPoints)).toBe(false)
    })

    it("returns false for undefined", () => {
      expect(isPixiPointRenderer(undefined)).toBe(false)
    })
  })

  describe("getCanvas", () => {
    it("returns null for NullPointRenderer", () => {
      const renderer = new NullPointRenderer()
      expect(getCanvas(renderer)).toBeNull()
    })

    it("returns null for uninitialized PixiPointRenderer", () => {
      const renderer = new PixiPointRenderer()
      expect(getCanvas(renderer)).toBeNull()
    })

    it("returns null for undefined", () => {
      expect(getCanvas(undefined)).toBeNull()
    })

    it("returns null for PixiPoints without renderer", () => {
      const pixiPoints = new PixiPoints()
      expect(getCanvas(pixiPoints)).toBeNull()
    })
  })

  describe("hasWebGLCapability", () => {
    it("returns false for NullPointRenderer", () => {
      const renderer = new NullPointRenderer()
      expect(hasWebGLCapability(renderer)).toBe(false)
    })

    it("returns true for PixiPointRenderer", () => {
      const renderer = new PixiPointRenderer()
      expect(hasWebGLCapability(renderer)).toBe(true)
    })

    it("returns false for PixiPoints without renderer", () => {
      const pixiPoints = new PixiPoints()
      expect(hasWebGLCapability(pixiPoints)).toBe(false)
    })

    it("returns false for undefined", () => {
      expect(hasWebGLCapability(undefined)).toBe(false)
    })
  })

  describe("toPixiPointsArray", () => {
    it("converts array of PointRendererBase to compatible array", () => {
      const renderer1 = new NullPointRenderer()
      const renderer2 = new PixiPointRenderer()
      const renderers: Array<PointRendererBase | undefined> = [renderer1, renderer2, undefined]

      const result = toPixiPointsArray(renderers)

      // Should be the same array, just typed differently
      expect(result).toHaveLength(3)
      expect(result[0]).toBe(renderer1)
      expect(result[1]).toBe(renderer2)
      expect(result[2]).toBeUndefined()
    })

    it("handles empty array", () => {
      const result = toPixiPointsArray([])
      expect(result).toEqual([])
    })
  })
})
