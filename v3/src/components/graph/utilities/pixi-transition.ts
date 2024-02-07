import * as PIXI from "pixi.js"
import { IPixiPointStyle, MAX_SPRITE_SCALE } from "./pixi-types"

// It's unclear what interpolation D3/SVG version uses. However, smoother feels pretty nice and probably it's not too
// far from the original. There's a couple of more options commented out below.
export type Interpolation = (input: number) => number
const smoother: Interpolation = (a: number) => a * a * a * (a * (a * 6 - 15) + 10)
const defaultInterpolation = smoother
// const smooth: Interpolation = (x: number) => x * x * (3 - 2 * x)
// const linear: Interpolation = (x: number) => x
// const smooth2: Interpolation = (x: number) => smooth(smooth(x))
// const pow2out: Interpolation = (x: number) => Math.pow(x - 1, 2) * (-1) + 1

export type TransitionProp = "position" | "scale" | "style"

export type TransitionTarget = { x: number, y: number, transition: PixiTransition }
export type TransitionStyleTarget = { style: IPixiPointStyle, transition: PixiTransition }
export type TransitionPropMap =
  Partial<Record<TransitionProp, Map<PIXI.Sprite, TransitionTarget | TransitionStyleTarget>>>

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

  static transitionStep(targetProps: TransitionPropMap, startProps: TransitionPropMap, renderer?: PIXI.Renderer) {
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
          if (propKey === "position" || propKey === "scale") {
            const targetPosition = target as TransitionTarget
            const start = startProp.get(point) as TransitionTarget
            const newX = start.x + progress * (targetPosition.x - start.x)
            const newY = start.y + progress * (targetPosition.y - start.y)
            point[propKey].set(newX, newY)
          } else if (propKey === "style" && renderer) {
            const targetStyle = target as TransitionStyleTarget
            const start = startProp.get(point) as TransitionStyleTarget
            const { fill, radius, stroke, strokeOpacity=0.4 } = targetStyle.style
            const { radius: currentRadius, strokeWidth: currentStrokeWidth } = start.style
            // Calculate the radius scale based on the transition progress
            const radiusScale = 1 + progress * (radius / currentRadius - 1)
            const newRadius = currentRadius * radiusScale
            // Currently strokeWidth will simply be scaled using the ratio of the new radius to the current radius.
            const newStrokeWidth = currentStrokeWidth * (progress * (radius / currentRadius - 1))
            // This generation of new textures is potentially inefficient.
            const graphics = new PIXI.Graphics()
            graphics.beginFill(fill) // fill does not transition
            graphics.lineStyle(newStrokeWidth, stroke, strokeOpacity) // stroke and strokeOpacity do not transition
            graphics.drawCircle(0, 0, newRadius)
            graphics.endFill()
            const texture = renderer.generateTexture(graphics, {
              // A trick to make sprites/textures look still sharp when they're scaled up (e.g. during hover effect).
              // The default resolution is `devicePixelRatio`, so if we multiply it by `MAX_SPRITE_SCALE`, we can scale
              // sprites up to `MAX_SPRITE_SCALE` without losing sharpness.
              resolution: devicePixelRatio * MAX_SPRITE_SCALE
            })
            renderer.plugins.prepare.upload(texture, 0, 0, point)
            point.texture = texture
            graphics.destroy()
          }
        }
        if (progress === 1 || point.destroyed) {
          targetProp.delete(point)
          startProp.delete(point)
          finishedTransitions.add(transition)
          // PIXI.utils.destroyTextureCache()
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
