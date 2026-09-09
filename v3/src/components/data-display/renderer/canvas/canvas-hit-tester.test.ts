import { CanvasHitTester } from "./canvas-hit-tester"
import { PointShape, PointShapes } from "../../../../utilities/point-shape-utils"
import { IPointState, IPointStyle } from "../point-renderer-types"

describe("CanvasHitTester", () => {
  const defaultStyle: IPointStyle = {
    radius: 10,
    fill: "#ff0000",
    stroke: "#000000",
    strokeWidth: 1
  }

  const createPointState = (
    id: string,
    x: number,
    y: number,
    overrides?: Partial<IPointState>
  ): IPointState => ({
    id,
    caseID: `case-${id}`,
    plotNum: 0,
    datasetID: "dataset1",
    x,
    y,
    scale: 1,
    style: defaultStyle,
    isRaised: false,
    isVisible: true,
    ...overrides
  })

  const circleAnchor = { x: 0.5, y: 0.5 }
  const barAnchor = { x: 0, y: 1 }


  describe("point shapes", () => {
    const shapedPoint = (shape: PointShape, x: number, y: number) =>
      createPointState("p1", x, y, { style: { ...defaultStyle, shape } })

    it("responds to a click on a star's tip, which lies outside the point radius", () => {
      // The tip reaches 1.42r, so a radius-sized hit area would leave the drawn ink dead.
      const hitTester = new CanvasHitTester()
      hitTester.updateFromPoints([shapedPoint("star", 100, 100)], "points", circleAnchor)

      expect(hitTester.hitTest(100, 100 - 13)).toBe("p1")
    })

    it("responds to a click on a triangle's apex", () => {
      /*
       * The triangle is centered on its centroid, so the apex is further from the point than half
       * the shape's width. Filing it in the grid by half its width put the apex in a cell the
       * point was not listed under, and the click found nothing at all.
       */
      const hitTester = new CanvasHitTester()
      hitTester.updateFromPoints([shapedPoint("triangle", 100, 100)], "points", circleAnchor)

      expect(hitTester.hitTest(100, 100 - 14)).toBe("p1")
    })

    it("ignores a click in the gap between a star's arms", () => {
      const hitTester = new CanvasHitTester()
      hitTester.updateFromPoints([shapedPoint("star", 100, 100)], "points", circleAnchor)

      // 13px out along an inner vertex, where the outline reaches under 7
      const rad = -54 * Math.PI / 180
      expect(hitTester.hitTest(100 + Math.cos(rad) * 13, 100 + Math.sin(rad) * 13)).toBeUndefined()
    })

    it("keeps every shape at least as easy to hit as a circle", () => {
      PointShapes.forEach(shape => {
        const hitTester = new CanvasHitTester()
        hitTester.updateFromPoints([shapedPoint(shape, 100, 100)], "points", circleAnchor)

        for (let deg = 0; deg < 360; deg += 15) {
          const rad = deg * Math.PI / 180
          const x = 100 + Math.cos(rad) * 9.9
          const y = 100 + Math.sin(rad) * 9.9
          expect(hitTester.hitTest(x, y)).toBe("p1")
        }
      })
    })

    it("files a shape in the grid by its reach, not by the point radius", () => {
      /*
       * At the default cell size the +/-1 cell margin hitTest already searches is far wider than
       * any shape's overhang, so mis-filing a star is invisible. That is a property of the current
       * tuning rather than of the code: the cell size is a constructor argument, and points scale
       * with the size slider. Tuned here so the grid, not the margin, decides.
       */
      const hitTester = new CanvasHitTester(8)
      const big = createPointState("p1", 200, 200, { style: { ...defaultStyle, radius: 40, shape: "star" } })
      hitTester.updateFromPoints([big], "points", circleAnchor)

      // the tip reaches 56.8; a grid filed by the radius alone stops at 40 and never offers it
      expect(hitTester.hitTest(200, 200 - 54)).toBe("p1")
    })

    it("treats a point with no shape as a circle", () => {
      // every style that predates shapes omits it, and those points must hit exactly as before
      const hitTester = new CanvasHitTester()
      hitTester.updateFromPoints([createPointState("p1", 100, 100)], "points", circleAnchor)

      expect(hitTester.hitTest(100, 95)).toBe("p1")
      expect(hitTester.hitTest(100, 100 - 13)).toBeUndefined()
    })

    it("hits the shape actually drawn rather than the one beside it", () => {
      // a star's tip overlaps the cell of its neighbor, so the grid alone cannot decide
      const hitTester = new CanvasHitTester()
      hitTester.updateFromPoints([
        shapedPoint("star", 100, 100),
        createPointState("p2", 130, 100, { style: { ...defaultStyle, shape: "circle" } })
      ], "points", circleAnchor)

      expect(hitTester.hitTest(100, 100 - 13)).toBe("p1")
      expect(hitTester.hitTest(130, 100)).toBe("p2")
      expect(hitTester.hitTest(115, 100)).toBeUndefined()
    })
  })

  describe("construction", () => {
    it("creates hit tester with default cell size", () => {
      const hitTester = new CanvasHitTester()
      expect(hitTester.size).toBe(0)
    })

    it("creates hit tester with custom cell size", () => {
      const hitTester = new CanvasHitTester(100)
      expect(hitTester.size).toBe(0)
    })
  })

  describe("updateFromPoints", () => {
    it("populates grid from points", () => {
      const hitTester = new CanvasHitTester()
      const points = [
        createPointState("p1", 100, 100),
        createPointState("p2", 200, 200),
        createPointState("p3", 300, 300)
      ]

      hitTester.updateFromPoints(points, "points", circleAnchor)

      expect(hitTester.size).toBe(3)
    })

    it("excludes invisible points", () => {
      const hitTester = new CanvasHitTester()
      const points = [
        createPointState("p1", 100, 100),
        createPointState("p2", 200, 200, { isVisible: false }),
        createPointState("p3", 300, 300)
      ]

      hitTester.updateFromPoints(points, "points", circleAnchor)

      expect(hitTester.size).toBe(2)
    })

    it("clears previous entries on update", () => {
      const hitTester = new CanvasHitTester()

      hitTester.updateFromPoints([createPointState("p1", 100, 100)], "points", circleAnchor)
      expect(hitTester.size).toBe(1)

      hitTester.updateFromPoints([
        createPointState("p2", 200, 200),
        createPointState("p3", 300, 300)
      ], "points", circleAnchor)
      expect(hitTester.size).toBe(2)
    })
  })

  describe("hitTest - circles", () => {
    it("returns point ID when hitting circle center", () => {
      const hitTester = new CanvasHitTester()
      const points = [createPointState("p1", 100, 100)]
      hitTester.updateFromPoints(points, "points", circleAnchor)

      const result = hitTester.hitTest(100, 100)
      expect(result).toBe("p1")
    })

    it("returns point ID when hitting within circle radius", () => {
      const hitTester = new CanvasHitTester()
      const points = [createPointState("p1", 100, 100)] // radius 10
      hitTester.updateFromPoints(points, "points", circleAnchor)

      // Hit near edge (within radius)
      const result = hitTester.hitTest(105, 105)
      expect(result).toBe("p1")
    })

    it("returns undefined when missing circle", () => {
      const hitTester = new CanvasHitTester()
      const points = [createPointState("p1", 100, 100)] // radius 10
      hitTester.updateFromPoints(points, "points", circleAnchor)

      // Hit outside radius
      const result = hitTester.hitTest(120, 120)
      expect(result).toBeUndefined()
    })

    it("returns undefined when no points", () => {
      const hitTester = new CanvasHitTester()
      hitTester.updateFromPoints([], "points", circleAnchor)

      const result = hitTester.hitTest(100, 100)
      expect(result).toBeUndefined()
    })

    it("uses precise circle hit testing (not bounding box)", () => {
      const hitTester = new CanvasHitTester()
      const points = [createPointState("p1", 100, 100)] // radius 10
      hitTester.updateFromPoints(points, "points", circleAnchor)

      // This point is inside the bounding box (90-110 x 90-110)
      // but outside the circle (distance from center > radius)
      // Point (109, 109): distance = sqrt(81+81) = ~12.7 > 10
      const result = hitTester.hitTest(109, 109)
      expect(result).toBeUndefined()
    })
  })

  describe("hitTest - bars", () => {
    const barStyle: IPointStyle = {
      ...defaultStyle,
      width: 20,
      height: 50
    }

    it("returns point ID when hitting bar", () => {
      const hitTester = new CanvasHitTester()
      const points = [createPointState("p1", 100, 100, { style: barStyle })]
      hitTester.updateFromPoints(points, "bars", barAnchor)

      // Bar with anchor (0, 1) at (100, 100) extends from:
      // x: 100 to 120, y: 50 to 100
      const result = hitTester.hitTest(110, 75)
      expect(result).toBe("p1")
    })

    it("returns undefined when missing bar", () => {
      const hitTester = new CanvasHitTester()
      const points = [createPointState("p1", 100, 100, { style: barStyle })]
      hitTester.updateFromPoints(points, "bars", barAnchor)

      // Outside the bar bounds
      const result = hitTester.hitTest(130, 75)
      expect(result).toBeUndefined()
    })
  })

  describe("hitTest - z-ordering", () => {
    it("returns raised point over non-raised point", () => {
      const hitTester = new CanvasHitTester()
      const points = [
        createPointState("p1", 100, 100, { isRaised: false }),
        createPointState("p2", 105, 105, { isRaised: true }) // overlapping
      ]
      hitTester.updateFromPoints(points, "points", circleAnchor)

      // Hit the overlap area
      const result = hitTester.hitTest(102, 102)
      expect(result).toBe("p2") // raised point wins
    })

    it("returns later rendered point among same-raised-state points", () => {
      const hitTester = new CanvasHitTester()
      const points = [
        createPointState("p1", 100, 100),
        createPointState("p2", 105, 105), // overlapping, rendered later
        createPointState("p3", 102, 102)  // also overlapping, rendered last
      ]
      hitTester.updateFromPoints(points, "points", circleAnchor)

      // Hit the overlap area
      const result = hitTester.hitTest(103, 103)
      expect(result).toBe("p3") // last rendered wins
    })

    it("raised point always beats later-rendered non-raised point", () => {
      const hitTester = new CanvasHitTester()
      const points = [
        createPointState("p1", 100, 100, { isRaised: true }),
        createPointState("p2", 105, 105, { isRaised: false }) // rendered later but not raised
      ]
      hitTester.updateFromPoints(points, "points", circleAnchor)

      // Hit the overlap area
      const result = hitTester.hitTest(102, 102)
      expect(result).toBe("p1") // raised wins over render order
    })
  })

  describe("hitTest - scale", () => {
    it("accounts for point scale when hit testing circles", () => {
      const hitTester = new CanvasHitTester()
      const points = [createPointState("p1", 100, 100, { scale: 2 })] // radius 10 * scale 2 = 20
      hitTester.updateFromPoints(points, "points", circleAnchor)

      // Should hit at distance 15 (within scaled radius of 20)
      const result = hitTester.hitTest(115, 100)
      expect(result).toBe("p1")
    })

    it("accounts for point scale when hit testing bars", () => {
      const hitTester = new CanvasHitTester()
      const barStyle: IPointStyle = { ...defaultStyle, width: 20, height: 50 }
      const points = [createPointState("p1", 100, 100, { style: barStyle, scale: 2 })]
      hitTester.updateFromPoints(points, "bars", barAnchor)

      // Scaled bar: width 40, height 100
      // With anchor (0, 1) at (100, 100): x: 100-140, y: 0-100
      const result = hitTester.hitTest(130, 50)
      expect(result).toBe("p1")
    })
  })

  describe("hitTestAll", () => {
    it("returns all overlapping points", () => {
      const hitTester = new CanvasHitTester()
      const points = [
        createPointState("p1", 100, 100),
        createPointState("p2", 105, 105),
        createPointState("p3", 200, 200) // not overlapping
      ]
      hitTester.updateFromPoints(points, "points", circleAnchor)

      // Hit the overlap area of p1 and p2
      const results = hitTester.hitTestAll(102, 102)
      expect(results).toHaveLength(2)
      expect(results).toContain("p1")
      expect(results).toContain("p2")
    })

    it("returns empty array when no hits", () => {
      const hitTester = new CanvasHitTester()
      const points = [createPointState("p1", 100, 100)]
      hitTester.updateFromPoints(points, "points", circleAnchor)

      const results = hitTester.hitTestAll(200, 200)
      expect(results).toHaveLength(0)
    })
  })

  describe("grid cell boundary handling", () => {
    it("handles points near cell boundaries", () => {
      // Use small cell size to test boundary conditions
      // Points are far enough apart (50 units) to not overlap with radius 10
      const hitTester = new CanvasHitTester(20)
      const points = [
        createPointState("p1", 10, 10),  // in cell (0,0)
        createPointState("p2", 60, 60)   // in cell (3,3), well separated
      ]
      hitTester.updateFromPoints(points, "points", circleAnchor)

      // Both points should be hittable in their respective locations
      expect(hitTester.hitTest(10, 10)).toBe("p1")
      expect(hitTester.hitTest(60, 60)).toBe("p2")
    })

    it("handles points spanning multiple cells", () => {
      // Large radius point should span multiple cells
      const hitTester = new CanvasHitTester(20)
      const largeStyle: IPointStyle = { ...defaultStyle, radius: 30 }
      const points = [createPointState("p1", 50, 50, { style: largeStyle })]
      hitTester.updateFromPoints(points, "points", circleAnchor)

      // Should be hittable from multiple directions
      expect(hitTester.hitTest(50, 50)).toBe("p1")
      expect(hitTester.hitTest(30, 50)).toBe("p1")
      expect(hitTester.hitTest(70, 50)).toBe("p1")
      expect(hitTester.hitTest(50, 30)).toBe("p1")
      expect(hitTester.hitTest(50, 70)).toBe("p1")
    })
  })
})
