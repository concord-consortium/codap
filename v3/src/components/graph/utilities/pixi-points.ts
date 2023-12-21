import * as PIXI from "pixi.js"
import { CaseData } from "../../data-display/d3-types"
import { PixiTransition } from "./pixi-transition"
import { hoverRadiusFactor, transitionDuration } from "../../data-display/data-display-types"

const DEFAULT_Z_INDEX = 0
const RAISED_Z_INDEX = 100
const MAX_SPRITE_SCALE = 2

export type IPixiPointsRef = React.MutableRefObject<PixiPoints | undefined>

export type DragHandler = (event: PointerEvent, point: PIXI.Sprite, metadata: IPixiPointMetadata) => void

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
    antialias: true,
    // `passive` is more performant and will be used by default in the future Pixi.JS versions
    eventMode: "passive",
    eventFeatures: {
      move: true,
      click: true,
      // disables the global move events which can be very expensive in large scenes
      globalMove: false,
      wheel: false
    }
  })
  stage = new PIXI.Container()
  pointsContainer = new PIXI.Container()
  background = new PIXI.Sprite(PIXI.Texture.EMPTY)
  ticker = new PIXI.Ticker()
  tickerStopTimeoutId: number | undefined

  pointMetadata: Map<PIXI.Sprite, IPixiPointMetadata> = new Map()
  caseIDToPoint: Map<string, PIXI.Sprite> = new Map()
  textures = new Map<string, PIXI.Texture>()

  activeTransitions = 0
  currentTransition?: PixiTransition

  onPointDragStart?: DragHandler
  onPointDrag?: DragHandler
  onPointDragEnd?: DragHandler

  constructor() {
    this.ticker.add(() => this.renderer.render(this.stage))
    this.stage.addChild(this.background)
    this.stage.addChild(this.pointsContainer)
    // Enable zIndex support
    this.pointsContainer.sortableChildren = true
  }

  get canvas() {
    return this.renderer.view as HTMLCanvasElement
  }

  get points() {
    return this.pointsContainer.children as PIXI.Sprite[]
  }

  get pointsCount() {
    return this.points.length
  }

  getPointByCaseId(caseId: string) {
    return this.caseIDToPoint.get(caseId) as PIXI.Sprite
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

  resize(width: number, height: number) {
    this.renderer.resize(width, height)
    this.background.width = width
    this.background.height = height
    this.rerender()
  }

  transition(duration: number, callback: () => void) {
    if (duration === 0) {
      callback()
      return
    }
    this.currentTransition = new PixiTransition(duration, this.points)
    this.currentTransition.onFinish(() => {
      this.stopRenderLoop()
    })
    callback()
    this.startRenderLoop()
    this.currentTransition.play()
    this.currentTransition = undefined
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
    const texture = this.renderer.generateTexture(graphics, {
      // A trick to make sprites/textures look still sharp when they're scaled up (e.g. during hover effect).
      // The default resolution is `devicePixelRatio`, so if we multiply it by `MAX_SPRITE_SCALE`, we can scale
      // sprites up to `MAX_SPRITE_SCALE` without losing sharpness.
      resolution: devicePixelRatio * MAX_SPRITE_SCALE
    })
    this.textures.set(key, texture)
    this.cleanupUnusedTextures()
    return texture
  }

  getMetadata(sprite: PIXI.Sprite) {
    const metadata = this.pointMetadata.get(sprite)
    if (!metadata) {
      throw new Error("Sprite not found in pointMetadata")
    }
    return metadata
  }

  getNewSprite(texture: PIXI.Texture) {
    const sprite = new PIXI.Sprite(texture)
    sprite.anchor.set(0.5)
    sprite.zIndex = DEFAULT_Z_INDEX
    this.setupSpriteInteractivity(sprite)
    return sprite
  }

  setupSpriteInteractivity(sprite: PIXI.Sprite) {
    sprite.eventMode = "static"
    sprite.cursor = "pointer"

    let draggingActive = false

    const setHoverRadius = () => {
      this.transition(transitionDuration, () => {
        this.setPointScale(sprite, hoverRadiusFactor)
      })
    }
    const restoreDefaultRadius = () => {
      this.transition(transitionDuration, () => {
        this.setPointScale(sprite, 1)
      })
    }

    // Hover effect
    sprite.on("pointerover", setHoverRadius)
    sprite.on("pointerleave", () => {
      if (!draggingActive) {
        restoreDefaultRadius()
      }
    })

    // Dragging
    sprite.on("pointerdown", (pointerDownEvent: PointerEvent) => {
      draggingActive = true
      this.onPointDragStart?.(pointerDownEvent, sprite, this.getMetadata(sprite))
      setHoverRadius()

      const onDrag = (onDragEvent: PointerEvent) => {
        if (draggingActive) {
          this.onPointDrag?.(onDragEvent, sprite, this.getMetadata(sprite))
        }
      }

      window.addEventListener("pointermove", onDrag)

      window.addEventListener("pointerup", (pointerUpEvent: PointerEvent) => {
        if (draggingActive) {
          draggingActive = false
          this.onPointDragEnd?.(pointerUpEvent, sprite, this.getMetadata(sprite))
          restoreDefaultRadius()
          window.removeEventListener("pointermove", onDrag)
        }
      })
    })
  }

  matchPointsToData(caseData: CaseData[], style: IPixiPointStyle) {
    const texture = this.getPointTexture(style)
    // First, remove all the old sprites. Go backwards, so it's less likely we end up with O(n^2) behavior (although
    // still possible). If we expect to have a lot of points removed, we should just destroy and recreate everything.
    // However, I believe that in most practical cases, we will only have a few points removed, so this is approach is
    // probably better.
    const newIDs = new Set(caseData.map(data => data.caseID))
    const currentIDs = new Set<string>()
    for (let i = this.points.length - 1; i >= 0; i--) {
      const point = this.points[i]
      const { caseID } = this.getMetadata(point)
      if (!newIDs.has(caseID)) {
        this.pointMetadata.delete(point)
        // Note that .destroy() call will also remove the point from the stage children array, so we don't have to
        // do that manually (e.g. using .removeChild()).
        point.destroy()
        this.caseIDToPoint.delete(caseID)
      } else {
        currentIDs.add(caseID)
        this.caseIDToPoint.set(caseID, point)
      }
    }

    // Save number of points before adding new points.
    const oldPointsCount = this.points.length

    // Now, add points that are in the new data but not in the old data.
    for (let i = 0; i < caseData.length; i++) {
      const { caseID, plotNum } = caseData[i]
      if (!currentIDs.has(caseID)) {
        const sprite = this.getNewSprite(texture)
        this.pointsContainer.addChild(sprite)
        this.pointMetadata.set(sprite, { caseID, plotNum, style })
        this.caseIDToPoint.set(caseID, sprite)
      }
    }

    // Process existing points.
    for (let i = 0; i < oldPointsCount; i++) {
      const point = this.points[i]
      if (point.texture !== texture) {
        point.texture = texture
        const metadata = this.getMetadata(point)
        metadata.style = style
      }
    }

    this.rerender()
  }

  forEachPoint(callback: (point: PIXI.Sprite, metadata: IPixiPointMetadata) => void, { selectedOnly = false } = {}) {
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i]
      const metadata = this.getMetadata(point)
      if (selectedOnly && point.zIndex !== RAISED_Z_INDEX) {
        continue
      }
      callback(point, metadata)
    }
    this.rerender()
  }

  forEachSelectedPoint(callback: (point: PIXI.Sprite, metadata: IPixiPointMetadata) => void) {
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i]
      if (point.zIndex === RAISED_Z_INDEX) {
        const metadata = this.getMetadata(point)
        callback(point, metadata)
      }
    }
    this.rerender()
  }

  setPointStyle(point: PIXI.Sprite, style: Partial<IPixiPointStyle>) {
    const metadata = this.getMetadata(point)
    const newStyle = { ...metadata.style, ...style }
    metadata.style = newStyle
    const texture = this.getPointTexture(newStyle)
    if (point.texture !== texture) {
      point.texture = texture
    }
    this.rerender()
  }

  setPointPosition(point: PIXI.Sprite, x: number, y: number) {
    if (this.currentTransition) {
      this.currentTransition.setTargetPosition(point, x, y)
    } else {
      point.position.set(x, y)
      this.rerender()
    }
  }

  setPointScale(point: PIXI.Sprite, scale: number) {
    if (this.currentTransition) {
      this.currentTransition.setTargetScale(point, scale)
    } else {
      point.scale.set(scale)
      this.rerender()
    }
  }

  setPointRaised(point: PIXI.Sprite, value: boolean) {
    point.zIndex = value ? RAISED_Z_INDEX : DEFAULT_Z_INDEX
    this.rerender()
  }

  dispose() {
    this.ticker.destroy()
    this.renderer.destroy()
    this.stage.destroy()
    this.textures.forEach(texture => texture.destroy())
  }
}
