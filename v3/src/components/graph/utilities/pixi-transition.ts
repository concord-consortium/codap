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

export type SupportedPropKey = "position" | "scale"
export type SupportedPropValue = { x: number, y: number }

export class PixiTranstion {
  duration = 0
  time = 0
  isFinished = false
  frameId: number | undefined
  points: PIXI.Sprite[] = []
  onFinishCallback?: () => void

  targetProp: Partial<Record<SupportedPropKey, SupportedPropValue[]>> = {}
  startProp: Partial<Record<SupportedPropKey, SupportedPropValue[]>> = {}

  constructor(duration: number, points: PIXI.Sprite[]) {
    this.duration = duration
    this.points = points
  }

  setTargetPosition(index: number, x: number, y: number) {
    this.setTargetXyProp("position", index, x, y)
  }

  setTargetScale(index: number, scale: number) {
    this.setTargetXyProp("scale", index, scale, scale)
  }

  play() {
    const transitionProps = Object.keys(this.targetProp) as SupportedPropKey[]
    if (transitionProps.length === 0) {
      this.handleOnFinish()
      return
    }

    let time = 0
    const duration = this.duration
    const startTime = performance.now()

    const transitionFrame = () => {
      const timeRatio = Math.min(1, time / duration)
      const factor = defaultInterpolation(timeRatio)

      transitionProps.forEach(propKey => {
        this.xyTransition(propKey, factor)
      })

      if (time < duration) {
        this.frameId = requestAnimationFrame(transitionFrame)
        time = performance.now() - startTime
      } else {
        this.frameId = undefined
        this.handleOnFinish()
      }
    }

    transitionFrame()
  }

  handleOnFinish() {
    this.onFinishCallback?.()
    this.isFinished = true
  }

  onFinish(callback: () => void) {
    this.onFinishCallback = callback
    if (this.isFinished) {
      this.onFinishCallback?.()
    }
  }

  destroy() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId)
    }
  }

  setTargetXyProp(propKey: SupportedPropKey, index: number, x: number, y: number) {
    let targetProp = this.targetProp[propKey]
    let startProp = this.startProp[propKey]
    if (!targetProp || !startProp) {
      targetProp = this.targetProp[propKey] = new Array(this.points.length)
      startProp = this.startProp[propKey] = new Array(this.points.length)
    }
    targetProp[index] = { x, y }
    startProp[index] = { x: this.points[index][propKey].x, y: this.points[index][propKey].y }
  }

  xyTransition(propKey: SupportedPropKey, factor: number) {
    for (let i = 0; i < this.points.length; i++) {
      const target = this.targetProp[propKey]?.[i]
      const start = this.startProp[propKey]?.[i]
      if (!target || !start) {
        continue // nothing to do for this point
      }
      const newX = start.x + factor * (target.x - start.x)
      const newY = start.y + factor * (target.y - start.y)
      this.points[i][propKey].set(newX, newY)
    }
  }
}
