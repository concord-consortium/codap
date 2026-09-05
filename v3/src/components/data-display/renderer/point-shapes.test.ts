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

// Area-weighted centroid, also by the shoelace formula.
function polygonCentroid(points: IShapePoint[]) {
  let a = 0, cx = 0, cy = 0
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const q = points[(i + 1) % points.length]
    const cross = p.x * q.y - q.x * p.y
    a += cross
    cx += (p.x + q.x) * cross
    cy += (p.y + q.y) * cross
  }
  a /= 2
  return { x: cx / (6 * a), y: cy / (6 * a) }
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

  it("centres every shape on its centre of area", () => {
    /*
     * The invariant that matters: a point drawn at a position must not read as sitting off it. An
     * equilateral triangle centred on its bounding box instead sits h/6 low, which is visible as a
     * downward jump when a category is switched to it.
     */
    PointShapes.filter(s => s !== "circle").forEach(shape => {
      const geometry = pointShapeGeometry(shape, 8)
      if (geometry.kind !== "polygon") throw new Error(`${shape} should be a polygon`)
      const centroid = polygonCentroid(geometry.points)
      expect(centroid.x).toBeCloseTo(0, 6)
      expect(centroid.y).toBeCloseTo(0, 6)
    })
  })

  it("leaves the bounding box off centre where centring the ink requires it", () => {
    // A consequence of the above, not a defect: for the triangle and the star the box centre is
    // not the centroid. Anything deriving a hit area must use the drawn box rather than assume
    // the shape is symmetric about its position.
    const offCentre = ["triangle", "star"] as const
    offCentre.forEach(shape => {
      const geometry = pointShapeGeometry(shape, 8)
      if (geometry.kind !== "polygon") throw new Error(`${shape} should be a polygon`)
      const ys = geometry.points.map(p => p.y)
      expect((Math.max(...ys) + Math.min(...ys)) / 2).not.toBeCloseTo(0, 2)
    })

    // and every other shape is symmetric, so its box centre and centroid agree
    PointShapes.filter(s => s !== "circle" && !offCentre.includes(s as any)).forEach(shape => {
      const geometry = pointShapeGeometry(shape, 8)
      if (geometry.kind !== "polygon") throw new Error(`${shape} should be a polygon`)
      const ys = geometry.points.map(p => p.y)
      expect((Math.max(...ys) + Math.min(...ys)) / 2).toBeCloseTo(0, 6)
    })
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
