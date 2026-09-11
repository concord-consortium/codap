import { PointShapes } from "../../../utilities/point-shape-utils"
import {
  isPointInShape, pointShapeArea, pointShapeBoundingRadius, pointShapeExtent,
  pointShapeGeometry
} from "./point-shapes"
import { Point } from "../data-display-types"

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
function polygonArea(points: Point[]) {
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    sum += a.x * b.y - b.x * a.y
  }
  return Math.abs(sum) / 2
}

// Area-weighted centroid, also by the shoelace formula.
function polygonCentroid(points: Point[]) {
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

function polygonExtent(points: Point[]) {
  const xs = points.map(p => p.x)
  const ys = points.map(p => p.y)
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
}

// the reference radius the assertions are written against
const kR = 8
const kSmallR = 3
const kLargeR = 12

describe("point shape geometry", () => {
  it("covers every shape", () => {
    PointShapes.forEach(shape => {
      expect(pointShapeGeometry(shape, kR)).toBeDefined()
    })
  })

  it("draws the circle as an arc of exactly kR, unchanged from what CODAP already ships", () => {
    const geometry = pointShapeGeometry("circle", kR)
    expect(geometry).toEqual({ kind: "circle", radius: 8 })
    // no polygonal approximation: that would change how the existing shape rasterizes
    expect(geometry.kind).not.toBe("polygon")
  })

  it("draws every other shape as a polygon", () => {
    PointShapes.filter(s => s !== "circle").forEach(shape => {
      const geometry = pointShapeGeometry(shape, kR)
      if (geometry.kind !== "polygon") throw new Error(`${shape} should be a polygon`)
      expect(geometry.points.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe("matches the reference metrics at r = 8", () => {
    PointShapes.forEach(shape => {
      const expected = kReferenceAtR8[shape]

      it(`${shape}`, () => {
        expect(pointShapeArea(shape, kR)).toBeCloseTo(expected.area, 1)
        const extent = pointShapeExtent(shape, kR)
        expect(extent.w).toBeCloseTo(expected.w, 2)
        expect(extent.h).toBeCloseTo(expected.h, 2)
      })
    })
  })

  it("normalizes every non-circular shape to about 90% of the circle's area", () => {
    // Equal area is deliberately not the target: straight edges and points read heavier than a
    // circle of identical ink.
    const circleArea = pointShapeArea("circle", kR)
    PointShapes.filter(s => s !== "circle").forEach(shape => {
      const pct = 100 * pointShapeArea(shape, kR) / circleArea
      expect(pct).toBeGreaterThanOrEqual(89)
      expect(pct).toBeLessThanOrEqual(93)
    })
  })

  it("declares an area that matches the vertices it actually draws", () => {
    // Guards the two from drifting apart: the declared area is a closed form, the drawn area comes
    // from the vertex list.
    PointShapes.filter(s => s !== "circle").forEach(shape => {
      const geometry = pointShapeGeometry(shape, kR)
      if (geometry.kind !== "polygon") throw new Error(`${shape} should be a polygon`)
      expect(polygonArea(geometry.points)).toBeCloseTo(pointShapeArea(shape, kR), 1)
    })
  })

  it("declares an extent that matches the vertices it actually draws", () => {
    PointShapes.filter(s => s !== "circle").forEach(shape => {
      const geometry = pointShapeGeometry(shape, kR)
      if (geometry.kind !== "polygon") throw new Error(`${shape} should be a polygon`)
      const drawn = polygonExtent(geometry.points)
      const declared = pointShapeExtent(shape, kR)
      expect(drawn.w).toBeCloseTo(declared.w, 2)
      expect(drawn.h).toBeCloseTo(declared.h, 2)
    })
  })

  it("centers every shape on its center of area", () => {
    /*
     * The invariant that matters: a point drawn at a position must not read as sitting off it. An
     * equilateral triangle centered on its bounding box instead sits h/6 low, which is visible as a
     * downward jump when a category is switched to it.
     */
    PointShapes.filter(s => s !== "circle").forEach(shape => {
      const geometry = pointShapeGeometry(shape, kR)
      if (geometry.kind !== "polygon") throw new Error(`${shape} should be a polygon`)
      const centroid = polygonCentroid(geometry.points)
      expect(centroid.x).toBeCloseTo(0, 6)
      expect(centroid.y).toBeCloseTo(0, 6)
    })
  })

  it("leaves the bounding box off center where centering the ink requires it", () => {
    // A consequence of the above, not a defect: for the triangle and the star the box center is
    // not the centroid. Anything deriving a hit area must use the drawn box rather than assume
    // the shape is symmetric about its position.
    const offCenter = ["triangle", "star"] as const
    offCenter.forEach(shape => {
      const geometry = pointShapeGeometry(shape, kR)
      if (geometry.kind !== "polygon") throw new Error(`${shape} should be a polygon`)
      const ys = geometry.points.map(p => p.y)
      expect((Math.max(...ys) + Math.min(...ys)) / 2).not.toBeCloseTo(0, 2)
    })

    // and every other shape is symmetric, so its box center and centroid agree
    PointShapes.filter(s => s !== "circle" && !offCenter.includes(s as any)).forEach(shape => {
      const geometry = pointShapeGeometry(shape, kR)
      if (geometry.kind !== "polygon") throw new Error(`${shape} should be a polygon`)
      const ys = geometry.points.map(p => p.y)
      expect((Math.max(...ys) + Math.min(...ys)) / 2).toBeCloseTo(0, 6)
    })
  })

  it("scales linearly with the radius", () => {
    // Point size is a continuous multiplier, so the shapes have to hold their proportions across
    // the whole range rather than only at the reference radius.
    PointShapes.forEach(shape => {
      const smallExtent = pointShapeExtent(shape, kSmallR)
      const largeExtent = pointShapeExtent(shape, kLargeR)
      expect(largeExtent.w / smallExtent.w).toBeCloseTo(4, 6)
      expect(largeExtent.h / smallExtent.h).toBeCloseTo(4, 6)
      // area goes with the square of the radius
      expect(pointShapeArea(shape, kLargeR) / pointShapeArea(shape, kSmallR)).toBeCloseTo(16, 6)
    })
  })

  it("gives X the same ink as Plus, being the same outline rotated", () => {
    expect(pointShapeArea("x", kR)).toBeCloseTo(pointShapeArea("plus", kR), 6)
  })

  describe("bounding radius", () => {
    it("reaches the furthest drawn point of every shape", () => {
      expect(pointShapeBoundingRadius("circle", kR)).toBeCloseTo(kR, 6)

      PointShapes.filter(sh => sh !== "circle").forEach(shape => {
        const geometry = pointShapeGeometry(shape, kR)
        if (geometry.kind !== "polygon") throw new Error(`${shape} should be a polygon`)
        const furthest = Math.max(...geometry.points.map(pt => Math.hypot(pt.x, pt.y)))
        expect(pointShapeBoundingRadius(shape, kR)).toBeGreaterThanOrEqual(furthest - 1e-9)
      })
    })

    it("reaches past half the drawn box, where the box is off center", () => {
      // why this is measured from the vertices rather than the extent: a triangle's box hangs low,
      // so half its width stops short of the apex and a hit area sized that way misses it
      const geometry = pointShapeGeometry("triangle", kR)
      if (geometry.kind !== "polygon") throw new Error("triangle should be a polygon")
      const apex = geometry.points.reduce((a, pt) => (pt.y < a.y ? pt : a))

      expect(Math.hypot(apex.x, apex.y)).toBeGreaterThan(pointShapeExtent("triangle", kR).w / 2)
    })
  })

  describe("containment", () => {
    it("puts the center of every shape inside it", () => {
      PointShapes.forEach(shape => expect(isPointInShape(shape, kR, 0, 0)).toBe(true))
    })

    it("never makes a shape harder to hit than the circle it replaced", () => {
      /*
       * The guarantee that lets shape be a free choice: a plus is narrower than a circle across its
       * notches and a star is narrower between its arms, so testing the ink alone would shrink the
       * target for anyone who picked one.
       */
      PointShapes.forEach(shape => {
        for (let deg = 0; deg < 360; deg += 15) {
          const rad = deg * Math.PI / 180
          const d = kR * 0.99
          expect(isPointInShape(shape, kR, Math.cos(rad) * d, Math.sin(rad) * d)).toBe(true)
        }
      })
    })

    it("includes the ink that reaches past the circle", () => {
      // each of these is beyond kR, so it is the outline rather than the circle answering
      // a star's tip points straight up
      expect(isPointInShape("star", kR, 0, -1.3 * kR)).toBe(true)
      // a square's corner
      expect(isPointInShape("square", kR, 0.8 * kR, 0.8 * kR)).toBe(true)
      // a triangle's apex
      expect(isPointInShape("triangle", kR, 0, -1.4 * kR)).toBe(true)
    })

    it("excludes the gaps between a star's arms", () => {
      // 1.3r along the direction of an inner vertex, which the outline reaches only to 0.68r
      const rad = -54 * Math.PI / 180
      expect(isPointInShape("star", kR, Math.cos(rad) * 1.3 * kR, Math.sin(rad) * 1.3 * kR)).toBe(false)
    })

    it("excludes everything beyond the shape", () => {
      PointShapes.forEach(shape => {
        const beyond = pointShapeBoundingRadius(shape, kR) + 0.01
        for (let deg = 0; deg < 360; deg += 15) {
          const rad = deg * Math.PI / 180
          expect(isPointInShape(shape, kR, Math.cos(rad) * beyond, Math.sin(rad) * beyond)).toBe(false)
        }
      })
    })

    it("scales with the radius", () => {
      // a click that lands on a star's tip at r = 16 lands outside it at r = 4
      expect(isPointInShape("star", 16, 0, -1.3 * 16)).toBe(true)
      expect(isPointInShape("star", 4, 0, -1.3 * 16)).toBe(false)
    })
  })
})
