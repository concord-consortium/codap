import { CRS, latLng, Point } from "leaflet"
import { computeMeanCenter, greatCircleDistance } from "../../../utilities/geo-utils"
import { degreesToRadians, mod, quantileOfSortedArray } from "../../../utilities/math-utils"
import { ILatLong } from "../map-types"

/** Grid cell side length, in CSS pixels */
export const kHotSpotCellSize = 2
/** Kernels are truncated outside a square window of this many bandwidths in each direction */
export const kKernelCutoff = 3
/** Extra canvas margin around the viewport, as a fraction of each dimension, on each side */
export const kHotSpotPadding = 0.1
/** Bandwidth used when the points have no spread */
export const kFallbackBandwidthMeters = 10000
/** Radius of the sphere used by Leaflet's Web Mercator projection (EPSG:3857) */
export const kWebMercatorRadiusMeters = 6378137
/** Leaflet's Web Mercator latitude limit */
export const kMaxMercatorLatitude = 85.0511287798
/** Width and height of the world in Leaflet's zoom-0 pixel coordinates */
export const kWorldSize = 256

/** Projects a lat/long to Leaflet's zoom-0 world coordinates, in which the world is a 256 × 256 square. */
export function latLongToWorldPoint({ lat, long }: ILatLong): Point {
  return CRS.EPSG3857.latLngToPoint(latLng(lat, long), 0)
}

/**
 * Converts a distance on the ground near the given latitude to zoom-0 world units. Mercator stretches the map by
 * 1/cos(latitude), so a kernel of this many world units covers about bandwidthMeters on the ground.
 */
export function bandwidthToWorldUnits(bandwidthMeters: number, lat: number) {
  const clampedLat = Math.max(-kMaxMercatorLatitude, Math.min(kMaxMercatorLatitude, lat))
  const metersPerWorldUnit =
    2 * Math.PI * kWebMercatorRadiusMeters * Math.cos(degreesToRadians(clampedLat)) / kWorldSize
  return bandwidthMeters / metersPerWorldUnit
}

// Spreads smaller than this are floating-point error from coincident points
const kMinSpreadMeters = 0.001

/**
 * Returns the default bandwidth in meters, using the default search radius of ArcGIS's Kernel Density tool:
 * 0.9 · min(SD, √(1/ln 2) · Dm) · n^(−0.2), where SD is the standard distance of the points from their mean center
 * and Dm is their median distance from it.
 */
export function computeDefaultBandwidth(latLongs: ILatLong[]) {
  const center = computeMeanCenter(latLongs)
  if (!center) return kFallbackBandwidthMeters

  const distances = latLongs.map(({ lat, long }) => greatCircleDistance(lat, long, center.lat, center.long))
  const n = distances.length
  const standardDistance = Math.sqrt(distances.reduce((sum, d) => sum + d * d, 0) / n)
  if (standardDistance < kMinSpreadMeters) return kFallbackBandwidthMeters

  const medianDistance = quantileOfSortedArray([...distances].sort((a, b) => a - b), 0.5) ?? 0
  // When more than half of the points are at the mean center, the median is zero, so use SD alone
  const spread = medianDistance < kMinSpreadMeters
    ? standardDistance
    : Math.min(standardDistance, Math.sqrt(1 / Math.LN2) * medianDistance)
  return 0.9 * spread * n ** -0.2
}

/** A Gaussian kernel centered at (x, y) with bandwidth h, all in the same units */
export interface IKernel {
  x: number
  y: number
  h: number
}

/** Unnormalized Gaussian kernel, truncated outside a square window of half-width kKernelCutoff · h */
export function kernelWeight(dx: number, dy: number, h: number) {
  const r = kKernelCutoff * h
  if (Math.abs(dx) > r || Math.abs(dy) > r) return 0
  return Math.exp(-(dx * dx + dy * dy) / (2 * h * h))
}

/** Wraps a horizontal world-coordinate difference into [−128, 128], the short way across the antimeridian */
export function wrapWorldDelta(dx: number) {
  return dx - kWorldSize * Math.round(dx / kWorldSize)
}

/**
 * Buckets world-coordinate kernels so that every kernel whose window contains a location is in that location's
 * bucket or one of its eight neighbors. Buckets are at least kKernelCutoff · (largest h) wide. Columns wrap
 * around the antimeridian.
 */
class WorldKernelIndex {
  private size: number
  private buckets = new Map<number, IKernel[]>()

  constructor(kernels: IKernel[]) {
    const maxH = kernels.reduce((max, { h }) => Math.max(max, h), 0)
    this.size = Math.max(1, Math.floor(kWorldSize / (kKernelCutoff * maxH)))
    kernels.forEach(kernel => {
      const key = this.key(this.col(kernel.x), this.row(kernel.y))
      const bucket = this.buckets.get(key)
      if (bucket) {
        bucket.push(kernel)
      } else {
        this.buckets.set(key, [kernel])
      }
    })
  }

  private col(x: number) {
    return Math.floor(mod(x, kWorldSize) / kWorldSize * this.size) % this.size
  }

  private row(y: number) {
    return Math.min(this.size - 1, Math.max(0, Math.floor(y / kWorldSize * this.size)))
  }

  private key(col: number, row: number) {
    return row * this.size + col
  }

  /** Calls fn with each kernel that may be within kKernelCutoff bandwidths of (x, y), and its offset from it */
  forEachNear(x: number, y: number, fn: (kernel: IKernel, dx: number, dy: number) => void) {
    const col = this.col(x), row = this.row(y)
    const cols = new Set([col - 1, col, col + 1].map(c => mod(c, this.size)))
    for (let r = Math.max(0, row - 1); r <= Math.min(this.size - 1, row + 1); r++) {
      cols.forEach(c => {
        this.buckets.get(this.key(c, r))?.forEach(kernel => fn(kernel, wrapWorldDelta(kernel.x - x), kernel.y - y))
      })
    }
  }

  densityAt(x: number, y: number) {
    let density = 0
    this.forEachNear(x, y, (kernel, dx, dy) => { density += kernelWeight(dx, dy, kernel.h) })
    return density
  }
}

const kMaxMeanShiftIterations = 50
// Mean-shift stops when a step is smaller than this fraction of the starting point's bandwidth
const kMeanShiftTolerance = 1e-6

/**
 * Returns the maximum of the density surface of world-coordinate kernels. The maximum usually lies between
 * points, so this climbs from each point to its local maximum with mean-shift, which always moves uphill on a
 * sum of Gaussians. The density at each starting point is included too, so the result is never less than
 * evaluating at the points alone.
 */
export function computeMaxDensity(kernels: IKernel[]) {
  const index = new WorldKernelIndex(kernels)
  let maxDensity = 0
  kernels.forEach(start => {
    let { x, y } = start
    maxDensity = Math.max(maxDensity, index.densityAt(x, y))
    for (let i = 0; i < kMaxMeanShiftIterations; i++) {
      let sumWeights = 0, sumDx = 0, sumDy = 0
      index.forEachNear(x, y, (kernel, dx, dy) => {
        // the gradient of the density is Σ kernelWeight · (offset) / h², so this step always goes uphill
        const weight = kernelWeight(dx, dy, kernel.h) / (kernel.h * kernel.h)
        sumWeights += weight
        sumDx += weight * dx
        sumDy += weight * dy
      })
      if (sumWeights === 0) break
      const stepX = sumDx / sumWeights, stepY = sumDy / sumWeights
      x += stepX
      y += stepY
      if (Math.hypot(stepX, stepY) < kMeanShiftTolerance * start.h) break
    }
    maxDensity = Math.max(maxDensity, index.densityAt(x, y))
  })
  return maxDensity
}

/** A point to plot, with its position and bandwidth in zoom-0 world units */
export interface IHotSpotPoint extends IKernel {
  latLong: ILatLong
}

/** Everything about a density surface that doesn't depend on the map's view */
export interface IHotSpotSurface {
  points: IHotSpotPoint[]
  bandwidthMeters: number
  maxDensity: number
}

/**
 * Returns the density surface of the points, or undefined if there are none. If bandwidthMeters isn't a positive
 * number, a default is computed from the points' spread.
 */
export function computeHotSpotSurface(latLongs: ILatLong[], bandwidthMeters?: number): Maybe<IHotSpotSurface> {
  if (!latLongs.length) return

  const bandwidth = bandwidthMeters && bandwidthMeters > 0 ? bandwidthMeters : computeDefaultBandwidth(latLongs)
  const points = latLongs.map(latLong => {
    const { x, y } = latLongToWorldPoint(latLong)
    return { latLong, x, y, h: bandwidthToWorldUnits(bandwidth, latLong.lat) }
  })
  return { points, bandwidthMeters: bandwidth, maxDensity: computeMaxDensity(points) }
}

/** A grid of square cells, positioned in container pixels */
export interface IDensityGridRegion {
  originX: number   // container x of the grid's left edge
  originY: number   // container y of the grid's top edge
  cols: number
  rows: number
  cellSize: number  // cell side length, in pixels
}

/**
 * Returns the density of pixel-coordinate kernels sampled at each cell's center, in row-major order. A Gaussian is
 * separable, exp(−(dx² + dy²)/2h²) = exp(−dx²/2h²) · exp(−dy²/2h²), so each kernel adds
 * rowWeight · colWeight[col] to each cell in its window and the inner loop needs no exp.
 */
export function computeDensityGrid(kernels: IKernel[], region: IDensityGridRegion) {
  const { originX, originY, cols, rows, cellSize } = region
  const grid = new Float32Array(cols * rows)
  const colWeights = new Float64Array(cols)

  // The first and last cells whose centers, origin + (i + 0.5) · cellSize, are within r of p
  const cellRange = (p: number, r: number, origin: number, count: number) => [
    Math.max(0, Math.ceil((p - r - origin) / cellSize - 0.5)),
    Math.min(count - 1, Math.floor((p + r - origin) / cellSize - 0.5))
  ]

  kernels.forEach(({ x, y, h }) => {
    const r = kKernelCutoff * h
    const [colMin, colMax] = cellRange(x, r, originX, cols)
    const [rowMin, rowMax] = cellRange(y, r, originY, rows)
    if (colMin > colMax || rowMin > rowMax) return

    const denominator = 2 * h * h
    for (let col = colMin; col <= colMax; col++) {
      const dx = originX + (col + 0.5) * cellSize - x
      colWeights[col] = Math.exp(-dx * dx / denominator)
    }
    for (let row = rowMin; row <= rowMax; row++) {
      const dy = originY + (row + 0.5) * cellSize - y
      const rowWeight = Math.exp(-dy * dy / denominator)
      const rowStart = row * cols
      for (let col = colMin; col <= colMax; col++) {
        grid[rowStart + col] += rowWeight * colWeights[col]
      }
    }
  })
  return grid
}
