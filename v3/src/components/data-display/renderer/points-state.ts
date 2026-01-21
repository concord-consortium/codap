import { CaseData, CaseDataWithSubPlot } from "../d3-types"
import { IPointMetadata, IPointState, IPointStyle } from "./point-renderer-types"

/**
 * Generates a unique key for a case data object
 */
export const caseDataKey = ({ plotNum, caseID }: CaseData) => `${plotNum}:${caseID}`

/**
 * Generates a unique point ID
 */
let nextPointId = 0
export const generatePointId = () => `point-${++nextPointId}`

/**
 * Intermediate state layer that survives renderer switches.
 * This class holds the canonical point data that both NullPointRenderer
 * and PixiPointRenderer read from and write to.
 */
export class PointsState {
  private points = new Map<string, IPointState>()
  private caseDataToPointId = new Map<string, string>()
  private datasetID = ""

  /**
   * Get the number of points
   */
  get size(): number {
    return this.points.size
  }

  /**
   * Set the current dataset ID
   */
  setDatasetID(datasetID: string): void {
    this.datasetID = datasetID
  }

  /**
   * Get the current dataset ID
   */
  getDatasetID(): string {
    return this.datasetID
  }

  /**
   * Add a new point
   */
  addPoint(caseData: CaseDataWithSubPlot, style: IPointStyle): string {
    const id = generatePointId()
    const key = caseDataKey(caseData)

    const pointState: IPointState = {
      id,
      caseID: caseData.caseID,
      plotNum: caseData.plotNum,
      subPlotNum: caseData.subPlotNum,
      datasetID: this.datasetID,
      x: 0,
      y: 0,
      scale: 1,
      style: { ...style },
      isRaised: false,
      isVisible: true
    }

    this.points.set(id, pointState)
    this.caseDataToPointId.set(key, id)

    return id
  }

  /**
   * Remove a point by its ID
   */
  removePoint(pointId: string): void {
    const point = this.points.get(pointId)
    if (point) {
      const key = caseDataKey({ plotNum: point.plotNum, caseID: point.caseID })
      this.caseDataToPointId.delete(key)
      this.points.delete(pointId)
    }
  }

  /**
   * Get a point by its ID
   */
  getPoint(pointId: string): IPointState | undefined {
    return this.points.get(pointId)
  }

  /**
   * Get a point ID by case data
   */
  getPointIdForCaseData(caseData: CaseData): string | undefined {
    return this.caseDataToPointId.get(caseDataKey(caseData))
  }

  /**
   * Get a point by case data
   */
  getPointForCaseData(caseData: CaseData): IPointState | undefined {
    const pointId = this.getPointIdForCaseData(caseData)
    return pointId ? this.points.get(pointId) : undefined
  }

  /**
   * Check if a point exists for the given case data
   */
  hasPointForCaseData(caseData: CaseData): boolean {
    return this.caseDataToPointId.has(caseDataKey(caseData))
  }

  /**
   * Update point position
   */
  updatePointPosition(pointId: string, x: number, y: number): void {
    const point = this.points.get(pointId)
    if (point) {
      point.x = x
      point.y = y
    }
  }

  /**
   * Update point scale
   */
  updatePointScale(pointId: string, scale: number): void {
    const point = this.points.get(pointId)
    if (point) {
      point.scale = scale
    }
  }

  /**
   * Update point style
   */
  updatePointStyle(pointId: string, style: Partial<IPointStyle>): void {
    const point = this.points.get(pointId)
    if (point) {
      point.style = { ...point.style, ...style }
    }
  }

  /**
   * Update point raised state (for selection z-index)
   */
  updatePointRaised(pointId: string, isRaised: boolean): void {
    const point = this.points.get(pointId)
    if (point) {
      point.isRaised = isRaised
    }
  }

  /**
   * Update point visibility
   */
  updatePointVisibility(pointId: string, isVisible: boolean): void {
    const point = this.points.get(pointId)
    if (point) {
      point.isVisible = isVisible
    }
  }

  /**
   * Update point subplot
   */
  updatePointSubPlot(pointId: string, subPlotNum: number): void {
    const point = this.points.get(pointId)
    if (point) {
      point.subPlotNum = subPlotNum
    }
  }

  /**
   * Update subPlotNum values from case data without modifying points otherwise.
   * This is a lightweight operation that only updates subplot assignments.
   */
  updateSubPlotNumsFromCaseData(caseData: CaseDataWithSubPlot[]): void {
    caseData.forEach(data => {
      const pointId = this.getPointIdForCaseData(data)
      if (pointId && data.subPlotNum !== undefined) {
        const point = this.points.get(pointId)
        if (point) {
          point.subPlotNum = data.subPlotNum
        }
      }
    })
  }

  /**
   * Iterate over all points
   */
  forEach(callback: (point: IPointState) => void): void {
    this.points.forEach(callback)
  }

  /**
   * Clear all points
   */
  clear(): void {
    this.points.clear()
    this.caseDataToPointId.clear()
  }

  /**
   * Get all point IDs
   */
  getPointIds(): string[] {
    return Array.from(this.points.keys())
  }

  /**
   * Get metadata for a point
   */
  getMetadata(pointId: string): IPointMetadata | undefined {
    const point = this.points.get(pointId)
    if (!point) return undefined

    return {
      caseID: point.caseID,
      plotNum: point.plotNum,
      datasetID: point.datasetID,
      style: { ...point.style },
      x: point.x,
      y: point.y
    }
  }

  /**
   * Create a snapshot of all point state (for renderer switching)
   */
  getSnapshot(): IPointState[] {
    return Array.from(this.points.values()).map(point => ({ ...point, style: { ...point.style } }))
  }

  /**
   * Restore state from a snapshot
   */
  restoreFromSnapshot(snapshot: IPointState[]): void {
    this.clear()
    snapshot.forEach(point => {
      this.points.set(point.id, { ...point, style: { ...point.style } })
      const key = caseDataKey({ plotNum: point.plotNum, caseID: point.caseID })
      this.caseDataToPointId.set(key, point.id)
    })
  }

  /**
   * Sync points with case data array - adds new points, removes missing ones
   * Returns the IDs of newly added points
   */
  syncWithCaseData(
    caseDataArray: CaseDataWithSubPlot[],
    defaultStyle: IPointStyle
  ): { added: string[], removed: string[] } {
    const added: string[] = []
    const removed: string[] = []

    // Track which points are still present
    const presentKeys = new Set<string>()

    // Add or update points for each case
    caseDataArray.forEach(caseData => {
      const key = caseDataKey(caseData)
      presentKeys.add(key)

      if (!this.caseDataToPointId.has(key)) {
        const id = this.addPoint(caseData, defaultStyle)
        added.push(id)
      } else {
        // Update subPlotNum if it changed
        const pointId = this.caseDataToPointId.get(key)!
        const point = this.points.get(pointId)
        if (point && point.subPlotNum !== caseData.subPlotNum) {
          point.subPlotNum = caseData.subPlotNum
        }
      }
    })

    // Remove points that are no longer in the data
    const toRemove: string[] = []
    this.caseDataToPointId.forEach((pointId, key) => {
      if (!presentKeys.has(key)) {
        toRemove.push(pointId)
        removed.push(pointId)
      }
    })
    toRemove.forEach(id => this.removePoint(id))

    return { added, removed }
  }
}
