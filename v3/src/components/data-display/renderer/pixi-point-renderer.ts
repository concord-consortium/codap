import * as PIXI from "pixi.js"
import { isFiniteNumber } from "../../../utilities/math-utils"
import { CaseDataWithSubPlot } from "../d3-types"
import { PointDisplayType, transitionDuration } from "../data-display-types"
import { PixiTransition, TransitionPropMap, TransitionProp } from "../pixi/pixi-transition"
import { PointerState } from "../models/pointer-state"
import {
  circleAnchor,
  hBarAnchor,
  PointRendererBase
} from "./point-renderer-base"
import { PointsState } from "./points-state"
import {
  IBackgroundEventDistributionOptions,
  IPoint,
  IPointMetadata,
  IPointRendererOptions,
  IPointStyle,
  RendererCapability
} from "./point-renderer-types"

const DEFAULT_Z_INDEX = 0
const RAISED_Z_INDEX = 100
const MAX_SPRITE_SCALE = 2

const strokeColor = "#ffffff"
const strokeColorHover = "#a35b3a"

// without this cast using TypeScript 5.7, we get the following error:
// "Type 'FederatedPointerEvent' is missing the following properties
// from type 'PointerEvent': altitudeAngle, azimuthAngle"
const toPointerEvent = (event: PIXI.FederatedPointerEvent) => event as unknown as PointerEvent
const toFederatedPointerEvent = (event: PointerEvent) => event as unknown as PIXI.FederatedPointerEvent

const hoverRadiusFactor = 1.5

interface IDisplayTypeTransitionState {
  isActive: boolean
}

interface IPointTransitionState {
  hasTransitioned: boolean
}

export const PixiPointsAnimationFrameRequestIds = ["deselectAll"] as const
export type PixiPointsAnimationFrameRequestId = typeof PixiPointsAnimationFrameRequestIds[number]

/**
 * WebGL point renderer using PIXI.js.
 * This is an adapter that extends PointRendererBase and uses PIXI.js for actual rendering.
 */
export class PixiPointRenderer extends PointRendererBase {
  // PIXI.js components
  private renderer?: PIXI.Renderer
  private stage = new PIXI.Container()
  private pointsContainer = new PIXI.Container()
  private background = new PIXI.Sprite(PIXI.Texture.EMPTY)
  private subPlotMasks: PIXI.Graphics[] = []
  private ticker = new PIXI.Ticker()
  private tickerStopTimeoutId: number | undefined

  // Safari workarounds
  private isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  private mostRecentSvgElement: SVGElement | null = null

  // Sprite management
  private sprites = new Map<string, PIXI.Sprite>()
  private textures = new Map<string, PIXI.Texture>()

  // Transition state
  private displayTypeTransitionState: IDisplayTypeTransitionState = { isActive: false }
  private pointTransitionStates = new Map<string, IPointTransitionState>()
  private currentTransition?: PixiTransition
  private targetProp: TransitionPropMap = {}
  private startProp: TransitionPropMap = {}

  // Resize observer
  private resizeObserver?: ResizeObserver

  // Disposed flag to prevent operations after disposal
  private isDisposed = false

  constructor(state?: PointsState) {
    super(state)
  }

  // ===== Abstract property implementations =====

  get canvas(): HTMLCanvasElement | null {
    return this.renderer?.view.canvas as HTMLCanvasElement ?? null
  }

  get capability(): RendererCapability {
    return "webgl"
  }

  get anyTransitionActive(): boolean {
    return PixiTransition.anyTransitionActive(this.targetProp)
  }

  // ===== Abstract method implementations =====

  protected async doInit(options?: IPointRendererOptions): Promise<void> {
    try {
      this.renderer = await PIXI.autoDetectRenderer({
        resolution: window.devicePixelRatio,
        autoDensity: true,
        backgroundAlpha: 0,
        antialias: true,
        eventMode: "passive",
        eventFeatures: {
          move: true,
          click: true,
          globalMove: false,
          wheel: false
        }
      })
    } catch (e) {
      console.error("PixiPointRenderer failed to initialize renderer", e)
      return
    }

    this.ticker.add(this.tick.bind(this))
    this.stage.addChild(this.background)
    this.stage.addChild(this.pointsContainer)
    this.pointsContainer.sortableChildren = true

    if (options?.backgroundEventDistribution) {
      this.doSetupBackgroundEventDistribution(options.backgroundEventDistribution)
    }

    if (options?.resizeTo) {
      this.resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          this.doResize(width, height, 1, 1, 1, 1)
        }
      })
      this.resizeObserver.observe(options.resizeTo)
    }

    // Sync any existing state to create sprites
    this.syncFromState()

    // Start rendering if we have sprites
    if (this.sprites.size > 0) {
      this.doStartRendering()
    }
  }

  protected doDispose(): void {
    this.isDisposed = true
    this.ticker.stop()
    this.ticker.destroy()
    this.renderer?.destroy()
    this.renderer = undefined
    this.stage.destroy()
    this.textures.forEach(texture => texture.destroy())
    this.textures.clear()
    this.resizeObserver?.disconnect()
    this.sprites.clear()
  }

  protected doResize(
    width: number,
    height: number,
    xCats: number,
    yCats: number,
    topCats: number,
    rightCats: number
  ): void {
    if (width > 0 && height > 0) {
      this.renderer?.resize(width, height)
      this.background.width = width
      this.background.height = height
      this.doStartRendering()
    }

    const maskWidth = width / (xCats * topCats)
    const maskHeight = height / (yCats * rightCats)

    this.subPlotMasks = []
    for (let top = 0; top < topCats; ++top) {
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

    // Re-apply masks to existing sprites based on their subPlotNum from state
    this.reapplyMasksFromState()
  }

  /**
   * Re-apply masks to all sprites based on their subPlotNum stored in state.
   * Called after resize when new masks are created.
   */
  private reapplyMasksFromState(): void {
    this.sprites.forEach((sprite, pointId) => {
      const pointState = this.state.getPoint(pointId)
      if (pointState?.subPlotNum !== undefined) {
        sprite.mask = this.subPlotMasks[pointState.subPlotNum] ?? null
      }
    })
  }

  protected doMatchPointsToData(
    datasetID: string,
    caseData: CaseDataWithSubPlot[],
    displayType: PointDisplayType,
    style: IPointStyle
  ): void {
    if (this.isDisposed) {
      console.warn("PixiPointRenderer.doMatchPointsToData: called after dispose, ignoring")
      return
    }
    if (!this.renderer) {
      console.warn("PixiPointRenderer.doMatchPointsToData: renderer not initialized, skipping")
      return
    }

    // Ensure sprites exist for any points in state that don't have sprites yet
    // This handles the case where syncFromState was called before state was populated
    if (this.state.size > 0 && this.sprites.size === 0) {
      this.syncFromState()
    }

    // Handle display type transition
    const oldDisplayType = this._displayType
    if (oldDisplayType !== displayType && this.sprites.size > 0 && this.sprites.size === caseData.length) {
      this.displayTypeTransitionState.isActive = true
      this.state.forEach(point => {
        this.pointTransitionStates.set(point.id, { hasTransitioned: false })
      })
    }
    this._displayType = displayType

    if (this.displayTypeTransitionState.isActive) return

    // Sync state with case data
    const { added, removed } = this.state.syncWithCaseData(caseData, style)

    // Remove sprites for removed points
    removed.forEach(pointId => {
      const sprite = this.sprites.get(pointId)
      if (sprite) {
        sprite.destroy()
        this.sprites.delete(pointId)
      }
    })

    // Update anchor based on display type
    this._anchor = displayType === "points" ? circleAnchor :
                   displayType === "bars" ? hBarAnchor : circleAnchor

    const texture = this.getPointTexture(style)

    // Create sprites for added points
    added.forEach(pointId => {
      const sprite = this.getNewSprite(pointId, texture)
      this.pointsContainer.addChild(sprite)
      this.sprites.set(pointId, sprite)
    })

    // Update existing sprites
    this.sprites.forEach((sprite, pointId) => {
      if (!added.includes(pointId) && sprite.texture !== texture) {
        sprite.texture = texture
      }
    })

    // Apply masks
    this.applyMasks(caseData)

    // Reset scale
    this.doSetAllPointsScale(1, 0)

    this.doStartRendering()
  }

  protected doSetPointPosition(pointId: string, x: number, y: number): void {
    const sprite = this.sprites.get(pointId)
    if (sprite) {
      this.setPointXyProperty("position", sprite, x, y)
    }
  }

  protected doSetPointScale(pointId: string, scale: number): void {
    const sprite = this.sprites.get(pointId)
    if (sprite) {
      this.setPointXyProperty("scale", sprite, scale, scale)
    }
  }

  protected doSetPointStyle(pointId: string, style: Partial<IPointStyle>): void {
    const sprite = this.sprites.get(pointId)
    if (!sprite) return

    // If transitioning from bars to points, skip style update
    if (this._displayType === "points" && this.displayTypeTransitionState.isActive) return

    const pointState = this.state.getPoint(pointId)
    if (!pointState) return

    const newStyle = { ...pointState.style, ...style }
    const texture = this.getPointTexture(newStyle)
    if (sprite.texture !== texture) {
      sprite.texture = texture
    }

    this.doStartRendering()
  }

  protected doSetPointRaised(pointId: string, raised: boolean): void {
    const sprite = this.sprites.get(pointId)
    if (sprite) {
      sprite.zIndex = raised ? RAISED_Z_INDEX : DEFAULT_Z_INDEX
      this.doStartRendering()
    }
  }

  protected doSetPointSubPlot(pointId: string, subPlotIndex: number): void {
    const sprite = this.sprites.get(pointId)
    if (sprite) {
      sprite.mask = this.subPlotMasks[subPlotIndex]
      this.doStartRendering()
    }
  }

  protected async doTransition(callback: () => void, duration: number): Promise<void> {
    if (duration === 0) {
      callback()
      return
    }
    return new Promise<void>(resolve => {
      this.currentTransition = new PixiTransition(duration, () => resolve())
      callback()
      this.currentTransition = undefined
      this.doStartRendering()
    })
  }

  protected doStartRendering(): void {
    if (this.isDisposed) {
      console.warn("PixiPointRenderer.doStartRendering: called after dispose, ignoring")
      return
    }
    if (!this.ticker.started) {
      this.ticker.start()
    }
  }

  protected doRemoveMasks(): void {
    this.subPlotMasks.forEach(mask => mask.destroy())
    this.subPlotMasks = []
    this.sprites.forEach(sprite => {
      sprite.mask = null
    })
  }

  protected doSetVisibility(isVisible: boolean): void {
    this.pointsContainer.visible = isVisible
    this.doStartRendering()
  }

  protected async doSetAllPointsScale(scale: number, duration: number): Promise<void> {
    return this.doTransition(() => {
      this.sprites.forEach(sprite => {
        this.setPointXyProperty("scale", sprite, scale, scale)
      })
    }, duration)
  }

  protected doSetPositionOrTransition(
    pointId: string,
    style: Partial<IPointStyle>,
    x: number,
    y: number
  ): void {
    const sprite = this.sprites.get(pointId)
    if (!sprite) return

    if (this.displayTypeTransitionState.isActive) {
      this.transitionPointDisplayType(pointId, sprite, style, x, y)
    } else {
      this.setPointXyProperty("anchor", sprite, this._anchor.x, this._anchor.y)
      this.setPointXyProperty("position", sprite, x, y)
      this.setPointXyProperty("scale", sprite, 1, 1)
    }
  }

  protected doSetupBackgroundEventDistribution(options: IBackgroundEventDistributionOptions): void {
    const { elementToHide } = options

    const getElementUnderCanvas = (event: PIXI.FederatedPointerEvent) => {
      const originalPointerEvents = elementToHide.style.pointerEvents
      elementToHide.style.pointerEvents = "none"
      const elementUnderneath = document.elementFromPoint(event.clientX, event.clientY)
      elementToHide.style.pointerEvents = originalPointerEvents
      return elementUnderneath
    }

    this.background.eventMode = "static"

    this.background.on("click", (event: PIXI.FederatedPointerEvent) => {
      this.dispatchEvent(getElementUnderCanvas(event), new MouseEvent("click", event), event)
    })

    this.background.on("pointerdown", (event: PIXI.FederatedPointerEvent) => {
      this.dispatchEvent(getElementUnderCanvas(event), new PointerEvent("pointerdown", event), event)
    })

    let mouseoverElement: Element | null = null
    this.background.on("mousemove", (event: PIXI.FederatedPointerEvent) => {
      const elementUnderneath = getElementUnderCanvas(event)
      if (elementUnderneath && elementUnderneath === mouseoverElement) {
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

  // ===== Private helper methods =====

  private tick(): void {
    if (this.isDisposed || !this.renderer) {
      this.ticker.stop()
      return
    }
    if (this.anyTransitionActive) {
      PixiTransition.transitionStep(this.targetProp, this.startProp)
    } else {
      this.ticker.stop()
      this.cleanupUnusedTextures()
    }
    this.renderer.render(this.stage)
  }

  private syncFromState(): void {
    // Create sprites for any points in state that don't have sprites yet
    if (!this.renderer) {
      console.warn("PixiPointRenderer.syncFromState: renderer not initialized, skipping")
      return
    }

    this.state.forEach(pointState => {
      if (!this.sprites.has(pointState.id)) {
        try {
          const texture = this.getPointTexture(pointState.style)
          const sprite = this.getNewSprite(pointState.id, texture)
          sprite.position.set(pointState.x, pointState.y)
          sprite.scale.set(pointState.scale)
          sprite.zIndex = pointState.isRaised ? RAISED_Z_INDEX : DEFAULT_Z_INDEX
          this.pointsContainer.addChild(sprite)
          this.sprites.set(pointState.id, sprite)
        } catch (error) {
          console.error("PixiPointRenderer.syncFromState: error creating sprite for", pointState.id, error)
        }
      }
    })
  }

  private getNewSprite(pointId: string, texture: PIXI.Texture): PIXI.Sprite {
    const sprite = new PIXI.Sprite(texture)
    sprite.anchor.copyFrom(this._anchor)
    sprite.zIndex = DEFAULT_Z_INDEX
    this.setupSpriteInteractivity(pointId, sprite)
    return sprite
  }

  private setPointXyProperty(prop: TransitionProp, sprite: PIXI.Sprite, x: number, y: number): void {
    if (this.currentTransition) {
      this.setTargetXyProp(prop, sprite, x, y)
    } else {
      const targetProp = this.targetProp[prop]
      if (targetProp?.has(sprite)) {
        targetProp.delete(sprite)
      }
      sprite[prop].set(x, y)
      this.doStartRendering()
    }
  }

  private setTargetXyProp(propKey: TransitionProp, sprite: PIXI.Sprite, x: number, y: number): void {
    if (!this.currentTransition) return

    let targetProp = this.targetProp[propKey]
    let startProp = this.startProp[propKey]
    if (!targetProp || !startProp) {
      targetProp = this.targetProp[propKey] = new Map()
      startProp = this.startProp[propKey] = new Map()
    }
    targetProp.set(sprite, { x, y, transition: this.currentTransition })
    startProp.set(sprite, { x: sprite[propKey].x, y: sprite[propKey].y, transition: this.currentTransition })
  }

  private textureKey(style: IPointStyle, includeDimensions = false): string {
    let keyStyle: Record<string, unknown> = { ...style, displayType: this._displayType }

    if (
      (!includeDimensions && (this._displayType === "bars" && this.displayTypeTransitionState.isActive)) ||
      (this._displayType === "points" && !this.displayTypeTransitionState.isActive)
    ) {
      const { width, height, ...rest } = keyStyle
      keyStyle = rest
    }
    return JSON.stringify(keyStyle)
  }

  private getPointTexture(style: IPointStyle, includeDimensions = false): PIXI.Texture {
    return this._displayType === "bars"
      ? this.getRectTexture(style, includeDimensions)
      : this.getCircleTexture(style)
  }

  private getCircleTexture(style: IPointStyle): PIXI.Texture {
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

  private getRectTexture(style: IPointStyle, includeDimensions = false): PIXI.Texture {
    const { radius, fill, stroke, strokeWidth, strokeOpacity, width, height } = style
    const key = this.textureKey(style, includeDimensions)

    if (this.textures.has(key)) {
      return this.textures.get(key) as PIXI.Texture
    }

    const shouldDrawStroke = (dimension: number | undefined) => {
      return includeDimensions || !this.displayTypeTransitionState.isActive &&
        isFiniteNumber(dimension) && dimension >= 3
    }

    const textureStrokeWidth = shouldDrawStroke(width) || shouldDrawStroke(height) ? strokeWidth : 0

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

  private generateTexture(graphics: PIXI.Graphics, key: string): PIXI.Texture {
    if (!this.renderer) {
      throw new Error("PixiPointRenderer renderer not initialized")
    }
    const texture = this.renderer.generateTexture({
      target: graphics,
      resolution: devicePixelRatio * MAX_SPRITE_SCALE,
    })

    this.textures.set(key, texture)
    return texture
  }

  private cleanupUnusedTextures(): void {
    const texturesInUse = new Set<PIXI.Texture>()
    this.sprites.forEach(sprite => {
      texturesInUse.add(sprite.texture)
    })
    for (const [key, texture] of this.textures) {
      if (!texturesInUse.has(texture)) {
        texture.destroy()
        this.textures.delete(key)
      }
    }
  }

  private dispatchEvent(targetElement: Element | null, event: Event, _pixiEvent: PIXI.FederatedEvent): void {
    if (targetElement) {
      this.registerDispatchedEvent(event)
      targetElement.dispatchEvent(event)
    }
  }

  private applyMasks(allCaseData: CaseDataWithSubPlot[]): void {
    if (!this.renderer || (window as any).Cypress) return

    allCaseData.forEach(caseData => {
      const pointId = this.state.getPointIdForCaseData(caseData)
      if (pointId) {
        const sprite = this.sprites.get(pointId)
        if (sprite) {
          const subPlotNum = caseData.subPlotNum
          sprite.mask = subPlotNum !== undefined ? this.subPlotMasks[subPlotNum] : null
        }
      }
    })
  }

  private async transitionPointDisplayType(
    pointId: string,
    sprite: PIXI.Sprite,
    style: Partial<IPointStyle>,
    x: number,
    y: number
  ): Promise<void> {
    const { width, height, radius = 6 } = style
    const isBar = this._displayType === "bars" && isFiniteNumber(width) && isFiniteNumber(height)
    const isPoint = this._displayType === "points" && isFiniteNumber(radius)

    if (!isBar && !isPoint) return

    const newWidth = isBar ? width - 1 : radius * 2
    const newHeight = isBar ? height - 1 : radius * 2

    const scaleXFactor = newWidth / sprite.width
    const scaleYFactor = newHeight / sprite.height

    await this.doTransition(() => {
      this.setPointXyProperty("anchor", sprite, this._anchor.x, this._anchor.y)
      this.setPointXyProperty("scale", sprite, scaleXFactor, scaleYFactor)
      this.setPointXyProperty("position", sprite, x, y)
    }, transitionDuration)

    this.pointTransitionStates.set(pointId, { hasTransitioned: true })
    const pointState = this.state.getPoint(pointId)
    if (pointState) {
      const newStyle = { ...pointState.style, ...style }
      const texture = this.getPointTexture(newStyle, true)

      if (sprite.texture !== texture) {
        sprite.texture = texture
        this.setPointXyProperty("anchor", sprite, this._anchor.x, this._anchor.y)
        this.setPointXyProperty("scale", sprite, 1, 1)
      }
    }

    const allTransitioned = Array.from(this.pointTransitionStates.values()).every(s => s.hasTransitioned)
    if (allTransitioned) {
      this.displayTypeTransitionState.isActive = false
    }
  }

  private dispatchForSafari(event: PIXI.FederatedPointerEvent, eventType: string): void {
    const x = event.clientX
    const y = event.clientY
    const canvas = this.renderer?.view.canvas
    if (canvas) {
      const canvasStyle = canvas.style as CSSStyleDeclaration
      canvasStyle.visibility = "hidden"
      const svgElement = (eventType === "mouseout") ? this.mostRecentSvgElement : document.elementFromPoint(x, y)
      canvasStyle.visibility = "visible"
      if (svgElement && svgElement.tagName === "rect") {
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

  private setupSpriteInteractivity(pointId: string, sprite: PIXI.Sprite): void {
    sprite.eventMode = "static"
    sprite.cursor = "pointer"

    let draggingActive = false

    const getPointAndMetadata = (): { point: IPoint, metadata: IPointMetadata } | null => {
      const pointState = this.state.getPoint(pointId)
      if (!pointState) return null
      return {
        point: { id: pointId },
        metadata: {
          caseID: pointState.caseID,
          plotNum: pointState.plotNum,
          datasetID: pointState.datasetID,
          style: { ...pointState.style },
          x: pointState.x,
          y: pointState.y
        }
      }
    }

    const handlePointerOver = (pointerEvent: PIXI.FederatedPointerEvent) => {
      const elementOnTop = document.elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)
      const pointerState = PointerState.getInstance()
      if (elementOnTop !== this.canvas || pointerState.pointerIsDown()) {
        return
      }

      const data = getPointAndMetadata()
      if (!data) return

      if (this._displayType === "bars") {
        if (!this._pointsFusedIntoBars) {
          const newStyle = { ...data.metadata.style, stroke: strokeColorHover }
          this.doSetPointStyle(pointId, newStyle)
        } else if (this.isSafari) {
          this.dispatchForSafari(pointerEvent, "mouseover")
        }
      } else {
        this.doTransition(() => {
          this.setPointXyProperty("scale", sprite, hoverRadiusFactor, hoverRadiusFactor)
        }, transitionDuration)
      }

      if (!draggingActive) {
        !this._pointsFusedIntoBars && this.onPointerOver?.(toPointerEvent(pointerEvent), data.point, data.metadata)
      } else {
        this.onPointerLeave?.(toPointerEvent(pointerEvent), data.point, data.metadata)
      }
    }

    const handlePointerLeave = (pointerEvent: PIXI.FederatedPointerEvent) => {
      const data = getPointAndMetadata()
      if (!data) return

      if (this._displayType === "bars") {
        if (!this._pointsFusedIntoBars) {
          const newStyle = { ...data.metadata.style, stroke: strokeColor }
          this.doSetPointStyle(pointId, newStyle)
        } else if (this.isSafari) {
          this.dispatchForSafari(pointerEvent, "mouseout")
        }
      } else {
        this.doTransition(() => {
          this.setPointXyProperty("scale", sprite, 1, 1)
        }, transitionDuration)
      }

      !this._pointsFusedIntoBars && this.onPointerLeave?.(toPointerEvent(pointerEvent), data.point, data.metadata)
    }

    sprite.on("pointerover", (pointerEvent: PIXI.FederatedPointerEvent) => {
      handlePointerOver(pointerEvent)
    })

    sprite.on("pointerleave", (pointerEvent: PIXI.FederatedPointerEvent) => {
      if (!draggingActive) {
        handlePointerLeave(pointerEvent)
      }
    })

    sprite.on("click", (clickEvent: PIXI.FederatedPointerEvent) => {
      const data = getPointAndMetadata()
      if (!data) return

      if (this._displayType === "bars" && this._pointsFusedIntoBars && this.isSafari) {
        this.dispatchForSafari(clickEvent, "click")
      } else {
        this.onPointerClick?.(toPointerEvent(clickEvent), data.point, data.metadata)
      }
    })

    sprite.on("pointerdown", (pointerDownEvent: PIXI.FederatedPointerEvent) => {
      const data = getPointAndMetadata()
      if (!data) return

      draggingActive = true
      this.onPointerDragStart?.(toPointerEvent(pointerDownEvent), data.point, data.metadata)

      const onDrag = (onDragEvent: PointerEvent) => {
        if (draggingActive && this._displayType !== "bars") {
          const currentData = getPointAndMetadata()
          currentData && this.onPointerDrag?.(onDragEvent, currentData.point, currentData.metadata)
        }
      }

      const onDragEnd = (pointerUpEvent: PointerEvent) => {
        if (draggingActive) {
          draggingActive = false
          const currentData = getPointAndMetadata()
          currentData && this.onPointerDragEnd?.(pointerUpEvent, currentData.point, currentData.metadata)
          handlePointerLeave(toFederatedPointerEvent(pointerUpEvent))
          window.removeEventListener("pointermove", onDrag)
          window.removeEventListener("pointerup", onDragEnd)
        }
      }

      window.addEventListener("pointermove", onDrag)
      window.addEventListener("pointerup", onDragEnd)
    })
  }

  // ===== Protected implementation of resize observer setup =====

  protected doSetupResizeObserver(resizeTo: HTMLElement): void {
    // Clean up existing observer if any
    this.resizeObserver?.disconnect()

    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        this.doResize(width, height, 1, 1, 1, 1)
      }
    })
    this.resizeObserver.observe(resizeTo)
  }
}

/**
 * Type guard to check if a renderer is a PixiPointRenderer (WebGL renderer)
 */
export function isPixiPointRenderer(renderer: PointRendererBase | undefined): renderer is PixiPointRenderer {
  return renderer instanceof PixiPointRenderer
}
