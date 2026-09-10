import { PointShape } from "../../../utilities/point-shape-utils"

/*
 * The geometry of the seven point shapes, as a function of the point radius.
 *
 * One source for every surface that draws a shape. Ported from the design prototype's js/shapes.js,
 * whose constants these are.
 *
 * Circle is the reference, unchanged from what CODAP has always drawn: radius r. Every other shape
 * is normalized to about 90% of the circle's area rather than to equal area, because straight edges
 * and points read heavier than a circle of identical ink. Their bounding boxes therefore differ,
 * which is intentional.
 *
 * Do not re-derive the constants. They are tuned, and the relative weight of the set depends on
 * them.
 */
const K = {
  square: 1.700,    // side
  diamond: 1.200,   // half-diagonal
  triangle: 2.550,  // side of the equilateral triangle
  star: 1.420,      // outer radius
  starInner: 0.48,  // inner/outer ratio - chunkier than the golden 0.382 so points survive at r = 3
  plusArm: 0.410,   // arm half-width
  plusLen: 1.080    // arm half-length
} as const

const kDegToRad = Math.PI / 180

export interface IShapePoint {
  x: number
  y: number
}

export interface IShapeExtent {
  w: number
  h: number
}

/*
 * A circle is an arc rather than a vertex list, so callers switch on `kind` instead of receiving a
 * polygonal approximation. Both renderers can draw an arc directly, and approximating one would
 * change how the shape CODAP already ships is rasterized.
 */
export type PointShapeGeometry =
  | { kind: "circle", radius: number }
  | { kind: "polygon", points: IShapePoint[] }

// Vertices of a plus: an arm half-width `a` and half-length `L`, optionally rotated. X is this
// same outline turned 45 degrees -- same ink, same weight, one set of numbers to maintain.
function crossPoints(a: number, l: number, rotationDeg = 0): IShapePoint[] {
  const pts: IShapePoint[] = [
    { x: -a, y: -l }, { x: a, y: -l }, { x: a, y: -a }, { x: l, y: -a },
    { x: l, y: a }, { x: a, y: a }, { x: a, y: l }, { x: -a, y: l },
    { x: -a, y: a }, { x: -l, y: a }, { x: -l, y: -a }, { x: -a, y: -a }
  ]
  if (!rotationDeg) return pts

  const cos = Math.cos(rotationDeg * kDegToRad)
  const sin = Math.sin(rotationDeg * kDegToRad)
  return pts.map(({ x, y }) => ({ x: x * cos - y * sin, y: x * sin + y * cos }))
}

// Ten alternating vertices, starting at the top and stepping 36 degrees.
function starPoints(outerRadius: number, innerRatio: number): IShapePoint[] {
  const pts: IShapePoint[] = []
  for (let i = 0; i < 10; i++) {
    const angle = (-90 + i * 36) * kDegToRad
    const radius = i % 2 === 0 ? outerRadius : outerRadius * innerRatio
    pts.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius })
  }
  return pts
}

interface IShapeDef {
  geometry: (r: number) => PointShapeGeometry
  area: (r: number) => number
  extent: (r: number) => IShapeExtent
}

const kShapeDefs: Record<PointShape, IShapeDef> = {
  circle: {
    geometry: r => ({ kind: "circle", radius: r }),
    area: r => Math.PI * r * r,
    extent: r => ({ w: 2 * r, h: 2 * r })
  },

  square: {
    geometry: r => {
      const h = K.square * r / 2
      return { kind: "polygon", points: [{ x: -h, y: -h }, { x: h, y: -h }, { x: h, y: h }, { x: -h, y: h }] }
    },
    area: r => (K.square * r) ** 2,
    extent: r => ({ w: K.square * r, h: K.square * r })
  },

  triangle: {
    geometry: r => {
      const s = K.triangle * r
      const h = s * Math.sqrt(3) / 2
      /*
       * Centered on its center of area, not its bounding box: a centroid sits h/6 below the box
       * center, so box-centering makes the triangle read as sitting low, and switching a category
       * to it visibly shifts the points down.
       *
       * The prototype centers on the box, buying a predictable hit area and a shared baseline with
       * the square. On a plot a position is the data, so the bias costs more than the alignment
       * gains.
       */
      return { kind: "polygon", points: [
        { x: 0, y: -2 * h / 3 }, { x: s / 2, y: h / 3 }, { x: -s / 2, y: h / 3 }
      ] }
    },
    area: r => Math.sqrt(3) / 4 * (K.triangle * r) ** 2,
    extent: r => {
      const s = K.triangle * r
      return { w: s, h: s * Math.sqrt(3) / 2 }
    }
  },

  diamond: {
    geometry: r => {
      const d = K.diamond * r
      return { kind: "polygon", points: [{ x: 0, y: -d }, { x: d, y: 0 }, { x: 0, y: d }, { x: -d, y: 0 }] }
    },
    area: r => 2 * (K.diamond * r) ** 2,
    extent: r => {
      const d = K.diamond * r
      return { w: 2 * d, h: 2 * d }
    }
  },

  star: {
    geometry: r => ({ kind: "polygon", points: starPoints(K.star * r, K.starInner) }),
    area: r => {
      const outer = K.star * r
      return 5 * K.starInner * outer * outer * Math.sin(36 * kDegToRad)
    },
    extent: r => {
      const outer = K.star * r
      return { w: 2 * outer * Math.sin(72 * kDegToRad), h: outer * (1 + Math.cos(36 * kDegToRad)) }
    }
  },

  plus: {
    geometry: r => ({ kind: "polygon", points: crossPoints(K.plusArm * r, K.plusLen * r) }),
    area: r => {
      const a = K.plusArm * r
      const l = K.plusLen * r
      return 8 * a * l - 4 * a * a
    },
    extent: r => {
      const l = K.plusLen * r
      return { w: 2 * l, h: 2 * l }
    }
  },

  x: {
    geometry: r => ({ kind: "polygon", points: crossPoints(K.plusArm * r, K.plusLen * r, 45) }),
    area: r => kShapeDefs.plus.area(r),
    extent: r => {
      const a = K.plusArm * r
      const l = K.plusLen * r
      const e = (l + a) * Math.SQRT2 / 2
      return { w: 2 * e, h: 2 * e }
    }
  }
}

/*
 * The outline of `shape` at point radius `r`, centered on the origin, so a point is drawn with a
 * single translate.
 */
export function pointShapeGeometry(shape: PointShape, r: number): PointShapeGeometry {
  return kShapeDefs[shape].geometry(r)
}

// The ink area. Used to verify the normalization holds rather than by the renderers.
export function pointShapeArea(shape: PointShape, r: number): number {
  return kShapeDefs[shape].area(r)
}

/*
 * The drawn bounding box, which is NOT 2r for anything but the circle: a star is about 35% wider
 * than the circle it replaces. Used to size a shape against a box, and to check the normalization.
 */
export function pointShapeExtent(shape: PointShape, r: number): IShapeExtent {
  return kShapeDefs[shape].extent(r)
}

// Rounded, so a path attribute is not pages of floating point noise.
const round = (n: number) => Math.round(n * 1000) / 1000

/*
 * The outline as an SVG path, for the surfaces that draw with SVG rather than into a canvas or a
 * texture. The circle is emitted as a pair of arcs, since one arc cannot close a full circle.
 */
export function pointShapePathData(shape: PointShape, r: number): string {
  const geometry = pointShapeGeometry(shape, r)
  if (geometry.kind === "circle") {
    const d = round(geometry.radius)
    return `M ${-d} 0 A ${d} ${d} 0 1 0 ${d} 0 A ${d} ${d} 0 1 0 ${-d} 0 Z`
  }
  return `${geometry.points.map(({ x, y }, i) =>
    `${i === 0 ? "M" : "L"} ${round(x)} ${round(y)}`).join(" ")} Z`
}

// The radius at which the shape's larger drawn dimension is exactly `extent`.
function radiusFillingExtent(shape: PointShape, extent: number): number {
  const { w, h } = pointShapeExtent(shape, 1)
  return extent / Math.max(w, h)
}

/*
 * The radius to draw a shape at inside a box of `extent`: the one it would be drawn at on a plot,
 * reduced only where that would take it outside the box.
 *
 * Holding the plot radius keeps the relative weights the constants above tune -- a square still
 * reads as lighter than a circle rather than being inflated past it to fill the corners. Only the
 * pointier shapes have to give that up to fit, which leaves them visibly lighter. That is the price
 * of a common footprint, and it is deliberate.
 */
export function pointShapeRadiusWithinExtent(shape: PointShape, extent: number): number {
  // extent / 2 is the radius at which a circle fills the box, which is the shared plot radius
  return Math.min(extent / 2, radiusFillingExtent(shape, extent))
}

/*
 * The center of the drawn box, which is the origin for every shape but the triangle and the star.
 *
 * Taken out of the placement by a caller that wants the ink centered in a box rather than the shape
 * sitting on a position. A legend key wants the former; a plotted point wants the latter, because
 * there its position is the data.
 */
export function pointShapeBoxCenter(shape: PointShape, r: number): IShapePoint {
  const geometry = pointShapeGeometry(shape, r)
  if (geometry.kind === "circle") return { x: 0, y: 0 }

  const xs = geometry.points.map(p => p.x)
  const ys = geometry.points.map(p => p.y)
  return { x: (Math.max(...xs) + Math.min(...xs)) / 2, y: (Math.max(...ys) + Math.min(...ys)) / 2 }
}

/*
 * The smallest box centered on the point that contains the drawn shape, which for a triangle or a
 * star is larger than the box that hugs the ink.
 *
 * What a renderer needs when it positions a shape by the middle of a box -- drawing into a texture
 * and anchoring it at 0.5, 0.5 does exactly that -- since the drawn box is not centered on the
 * point it belongs to.
 */
export function pointShapeSymmetricExtent(shape: PointShape, r: number): IShapeExtent {
  const geometry = pointShapeGeometry(shape, r)
  if (geometry.kind === "circle") return { w: 2 * geometry.radius, h: 2 * geometry.radius }

  let maxAbsX = 0
  let maxAbsY = 0
  geometry.points.forEach(({ x, y }) => {
    maxAbsX = Math.max(maxAbsX, Math.abs(x))
    maxAbsY = Math.max(maxAbsY, Math.abs(y))
  })
  return { w: 2 * maxAbsX, h: 2 * maxAbsY }
}

/*
 * The distance from the center to the furthest vertex, which is what hit testing needs.
 *
 * Measured from the vertices rather than from the extent: a triangle's box is not centered on the
 * point, so half its larger side stops short of the ink -- the apex sits at 2h/3 while half the
 * width is s/2. A hit area sized that way misses the apex.
 */
export function pointShapeBoundingRadius(shape: PointShape, r: number): number {
  const geometry = pointShapeGeometry(shape, r)
  if (geometry.kind === "circle") return geometry.radius
  return geometry.points.reduce((max, p) => Math.max(max, Math.hypot(p.x, p.y)), 0)
}

// Even-odd ray casting. Vertices are in shape-local coordinates, as is (x, y).
function isPointInPolygon(points: IShapePoint[], x: number, y: number): boolean {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const { x: xi, y: yi } = points[i]
    const { x: xj, y: yj } = points[j]
    const straddlesRay = (yi > y) !== (yj > y)
    if (straddlesRay && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/*
 * Whether (dx, dy), relative to the point's center, is on the point.
 *
 * The drawn ink, unioned with the circle of radius r that CODAP has always used. Shape is a second
 * encoding channel, so choosing one must not make a point harder to click than it was as a circle:
 * testing the ink alone would open dead zones between a star's arms and in the notches of a plus,
 * where the shape is narrower than the circle it replaced. The union keeps every shape at least as
 * easy to hit as a circle while adding the ink that extends past it -- a star's tips, a square's
 * corners, a triangle's apex -- so the target matches what is drawn wherever that is generous, and
 * matches the old circle wherever it is not.
 */
export function isPointInShape(shape: PointShape, r: number, dx: number, dy: number): boolean {
  if (dx * dx + dy * dy <= r * r) return true

  const geometry = pointShapeGeometry(shape, r)
  return geometry.kind === "circle" ? false : isPointInPolygon(geometry.points, dx, dy)
}
