import * as PIXI from "pixi.js"
import { CaseData } from "../../data-display/d3-types"

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
  app: PIXI.Application = new PIXI.Application({
    resolution: window.devicePixelRatio,
    autoDensity: true,
    backgroundAlpha: 0,
    antialias: true
  })
  pointMetadata: IPixiPointMetadata[] = []
  textures = new Map<string, PIXI.Texture>()

  get canvas() {
    return this.app.view as HTMLCanvasElement
  }

  get points() {
    return this.app.stage.children as PIXI.Sprite[]
  }

  get pointsCount() {
    return this.points.length
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
    // TODO PIXI: optimize this method. We don't have to remove all children and re-add them.
    this.app.stage.removeChildren()
    this.pointMetadata = []

    for (let i = 0; i < caseData.length; i++) {
      const texture = this.getPointTexture(style)
      const data = caseData[i]
      const sprite = new PIXI.Sprite(texture)
      this.app.stage.addChild(sprite)
      sprite.anchor.set(0.5)
      sprite.position.x = Math.random() * this.app.renderer.width / 2
      sprite.position.y = Math.random() * this.app.renderer.height / 2
      sprite.zIndex = DEFAULT_Z_INDEX
      this.pointMetadata.push({ caseID: data.caseID, plotNum: data.plotNum, style })
    }
  }

  forEachPoint(callback: (point: PIXI.Sprite, metadata: IPixiPointMetadata, index: number) => void) {
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i]
      const metadata = this.pointMetadata[i]
      callback(point, metadata, i)
    }
  }

  setPointStyle(index: number, style: Partial<IPixiPointStyle>) {
    const newStyle = { ...this.pointMetadata[index].style, ...style }
    this.pointMetadata[index].style = newStyle
    const texture = this.getPointTexture(newStyle)
    const point = this.points[index]
    point.texture = texture
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
