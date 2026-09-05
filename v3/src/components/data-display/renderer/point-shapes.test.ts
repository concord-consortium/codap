import { PointShapes } from "../../../utilities/point-shape-utils"
import {
  IShapePoint, pointShapeArea, pointShapeBoundingRadius, pointShapeExtent, pointShapeGeometry
} from "./point-shapes"

/*
 * The reference table from the design prototype's ASSET-SPEC.md, evaluated at r = 8. These are the
 * numbers the tuned constants are supposed to produce; if a constant is edited, one of these fails.
 */
const kReferenceAtR8 = {
  circle: { area: 201.1, pctOfCircle: 100.0, w: 16.00, h: 16.00 },
  square: { area: 185.0, pctOfCircle: 92.0, w: 13.60, h: 13.60 },
  triangle: { area: 180.2, pctOfCircle: 89.6, w: 20.40, h: 17.67 },
  diamond: { area: 184.3, pctOfCircle: 91.7, w: 19.20, h: 19.20 },
  star: { area: 182.0, pctOfCircle: 90.5, w: 21.61, h: 20.55 },
  plus: { area: 183.7, pctOfCircle: 91.4, w: 17.28, h: 17.28 },
  x: { area: 183.7, pctOfCircle: 91.4, w: 16.86, h: 16.86 }
} as const

// Area of a closed polygon by the shoelace formula, so the declared area is checked against the
// vertices actually drawn rather than against itself.
function polygonArea(points: IShapePoint[]) {
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    sum += a.x * b.y - b.x * a.y
  }
  return Math.abs(sum) / 2
}

function polygonExtent(points: IShapePoint[]) {
  const xs = points.map(p => p.x)
  const ys = points.map(p => p.y)
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
}

describe("point shape geometry", () => {
  it("covers every shape", () => {
    PointShapes.forEach(shape => {
      expect(pointShapeGeometry(shape, 8)).toBeDefined()
    })
  })

  it("draws the circle as an arc of exactly r, unchanged from what CODAP already ships", () => {
    const geometry = pointShapeGeometry("circle", 8)
    expect(geometry).toEqual({ kind: "circle", radius: 8 })
    // no polygonal approximation: that would change how the existing shape rasterizes
    expect(geometry.kind).not.toBe("polygon")
  })

  it("draws every other shape as a polygon", () => {
    PointShapes.filter(s => s !== "circle").forEach(shape => {
      const geometry = pointShapeGeometry(shape, 8)
      if (geometry.kind !== "polygon") throw new Error(`${shape} should be a polygon`)
      expect(geometry.points.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe("matches the reference metrics at r = 8", () => {
    PointShapes.forEach(shape => {
      const expected = kReferenceAtR8[shape]

      it(`${shape}`, () => {
        expect(pointShapeArea(shape, 8)).toBeCloseTo(expected.area, 1)
        const extent = pointShapeExtent(shape, 8)
        expect(extent.w).toBeCloseTo(expected.w, 2)
        expect(extent.h).toBeCloseTo(expected.h, 2)
      })
    })
  })

  it("normalizes every non-circular shape to about 90% of the circle's area", () => {
    // Equal area is deliberately not the target: straight edges and points read heavier than a
    // circle of identical ink.
    const circleArea = pointShapeArea("circle", 8)
    PointShapes.filter(s => s !== "circle").forEach(shape => {
      const pct = 100 * pointShapeArea(shape, 8) / circleArea
      expect(pct).toBeGreaterThanOrEqual(89)
      expect(pct).toBeLessThanOrEqual(93)
    })
  })

  it("declares an area that matches the vertices it actually draws", () => {
    // Guards the two from drifting apart: the declared area is a closed form, the drawn area comes
    // from the vertex list.
    PointShapes.filter(s => s !== "circle").forEach(shape => {
      const geometry = pointShapeGeometry(shape, 8)
      if (geometry.kind !== "polygon") throw new Error(`${shape} should be a polygon`)
      expect(polygonArea(geometry.points)).toBeCloseTo(pointShapeArea(shape, 8), 1)
    })
  })

  it("declares an extent that matches the vertices it actually draws", () => {
    PointShapes.filter(s => s !== "circle").forEach(shape => {
      const geometry = pointShapeGeometry(shape, 8)
      if (geometry.kind !== "polygon") throw new Error(`${shape} should be a polygon`)
      const drawn = polygonExtent(geometry.points)
      const declared = pointShapeExtent(shape, 8)
      expect(drawn.w).toBeCloseTo(declared.w, 2)
      expect(drawn.h).toBeCloseTo(declared.h, 2)
    })
  })

  it("centers every shape horizontally on the origin", () => {
    PointShapes.filter(s => s !== "circle").forEach(shape => {
      const geometry = pointShapeGeometry(shape, 8)
      if (geometry.kind !== "polygon") throw new Error(`${shape} should be a polygon`)
      const xs = geometry.points.map(p => p.x)
      expect((Math.max(...xs) + Math.min(...xs)) / 2).toBeCloseTo(0, 6)
    })
  })

  it("centers every shape but the star vertically too", () => {
    /*
     * The star is centered on its circumcircle rather than its bounding box: with a vertex at the
     * top it reaches -R upward but only R*cos(36) down, so its box sits slightly low. That is how
     * a star is conventionally drawn, and it is what the prototype does. The triangle, by contrast,
     * is deliberately box-centered so it shares a visual baseline with the square.
     */
    PointShapes.filter(s => s !== "circle" && s !== "star").forEach(shape => {
      const geometry = pointShapeGeometry(shape, 8)
      if (geometry.kind !== "polygon") throw new Error(`${shape} should be a polygon`)
      const ys = geometry.points.map(p => p.y)
      expect((Math.max(...ys) + Math.min(...ys)) / 2).toBeCloseTo(0, 6)
    })

    const star = pointShapeGeometry("star", 8)
    if (star.kind !== "polygon") throw new Error("star should be a polygon")
    const starYs = star.points.map(p => p.y)
    // the top vertex sits on the circumcircle, so the outline reaches exactly -R
    expect(Math.min(...starYs)).toBeCloseTo(-1.420 * 8, 6)
  })

  it("scales linearly with the radius", () => {
    // Point size is a continuous multiplier, so the shapes have to hold their proportions across
    // the whole range rather than only at the reference radius.
    PointShapes.forEach(shape => {
      const smallExtent = pointShapeExtent(shape, 3)
      const largeExtent = pointShapeExtent(shape, 12)
      expect(largeExtent.w / smallExtent.w).toBeCloseTo(4, 6)
      expect(largeExtent.h / smallExtent.h).toBeCloseTo(4, 6)
      // area goes with the square of the radius
      expect(pointShapeArea(shape, 12) / pointShapeArea(shape, 3)).toBeCloseTo(16, 6)
    })
  })

  it("gives X the same ink as Plus, being the same outline rotated", () => {
    expect(pointShapeArea("x", 8)).toBeCloseTo(pointShapeArea("plus", 8), 6)
  })

  describe("bounding radius", () => {
    it("reaches the furthest drawn point, which is not r for anything but the circle", () => {
      expect(pointShapeBoundingRadius("circle", 8)).toBeCloseTo(8, 6)
      // a star is drawn well outside a radius-8 circle, which is why hit testing cannot use r
      expect(pointShapeBoundingRadius("star", 8)).toBeGreaterThan(10)
    })

    it("covers the drawn extent of every shape", () => {
      PointShapes.forEach(shape => {
        const { w, h } = pointShapeExtent(shape, 8)
        const radius = pointShapeBoundingRadius(shape, 8)
        expect(radius).toBeGreaterThanOrEqual(w / 2 - 1e-9)
        expect(radius).toBeGreaterThanOrEqual(h / 2 - 1e-9)
      })
    })
  })
})
