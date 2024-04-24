import * as PIXI from "pixi.js"

// It's unclear what interpolation D3/SVG version uses. However, smoother feels pretty nice and probably it's not too
// far from the original. There's a couple of more options commented out below.
export type Interpolation = (input: number) => number
const smoother: Interpolation = (a: number) => a * a * a * (a * (a * 6 - 15) + 10)
const defaultInterpolation = smoother
// const smooth: Interpolation = (x: number) => x * x * (3 - 2 * x)
// const linear: Interpolation = (x: number) => x
// const smooth2: Interpolation = (x: number) => smooth(smooth(x))
// const pow2out: Interpolation = (x: number) => Math.pow(x - 1, 2) * (-1) + 1

export type TransitionProp = "anchor" | "position" | "scale"

export type TransitionTarget = { x: number, y: number, transition: PixiTransition }

export type TransitionPropMap = Partial<Record<TransitionProp, Map<PIXI.Sprite, TransitionTarget>>>

export class PixiTransition {
  startTime = performance.now()
  duration = 0
  onEndCallback?: () => void

  static anyTransitionActive(targetProps: TransitionPropMap) {
    const transitionProps = Object.keys(targetProps) as TransitionProp[]
    for (const propName of transitionProps) {
      if (targetProps[propName]?.size) {
        return true
      }
    }
    return false
  }

  static transitionStep(targetProps: TransitionPropMap, startProps: TransitionPropMap) {
    const now = performance.now()
    const finishedTransitions = new Set<PixiTransition>()
    const transitionProps = Object.keys(targetProps) as TransitionProp[]

    transitionProps.forEach(propKey => {
      const targetProp = targetProps[propKey]
      const startProp = startProps[propKey]
      if (!targetProp || !startProp) {
        return
      }

      for (const [point, target] of targetProp.entries()) {
        const transition = target.transition
        const progress = transition.getProgress(now)
        if (!point.destroyed) {
          const start = startProp.get(point) as TransitionTarget
          const newX = start.x + progress * (target.x - start.x)
          const newY = start.y + progress * (target.y - start.y)
          point[propKey].set(newX, newY)
        }
        if (progress === 1 || point.destroyed) {
          targetProp.delete(point)
          startProp.delete(point)
          finishedTransitions.add(transition)
        }
      }
    })

    for (const transition of finishedTransitions) {
      transition.handleOnEnd()
    }
  }

  constructor(duration: number, onEndCallback?: () => void) {
    this.duration = duration
    this.onEndCallback = onEndCallback
  }

  getProgress(now: number) {
    const time = now - this.startTime
    const timeRatio = Math.min(1, time / this.duration)
    return defaultInterpolation(timeRatio)
  }

  handleOnEnd() {
    this.onEndCallback?.()
  }
}
