import * as PIXI from "pixi.js"
import { CaseData } from "../../data-display/d3-types"
import { PixiTransition } from "./pixi-transition"

const DEFAULT_Z_INDEX = 0
const RAISED_Z_INDEX = 1
export interface IPixiPointMetadata {
  caseID: string
  plotNum: number
  style: IPixiPointStyle
}

export interface IPixiPointStyle {
  radius: number
  fill: string
  stroke: string
  strokeWidth: number
  strokeOpacity?: number
}

export class PixiPoints {
  renderer: PIXI.Renderer = new PIXI.Renderer({
    resolution: window.devicePixelRatio,
    autoDensity: true,
    backgroundAlpha: 0,
    antialias: true
  })
  stage = new PIXI.Container()
  ticker = new PIXI.Ticker()
  tickerStopTimeoutId: number | undefined

  pointMetadata: IPixiPointMetadata[] = []
  pointIdToIndex = new Map<string, number>()
  textures = new Map<string, PIXI.Texture>()

  activeTransitions = 0
  currentTransition?: PixiTransition

  constructor() {
    this.ticker.add(() => this.renderer.render(this.stage))
  }

  get canvas() {
    return this.renderer.view as HTMLCanvasElement
  }

  get points() {
    return this.stage.children as PIXI.Sprite[]
  }

  get pointsCount() {
    return this.points.length
  }

  startRenderLoop() {
    if (this.activeTransitions === 0) {
      this.ticker.start()
    }
    this.activeTransitions += 1
  }

  stopRenderLoop() {
    this.activeTransitions -= 1
    if (this.activeTransitions === 0) {
      this.ticker.stop()
    }
  }

  rerender() {
    // This function is currently used only by resize() and it uses render loop to avoid rendering in the main thread.
    if (this.activeTransitions) {
       // rendering loop is already running
      return
    }
    window.clearTimeout(this.tickerStopTimeoutId)
    this.tickerStopTimeoutId = window.setTimeout(() => {
      if (!this.activeTransitions) {
        this.ticker.stop()
      }
    }, 250)
    if (!this.ticker.started) {
      this.ticker.start()
    }
  }

  transition(duration: number, callback: () => void) {
    if (this.currentTransition) {
      this.currentTransition.destroy()
      this.currentTransition.onFinishCallback?.()
    }
    if (duration === 0) {
      callback()
      return
    }
    this.currentTransition = new PixiTransition(duration, this.points)
    this.currentTransition.onFinish(() => {
      this.currentTransition = undefined
      this.stopRenderLoop()
    })
    callback()
    this.startRenderLoop()
    this.currentTransition.play()
  }

  textureKey(style: IPixiPointStyle) {
    return JSON.stringify(style)
  }

  cleanupUnusedTextures() {
    // TODO PIXI
  }

  getPointTexture(style: IPixiPointStyle): PIXI.Texture {
    const { radius, fill, stroke, strokeWidth, strokeOpacity } = style
    const key = this.textureKey(style)
    if (this.textures.has(key)) {
      return this.textures.get(key) as PIXI.Texture
    }
    const graphics = new PIXI.Graphics()
    graphics.beginFill(fill)
    graphics.lineStyle(strokeWidth, stroke, strokeOpacity ?? 0.4)
    graphics.drawCircle(0, 0, radius)
    graphics.endFill()
    const texture = this.renderer.generateTexture(graphics)
    this.textures.set(key, texture)
    this.cleanupUnusedTextures()
    return texture
  }

  resize(width: number, height: number) {
    this.renderer.resize(width, height)
    this.rerender()
  }

  matchPointsToData(caseData: CaseData[], style: IPixiPointStyle) {
    // This map will get invalid because of point removal.
    this.pointIdToIndex.clear()
    const texture = this.getPointTexture(style)

    // First, remove all the old sprites. Go backwards, so it's less likely we end up with O(n^2) behavior (although
    // still possible). If we expect to have a lot of points removed, we should just destroy and recreate everything.
    // However, I believe that in most practical cases, we will only have a few points removed, so this is approach is
    // probably better.
    const newIDs = new Set(caseData.map(data => data.caseID))
    const currentIDs = new Set<string>()
    for (let i = this.points.length - 1; i >= 0; i--) {
      const point = this.points[i]
      const { caseID } = this.pointMetadata[i]
      if (!newIDs.has(caseID)) {
        // Note that .destroy() call will also remove the point from the stage children array, so we don't have to
        // do that manually (e.g. using .removeChild()).
        point.destroy()
        this.pointMetadata.splice(i, 1)
      } else {
        currentIDs.add(caseID)
      }
    }

    // Save number of points before adding new points.
    const oldPointsCount = this.points.length

    // Now, add points that are in the new data but not in the old data.
    for (let i = 0; i < caseData.length; i++) {
      const { caseID, plotNum } = caseData[i]
      if (!currentIDs.has(caseID)) {
        const sprite = new PIXI.Sprite(texture)
        this.stage.addChild(sprite)
        sprite.anchor.set(0.5)
        sprite.zIndex = DEFAULT_Z_INDEX
        this.pointMetadata.push({ caseID, plotNum, style })
        this.pointIdToIndex.set(caseID, this.pointMetadata.length - 1)
      }
    }

    // Process existing points.
    for (let i = 0; i < oldPointsCount; i++) {
      // Update pointIdToIndex map and style/texture (if needed).
      this.pointIdToIndex.set(this.pointMetadata[i].caseID, i)
      const point = this.points[i]
      if (point.texture !== texture) {
        point.texture = texture
        this.pointMetadata[i].style = style
      }
    }
  }

  forEachPoint(callback: (point: PIXI.Sprite, metadata: IPixiPointMetadata, index: number) => void,
    { selectedOnly = false } = {}) {
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i]
      const metadata = this.pointMetadata[i]
      if (selectedOnly && point.zIndex !== RAISED_Z_INDEX) {
        continue
      }
      callback(point, metadata, i)
    }
  }

  forEachSelectedPoint(callback: (point: PIXI.Sprite, metadata: IPixiPointMetadata, index: number) => void) {
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i]
      if (point.zIndex === RAISED_Z_INDEX) {
        const metadata = this.pointMetadata[i]
        callback(point, metadata, i)
      }
    }
  }

  setPointStyle(index: number, style: Partial<IPixiPointStyle>) {
    const newStyle = { ...this.pointMetadata[index]?.style ?? {}, ...style }
    this.pointMetadata[index].style = newStyle
    const texture = this.getPointTexture(newStyle)
    const point = this.points[index]
    if (point.texture !== texture) {
      point.texture = texture
    }
  }

  setPointPosition(index: number, x: number, y: number) {
    const point = this.points[index]
    if (this.currentTransition) {
      this.currentTransition.setTargetPosition(index, x, y)
    } else {
      point.position.set(x, y)
    }
  }

  setPointRaised(index: number, value: boolean) {
    const point = this.points[index]
    point.zIndex = value ? RAISED_Z_INDEX : DEFAULT_Z_INDEX
  }

  dispose() {
    this.renderer.destroy()
    this.stage.destroy()
    this.textures.forEach(texture => texture.destroy())
  }
}
