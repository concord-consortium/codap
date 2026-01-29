import {
  computeScaleFactor,
  constrainDimensionsToBounds,
  constrainPositionToBounds,
  floorToGrid,
  getScaledDimensions,
  getScaledDimensionsSnapped,
  getScaledPosition,
  getScaledPositionSnapped,
  getUnscaledDimensions,
  getUnscaledPosition,
  kInspectorPanelWidth
} from "./inbounds-utils"
import { kTileDragGridSize } from "../components/constants"

describe("inbounds-utils", () => {

  describe("floorToGrid", () => {
    it("rounds values down to grid boundary", () => {
      // Default grid size is 5 (kTileDragGridSize)
      expect(floorToGrid(0)).toBe(0)
      expect(floorToGrid(4)).toBe(0)
      expect(floorToGrid(5)).toBe(5)
      expect(floorToGrid(7)).toBe(5)
      expect(floorToGrid(10)).toBe(10)
      expect(floorToGrid(13)).toBe(10)
    })

    it("handles negative values", () => {
      expect(floorToGrid(-1)).toBe(-5)
      expect(floorToGrid(-5)).toBe(-5)
      expect(floorToGrid(-6)).toBe(-10)
    })

    it("accepts custom grid size", () => {
      expect(floorToGrid(0, 10)).toBe(0)
      expect(floorToGrid(9, 10)).toBe(0)
      expect(floorToGrid(10, 10)).toBe(10)
      expect(floorToGrid(15, 10)).toBe(10)
      expect(floorToGrid(20, 10)).toBe(20)
    })

    it("uses kTileDragGridSize as default", () => {
      // Verify default matches the constant
      expect(floorToGrid(kTileDragGridSize - 1)).toBe(0)
      expect(floorToGrid(kTileDragGridSize)).toBe(kTileDragGridSize)
    })
  })

  describe("computeScaleFactor", () => {
    it("returns 1 when container is large enough", () => {
      expect(computeScaleFactor(1000, 800, 500, 400)).toBe(1)
      expect(computeScaleFactor(500, 400, 500, 400)).toBe(1)
    })

    it("computes uniform scale factor when container is too small", () => {
      // Container half the required width
      expect(computeScaleFactor(250, 400, 500, 400)).toBe(0.5)

      // Container half the required height
      expect(computeScaleFactor(500, 200, 500, 400)).toBe(0.5)

      // Both dimensions too small - use the smaller ratio
      expect(computeScaleFactor(250, 200, 500, 400)).toBe(0.5)
    })

    it("returns the smaller of width and height ratios", () => {
      // Width ratio = 300/600 = 0.5, Height ratio = 500/500 = 1.0
      expect(computeScaleFactor(300, 500, 600, 500)).toBe(0.5)

      // Width ratio = 400/400 = 1.0, Height ratio = 200/400 = 0.5
      expect(computeScaleFactor(400, 200, 400, 400)).toBe(0.5)
    })

    it("enforces minimum scale factor of 0.1", () => {
      // Very small container would result in scale < 0.1
      expect(computeScaleFactor(10, 10, 1000, 1000)).toBe(0.1)
      expect(computeScaleFactor(5, 5, 1000, 1000)).toBe(0.1)
    })

    it("returns 1 for invalid bounds", () => {
      expect(computeScaleFactor(500, 400, 0, 400)).toBe(1)
      expect(computeScaleFactor(500, 400, 500, 0)).toBe(1)
      expect(computeScaleFactor(500, 400, -100, 400)).toBe(1)
    })
  })

  describe("getScaledPosition", () => {
    it("scales positions by the scale factor", () => {
      expect(getScaledPosition(100, 200, 1)).toEqual({ x: 100, y: 200 })
      expect(getScaledPosition(100, 200, 0.5)).toEqual({ x: 50, y: 100 })
      expect(getScaledPosition(100, 200, 0.25)).toEqual({ x: 25, y: 50 })
    })

    it("handles zero positions", () => {
      expect(getScaledPosition(0, 0, 0.5)).toEqual({ x: 0, y: 0 })
    })
  })

  describe("getScaledPositionSnapped", () => {
    it("scales positions and snaps to grid", () => {
      // 100 * 0.5 = 50, already on grid
      expect(getScaledPositionSnapped(100, 200, 0.5)).toEqual({ x: 50, y: 100 })

      // 100 * 0.3 = 30, already on grid
      expect(getScaledPositionSnapped(100, 200, 0.3)).toEqual({ x: 30, y: 60 })

      // 7 * 1 = 7, should snap down to 5
      expect(getScaledPositionSnapped(7, 13, 1)).toEqual({ x: 5, y: 10 })
    })

    it("handles fractional results by rounding down", () => {
      // 100 * 0.73 = 73, should snap to 70
      expect(getScaledPositionSnapped(100, 100, 0.73)).toEqual({ x: 70, y: 70 })
    })
  })

  describe("getScaledDimensions", () => {
    it("scales dimensions by the scale factor", () => {
      expect(getScaledDimensions(400, 300, 1)).toEqual({ width: 400, height: 300 })
      expect(getScaledDimensions(400, 300, 0.5)).toEqual({ width: 200, height: 150 })
    })

    it("enforces minimum dimensions", () => {
      // 40 * 0.5 = 20, should be clamped to minimum 50
      expect(getScaledDimensions(40, 30, 0.5)).toEqual({ width: 50, height: 50 })
    })

    it("accepts custom minimum dimensions", () => {
      expect(getScaledDimensions(40, 30, 0.5, 10, 10)).toEqual({ width: 20, height: 15 })
      expect(getScaledDimensions(10, 10, 0.5, 100, 100)).toEqual({ width: 100, height: 100 })
    })
  })

  describe("getScaledDimensionsSnapped", () => {
    it("scales dimensions and snaps to grid", () => {
      // 400 * 0.5 = 200, already on grid
      expect(getScaledDimensionsSnapped(400, 300, 0.5)).toEqual({ width: 200, height: 150 })

      // 73 * 1 = 73, should snap to 70
      expect(getScaledDimensionsSnapped(73, 68, 1)).toEqual({ width: 70, height: 65 })
    })

    it("enforces minimum dimensions", () => {
      expect(getScaledDimensionsSnapped(40, 30, 0.5)).toEqual({ width: 50, height: 50 })
    })
  })

  describe("getUnscaledPosition", () => {
    it("converts scaled coordinates back to original", () => {
      expect(getUnscaledPosition(50, 100, 0.5)).toEqual({ x: 100, y: 200 })
      expect(getUnscaledPosition(25, 50, 0.25)).toEqual({ x: 100, y: 200 })
    })

    it("returns original values for scale factor of 1", () => {
      expect(getUnscaledPosition(100, 200, 1)).toEqual({ x: 100, y: 200 })
    })

    it("returns original values for invalid scale factors", () => {
      expect(getUnscaledPosition(100, 200, 0)).toEqual({ x: 100, y: 200 })
      expect(getUnscaledPosition(100, 200, -0.5)).toEqual({ x: 100, y: 200 })
      expect(getUnscaledPosition(100, 200, 1.5)).toEqual({ x: 100, y: 200 })
    })
  })

  describe("getUnscaledDimensions", () => {
    it("converts scaled dimensions back to original", () => {
      expect(getUnscaledDimensions(200, 150, 0.5)).toEqual({ width: 400, height: 300 })
      expect(getUnscaledDimensions(100, 75, 0.25)).toEqual({ width: 400, height: 300 })
    })

    it("returns original values for scale factor of 1", () => {
      expect(getUnscaledDimensions(400, 300, 1)).toEqual({ width: 400, height: 300 })
    })

    it("returns original values for invalid scale factors", () => {
      expect(getUnscaledDimensions(400, 300, 0)).toEqual({ width: 400, height: 300 })
      expect(getUnscaledDimensions(400, 300, -0.5)).toEqual({ width: 400, height: 300 })
      expect(getUnscaledDimensions(400, 300, 1.5)).toEqual({ width: 400, height: 300 })
    })
  })

  describe("constrainPositionToBounds", () => {
    const containerWidth = 800
    const containerHeight = 600

    it("does not modify positions within bounds", () => {
      expect(constrainPositionToBounds(100, 100, 200, 150, containerWidth, containerHeight, false))
        .toEqual({ x: 100, y: 100 })
    })

    it("constrains positions to minimum (0, 0)", () => {
      expect(constrainPositionToBounds(-50, -30, 200, 150, containerWidth, containerHeight, false))
        .toEqual({ x: 0, y: 0 })
    })

    it("constrains positions to stay within container", () => {
      // Component would extend beyond right edge
      expect(constrainPositionToBounds(700, 100, 200, 150, containerWidth, containerHeight, false))
        .toEqual({ x: 600, y: 100 }) // 800 - 200 = 600

      // Component would extend beyond bottom edge
      expect(constrainPositionToBounds(100, 500, 200, 150, containerWidth, containerHeight, false))
        .toEqual({ x: 100, y: 450 }) // 600 - 150 = 450
    })

    it("accounts for inspector panel width", () => {
      // Without inspector: max x = 800 - 200 = 600
      expect(constrainPositionToBounds(700, 100, 200, 150, containerWidth, containerHeight, false))
        .toEqual({ x: 600, y: 100 })

      // With inspector: max x = 800 - 200 - 72 = 528
      expect(constrainPositionToBounds(700, 100, 200, 150, containerWidth, containerHeight, true))
        .toEqual({ x: containerWidth - 200 - kInspectorPanelWidth, y: 100 })
    })
  })

  describe("constrainDimensionsToBounds", () => {
    const containerWidth = 800
    const containerHeight = 600

    it("does not modify dimensions within bounds", () => {
      expect(constrainDimensionsToBounds(100, 100, 300, 200, containerWidth, containerHeight, false))
        .toEqual({ width: 300, height: 200 })
    })

    it("constrains dimensions to container", () => {
      // Width would exceed container
      expect(constrainDimensionsToBounds(100, 100, 900, 200, containerWidth, containerHeight, false))
        .toEqual({ width: 700, height: 200 }) // 800 - 100 = 700

      // Height would exceed container
      expect(constrainDimensionsToBounds(100, 100, 300, 700, containerWidth, containerHeight, false))
        .toEqual({ width: 300, height: 500 }) // 600 - 100 = 500
    })

    it("enforces minimum dimensions", () => {
      expect(constrainDimensionsToBounds(750, 550, 200, 200, containerWidth, containerHeight, false))
        .toEqual({ width: 50, height: 50 })
    })

    it("accepts custom minimum dimensions", () => {
      expect(constrainDimensionsToBounds(750, 550, 200, 200, containerWidth, containerHeight, false, 30, 30))
        .toEqual({ width: 50, height: 50 }) // Clamped to max available, not min

      // When min is larger than available space, use min
      expect(constrainDimensionsToBounds(790, 590, 200, 200, containerWidth, containerHeight, false, 100, 100))
        .toEqual({ width: 100, height: 100 })
    })

    it("accounts for inspector panel width", () => {
      // Without inspector: max width = 800 - 100 = 700
      expect(constrainDimensionsToBounds(100, 100, 900, 200, containerWidth, containerHeight, false))
        .toEqual({ width: 700, height: 200 })

      // With inspector: max width = 800 - 100 - 72 = 628
      expect(constrainDimensionsToBounds(100, 100, 900, 200, containerWidth, containerHeight, true))
        .toEqual({ width: containerWidth - 100 - kInspectorPanelWidth, height: 200 })
    })
  })

  describe("round-trip conversions", () => {
    it("getScaledPosition and getUnscaledPosition are inverses", () => {
      const original = { x: 100, y: 200 }
      const scaleFactor = 0.5

      const scaled = getScaledPosition(original.x, original.y, scaleFactor)
      const restored = getUnscaledPosition(scaled.x, scaled.y, scaleFactor)

      expect(restored).toEqual(original)
    })

    it("getScaledDimensions and getUnscaledDimensions are inverses", () => {
      const original = { width: 400, height: 300 }
      const scaleFactor = 0.5

      const scaled = getScaledDimensions(original.width, original.height, scaleFactor, 0, 0)
      const restored = getUnscaledDimensions(scaled.width, scaled.height, scaleFactor)

      expect(restored).toEqual(original)
    })
  })
})
