/**
 * Spatial hash-based hit testing for Canvas point rendering.
 *
 * Uses a grid-based spatial hash for O(1) average-case hit testing.
 * The grid is rebuilt after each render from current point positions.
 */

import { PointDisplayType } from "../../data-display-types"
import { IPointState } from "../point-renderer-types"

/**
 * Entry in the spatial hash grid
 */
export interface IHitTestEntry {
  pointId: string
  bounds: IHitTestBounds
  isRaised: boolean
  /** Index in the render order (higher = drawn later = visually on top) */
  renderOrder: number
}

/**
 * Bounding box for hit testing
 */
interface IHitTestBounds {
  x: number
  y: number
  width: number
  height: number
  /** For circles: center x */
  centerX?: number
  /** For circles: center y */
  centerY?: number
  /** For circles: radius (for precise circle hit testing) */
  radius?: number
}

/**
 * Grid-based spatial hash for efficient point hit testing.
 *
 * The grid divides the canvas into cells of fixed size. Each cell
 * stores references to points whose bounds overlap that cell.
 * Hit testing checks only cells near the query point, achieving
 * O(1) average-case lookup.
 */
export class CanvasHitTester {
  /** Size of each grid cell in pixels */
  private readonly cellSize: number

  /** Spatial hash grid: cell key -> array of entries */
  private grid = new Map<string, IHitTestEntry[]>()

  /** All entries for iteration */
  private allEntries: IHitTestEntry[] = []

  constructor(cellSize = 50) {
    this.cellSize = cellSize
  }

  /**
   * Clear and rebuild the spatial hash from current point positions.
   * Should be called after each render to keep hit testing accurate.
   *
   * @param points Array of point states (should be in render order)
   * @param displayType Current display type ("points" or "bars")
   * @param anchor Anchor point for positioning (e.g., { x: 0.5, y: 0.5 } for center)
   */
  updateFromPoints(
    points: IPointState[],
    displayType: PointDisplayType,
    anchor: { x: number, y: number }
  ): void {
    this.grid.clear()
    this.allEntries = []

    points.forEach((point, index) => {
      if (!point.isVisible) return

      const bounds = this.computeBounds(point, displayType, anchor)
      const entry: IHitTestEntry = {
        pointId: point.id,
        bounds,
        isRaised: point.isRaised,
        renderOrder: index
      }

      this.allEntries.push(entry)
      this.addToGrid(entry)
    })
  }

  /**
   * Find the topmost point at the given canvas coordinates.
   *
   * @param x Canvas x coordinate
   * @param y Canvas y coordinate
   * @returns Point ID of the topmost point, or undefined if no hit
   */
  hitTest(x: number, y: number): string | undefined {
    const cellX = Math.floor(x / this.cellSize)
    const cellY = Math.floor(y / this.cellSize)

    // Check surrounding cells (point may span multiple cells)
    const candidates: IHitTestEntry[] = []
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = this.cellKey(cellX + dx, cellY + dy)
        const entries = this.grid.get(key)
        if (entries) {
          candidates.push(...entries)
        }
      }
    }

    if (candidates.length === 0) return undefined

    // Remove duplicates (point may be in multiple cells)
    const uniqueCandidates = this.deduplicateEntries(candidates)

    // Filter to points actually containing (x, y)
    const hits = uniqueCandidates.filter(entry => this.containsPoint(entry.bounds, x, y))

    if (hits.length === 0) return undefined

    // Return topmost: raised points first, then by render order (higher = on top)
    return this.getTopmostHit(hits)
  }

  /**
   * Find all points at the given coordinates (not just the topmost)
   */
  hitTestAll(x: number, y: number): string[] {
    const cellX = Math.floor(x / this.cellSize)
    const cellY = Math.floor(y / this.cellSize)

    const candidates: IHitTestEntry[] = []
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = this.cellKey(cellX + dx, cellY + dy)
        const entries = this.grid.get(key)
        if (entries) {
          candidates.push(...entries)
        }
      }
    }

    const uniqueCandidates = this.deduplicateEntries(candidates)
    return uniqueCandidates
      .filter(entry => this.containsPoint(entry.bounds, x, y))
      .map(entry => entry.pointId)
  }

  /**
   * Get the number of points in the hit tester
   */
  get size(): number {
    return this.allEntries.length
  }

  // ===== Private methods =====

  private cellKey(cellX: number, cellY: number): string {
    return `${cellX},${cellY}`
  }

  private computeBounds(
    point: IPointState,
    displayType: PointDisplayType,
    anchor: { x: number, y: number }
  ): IHitTestBounds {
    const { x, y, scale, style } = point

    if (displayType === "bars" && style.width !== undefined && style.height !== undefined) {
      // Bar/rectangle
      const w = style.width * scale
      const h = style.height * scale
      return {
        x: x - anchor.x * w,
        y: y - anchor.y * h,
        width: w,
        height: h
      }
    } else {
      // Circle/point
      const r = style.radius * scale
      return {
        x: x - r,
        y: y - r,
        width: r * 2,
        height: r * 2,
        centerX: x,
        centerY: y,
        radius: r
      }
    }
  }

  private addToGrid(entry: IHitTestEntry): void {
    const { x, y, width, height } = entry.bounds
    const minCellX = Math.floor(x / this.cellSize)
    const maxCellX = Math.floor((x + width) / this.cellSize)
    const minCellY = Math.floor(y / this.cellSize)
    const maxCellY = Math.floor((y + height) / this.cellSize)

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const key = this.cellKey(cx, cy)
        if (!this.grid.has(key)) {
          this.grid.set(key, [])
        }
        this.grid.get(key)!.push(entry)
      }
    }
  }

  private deduplicateEntries(entries: IHitTestEntry[]): IHitTestEntry[] {
    const seen = new Set<string>()
    return entries.filter(entry => {
      if (seen.has(entry.pointId)) return false
      seen.add(entry.pointId)
      return true
    })
  }

  private containsPoint(bounds: IHitTestBounds, px: number, py: number): boolean {
    // For circles, use precise distance check
    if (bounds.radius !== undefined && bounds.centerX !== undefined && bounds.centerY !== undefined) {
      const dx = px - bounds.centerX
      const dy = py - bounds.centerY
      return (dx * dx + dy * dy) <= (bounds.radius * bounds.radius)
    }

    // For rectangles, use bounding box
    return px >= bounds.x && px <= bounds.x + bounds.width &&
           py >= bounds.y && py <= bounds.y + bounds.height
  }

  private getTopmostHit(hits: IHitTestEntry[]): string {
    // Sort by: raised first (true > false), then by render order (higher = on top)
    hits.sort((a, b) => {
      // Raised points always on top
      if (a.isRaised !== b.isRaised) {
        return a.isRaised ? 1 : -1
      }
      // Among same raised state, higher render order = on top
      return a.renderOrder - b.renderOrder
    })

    // Return the last one (topmost after sorting)
    return hits[hits.length - 1].pointId
  }
}
