import { action, computed, makeObservable, observable } from "mobx"

const kMinScaleFactor = 0.1

/**
 * InBoundsScaling manages the ephemeral scaling state for inbounds mode.
 *
 * When inbounds mode is active, components are scaled uniformly to fit within
 * the container. The MST model stores the original/unscaled coordinates (source of truth),
 * while this class manages the computed scale factor and container dimensions used
 * for rendering.
 *
 * The scale factor is computed as:
 *   scaleFactor = min(containerWidth / scaleBoundsX, containerHeight / scaleBoundsY)
 *
 * Where scaleBoundsX and scaleBoundsY represent the minimum container dimensions
 * required to display all components at 100% scale.
 */
export class InBoundsScaling {
  // Current scale factor (0 < x <= 1). Components render at scaleFactor * originalSize.
  @observable scaleFactor = 1

  // Required width to display all components at 100% (includes inspector panels)
  @observable scaleBoundsX = 0

  // Required height to display all components at 100%
  @observable scaleBoundsY = 0

  // Current container dimensions (updated via ResizeObserver)
  @observable containerWidth = 0
  @observable containerHeight = 0

  // True while the container is being resized (disables transitions)
  @observable isResizing = false

  // Timer for debouncing resize end detection
  private resizeEndTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    makeObservable(this)
  }

  /**
   * True when components are being scaled down (scale factor < 1).
   */
  @computed
  get isScaled() {
    return this.scaleFactor < 1
  }

  /**
   * Update the container dimensions. Called from ResizeObserver.
   * Sets isResizing to true only when the size actually changes (not on initial/duplicate measurements).
   */
  @action
  setContainerSize(width: number, height: number) {
    const sizeChanged = this.containerWidth !== width || this.containerHeight !== height
    const hadPreviousSize = this.containerWidth > 0 && this.containerHeight > 0

    this.containerWidth = width
    this.containerHeight = height

    // Only set isResizing when size actually changes after we had a valid previous size
    // This preserves tile creation animations on page load
    if (sizeChanged && hadPreviousSize) {
      this.isResizing = true
      if (this.resizeEndTimer) {
        clearTimeout(this.resizeEndTimer)
      }
      this.resizeEndTimer = setTimeout(() => {
        this.setResizing(false)
      }, 150)
    }
  }

  /**
   * Set the resizing state directly.
   */
  @action
  setResizing(resizing: boolean) {
    this.isResizing = resizing
  }

  /**
   * Update the scale bounds (minimum dimensions for 100% display).
   */
  @action
  setScaleBounds(x: number, y: number) {
    this.scaleBoundsX = x
    this.scaleBoundsY = y
  }

  /**
   * Set the scale factor directly.
   */
  @action
  setScaleFactor(factor: number) {
    this.scaleFactor = Math.min(1, Math.max(kMinScaleFactor, factor))
  }

  /**
   * Recompute the scale factor based on current container size and scale bounds.
   * Returns 1 if container is large enough, or a value < 1 if scaling is needed.
   */
  @action
  recomputeScaleFactor() {
    if (this.scaleBoundsX <= 0 || this.scaleBoundsY <= 0) {
      this.scaleFactor = 1
      return
    }

    if (this.containerWidth >= this.scaleBoundsX && this.containerHeight >= this.scaleBoundsY) {
      // Container is large enough - no scaling needed
      this.scaleFactor = 1
    } else {
      // Container is too small - compute uniform scale factor
      const widthRatio = this.containerWidth / this.scaleBoundsX
      const heightRatio = this.containerHeight / this.scaleBoundsY
      this.scaleFactor = Math.max(kMinScaleFactor, Math.min(widthRatio, heightRatio))
    }
  }

  /**
   * Reset all scaling state.
   */
  @action
  reset() {
    this.scaleFactor = 1
    this.scaleBoundsX = 0
    this.scaleBoundsY = 0
    this.containerWidth = 0
    this.containerHeight = 0
    this.isResizing = false
    if (this.resizeEndTimer) {
      clearTimeout(this.resizeEndTimer)
      this.resizeEndTimer = null
    }
  }
}

// Singleton instance for global access
export const inBoundsScaling = new InBoundsScaling()
