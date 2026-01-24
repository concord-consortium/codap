/**
 * Canvas 2D point renderer - fallback when WebGL is unavailable.
 *
 * This renderer provides a middle ground between full WebGL rendering
 * (PixiPointRenderer) and no rendering (NullPointRenderer). It is used when:
 * - WebGLContextManager denies a context (too many graphs)
 * - WebGL is not supported by the browser/device
 *
 * The Canvas renderer does NOT participate in WebGLContextManager since
 * Canvas 2D contexts are virtually unlimited.
 */

import { CaseDataWithSubPlot } from "../d3-types"
import { PointDisplayType } from "../data-display-types"
import { CanvasHitTester, CanvasTransitionManager } from "./canvas"
import {
  circleAnchor,
  getRendererForEvent,
  hBarAnchor,
  PointRendererBase
} from "./point-renderer-base"
import { PointsState } from "./points-state"
import {
  IBackgroundEventDistributionOptions,
  IPoint,
  IPointMetadata,
  IPointRendererOptions,
  IPointState,
  IPointStyle,
  RendererCapability
} from "./point-renderer-types"

const strokeColorHover = "#a35b3a"
const hoverRadiusFactor = 1.5

/**
 * Clip rectangle for subplot masking
 */
interface ISubPlotClipRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Canvas 2D point renderer implementing the PointRendererBase interface.
 */
export class CanvasPointRenderer extends PointRendererBase {
  // Canvas elements
  private _canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null

  // Hit testing
  private hitTester: CanvasHitTester | null = null

  // Transition state
  private transitionManager: CanvasTransitionManager | null = null
  private renderLoopActive = false
  private animationFrameId: number | null = null

  // Rendering state
  private needsRedraw = false
  private subPlotClipRects: ISubPlotClipRect[] = []
  private width = 0
  private height = 0

  // Resize observer
  private resizeObserver?: ResizeObserver

  // Background event distribution
  private backgroundEventOptions?: IBackgroundEventDistributionOptions

  // Hover state for interactivity
  private hoveredPointId: string | null = null

  // Drag state
  private draggingPointId: string | null = null

  // Event handlers that need cleanup (stored as bound functions)
  private boundWindowPointerUp: ((event: PointerEvent) => void) | null = null
  private boundWindowPointerMove: ((event: PointerEvent) => void) | null = null

  // Disposed flag
  private isDisposed = false

  // Temporary storage for pre-transition positions
  // Used to capture old positions before state is updated
  private pendingTransitionStarts = new Map<string, { x: number, y: number, scale: number }>()

  constructor(state?: PointsState) {
    super(state)
  }

  // ===== Override to capture old positions before state is updated =====

  /**
   * Override setPositionOrTransition to capture the old position BEFORE
   * the base class updates the state. This is necessary because the base class
   * calls state.updatePointPosition() before doSetPositionOrTransition(),
   * so by the time doSetPositionOrTransition runs, point.x/y are already
   * the target values. We need the old values for transition animations.
   */
  setPositionOrTransition(point: IPoint, style: Partial<IPointStyle>, x: number, y: number): void {
    // Capture old position before state is updated (only during transition setup)
    // Important: don't overwrite if we already have an entry (e.g., from doInit pre-population
    // during renderer switch, which preserves positions to prevent animation)
    if (this.transitionManager?.isSettingUpTransition() && !this.pendingTransitionStarts.has(point.id)) {
      const pointState = this.state.getPoint(point.id)
      if (pointState) {
        this.pendingTransitionStarts.set(point.id, {
          x: pointState.x,
          y: pointState.y,
          scale: pointState.scale
        })
      }
    }

    // Call parent which updates state and calls doSetPositionOrTransition
    super.setPositionOrTransition(point, style, x, y)

    // Clean up
    this.pendingTransitionStarts.delete(point.id)
  }

  // ===== Abstract property implementations =====

  get canvas(): HTMLCanvasElement | null {
    return this._canvas
  }

  get capability(): RendererCapability {
    return "canvas"
  }

  get anyTransitionActive(): boolean {
    return this.transitionManager?.hasActiveTransitions() ?? false
  }

  // ===== Abstract method implementations =====

  protected async doInit(options?: IPointRendererOptions): Promise<void> {
    // Create canvas element
    this._canvas = document.createElement("canvas")
    this._canvas.style.position = "absolute"
    this._canvas.style.top = "0"
    this._canvas.style.left = "0"
    this._canvas.style.pointerEvents = "auto"

    this.ctx = this._canvas.getContext("2d")
    if (!this.ctx) {
      throw new Error("Failed to get 2D canvas context")
    }

    // Initialize subsystems
    this.hitTester = new CanvasHitTester()
    this.transitionManager = new CanvasTransitionManager()

    // Set up event listeners for interactivity
    this.setupCanvasEventListeners()

    // Configure background event distribution if requested
    if (options?.backgroundEventDistribution) {
      this.backgroundEventOptions = options.backgroundEventDistribution
      this.doSetupBackgroundEventDistribution(options.backgroundEventDistribution)
    }

    // Set up resize observer if requested
    if (options?.resizeTo) {
      this.doSetupResizeObserver(options.resizeTo)
    }

    // Sync from existing state (if switching from another renderer)
    this.syncFromState()

    // Pre-populate pendingTransitionStarts with existing points to prevent animation
    // on first transition after renderer switch. Truly new points won't be in this map.
    // The state's scale is now correctly maintained (setPositionOrTransition updates it to 1).
    this.state.forEach(point => {
      this.pendingTransitionStarts.set(point.id, {
        x: point.x,
        y: point.y,
        scale: point.scale
      })
    })
  }

  protected doDispose(): void {
    this.isDisposed = true

    // Cancel any pending animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    // Remove window event listeners (if drag is in progress)
    this.removeWindowDragListeners()

    // Disconnect resize observer
    this.resizeObserver?.disconnect()
    this.resizeObserver = undefined

    // Remove canvas from DOM if attached
    if (this._canvas?.parentElement) {
      this._canvas.parentElement.removeChild(this._canvas)
    }

    // Clear references
    this._canvas = null
    this.ctx = null
    this.hitTester = null
    this.transitionManager = null
  }

  protected doResize(
    width: number,
    height: number,
    xCats: number,
    yCats: number,
    topCats: number,
    rightCats: number
  ): void {
    if (!this._canvas || !this.ctx) return

    this.width = width
    this.height = height

    // Resize canvas with device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1
    this._canvas.width = width * dpr
    this._canvas.height = height * dpr
    this._canvas.style.width = `${width}px`
    this._canvas.style.height = `${height}px`
    this.ctx.scale(dpr, dpr)

    // Calculate subplot clip rectangles
    this.subPlotClipRects = []
    const maskWidth = width / (xCats * topCats)
    const maskHeight = height / (yCats * rightCats)

    for (let top = 0; top < topCats; ++top) {
      for (let right = rightCats - 1; right >= 0; --right) {
        for (let left = yCats - 1; left >= 0; --left) {
          for (let bottom = 0; bottom < xCats; ++bottom) {
            const r = right * yCats + left
            const c = top * xCats + bottom
            const x = c * maskWidth
            const y = r * maskHeight
            this.subPlotClipRects.push({ x, y, width: maskWidth, height: maskHeight })
          }
        }
      }
    }

    this.needsRedraw = true
    this.doStartRendering()
  }

  protected doMatchPointsToData(
    _datasetID: string,
    caseData: CaseDataWithSubPlot[],
    displayType: PointDisplayType,
    style: IPointStyle
  ): void {
    if (this.isDisposed) return

    // Update anchor based on display type
    this._anchor = displayType === "points" ? circleAnchor :
                   displayType === "bars" ? hBarAnchor : circleAnchor

    // Sync state with case data
    this.state.syncWithCaseData(caseData, style)

    this.needsRedraw = true
    this.doStartRendering()
  }

  protected doSetPointPosition(_pointId: string, _x: number, _y: number): void {
    if (this.transitionManager?.hasActiveTransitions()) {
      // If a transition is active, the position will be set by the transition
      return
    }
    this.needsRedraw = true
    this.doStartRendering()
  }

  protected doSetPointScale(_pointId: string, _scale: number): void {
    this.needsRedraw = true
    this.doStartRendering()
  }

  protected doSetPointStyle(_pointId: string, _style: Partial<IPointStyle>): void {
    this.needsRedraw = true
    this.doStartRendering()
  }

  protected doSetPointRaised(_pointId: string, _raised: boolean): void {
    this.needsRedraw = true
    this.doStartRendering()
  }

  protected doSetPointSubPlot(_pointId: string, _subPlotIndex: number): void {
    this.needsRedraw = true
    this.doStartRendering()
  }

  protected async doTransition(callback: () => void, duration: number): Promise<void> {
    if (duration === 0 || !this.transitionManager) {
      callback()
      // Still need to render after the callback sets positions
      this.doStartRendering()
      return
    }

    return new Promise<void>(resolve => {
      this.transitionManager!.beginTransition(duration, () => resolve())
      callback()
      this.transitionManager!.endTransition()
      this.doStartRendering()
    })
  }

  protected doStartRendering(): void {
    if (this.isDisposed || this.renderLoopActive) return

    this.renderLoopActive = true
    // Use requestAnimationFrame to batch multiple synchronous updates into one render
    this.animationFrameId = requestAnimationFrame(this.renderFrame)
  }

  protected doRemoveMasks(): void {
    this.subPlotClipRects = []
    this.needsRedraw = true
    this.doStartRendering()
  }

  protected doSetVisibility(isVisible: boolean): void {
    if (this._canvas) {
      this._canvas.style.visibility = isVisible ? "visible" : "hidden"
    }
  }

  protected async doSetAllPointsScale(scale: number, duration: number): Promise<void> {
    if (duration === 0 || !this.transitionManager) {
      this.needsRedraw = true
      this.doStartRendering()
      return
    }

    return new Promise<void>(resolve => {
      this.transitionManager!.beginTransition(duration, () => resolve())
      this.state.forEach(point => {
        const currentScale = point.scale
        this.transitionManager!.setTarget(point.id, "scale", currentScale, scale)
      })
      this.transitionManager!.endTransition()
      this.doStartRendering()
    })
  }

  protected doSetPositionOrTransition(
    pointId: string,
    _style: Partial<IPointStyle>,
    x: number,
    y: number
  ): void {
    const point = this.state.getPoint(pointId)
    if (!point || !this.transitionManager) return

    if (this.transitionManager.isSettingUpTransition()) {
      // Use stored old positions (captured before state was updated or at init)
      // For existing points: oldPos exists (from init or previous transition)
      // For truly new points: oldPos is undefined, so they animate from (x, y, scale=0)
      const oldPos = this.pendingTransitionStarts.get(pointId)
      const startX = oldPos?.x ?? x
      const startY = oldPos?.y ?? y
      const startScale = oldPos?.scale ?? 0

      // Set transition targets for position and scale
      this.transitionManager.setTarget(pointId, "x", startX, x)
      this.transitionManager.setTarget(pointId, "y", startY, y)
      // New points animate scale from 0 to 1; existing points stay at their current scale
      this.transitionManager.setTarget(pointId, "scale", startScale, 1)
    } else {
      // No transition active - set scale to 1 immediately
      this.state.updatePointScale(pointId, 1)
    }

    this.needsRedraw = true
  }

  protected doSetupBackgroundEventDistribution(
    options: IBackgroundEventDistributionOptions
  ): void {
    this.backgroundEventOptions = options
    // Background events are handled in setupCanvasEventListeners
  }

  protected doSetupResizeObserver(resizeTo: HTMLElement): void {
    this.resizeObserver?.disconnect()

    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        this.doResize(width, height, 1, 1, 1, 1)
      }
    })
    this.resizeObserver.observe(resizeTo)
  }

  // ===== Private rendering methods =====

  private renderFrame = (): void => {
    if (this.isDisposed) {
      this.renderLoopActive = false
      return
    }

    // Process transitions
    if (this.transitionManager?.hasActiveTransitions()) {
      const updates = this.transitionManager.step()

      // Apply transition updates to point state
      for (const [pointId, props] of updates) {
        const point = this.state.getPoint(pointId)
        if (point) {
          const x = props.get("x")
          const y = props.get("y")
          const scale = props.get("scale")
          if (x !== undefined) point.x = x
          if (y !== undefined) point.y = y
          if (scale !== undefined) point.scale = scale
        }
      }

      this.needsRedraw = true
    }

    // Render if needed
    if (this.needsRedraw) {
      this.drawAllPoints()
      this.needsRedraw = false
    }

    // Continue loop if transitions active
    if (this.transitionManager?.hasActiveTransitions()) {
      this.animationFrameId = requestAnimationFrame(this.renderFrame)
    } else {
      this.renderLoopActive = false
      this.animationFrameId = null
    }
  }

  private drawAllPoints(): void {
    if (!this.ctx || !this._canvas) return

    // Reset transform and clear
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    const dpr = window.devicePixelRatio || 1
    this.ctx.scale(dpr, dpr)
    this.ctx.clearRect(0, 0, this.width, this.height)

    // Get sorted points for rendering (non-raised first, then raised)
    const sortedPoints = this.getSortedPointsForRendering()

    // Group by subplot for efficient clipping
    const pointsBySubplot = this.groupPointsBySubplot(sortedPoints)

    // Draw points grouped by subplot
    for (const [subplotIndex, points] of pointsBySubplot) {
      this.ctx.save()

      // Apply subplot clipping if applicable
      if (subplotIndex !== undefined && this.subPlotClipRects[subplotIndex]) {
        const clip = this.subPlotClipRects[subplotIndex]
        this.ctx.beginPath()
        this.ctx.rect(clip.x, clip.y, clip.width, clip.height)
        this.ctx.clip()
      }

      // Draw each point
      for (const pointState of points) {
        if (pointState.isVisible) {
          this.drawPoint(pointState)
        }
      }

      this.ctx.restore()
    }

    // Update hit tester with current positions
    this.hitTester?.updateFromPoints(sortedPoints, this._displayType, this._anchor)
  }

  private drawPoint(point: IPointState): void {
    if (!this.ctx) return

    const { x, y, scale, style } = point
    const { radius, fill, stroke, strokeWidth, strokeOpacity, width, height } = style

    // Apply hover effect
    const isHovered = point.id === this.hoveredPointId
    let effectiveScale = scale
    let effectiveStroke = stroke

    if (isHovered && this._displayType === "points") {
      effectiveScale = scale * hoverRadiusFactor
    } else if (isHovered && this._displayType === "bars" && !this._pointsFusedIntoBars) {
      effectiveStroke = strokeColorHover
    }

    this.ctx.save()
    this.ctx.translate(x, y)
    this.ctx.scale(effectiveScale, effectiveScale)

    if (this._displayType === "bars" && width !== undefined && height !== undefined) {
      // Draw rectangle (bar)
      const rectX = -this._anchor.x * width
      const rectY = -this._anchor.y * height

      this.ctx.fillStyle = fill
      this.ctx.fillRect(rectX, rectY, width, height)

      if (strokeWidth > 0) {
        this.ctx.strokeStyle = effectiveStroke
        this.ctx.lineWidth = strokeWidth / effectiveScale // Compensate for scale
        this.ctx.globalAlpha = strokeOpacity ?? 0.4
        this.ctx.strokeRect(rectX, rectY, width, height)
      }
    } else {
      // Draw circle (point)
      this.ctx.beginPath()
      this.ctx.arc(0, 0, radius, 0, Math.PI * 2)
      this.ctx.fillStyle = fill
      this.ctx.fill()

      if (strokeWidth > 0) {
        this.ctx.strokeStyle = effectiveStroke
        this.ctx.lineWidth = strokeWidth / effectiveScale // Compensate for scale
        this.ctx.globalAlpha = strokeOpacity ?? 0.4
        this.ctx.stroke()
      }
    }

    this.ctx.restore()
  }

  private getSortedPointsForRendering(): IPointState[] {
    const points: IPointState[] = []
    this.state.forEach(point => points.push(point))

    // Sort: non-raised first, then raised (so raised are drawn on top)
    return points.sort((a, b) => {
      if (a.isRaised !== b.isRaised) {
        return a.isRaised ? 1 : -1
      }
      return 0
    })
  }

  private groupPointsBySubplot(points: IPointState[]): Map<number | undefined, IPointState[]> {
    const groups = new Map<number | undefined, IPointState[]>()

    for (const point of points) {
      const key = point.subPlotNum
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(point)
    }

    return groups
  }

  private syncFromState(): void {
    // If we have existing state (switching from another renderer), trigger a redraw
    if (this.state.size > 0) {
      this.needsRedraw = true
      this.doStartRendering()
    }
  }

  // ===== Event handling =====

  private setupCanvasEventListeners(): void {
    if (!this._canvas) return

    const getCanvasCoords = (event: PointerEvent): { x: number, y: number } => {
      const rect = this._canvas!.getBoundingClientRect()
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      }
    }

    const getPointAndMetadata = (pointId: string): { point: IPoint, metadata: IPointMetadata } | null => {
      const pointState = this.state.getPoint(pointId)
      if (!pointState) return null
      return {
        point: { id: pointId },
        metadata: {
          caseID: pointState.caseID,
          plotNum: pointState.plotNum,
          datasetID: pointState.datasetID,
          style: { ...pointState.style },
          x: pointState.x,
          y: pointState.y
        }
      }
    }

    // Pointer move on canvas - handle hover
    this._canvas.addEventListener("pointermove", (event: PointerEvent) => {
      if (this.draggingPointId) {
        // Drag is handled by window listener
        return
      }

      const { x, y } = getCanvasCoords(event)
      const hitPointId = this.hitTester?.hitTest(x, y)

      if (hitPointId !== this.hoveredPointId) {
        // Leave old point
        if (this.hoveredPointId) {
          const oldData = getPointAndMetadata(this.hoveredPointId)
          if (oldData) {
            this.onPointerLeave?.(event, oldData.point, oldData.metadata)
          }
        }

        this.hoveredPointId = hitPointId ?? null

        // Enter new point
        if (hitPointId) {
          const newData = getPointAndMetadata(hitPointId)
          if (newData) {
            this.onPointerOver?.(event, newData.point, newData.metadata)
          }
        }

        this.needsRedraw = true
        this.doStartRendering()
      }
    })

    // Pointer leave canvas
    this._canvas.addEventListener("pointerleave", (event: PointerEvent) => {
      if (this.hoveredPointId && !this.draggingPointId) {
        const data = getPointAndMetadata(this.hoveredPointId)
        if (data) {
          this.onPointerLeave?.(event, data.point, data.metadata)
        }
        this.hoveredPointId = null
        this.needsRedraw = true
        this.doStartRendering()
      }
    })

    // Click - DOM "click" events produce MouseEvent, not PointerEvent
    this._canvas.addEventListener("click", (event: MouseEvent) => {
      // Skip events that we dispatched to avoid infinite recursion
      if (getRendererForEvent(event)) return

      const rect = this._canvas!.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const hitPointId = this.hitTester?.hitTest(x, y)

      if (hitPointId) {
        // For bars with points fused into bars, forward clicks to the underlying SVG
        // "bar covers" layer which handles bar selection (selecting all cases in the bar)
        if (this._displayType === "bars" && this._pointsFusedIntoBars && this.backgroundEventOptions) {
          this.forwardEventToBackground(event, "click")
          return
        }

        // Stop propagation to prevent the click from bubbling to the background,
        // which would trigger deselection of the point we just selected
        event.stopPropagation()

        const data = getPointAndMetadata(hitPointId)
        if (data) {
          // Cast MouseEvent to PointerEvent for callback compatibility.
          // MouseEvent and PointerEvent share the properties we use (clientX, clientY, etc.)
          this.onPointerClick?.(event as unknown as PointerEvent, data.point, data.metadata)
        }
      } else if (this.backgroundEventOptions) {
        // Forward to background element
        this.forwardEventToBackground(event, "click")
      }
    })

    // Pointer down
    this._canvas.addEventListener("pointerdown", (event: PointerEvent) => {
      // Skip events that we dispatched to avoid infinite recursion
      if (getRendererForEvent(event)) return

      const { x, y } = getCanvasCoords(event)
      const hitPointId = this.hitTester?.hitTest(x, y)

      if (hitPointId) {
        // Stop propagation to prevent the pointerdown from bubbling to the background
        event.stopPropagation()

        // Cancel any pending deselection. The window capture listener in useRendererPointerDown
        // fires before we see the event and schedules "deselectAll". We need to cancel it here
        // since we're clicking on a point, not the background.
        this.cancelAnimationFrame("deselectAll")

        this.draggingPointId = hitPointId
        const data = getPointAndMetadata(hitPointId)
        if (data) {
          this.onPointerDragStart?.(event, data.point, data.metadata)
        }

        // Add window listeners for drag
        this.addWindowDragListeners(getPointAndMetadata)
      } else if (this.backgroundEventOptions) {
        // Forward to background element for marquee selection.
        // The background component adds its own window listeners for pointermove/pointerup,
        // so we only need to forward the initial pointerdown.
        this.forwardEventToBackground(event, "pointerdown")
      }
    })
  }

  private addWindowDragListeners(
    getPointAndMetadata: (pointId: string) => { point: IPoint, metadata: IPointMetadata } | null
  ): void {
    // Remove any existing listeners first
    this.removeWindowDragListeners()

    // Pointer move on window (for drag)
    this.boundWindowPointerMove = (event: PointerEvent) => {
      if (this.draggingPointId && this._displayType !== "bars") {
        const data = getPointAndMetadata(this.draggingPointId)
        if (data) {
          this.onPointerDrag?.(event, data.point, data.metadata)
        }
      }
    }
    window.addEventListener("pointermove", this.boundWindowPointerMove)

    // Pointer up on window (to end drag)
    this.boundWindowPointerUp = (event: PointerEvent) => {
      if (this.draggingPointId) {
        const data = getPointAndMetadata(this.draggingPointId)
        if (data) {
          this.onPointerDragEnd?.(event, data.point, data.metadata)
        }
        this.draggingPointId = null

        // Clean up hover state
        this.hoveredPointId = null
        this.needsRedraw = true
        this.doStartRendering()
      }

      // Remove window listeners after drag ends
      this.removeWindowDragListeners()
    }
    window.addEventListener("pointerup", this.boundWindowPointerUp)
  }

  private removeWindowDragListeners(): void {
    if (this.boundWindowPointerMove) {
      window.removeEventListener("pointermove", this.boundWindowPointerMove)
      this.boundWindowPointerMove = null
    }
    if (this.boundWindowPointerUp) {
      window.removeEventListener("pointerup", this.boundWindowPointerUp)
      this.boundWindowPointerUp = null
    }
  }

  private forwardEventToBackground(event: PointerEvent | MouseEvent, eventType: string): void {
    if (!this.backgroundEventOptions || !this._canvas) return

    // Temporarily hide both the element specified in options AND our own canvas
    // to find the element underneath. The elementToHide is typically the pixi-points-host
    // container, but our Canvas 2D canvas is a separate element that also needs hiding.
    const { elementToHide } = this.backgroundEventOptions
    const originalHostPointerEvents = elementToHide.style.pointerEvents
    const originalCanvasPointerEvents = this._canvas.style.pointerEvents
    elementToHide.style.pointerEvents = "none"
    this._canvas.style.pointerEvents = "none"
    const elementUnderneath = document.elementFromPoint(event.clientX, event.clientY)
    elementToHide.style.pointerEvents = originalHostPointerEvents
    this._canvas.style.pointerEvents = originalCanvasPointerEvents

    if (elementUnderneath) {
      const newEvent = eventType === "click"
        ? new MouseEvent(eventType, event)
        : new PointerEvent(eventType, event)
      this.registerDispatchedEvent(newEvent)
      elementUnderneath.dispatchEvent(newEvent)
    }
  }
}

/**
 * Type guard to check if a renderer is a CanvasPointRenderer
 */
export function isCanvasPointRenderer(renderer: PointRendererBase | undefined): renderer is CanvasPointRenderer {
  return renderer instanceof CanvasPointRenderer
}
