import * as PIXI from "pixi.js"
import { Actions, Interpolations } from "pixi-actions"
import { CaseData } from "../../data-display/d3-types"

const DEFAULT_Z_INDEX = 0
const RAISED_Z_INDEX = 1
const TARGET_FPS = 60
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

export type Interpolation = (input: number) => number

export class PixiPoints {
  app: PIXI.Application = new PIXI.Application({
    resolution: window.devicePixelRatio,
    autoDensity: true,
    backgroundAlpha: 0,
    antialias: true
  })
  pointMetadata: IPixiPointMetadata[] = []
  pointIdToIndex = new Map<string, number>()
  textures = new Map<string, PIXI.Texture>()
  transitionDuration = 0.5 // seconds
  transitionInterpolation = Interpolations.smooth

  constructor() {
    this.app.ticker.add((delta) => {
      Actions.tick(delta / TARGET_FPS)
    })
  }

  get canvas() {
    return this.app.view as HTMLCanvasElement
  }

  get points() {
    return this.app.stage.children as PIXI.Sprite[]
  }

  get pointsCount() {
    return this.points.length
  }

  setTransitionDuration(duration: number) {
    this.transitionDuration = duration / 1000
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
    const texture = this.app.renderer.generateTexture(graphics)
    this.textures.set(key, texture)
    this.cleanupUnusedTextures()
    return texture
  }

  resize(width: number, height: number) {
    this.app.renderer.resize(width, height)
  }

  matchPointsToData(caseData: CaseData[], style: IPixiPointStyle) {
    // This map will get invalid because of point removal.
    this.pointIdToIndex.clear()
    const texture = this.getPointTexture(style)

    // First, remove all the old sprites. Go backwards, so it's less likely we end up with O(n^2) behavior (although
    // still possible). If we expect to have a lot of points removed, we should just destroy and recreate everything.
    // However, I believe than in most practical cases, we will only have a few points removed, so this is approach is
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
        this.app.stage.addChild(sprite)
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
    point.position.set(x, y)
  }

  movePointTo(index: number, x: number, y: number) {
    if (this.transitionDuration > 0) {
      Actions.moveTo(this.points[index], x, y, this.transitionDuration, this.transitionInterpolation).play()
    } else {
      this.setPointPosition(index, x, y)
    }
  }

  setPointRaised(index: number, value: boolean) {
    const point = this.points[index]
    point.zIndex = value ? RAISED_Z_INDEX : DEFAULT_Z_INDEX
  }

  dispose() {
    this.app.destroy()
    this.textures.forEach(texture => texture.destroy())
  }
}
