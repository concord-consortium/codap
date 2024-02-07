import * as PIXI from "pixi.js"
import { CaseData } from "../../data-display/d3-types"
import { PixiTransition, TransitionPropMap, TransitionProp } from "./pixi-transition"
import { hoverRadiusFactor, transitionDuration } from "../../data-display/data-display-types"
import { DEFAULT_Z_INDEX, IPixiPointMetadata, IPixiPointStyle, MAX_SPRITE_SCALE, RAISED_Z_INDEX } from "./pixi-types"

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

  resizeObserver?: ResizeObserver

  // It's the currently installed/configured transition, not necessarily that it's actively transitioning.
  currentTransition?: PixiTransition
  targetProp: TransitionPropMap = {}
  startProp: TransitionPropMap = {}
  targetStyleProp: TransitionPropMap = {}
  startStyleProp: TransitionPropMap = {}

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
    const activeReg = PixiTransition.anyTransitionActive(this.targetProp)
    const activeStyle = PixiTransition.anyTransitionActive(this.targetStyleProp)
    return activeReg || activeStyle
  }

  tick() {
    if (this.anyTransitionActive) {
      PixiTransition.transitionStep(this.targetProp, this.startProp)
      PixiTransition.transitionStep(this.targetStyleProp, this.startStyleProp, this.renderer)
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

  setPointXyProperty(prop: TransitionProp, point: PIXI.Sprite, x: number, y: number) {
    if (prop !== "position" && prop !== "scale") {
      return
    }
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
    if (!this.currentTransition || (propKey !== "position" && propKey !== "scale")) {
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
  setTargetStyle(point: PIXI.Sprite, newStyle: IPixiPointStyle, style: IPixiPointStyle) {
    if (!this.currentTransition) {
      return
    }
    const propKey = "style"
    let targetStyleProp = this.targetStyleProp[propKey]
    let startStyleProp = this.startStyleProp[propKey]
    if (!targetStyleProp || !startStyleProp) {
      targetStyleProp = this.targetStyleProp[propKey] = new Map()
      startStyleProp = this.startStyleProp[propKey] = new Map()
    }
    targetStyleProp.set(point, { style: newStyle, transition: this.currentTransition, })
    startStyleProp.set(point, { style, transition: this.currentTransition })
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

  transition(callback: () => void, options: { duration: number, onEnd?: () => void }) {
    const { duration, onEnd } = options
    if (duration === 0) {
      callback()
      return
    }
    this.currentTransition = new PixiTransition(duration, onEnd)
    callback()
    this.currentTransition = undefined
    this.startRendering()
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
    const { radius, fill, stroke, strokeWidth, strokeOpacity } = style
    const key = this.textureKey(style)
    if (this.textures.has(key)) {
      return this.textures.get(key) as PIXI.Texture
    }
    const graphics = new PIXI.Graphics()
    graphics.beginFill(fill)
    graphics.lineStyle(strokeWidth, stroke, strokeOpacity ?? 0.4)
    graphics.drawRoundedRect(0, 0, radius * 2, radius * 2, radius)
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
      this.transition(() => {
        this.setPointScale(sprite, hoverRadiusFactor)
      }, { duration: transitionDuration })
      if (!draggingActive) {
        this.onPointOver?.(pointerEvent, sprite, this.getMetadata(sprite))
      } else {
        this.onPointLeave?.(pointerEvent, sprite, this.getMetadata(sprite))
      }
    }
    const handlePointerLeave = (pointerEvent: PIXI.FederatedPointerEvent) => {
      this.transition(() => {
        this.setPointScale(sprite, 1)
      }, { duration: transitionDuration })
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
        if (draggingActive) {
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

  matchPointsToData(caseData: CaseData[], style: IPixiPointStyle, animateChange = false) {
    // If the changes should be animated, we will use the current texture and animate the style changes later.
    // Otherwise, we create a new texture with the new style and apply it immediately.
    // TODO: Is there a better way to get the current style?
    const currentStyle = this.points[0] ? this.getMetadata(this.points[0]).style : style
    const texture = animateChange ? this.getPointTexture(currentStyle) : this.getPointTexture(style)
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
        this.pointMetadata.set(sprite, { caseID, plotNum, style: animateChange ? currentStyle : style })
        this.caseIDToPoint.set(caseID, sprite)
      }
    }

    // Process existing points.
    for (let i = 0; i < oldPointsCount; i++) {
      const point = this.points[i]
      if (point.texture !== texture) {
        point.texture = texture
        const metadata = this.getMetadata(point)
        metadata.style = animateChange ? currentStyle : style
      }
    }

    // If we're animating the change, we need to transition the point style/texture changes
    animateChange && this.points.forEach((point) => {
      this.transition(() => {
        this.setTargetStyle(point, style, currentStyle)
      }, { duration: transitionDuration })
      this.getMetadata(point).style = style
    })

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
