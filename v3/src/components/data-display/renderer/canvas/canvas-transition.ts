/**
 * Canvas transition system for animated point movements.
 *
 * Uses the same interpolation function as PixiTransition for visual consistency
 * when users switch between WebGL and Canvas renderers.
 */

/**
 * Properties that can be transitioned
 */
export type CanvasTransitionProp = "x" | "y" | "scale"

/**
 * Target state for a single property transition
 */
export interface ICanvasTransitionTarget {
  pointId: string
  prop: CanvasTransitionProp
  startValue: number
  targetValue: number
  transition: CanvasTransition
}

/**
 * Smoother interpolation function - same as PixiTransition for visual consistency
 * This provides a smooth ease-in-out effect
 */
const smoother = (a: number): number => a * a * a * (a * (a * 6 - 15) + 10)

/**
 * Represents a single transition with duration and timing
 */
export class CanvasTransition {
  readonly startTime = performance.now()
  readonly duration: number
  private onEndCallback?: () => void
  private ended = false

  constructor(duration: number, onEndCallback?: () => void) {
    this.duration = duration
    this.onEndCallback = onEndCallback
  }

  /**
   * Get the current progress of the transition (0 to 1)
   * Uses smoother interpolation for visual consistency with PixiTransition
   */
  getProgress(now: number): number {
    const time = now - this.startTime
    const timeRatio = Math.min(1, time / this.duration)
    return smoother(timeRatio)
  }

  /**
   * Check if the transition has completed
   */
  isComplete(now: number): boolean {
    return (now - this.startTime) >= this.duration
  }

  /**
   * Call the completion callback (only once)
   */
  handleOnEnd(): void {
    if (!this.ended) {
      this.ended = true
      this.onEndCallback?.()
    }
  }
}

/**
 * Manages multiple concurrent transitions for Canvas rendering.
 *
 * Unlike PixiTransition which updates PIXI.Sprite properties directly,
 * this manager returns interpolated values that the renderer applies
 * to its internal state before redrawing.
 */
export class CanvasTransitionManager {
  /**
   * Active transitions keyed by "pointId:prop"
   */
  private activeTransitions = new Map<string, ICanvasTransitionTarget>()

  /**
   * Current transition being populated (set during beginTransition/endTransition)
   */
  private currentTransition: CanvasTransition | null = null

  /**
   * Begin a new transition. All setTarget calls until endTransition
   * will be associated with this transition.
   */
  beginTransition(duration: number, onEnd?: () => void): void {
    this.currentTransition = new CanvasTransition(duration, onEnd)
  }

  /**
   * End the current transition setup
   */
  endTransition(): void {
    this.currentTransition = null
  }

  /**
   * Set a target value for a property. Must be called between
   * beginTransition and endTransition.
   */
  setTarget(pointId: string, prop: CanvasTransitionProp, startValue: number, targetValue: number): void {
    if (!this.currentTransition) return

    const key = `${pointId}:${prop}`
    this.activeTransitions.set(key, {
      pointId,
      prop,
      startValue,
      targetValue,
      transition: this.currentTransition
    })
  }

  /**
   * Check if there are any active transitions
   */
  hasActiveTransitions(): boolean {
    return this.activeTransitions.size > 0
  }

  /**
   * Check if we're currently setting up a transition
   * (between beginTransition and endTransition calls)
   */
  isSettingUpTransition(): boolean {
    return this.currentTransition !== null
  }

  /**
   * Process one step of all active transitions.
   * Returns a map of pointId -> { prop -> currentValue } for all transitioning properties.
   */
  step(): Map<string, Map<CanvasTransitionProp, number>> {
    const now = performance.now()
    const results = new Map<string, Map<CanvasTransitionProp, number>>()
    const completedTransitions = new Set<CanvasTransition>()
    const keysToRemove: string[] = []

    for (const [key, target] of this.activeTransitions) {
      const progress = target.transition.getProgress(now)

      // Interpolate the value
      const currentValue = target.startValue + progress * (target.targetValue - target.startValue)

      // Store in results
      if (!results.has(target.pointId)) {
        results.set(target.pointId, new Map())
      }
      results.get(target.pointId)!.set(target.prop, currentValue)

      // Check if complete
      if (target.transition.isComplete(now)) {
        completedTransitions.add(target.transition)
        keysToRemove.push(key)
      }
    }

    // Clean up completed transitions
    for (const key of keysToRemove) {
      this.activeTransitions.delete(key)
    }

    // Call completion callbacks
    for (const transition of completedTransitions) {
      transition.handleOnEnd()
    }

    return results
  }

  /**
   * Cancel all active transitions for a specific point
   */
  cancelTransitionsForPoint(pointId: string): void {
    const keysToRemove: string[] = []
    for (const [key, target] of this.activeTransitions) {
      if (target.pointId === pointId) {
        keysToRemove.push(key)
      }
    }
    for (const key of keysToRemove) {
      this.activeTransitions.delete(key)
    }
  }

  /**
   * Cancel all active transitions
   */
  cancelAllTransitions(): void {
    this.activeTransitions.clear()
  }

  /**
   * Get the current target value for a property if it's being transitioned
   */
  getTargetValue(pointId: string, prop: CanvasTransitionProp): number | undefined {
    const key = `${pointId}:${prop}`
    return this.activeTransitions.get(key)?.targetValue
  }
}
