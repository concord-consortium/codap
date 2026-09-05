import { PointShape } from "../../../utilities/point-shape-utils"

/*
 * The geometry of the seven point shapes, as a function of the point radius.
 *
 * One source for every surface that draws a shape: the canvas renderer, the PIXI renderer and the
 * legend keys. Ported from the design prototype's js/shapes.js, which states the same contract --
 * "ONE source of geometry for every place a shape appears" -- and whose constants these are.
 *
 * Circle is the reference and is unchanged from what CODAP has always drawn: radius r. Every other
 * shape is normalized to about 90% of the circle's area. Equal area is deliberately not the target:
 * straight edges and points read heavier than a circle of identical ink, so a small negative
 * correction is what makes a triangle look like the same size point as a circle. The bounding boxes
 * therefore differ between shapes, and that is intentional.
 *
 * Do not re-derive these constants. They are tuned, and the relative visual weight of the set
 * depends on them.
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
       * Centred on its centre of area, not its bounding box. An equilateral triangle's centroid
       * sits h/6 below its box centre, so box-centring makes it read as sitting low: switching a
       * category from another shape to this one visibly shifts its points down.
       *
       * The prototype centres it on the box instead, for a predictable hit area and a shared
       * baseline with the square. That trades a visible positional bias for an alignment nicety,
       * and in a scatterplot position is the data. Every shape now sits on its centre of area.
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
 * The drawn bounding box, which is NOT 2r for anything but the circle -- a star is about 35% wider
 * than a circle of the same visual weight. Hit testing needs this rather than the radius, or the
 * points of a star are drawn outside the region that responds to a click.
 */
export function pointShapeExtent(shape: PointShape, r: number): IShapeExtent {
  return kShapeDefs[shape].extent(r)
}

/*
 * The distance from the center to the furthest point of the outline. The cheap basis for a
 * shape-aware hit test: it never reports a hit short of the drawn ink, though it is generous in
 * the concave regions of a plus or an X.
 */
export function pointShapeBoundingRadius(shape: PointShape, r: number): number {
  const { w, h } = pointShapeExtent(shape, r)
  return Math.max(w, h) / 2
}
