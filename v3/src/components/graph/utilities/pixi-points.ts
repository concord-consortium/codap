import * as PIXI from "pixi.js"
import { CaseData } from "../../data-display/d3-types"
import { PixiTransition, TransitionPropMap, TransitionProp } from "./pixi-transition"
import { hoverRadiusFactor, transitionDuration } from "../../data-display/data-display-types"

const DEFAULT_Z_INDEX = 0
const RAISED_Z_INDEX = 100
const MAX_SPRITE_SCALE = 2

const strokeColor = "#ffffff"
const strokeColorHover = "#a35b3a"

// Anything lying beneath the PixiJS canvas, expecting events to be passed through, must utilize only these specified
// events. Others are currently not supported.
export enum PixiBackgroundPassThroughEvent {
  Click = "click",
  MouseOver = "mouseover",
  MouseOut = "mouseout",
  PointerDown = "pointerdown",
}

export type IPixiPointsRef = React.MutableRefObject<PixiPoints | undefined>

export type PixiPointEventHandler = (event: PointerEvent, point: PIXI.Sprite, metadata: IPixiPointMetadata) => void

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
  width?: number
  height?: number
}

// PixiPoints layer can be setup to distribute events from background to elements laying underneath.
export interface IBackgroundEventDistributionOptions {
  elementToHide: HTMLElement | SVGElement // element which should be hidden to obtain element laying underneath
  interactiveElClassName?: string // class name of elements that should receive passed events
}

export interface IPixiPointsOptions {
  resizeTo: HTMLElement
  backgroundEventDistribution?: IBackgroundEventDistributionOptions
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
  displayType = "points"
  barOrientation = "horizontal"

  resizeObserver?: ResizeObserver

  // It's the currently installed/configured transition, not necessarily that it's actively transitioning.
  currentTransition?: PixiTransition
  targetProp: TransitionPropMap = {}
  startProp: TransitionPropMap = {}

  onPointOver?: PixiPointEventHandler
  onPointLeave?: PixiPointEventHandler
  onPointClick?: PixiPointEventHandler
  onPointDragStart?: PixiPointEventHandler
  onPointDrag?: PixiPointEventHandler
  onPointDragEnd?: PixiPointEventHandler

  constructor(options?: IPixiPointsOptions) {
    this.ticker.add(this.tick.bind(this))
    this.stage.addChild(this.background)
    this.stage.addChild(this.pointsContainer)
    // Enable zIndex support
    this.pointsContainer.sortableChildren = true

    if (options?.backgroundEventDistribution) {
      this.setupBackgroundEventDistribution(options.backgroundEventDistribution)
    }

    if (options?.resizeTo) {
      this.resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          this.resize(width, height)
        }
      })
      this.resizeObserver.observe(options.resizeTo)
    }
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

  get anyTransitionActive() {
    return PixiTransition.anyTransitionActive(this.targetProp)
  }

  tick() {
    if (this.anyTransitionActive) {
      PixiTransition.transitionStep(this.targetProp, this.startProp)
    } else {
      // The only reason for ticker to run is to handle ongoing transitions. If there are no transitions, we can stop.
      this.ticker.stop()
    }
    this.renderer.render(this.stage)
  }

  resize(width: number, height: number) {
    this.renderer.resize(width, height)
    this.background.width = width
    this.background.height = height
    this.startRendering()
  }

  startRendering() {
    if (!this.ticker.started) {
      this.ticker.start()
    }
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
    this.startRendering()
  }

  forEachSelectedPoint(callback: (point: PIXI.Sprite, metadata: IPixiPointMetadata) => void) {
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i]
      if (point.zIndex === RAISED_Z_INDEX) {
        const metadata = this.getMetadata(point)
        callback(point, metadata)
      }
    }
    this.startRendering()
  }

  // This method should be used instead of directly setting the position of the point sprite, as it handles transitions.
  setPointPosition(point: PIXI.Sprite, x: number, y: number) {
    this.setPointXyProperty("position", point, x, y)
  }

  // This method should be used instead of directly setting the scale of the point sprite, as it handles transitions.
  setPointScale(point: PIXI.Sprite, scale: number) {
    this.setPointXyProperty("scale", point, scale, scale)
  }

  setAllPointsScale(scale: number, duration = 0) {
    return this.transition(() => {
      this.points.forEach(point => {
        this.setPointScale(point, scale)
      })
    }, { duration })
  }

  setPointXyProperty(prop: TransitionProp, point: PIXI.Sprite, x: number, y: number) {
    if (this.currentTransition) {
      this.setTargetXyProp(prop, point, x, y)
    } else {
      // Cancel any ongoing transition for this point and simply set the new position immediately.
      const targetProp = this.targetProp[prop]
      if (targetProp?.has(point)) {
        targetProp.delete(point)
      }
      point[prop].set(x, y)
      this.startRendering()
    }
  }

  setTargetXyProp(propKey: TransitionProp, point: PIXI.Sprite, x: number, y: number) {
    if (!this.currentTransition) {
      return
    }
    let targetProp = this.targetProp[propKey]
    let startProp = this.startProp[propKey]
    if (!targetProp || !startProp) {
      targetProp = this.targetProp[propKey] = new Map()
      startProp = this.startProp[propKey] = new Map()
    }
    targetProp.set(point, { x, y, transition: this.currentTransition })
    startProp.set(point, { x: point[propKey].x, y: point[propKey].y, transition: this.currentTransition })
  }

  setPointRaised(point: PIXI.Sprite, value: boolean) {
    point.zIndex = value ? RAISED_Z_INDEX : DEFAULT_Z_INDEX
    this.startRendering()
  }

  setPointStyle(point: PIXI.Sprite, style: Partial<IPixiPointStyle>) {
    const newStyle = this.updatePointStyle(point, style)
    const texture = this.getPointTexture(newStyle)
    if (point.texture !== texture) {
      point.texture = texture
    }
    this.startRendering()
  }

  getPointByCaseId(caseId: string) {
    return this.caseIDToPoint.get(caseId) as PIXI.Sprite
  }

  transition(callback: () => void, options: { duration: number }) {
    const { duration } = options
    if (duration === 0) {
      callback()
      return Promise.resolve()
    }
    return new Promise<void>(resolve => {
      this.currentTransition = new PixiTransition(duration, () => resolve())
      callback()
      this.currentTransition = undefined
      this.startRendering()
    })
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

  textureKey(style: IPixiPointStyle) {
    return JSON.stringify(style)
  }

  updatePointStyle(point: PIXI.Sprite, style: Partial<IPixiPointStyle>) {
    Object.keys(style).forEach((key: any) => {
      // Sometimes, client code might provide empty strings as style values. This means that the given property
      // should not be changed from its current value.
      const styleAny = style as any
      if (styleAny[key] == null || styleAny[key] === "") {
        delete styleAny[key]
      }
    })
    const metadata = this.getMetadata(point)
    const newStyle = { ...metadata.style, ...style }
    metadata.style = newStyle
    return newStyle
  }

  getPointTexture(style: IPixiPointStyle): PIXI.Texture {
    // TODO: It would be better to not create new textures for every width and height as doing so will generate more 
    // textures than necessary, possibly causing performance issues. If possible, generate a single texture here, and
    // when it's necessary to vary width and height (i.e. when displayType === "bars"), adjust those properties
    // directly on the sprites elsewhere, probably in `setPointStyle`. There are scaling issues to do with stroke width
    // that need to be worked out before we can do that, though. For now, we generate a new texture for each width
    // and height when `displayType` is `bars`.
    const { radius, fill, stroke, strokeWidth, strokeOpacity, width, height } = style
    const styleForKey = this.displayType !== "bars"
      ? { radius, fill, stroke, strokeWidth, strokeOpacity }
      : style
    const styleAndDisplayType = { ...styleForKey, displayType: this.displayType }
    const key = this.textureKey(styleAndDisplayType)
    // If there's already a matching texture, return that instead of creating a new one.
    if (this.textures.has(key)) {
      return this.textures.get(key) as PIXI.Texture
    }
    const graphics = new PIXI.Graphics()
    graphics.beginFill(fill)
    graphics.lineStyle(strokeWidth, stroke, strokeOpacity ?? 0.4)
    if (this.displayType === "bars") {
      graphics.drawRect(0, 0, width ?? radius * 2, height ?? radius * 2)
    } else {
      graphics.drawCircle(0, 0, radius)
    }
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

  cleanupUnusedTextures() {
    // TODO PIXI
  }

  setupBackgroundEventDistribution(options: IBackgroundEventDistributionOptions) {
    const { elementToHide } = options

    const getElementUnderCanvas = (event: PIXI.FederatedPointerEvent) => {
      const originalPointerEvents = elementToHide.style.pointerEvents
      elementToHide.style.pointerEvents = "none"
      const elementUnderneath = document.elementFromPoint(event.clientX, event.clientY)
      elementToHide.style.pointerEvents = originalPointerEvents
      return elementUnderneath
    }

    // Note that background event handling attempts to pass the event to the element beneath the cursor,
    // as if the canvas background were transparent. This facilitates the passing of events to other map layers.
    this.background.eventMode = "static"

    // Click event redistribution.
    this.background.on("click", (event: PIXI.FederatedPointerEvent) => {
      const elementUnderneath = getElementUnderCanvas(event)
      // Dispatch the same event to the element under the cursor.
      if (elementUnderneath) {
        elementUnderneath.dispatchEvent(new MouseEvent("click", event))
      }
    })

    this.background.on("pointerdown", (event: PIXI.FederatedPointerEvent) => {
      const elementUnderneath = getElementUnderCanvas(event)
      // Dispatch the same event to the element under the cursor.
      if (elementUnderneath) {
        elementUnderneath.dispatchEvent(new PointerEvent("pointerdown", event))
      }
    })

    // Handle mousemove events by dispatching mouseover/mouseout events to the elements beneath the cursor.
    let mouseoverElement: Element | undefined
    this.background.on("mousemove", (event: PIXI.FederatedPointerEvent) => {
      const elementUnderneath = getElementUnderCanvas(event)
      if (elementUnderneath && elementUnderneath === mouseoverElement) {
        // Mouse moving over the same element, no need to do anything.
        return
      }
      if (elementUnderneath) {
        if (mouseoverElement && mouseoverElement !== elementUnderneath) {
          mouseoverElement.dispatchEvent(new MouseEvent("mouseout", event))
        }
        elementUnderneath.dispatchEvent(new MouseEvent("mouseover", event))
        mouseoverElement = elementUnderneath
      } else if (mouseoverElement) {
        mouseoverElement.dispatchEvent(new MouseEvent("mouseout", event))
        mouseoverElement = undefined
      }
    })
    this.background.on("mouseout", (event: PIXI.FederatedPointerEvent) => {
      if (mouseoverElement) {
        mouseoverElement.dispatchEvent(new MouseEvent("mouseout", event))
        mouseoverElement = undefined
      }
    })
  }

  setupSpriteInteractivity(sprite: PIXI.Sprite) {
    sprite.eventMode = "static"
    sprite.cursor = "pointer"

    let draggingActive = false

    const handlePointerOver = (pointerEvent: PIXI.FederatedPointerEvent) => {
      if (this.displayType === "bars") {
        const newStyle = { ...this.getMetadata(sprite).style, stroke: strokeColorHover }
        this.setPointStyle(sprite, newStyle)
      } else {
        this.transition(() => {
          this.setPointScale(sprite, hoverRadiusFactor)
        }, { duration: transitionDuration })
      }
      if (!draggingActive) {
        this.onPointOver?.(pointerEvent, sprite, this.getMetadata(sprite))
      } else {
        this.onPointLeave?.(pointerEvent, sprite, this.getMetadata(sprite))
      }
    }
    const handlePointerLeave = (pointerEvent: PIXI.FederatedPointerEvent) => {
      if (this.displayType === "bars") {
        const newStyle = { ...this.getMetadata(sprite).style, stroke: strokeColor }
        this.setPointStyle(sprite, newStyle)
      } else {
        this.transition(() => {
          this.setPointScale(sprite, 1)
        }, { duration: transitionDuration })
      }
      this.onPointLeave?.(pointerEvent, sprite, this.getMetadata(sprite))
    }

    // Hover effect
    sprite.on("pointerover", (pointerEvent: PIXI.FederatedPointerEvent) => {
      handlePointerOver(pointerEvent)
    })
    sprite.on("pointerleave", (pointerEvent: PIXI.FederatedPointerEvent) => {
      if (!draggingActive) {
        handlePointerLeave(pointerEvent)
      }
    })

    sprite.on("click", (clickEvent: PIXI.FederatedPointerEvent) => {
      this.onPointClick?.(clickEvent, sprite, this.getMetadata(sprite))
    })

    // Dragging
    sprite.on("pointerdown", (pointerDownEvent: PIXI.FederatedPointerEvent) => {
      draggingActive = true
      this.onPointDragStart?.(pointerDownEvent, sprite, this.getMetadata(sprite))

      const onDrag = (onDragEvent: PointerEvent) => {
        // bars cannot be dragged
        if (draggingActive && this.displayType !== "bars") {
          this.onPointDrag?.(onDragEvent, sprite, this.getMetadata(sprite))
        }
      }

      const onDragEnd = (pointerUpEvent: PointerEvent) => {
        if (draggingActive) {
          draggingActive = false
          this.onPointDragEnd?.(pointerUpEvent, sprite, this.getMetadata(sprite))
          window.removeEventListener("pointermove", onDrag)
          window.removeEventListener("pointerup", onDragEnd)
        }
      }

      window.addEventListener("pointermove", onDrag)
      window.addEventListener("pointerup", onDragEnd)
    })
  }

  matchPointsToData(caseData: CaseData[], displayType: string, style: IPixiPointStyle) {
    this.displayType = displayType
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
        // The anchor should be set according to the point's shape.
        // Circle: center (0.5)
        // Horizontal Bar: bottom left corner (1,0)
        // Vertical Bar: top left corner (0,0)
        point.anchor.set(
          this.displayType === "bars" ? (this.barOrientation === "horizontal" ? 1 : 0) : 0.5,
          this.displayType === "bars" ? 0 : 0.5
        )
        point.texture = texture
        const metadata = this.getMetadata(point)
        metadata.style = style
      }
    }

    // Before rendering, reset the scale for all points. This may be necessary if the scale was modified
    // during a transition immediately before matchPointsToData is called. For example, when the Connecting
    // Lines graph adornment is activated or deactivated.
    this.setAllPointsScale(1)

    this.startRendering()
  }

  dispose() {
    this.ticker.destroy()
    this.renderer.destroy()
    this.stage.destroy()
    this.textures.forEach(texture => texture.destroy())
    this.resizeObserver?.disconnect()
  }
}
