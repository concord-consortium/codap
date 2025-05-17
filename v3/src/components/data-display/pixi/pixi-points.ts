import * as PIXI from "pixi.js"
import { isFiniteNumber } from "../../../utilities/math-utils"
import { PointerState } from "../models/pointer-state"
import { CaseData, CaseDataWithSubPlot } from "../d3-types"
import { hoverRadiusFactor, transitionDuration } from "../data-display-types"
import { PixiTransition, TransitionPropMap, TransitionProp } from "./pixi-transition"

const DEFAULT_Z_INDEX = 0
const RAISED_Z_INDEX = 100
const MAX_SPRITE_SCALE = 2

export const circleAnchor = { x: 0.5, y: 0.5 }
export const hBarAnchor = { x: 1, y: 0 }
export const vBarAnchor = { x: 0, y: 0 }

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

export type PixiPointsArray = Array<Maybe<PixiPoints>>

// without this cast using TypeScript 5.7, we get the following error:
// "Type 'FederatedPointerEvent' is missing the following properties
// from type 'PointerEvent': altitudeAngle, azimuthAngle"
const toPointerEvent = (event: PIXI.FederatedPointerEvent) => event as unknown as PointerEvent
const toFederatedPointerEvent = (event: PointerEvent) => event as unknown as PIXI.FederatedPointerEvent

export type PixiPointEventHandler = (event: PointerEvent, point: PIXI.Sprite, metadata: IPixiPointMetadata) => void

export interface IPixiPointMetadata extends CaseData {
  datasetID: string
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

export const PixiPointsAnimationFrameRequestIds = ["deselectAll"] as const
export type PixiPointsAnimationFrameRequestId = typeof PixiPointsAnimationFrameRequestIds[number]

// map from dispatched event to the PixiPoints instance that dispatched it
const pixiDispatchedEventsMap = new WeakMap<Event | PIXI.FederatedEvent, PixiPoints>()

export function getPixiPointsDispatcher(event: Event) {
  return pixiDispatchedEventsMap.get(event)
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

interface IDisplayTypeTransitionState {
  isActive: boolean
}

interface ITransitionPointDisplayTypeOptions {
  point: PIXI.Sprite
  style: Partial<IPixiPointStyle>
  x: number
  y: number
}

interface IPointTransitionState {
  hasTransitioned: boolean
}

const caseDataKey = ({ plotNum, caseID }: CaseData) => `${plotNum}:${caseID}`

export class PixiPoints {
  renderer?: PIXI.Renderer
  stage = new PIXI.Container()
  pointsContainer = new PIXI.Container()
  background = new PIXI.Sprite(PIXI.Texture.EMPTY)
  subPlotMasks: PIXI.Graphics[] = []
  ticker = new PIXI.Ticker()
  tickerStopTimeoutId: number | undefined
  // For bar charts and histograms, we need events to be passed to the "cover" rectangles that
  // overlay the pixi sprites. This happens seamlessly in Chrome and Firefox, but not in Safari.
  // TODO: Rather than using browser-detection, a better approach would be to runtime-detect the
  // problematic behavior and use that to determine whether to use the workaround. For instance,
  // if the problem is really that the bar cover SVGs never receive pointer events, then the
  // handler for those pointer events could be used to disable the Safari-specific event dispatch.
  // This would allow the code to continue to work once Safari fixes the underlying issue.
  isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  // To dispatch to Safari for 'mouseout' we need the element we are leaving, computable from the event's x,y coords.
  mostRecentSvgElement: SVGElement | null = null

  pointMetadata: Map<PIXI.Sprite, IPixiPointMetadata> = new Map()
  caseDataToPoint: Map<string, PIXI.Sprite> = new Map()
  textures = new Map<string, PIXI.Texture>()
  displayType: "points" | "bars" = "points"
  pointsFusedIntoBars = false
  anchor = circleAnchor
  displayTypeTransitionState: IDisplayTypeTransitionState = {
    isActive: false
  }
  pointTransitionStates = new Map<PIXI.Sprite, IPointTransitionState>()

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

  // map from id string to requestAnimationFrame id number
  animationFrames = new Map<PixiPointsAnimationFrameRequestId, number>()

  async init(options?: IPixiPointsOptions) {
    // Automatically determines the most appropriate renderer for the current environment.
    // The function will prioritize the WebGL renderer as it is the most tested safe API to use. In the near future as
    // WebGPU becomes more stable and ubiquitous, it will be prioritized over WebGL.
    // See: https://pixijs.download/release/docs/rendering.html#autoDetectRenderer
    try {
      this.renderer = await PIXI.autoDetectRenderer({
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
    } catch (e) {
      console.error("PixiPoints failed to initialize renderer")
      return
    }

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

  get canvas(): HTMLCanvasElement | null {
    return this.renderer?.view.canvas as HTMLCanvasElement ?? null
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
      this.cleanupUnusedTextures()
    }
    this.renderer?.render(this.stage)
  }

  resize(width: number, height: number, xCats = 1, yCats = 1, topCats = 1, rightCats = 1) {
    // We only set the background size if the width and height are valid. If we ever set width/height of background to
    // negative values, the background won't be able to detect pointer events.
    if (width > 0 && height > 0) {
      this.renderer?.resize(width, height)
      this.background.width = width
      this.background.height = height
      this.startRendering()
    }

    const maskWidth = width / (xCats * topCats)
    const maskHeight = height / (yCats * rightCats)

    // masks are pushed into the array so that their index corresponds to the cellKey index in the data configuration

    this.subPlotMasks = []
    for (let top = 0; top < topCats; ++top) {
      // vertical axis categories are rendered bottom to top, but coords are top to bottom
      for (let right = rightCats - 1; right >= 0; --right) {
        for (let left = yCats - 1; left >= 0; --left) {
          for (let bottom = 0; bottom < xCats; ++bottom) {
            const r = right * yCats + left
            const c = top * xCats + bottom
            const mask = new PIXI.Graphics()
              .rect(c * maskWidth, r * maskHeight, maskWidth, maskHeight)
              .fill(0xffffff)
            this.subPlotMasks.push(mask)
          }
        }
      }
    }
  }

  setVisibility(isVisible: boolean) {
    this.pointsContainer.visible = isVisible
    this.startRendering()
  }

  get isVisible() {
    return this.pointsContainer.visible
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

  getPointForCaseData(caseData: CaseData) {
    return this.caseDataToPoint.get(caseDataKey(caseData))
  }

  setPointForCaseData(caseData: CaseData, point: PIXI.Sprite) {
    this.caseDataToPoint.set(caseDataKey(caseData), point)
  }

  deletePointForCaseData(caseData: CaseData) {
    this.caseDataToPoint.delete(caseDataKey(caseData))
  }

  // This method should be used instead of directly setting the position of the point sprite, as it handles transitions.
  setPointPosition(point: PIXI.Sprite, x: number, y: number) {
    this.setPointXyProperty("position", point, x, y)
  }

  // This method should be used instead of directly setting the scale of the point sprite, as it handles transitions.
  setPointScale(point: PIXI.Sprite, scale: number) {
    this.setPointXyProperty("scale", point, scale, scale)
  }

  // This method should be used instead of directly setting the anchor of the point sprite, as it handles transitions.
  setPointAnchor(point: PIXI.Sprite, x: number, y: number) {
    this.setPointXyProperty("anchor", point, x, y)
  }

  // This method adjusts a point sprite's width and height without modifying the texture it uses. It's intended for
  // use during transitions between display types (i.e. points to bars, and vice versa) before applying a new texture
  // that's defined with the desired width and height. It should not be used to adjust the scale of a point sprite
  // before or after a transition as it could distort the sprite's appearance. To adjust the scale of a point sprite,
  // use `setPointScale` instead.
  setPointDimensionsForTransition(point: PIXI.Sprite, newWidth: number, newHeight: number) {
    const scaleXFactor = newWidth / point.width
    const scaleYFactor = newHeight / point.height
    this.setPointXyProperty("scale", point, scaleXFactor, scaleYFactor)
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

  async transitionPointDisplayType(props: ITransitionPointDisplayTypeOptions) {
    const { point, style, x, y } = props
    const { width, height } = style
    const defaultRadius = 6
    const radius = style.radius ?? defaultRadius
    const isBar = this.displayType === "bars" && isFiniteNumber(width) && isFiniteNumber(height)
    const isPoint = this.displayType === "points" && isFiniteNumber(radius)

    if (!isBar && !isPoint) return

    // Subtract 1 from the width and height to ensure bars don't touch during transition. If they touch,
    // they look more like a single mass than individual bars.
    const newWidth = isBar ? width - 1 : radius * 2
    const newHeight = isBar ? height - 1 : radius * 2

    // Transition the point sprite's dimensions to the desired width and height by adjusting its scale while
    // also moving the point sprite to the specified location.
    await this.transition(() => {
      this.setPointAnchor(point, this.anchor.x, this.anchor.y)
      this.setPointDimensionsForTransition(point, newWidth, newHeight)
      this.setPointPosition(point, x, y)
    }, { duration: transitionDuration })

    // Once the transition is complete, use the given style to create a new texture (or get a matching texture
    // if one already exists in the cache) and apply that texture to the point sprite. In the case of bars, the
    // texture will include the unique width and height for the bar.
    this.pointTransitionStates.set(point, { hasTransitioned: true })
    const newStyle = this.updatePointStyle(point, style)
    const includeDimensions = this.pointTransitionStates.get(point)?.hasTransitioned
    const texture = this.getPointTexture(newStyle, includeDimensions)

    if (point.texture !== texture) {
      point.texture = texture
      this.setPointAnchor(point, this.anchor.x, this.anchor.y)
      this.setPointScale(point, 1)
    }

    const allPointsTransitioned = Array.from(this.pointTransitionStates.values()).every(state => state.hasTransitioned)
    if (allPointsTransitioned) {
      this.displayTypeTransitionState.isActive = false
    }
  }

  setPositionOrTransition(point: PIXI.Sprite, style: Partial<IPixiPointStyle>, x: number, y: number) {
    if (this.displayTypeTransitionState.isActive) {
      this.transitionPointDisplayType({ point, style, x, y })
    } else {
      this.setPointAnchor(point, this.anchor.x, this.anchor.y)
      this.setPointPosition(point, x, y)
    }
  }

  setPointStyle(point: PIXI.Sprite, style: Partial<IPixiPointStyle>) {
    // If the display type is transitioning from bars to points, we don't want to update the style here.
    // It will be handled elsewhere after the transition.
    if (this.displayType === "points" && this.displayTypeTransitionState.isActive) return

    const newStyle = this.updatePointStyle(point, style)
    const texture = this.getPointTexture(newStyle)
    if (point.texture !== texture) {
      point.texture = texture
    }

    this.startRendering()
  }

  setPointSubPlot(point: PIXI.Sprite, subPlotIndex: number) {
    point.mask = this.subPlotMasks[subPlotIndex]
    this.startRendering()
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
    sprite.anchor.copyFrom(this.anchor)
    sprite.zIndex = DEFAULT_Z_INDEX
    this.setupSpriteInteractivity(sprite)
    return sprite
  }

  textureKey(style: IPixiPointStyle, includeDimensions = false): string {
    let keyStyle = { ...style, displayType: this.displayType }
    // Unless `includeDimensions` is set to true, remove width and height from keyStyle when the display type is bars
    // and the transition from points to bars is active, or if the display type is points and the transition from
    // bars to points is not active. This helps minimize the number of textures created.
    if (
      (!includeDimensions && (this.displayType === "bars" && this.displayTypeTransitionState.isActive)) ||
      (this.displayType === "points" && !this.displayTypeTransitionState.isActive)
    ) {
      const { width, height, ...rest } = keyStyle
      keyStyle = rest
    }
    return JSON.stringify(keyStyle)
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

  generateTexture(graphics: PIXI.Graphics, key: string): PIXI.Texture {
    if (!this.renderer) {
      throw new Error("PixiPoints renderer not initialized")
    }
    const texture = this.renderer.generateTexture({
      target: graphics,
      // A trick to make sprites/textures look still sharp when they're scaled up (e.g. during hover effect).
      // The default resolution is `devicePixelRatio`, so if we multiply it by `MAX_SPRITE_SCALE`, we can scale
      // sprites up to `MAX_SPRITE_SCALE` without losing sharpness.
      resolution: devicePixelRatio * MAX_SPRITE_SCALE,
    })

    this.textures.set(key, texture)
    return texture
  }

  getRectTexture(style: IPixiPointStyle, includeDimensions = false) {
    const { radius, fill, stroke, strokeWidth, strokeOpacity, width, height } = style
    const key = this.textureKey(style, includeDimensions)

    if (this.textures.has(key)) {
      return this.textures.get(key) as PIXI.Texture
    }

    const shouldDrawStroke = (dimension: number | undefined) => {
      // Do not draw the stroke when either:
      // 1. a transition from points to bars is active -- the stroke would be distorted by the scale change
      // 2. there are so many bars that their non-value dimension is thin enough that the stroke would obscure the fill
      return includeDimensions || !this.displayTypeTransitionState.isActive &&
        isFiniteNumber(dimension) && dimension >= 3
    }

    const textureStrokeWidth = shouldDrawStroke(width) || shouldDrawStroke(height) ? strokeWidth : 0

    // When the option to display bars is first selected, the width and height of the bars are first set to two times
    // the radius value specified in `style`. This is so the bars are initially drawn as squares that are the same size
    // as the circular point. The squares are then transitioned to the correct width and height per point. This is
    // necessary because we transition from points to bars by scaling the point sprites' dimensions after applying this
    // shared square texture. Once the transition is complete, we apply separate rectangle textures to each bar. These
    // textures are defined using each point's unique width and height. This process helps minimize the number of
    // textures we create.
    const rectWidth = isFiniteNumber(width) && (!this.displayTypeTransitionState.isActive || includeDimensions)
      ? width : radius * 2
    const rectHeight = isFiniteNumber(height) && (!this.displayTypeTransitionState.isActive || includeDimensions)
      ? height : radius * 2

    const graphics = new PIXI.Graphics()
      .rect(0, 0, rectWidth, rectHeight)
      .fill(fill)
      .stroke({ color: stroke, width: textureStrokeWidth, alpha: strokeOpacity ?? 0.4 })

    return this.generateTexture(graphics, key)
  }

  getCircleTexture(style: IPixiPointStyle) {
    const { radius, fill, stroke, strokeWidth, strokeOpacity } = style
    const key = this.textureKey(style)

    if (this.textures.has(key)) {
      return this.textures.get(key) as PIXI.Texture
    }

    const graphics = new PIXI.Graphics()
      .circle(0, 0, radius)
      .fill(fill)
      .stroke({ color: stroke, width: strokeWidth, alpha: strokeOpacity ?? 0.4 })

    return this.generateTexture(graphics, key)
  }

  getPointTexture(style: IPixiPointStyle, includeDimensions = false): PIXI.Texture {
    return this.displayType === "bars" ? this.getRectTexture(style, includeDimensions) : this.getCircleTexture(style)
  }

  cleanupUnusedTextures() {
    const texturesInUse: Set<PIXI.Texture> = new Set()
    this.points.forEach(point => {
      texturesInUse.add(point.texture)
    })
    for (const [key, texture] of this.textures) {
      if (!texturesInUse.has(texture)) {
        texture.destroy()
        this.textures.delete(key)
      }
    }
  }

  dispatchEvent(targetElement: Element | null, event: Event, pixiEvent: PIXI.FederatedEvent) {
    if (targetElement) {
      // associate this PixiPoints instance with dispatched events
      pixiDispatchedEventsMap.set(event, this)
      pixiDispatchedEventsMap.set(pixiEvent, this)
      targetElement.dispatchEvent(event)
    }
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
      // Dispatch the same event to the element under the cursor.
      this.dispatchEvent(getElementUnderCanvas(event), new MouseEvent("click", event), event)
    })

    this.background.on("pointerdown", (event: PIXI.FederatedPointerEvent) => {
      // Dispatch the same event to the element under the cursor.
      this.dispatchEvent(getElementUnderCanvas(event), new PointerEvent("pointerdown", event), event)
    })

    // Handle mousemove events by dispatching mouseover/mouseout events to the elements beneath the cursor.
    let mouseoverElement: Element | null = null
    this.background.on("mousemove", (event: PIXI.FederatedPointerEvent) => {
      const elementUnderneath = getElementUnderCanvas(event)
      if (elementUnderneath && elementUnderneath === mouseoverElement) {
        // Mouse moving over the same element, no need to do anything.
        return
      }
      if (elementUnderneath) {
        if (mouseoverElement && mouseoverElement !== elementUnderneath) {
          this.dispatchEvent(mouseoverElement, new MouseEvent("mouseout", event), event)
        }
        this.dispatchEvent(elementUnderneath, new MouseEvent("mouseover", event), event)
        mouseoverElement = elementUnderneath
      } else if (mouseoverElement) {
        this.dispatchEvent(mouseoverElement, new MouseEvent("mouseout", event), event)
        mouseoverElement = null
      }
    })
    this.background.on("mouseout", (event: PIXI.FederatedPointerEvent) => {
      this.dispatchEvent(mouseoverElement, new MouseEvent("mouseout", event), event)
      mouseoverElement = null
    })
  }

  requestAnimationFrame(requestId: PixiPointsAnimationFrameRequestId, callback: () => void) {
    // can only have one pending request of a given type
    if (!this.animationFrames.get(requestId)) {
      this.animationFrames.set(requestId, requestAnimationFrame(() => {
        callback()
        this.animationFrames.delete(requestId)
      }))
    }
  }

  cancelAnimationFrame(requestId: PixiPointsAnimationFrameRequestId) {
    const frameToCancel = this.animationFrames.get(requestId)
    if (frameToCancel != null) {
      cancelAnimationFrame(frameToCancel)
      this.animationFrames.delete(requestId)
    }
  }

  /**
   * Dispatches events to the SVG elements lying on top of the PixiJS canvas. This is necessary for Safari,
   * as it does not pass events through the canvas to the elements above it.
   */
  dispatchForSafari(event: PIXI.FederatedPointerEvent, eventType: string) {
    const x = event.clientX
    const y = event.clientY
    const canvas = this.renderer?.view.canvas
    if (canvas) {
      const canvasStyle = canvas.style as CSSStyleDeclaration
      canvasStyle.visibility = 'hidden'
      const svgElement = (eventType === 'mouseout') ? this.mostRecentSvgElement : document.elementFromPoint(x, y)
      canvasStyle.visibility = 'visible'
      if (svgElement && svgElement.tagName === 'rect') {
        const mouseEvent = new MouseEvent(eventType, {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
        })
        svgElement.dispatchEvent(mouseEvent)
        this.mostRecentSvgElement = svgElement as SVGElement
      }
    }
  }

  setupSpriteInteractivity(sprite: PIXI.Sprite) {
    sprite.eventMode = "static"
    sprite.cursor = "pointer"

    let draggingActive = false

    const handlePointerOver = (pointerEvent: PIXI.FederatedPointerEvent) => {
      const elementOnTop = document.elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)
      const pointerState = PointerState.getInstance()
      if (elementOnTop !== this.canvas || pointerState.pointerIsDown()) { // If the element on top is not the canvas, we don't want to do anything.
        return
      }
      if (pointerState.pointerIsDown()) {
        return // Skip if the pointer is down
      }
      if (this.displayType === "bars") {
        if (!this.pointsFusedIntoBars) {
          const newStyle = { ...this.getMetadata(sprite).style, stroke: strokeColorHover }
          this.setPointStyle(sprite, newStyle)
        }
        else if (this.isSafari) {
          this.dispatchForSafari(pointerEvent, 'mouseover')
        }
      } else {
        this.transition(() => {
          this.setPointScale(sprite, hoverRadiusFactor)
        }, { duration: transitionDuration })
      }
      if (!draggingActive) {
        !this.pointsFusedIntoBars && this.onPointOver?.(toPointerEvent(pointerEvent), sprite, this.getMetadata(sprite))
      } else {
        this.onPointLeave?.(toPointerEvent(pointerEvent), sprite, this.getMetadata(sprite))
      }
    }
    const handlePointerLeave = (pointerEvent: PIXI.FederatedPointerEvent) => {
      if (this.displayType === "bars") {
        if (!this.pointsFusedIntoBars) {
          const newStyle = { ...this.getMetadata(sprite).style, stroke: strokeColor }
          this.setPointStyle(sprite, newStyle)
        }
        else if (this.isSafari) {
          this.dispatchForSafari(pointerEvent, 'mouseout')
        }
      } else {
        this.transition(() => {
          this.setPointScale(sprite, 1)
        }, { duration: transitionDuration })
      }
      !this.pointsFusedIntoBars && this.onPointLeave?.(toPointerEvent(pointerEvent), sprite, this.getMetadata(sprite))
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
      if (this.displayType === "bars" && this.pointsFusedIntoBars && this.isSafari) {
        this.dispatchForSafari(clickEvent, 'click')
      }
      else {
        this.onPointClick?.(toPointerEvent(clickEvent), sprite, this.getMetadata(sprite))
      }
    })

    // Dragging
    sprite.on("pointerdown", (pointerDownEvent: PIXI.FederatedPointerEvent) => {
      draggingActive = true
      this.onPointDragStart?.(toPointerEvent(pointerDownEvent), sprite, this.getMetadata(sprite))

      const onDrag = (onDragEvent: PointerEvent) => {
        // bars cannot be dragged
        if (draggingActive && this.displayType !== "bars") {
          // Note that we don't call getMetadata here because the point can be removed by a click
          const metadata = this.pointMetadata.get(sprite)
          metadata && this.onPointDrag?.(onDragEvent, sprite, metadata)
        }
      }

      const onDragEnd = (pointerUpEvent: PointerEvent) => {
        if (draggingActive) {
          draggingActive = false
          // Note that we don't call getMetadata here because the point can be removed by a click
          const metadata = this.pointMetadata.get(sprite)
          metadata && this.onPointDragEnd?.(pointerUpEvent, sprite, metadata)
          handlePointerLeave(toFederatedPointerEvent(pointerUpEvent))
          window.removeEventListener("pointermove", onDrag)
          window.removeEventListener("pointerup", onDragEnd)
        }
      }

      window.addEventListener("pointermove", onDrag)
      window.addEventListener("pointerup", onDragEnd)
    })
  }

  matchPointsToData(
    datasetID:string, caseData: CaseDataWithSubPlot[], displayType: "points" | "bars", style: IPixiPointStyle
  ) {
    if (!this.renderer) {
      return
    }
    // If the display type has changed, we need to prepare for the transition between types
    // But we can't do so if the number of cases to plot is not equal to the number of points we have because
    // there will be a mismatch between caseIDs held onto by the points and the caseIDs of the cases we're plotting.
    if (this.displayType !== displayType && this.points.length > 0 && this.points.length === caseData.length) {
      this.displayTypeTransitionState.isActive = true
      this.forEachPoint(point => {
        this.pointTransitionStates.set(point, { hasTransitioned: false })
      })
    }
    this.displayType = displayType

    // Stop here if we need to transition between display types. The need for a display type transition is only
    // triggered when the user changes the display type from points to bars or vice versa. Calls to `matchPointsToData`
    // caused by other changes will always happen separately from a display type change.
    if (this.displayTypeTransitionState.isActive) return

    const texture = this.getPointTexture(style)
    // First, remove all the old sprites. Go backwards, so it's less likely we end up with O(n^2) behavior (although
    // still possible). If we expect to have a lot of points removed, we should just destroy and recreate everything.
    // However, I believe that in most practical cases, we will only have a few points removed, so this approach is
    // probably better.
    const newCaseDataSet = new Set<string>(caseData.map(cd => caseDataKey(cd)))
    const currentCaseDataSet = new Set<string>()
    for (let i = this.points.length - 1; i >= 0; i--) {
      const point = this.points[i]
      const pointMetadata = this.getMetadata(point)
      if (!newCaseDataSet.has(caseDataKey(pointMetadata))) {
        this.pointMetadata.delete(point)
        // Note that .destroy() call will also remove the point from the stage children array, so we don't have to
        // do that manually (e.g. using .removeChild()).
        point.destroy()
        this.deletePointForCaseData(pointMetadata)
      } else {
        currentCaseDataSet.add(caseDataKey(pointMetadata))
        this.setPointForCaseData(pointMetadata, point)
      }
    }

    // Save number of points before adding new points.
    const oldPointsCount = this.points.length

    // Now, add points that are in the new data but not in the old data.
    for (let i = 0; i < caseData.length; i++) {
      const caseDataItem = caseData[i]
      if (!currentCaseDataSet.has(caseDataKey(caseDataItem))) {
        const sprite = this.getNewSprite(texture)
        this.pointsContainer.addChild(sprite)
        this.pointMetadata.set(sprite, { ...caseDataItem, datasetID, style })
        this.setPointForCaseData(caseDataItem, sprite)
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

    this.setPointsMask(caseData)

    // Before rendering, reset the scale for all points. This may be necessary if the scale was modified
    // during a transition immediately before matchPointsToData is called. For example, when the Connecting
    // Lines graph adornment is activated or deactivated.
    this.setAllPointsScale(1)

    this.startRendering()
  }

  setPointsMask(allCaseData: CaseDataWithSubPlot[]) {
    if (!this.renderer || (window as any).Cypress) {
      // This method causes Cypress tests to fail in the GitHub Actions environment, so we skip it in that case.
      // The exact reason is unclear, but it seems likely that the WebGL (or WebGPU) renderer initialized in GitHub
      // Actions is somehow faulty or incomplete, and using masking features causes it to break entirely. This isn't
      // a feature that can be tested using Cypress anyway, so it's safe to skip it in this case.
      return
    }
    allCaseData.forEach((caseData, i) => {
      const point = this.getPointForCaseData(caseData)
      if (point) {
        const subPlotNum = caseData.subPlotNum
        point.mask = subPlotNum !== undefined ? this.subPlotMasks[subPlotNum] : null
      }
    })
  }

  dispose() {
    this.ticker.destroy()
    this.renderer?.destroy()
    this.stage.destroy()
    this.textures.forEach(texture => texture.destroy())
    this.resizeObserver?.disconnect()
  }
}
