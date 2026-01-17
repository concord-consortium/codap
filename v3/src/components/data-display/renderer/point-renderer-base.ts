import { CaseData, CaseDataWithSubPlot } from "../d3-types"
import { PointDisplayType } from "../data-display-types"
import { PointsState } from "./points-state"
import {
  IBackgroundEventDistributionOptions,
  IPoint,
  IPointMetadata,
  IPointRendererOptions,
  IPointStyle,
  ITransitionOptions,
  RendererCapability
} from "./point-renderer-types"

/**
 * Anchor points for different display types
 */
export const circleAnchor = { x: 0.5, y: 0.5 }
export const hBarAnchor = { x: 1, y: 0 }
export const vBarAnchor = { x: 0, y: 0 }

/**
 * Abstract base class for point renderers.
 * Provides shared state management, template methods for common logic,
 * and default event handler implementations.
 */
/**
 * Animation frame request ID type for managing animation frame requests
 */
export type AnimationFrameRequestId = "deselectAll" | "transition" | string

/**
 * WeakMap from dispatched events to the renderer that dispatched them.
 * Used to look up which renderer dispatched an event (e.g., to cancel pending operations).
 */
const dispatchedEventsMap = new WeakMap<Event, PointRendererBase>()

/**
 * Look up the renderer that dispatched a given event.
 * Returns undefined if the event was not dispatched by a renderer.
 */
export function getRendererForEvent(event: Event): PointRendererBase | undefined {
  return dispatchedEventsMap.get(event)
}

export abstract class PointRendererBase {
  protected state: PointsState
  protected _isReady = false
  protected _isVisible = true
  protected _displayType: PointDisplayType = "points"
  protected _pointsFusedIntoBars = false
  protected _anchor = circleAnchor
  protected animationFrames = new Map<AnimationFrameRequestId, number>()

  constructor(state?: PointsState) {
    this.state = state ?? new PointsState()
  }

  /**
   * Register that this renderer dispatched the given event.
   * Subclasses should call this when dispatching events so that
   * handlers can look up the originating renderer.
   */
  protected registerDispatchedEvent(event: Event): void {
    dispatchedEventsMap.set(event, this)
  }

  // ===== Abstract properties (subclasses must implement) =====

  /**
   * The canvas element for rendering (null for NullPointRenderer)
   */
  abstract get canvas(): HTMLCanvasElement | null

  /**
   * The renderer capability type
   */
  abstract get capability(): RendererCapability

  // ===== Abstract methods (subclasses must implement) =====

  /**
   * Initialize the renderer
   */
  protected abstract doInit(options?: IPointRendererOptions): Promise<void>

  /**
   * Clean up renderer resources
   */
  protected abstract doDispose(): void

  /**
   * Resize the renderer
   */
  protected abstract doResize(
    width: number,
    height: number,
    xCats: number,
    yCats: number,
    topCats: number,
    rightCats: number
  ): void

  /**
   * Sync points with case data
   */
  protected abstract doMatchPointsToData(
    datasetID: string,
    caseData: CaseDataWithSubPlot[],
    displayType: PointDisplayType,
    style: IPointStyle
  ): void

  /**
   * Set a point's position
   */
  protected abstract doSetPointPosition(pointId: string, x: number, y: number): void

  /**
   * Set a point's scale
   */
  protected abstract doSetPointScale(pointId: string, scale: number): void

  /**
   * Set a point's style
   */
  protected abstract doSetPointStyle(pointId: string, style: Partial<IPointStyle>): void

  /**
   * Set a point's raised state (for selection z-index)
   */
  protected abstract doSetPointRaised(pointId: string, raised: boolean): void

  /**
   * Set a point's subplot mask
   */
  protected abstract doSetPointSubPlot(pointId: string, subPlotIndex: number): void

  /**
   * Perform a transition
   */
  protected abstract doTransition(callback: () => void, duration: number): Promise<void>

  /**
   * Start the rendering loop
   */
  protected abstract doStartRendering(): void

  /**
   * Remove all subplot masks
   */
  protected abstract doRemoveMasks(): void

  /**
   * Set visibility of points container
   */
  protected abstract doSetVisibility(isVisible: boolean): void

  /**
   * Set all points' scale
   */
  protected abstract doSetAllPointsScale(scale: number, duration: number): Promise<void>

  /**
   * Set position or transition based on display type state
   */
  protected abstract doSetPositionOrTransition(
    pointId: string,
    style: Partial<IPointStyle>,
    x: number,
    y: number
  ): void

  /**
   * Setup background event distribution
   */
  protected abstract doSetupBackgroundEventDistribution(
    options: IBackgroundEventDistributionOptions
  ): void

  // ===== Concrete properties =====

  get isReady(): boolean {
    return this._isReady
  }

  get isVisible(): boolean {
    return this._isVisible
  }

  get pointsCount(): number {
    return this.state.size
  }

  get displayType(): PointDisplayType {
    return this._displayType
  }

  set displayType(value: PointDisplayType) {
    this._displayType = value
  }

  get pointsFusedIntoBars(): boolean {
    return this._pointsFusedIntoBars
  }

  set pointsFusedIntoBars(value: boolean) {
    this._pointsFusedIntoBars = value
  }

  get anchor(): { x: number; y: number } {
    return this._anchor
  }

  set anchor(value: { x: number; y: number }) {
    this._anchor = value
  }

  // ===== Template methods (shared logic + delegation) =====

  /**
   * Initialize the renderer
   */
  async init(options?: IPointRendererOptions): Promise<void> {
    await this.doInit(options)
    this._isReady = true
  }

  /**
   * Clean up renderer resources
   */
  dispose(): void {
    this.doDispose()
    this._isReady = false
  }

  /**
   * Resize the renderer and update masks
   */
  resize(width: number, height: number, xCats = 1, yCats = 1, topCats = 1, rightCats = 1): void {
    this.doResize(width, height, xCats, yCats, topCats, rightCats)
  }

  /**
   * Remove all subplot masks
   */
  removeMasks(): void {
    this.doRemoveMasks()
  }

  /**
   * Set visibility of points
   */
  setVisibility(isVisible: boolean): void {
    this._isVisible = isVisible
    this.doSetVisibility(isVisible)
  }

  /**
   * Start the rendering loop
   */
  startRendering(): void {
    this.doStartRendering()
  }

  /**
   * Sync points with case data array
   */
  matchPointsToData(
    datasetID: string,
    caseData: CaseDataWithSubPlot[],
    displayType: PointDisplayType,
    style: IPointStyle
  ): void {
    this.state.setDatasetID(datasetID)
    this._displayType = displayType
    this.doMatchPointsToData(datasetID, caseData, displayType, style)
  }

  /**
   * Get a point by case data
   */
  getPointForCaseData(caseData: CaseData): IPoint | undefined {
    const pointId = this.state.getPointIdForCaseData(caseData)
    return pointId ? { id: pointId } : undefined
  }

  /**
   * Set a point's position
   */
  setPointPosition(point: IPoint, x: number, y: number): void {
    this.state.updatePointPosition(point.id, x, y)
    this.doSetPointPosition(point.id, x, y)
  }

  /**
   * Set a point's scale
   */
  setPointScale(point: IPoint, scale: number): void {
    this.state.updatePointScale(point.id, scale)
    this.doSetPointScale(point.id, scale)
  }

  /**
   * Set a point's style
   */
  setPointStyle(point: IPoint, style: Partial<IPointStyle>): void {
    this.state.updatePointStyle(point.id, style)
    this.doSetPointStyle(point.id, style)
  }

  /**
   * Set a point's raised state (for selection z-index)
   */
  setPointRaised(point: IPoint, value: boolean): void {
    this.state.updatePointRaised(point.id, value)
    this.doSetPointRaised(point.id, value)
  }

  /**
   * Set a point's subplot mask
   */
  setPointSubPlot(point: IPoint, subPlotIndex: number): void {
    this.state.updatePointSubPlot(point.id, subPlotIndex)
    this.doSetPointSubPlot(point.id, subPlotIndex)
  }

  /**
   * Set position or transition based on display type
   */
  setPositionOrTransition(point: IPoint, style: Partial<IPointStyle>, x: number, y: number): void {
    this.state.updatePointPosition(point.id, x, y)
    this.state.updatePointStyle(point.id, style)
    this.doSetPositionOrTransition(point.id, style, x, y)
  }

  /**
   * Set all points' scale
   */
  setAllPointsScale(scale: number, duration = 0): Promise<void> {
    this.state.forEach(point => {
      this.state.updatePointScale(point.id, scale)
    })
    return this.doSetAllPointsScale(scale, duration)
  }

  /**
   * Perform a transition
   */
  transition(callback: () => void, options: ITransitionOptions): Promise<void> {
    return this.doTransition(callback, options.duration)
  }

  /**
   * Check if any transition is currently active
   */
  abstract get anyTransitionActive(): boolean

  /**
   * Iterate over all points
   */
  forEachPoint(
    callback: (point: IPoint, metadata: IPointMetadata) => void,
    options?: { selectedOnly?: boolean }
  ): void {
    this.state.forEach(pointState => {
      if (options?.selectedOnly && !pointState.isRaised) return
      const metadata = this.state.getMetadata(pointState.id)
      if (metadata) {
        callback({ id: pointState.id }, metadata)
      }
    })
    this.startRendering()
  }

  /**
   * Iterate over selected points only
   */
  forEachSelectedPoint(callback: (point: IPoint, metadata: IPointMetadata) => void): void {
    this.forEachPoint(callback, { selectedOnly: true })
  }

  /**
   * Get metadata for a point
   */
  getMetadata(point: IPoint): IPointMetadata {
    const metadata = this.state.getMetadata(point.id)
    if (!metadata) {
      throw new Error(`Point not found in state: ${point.id}`)
    }
    return metadata
  }

  /**
   * Get the shared state
   */
  getState(): PointsState {
    return this.state
  }

  /**
   * Setup background event distribution
   */
  setupBackgroundEventDistribution(options: IBackgroundEventDistributionOptions): void {
    this.doSetupBackgroundEventDistribution(options)
  }

  // ===== Animation frame management =====

  /**
   * Request an animation frame with a unique ID.
   * Only one pending request of a given type is allowed.
   */
  requestAnimationFrame(requestId: AnimationFrameRequestId, callback: () => void): void {
    // can only have one pending request of a given type
    if (!this.animationFrames.get(requestId)) {
      this.animationFrames.set(requestId, window.requestAnimationFrame(() => {
        callback()
        this.animationFrames.delete(requestId)
      }))
    }
  }

  /**
   * Cancel a pending animation frame request
   */
  cancelAnimationFrame(requestId: AnimationFrameRequestId): void {
    const frameToCancel = this.animationFrames.get(requestId)
    if (frameToCancel != null) {
      window.cancelAnimationFrame(frameToCancel)
      this.animationFrames.delete(requestId)
    }
  }

  // ===== Event handlers (default no-op implementations) =====
  // Subclasses can override these to provide actual event handling

  onPointerOver?(event: PointerEvent, point: IPoint, metadata: IPointMetadata): void

  onPointerLeave?(event: PointerEvent, point: IPoint, metadata: IPointMetadata): void

  onPointerClick?(event: PointerEvent, point: IPoint, metadata: IPointMetadata): void

  onPointerDragStart?(event: PointerEvent, point: IPoint, metadata: IPointMetadata): void

  onPointerDrag?(event: PointerEvent, point: IPoint, metadata: IPointMetadata): void

  onPointerDragEnd?(event: PointerEvent, point: IPoint, metadata: IPointMetadata): void
}

/**
 * Array of point renderers (for multi-layer support)
 */
export type PointRendererArray = Array<Maybe<PointRendererBase>>
