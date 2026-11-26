import { CaseData, CaseDataWithSubPlot } from "../d3-types"
import { PointDisplayType } from "../data-display-types"
import { PointShape } from "../../../utilities/point-shape-utils"

/**
 * Opaque point handle - consumers don't need to know the underlying implementation
 * (e.g., whether it's a PIXI.Sprite, an SVG element, or just virtual state)
 */
export interface IPoint {
  readonly id: string
}

/**
 * Style properties for a point
 */
export interface IPointStyle {
  radius: number
  shape?: PointShape
  fill: string
  stroke: string
  strokeWidth: number
  strokeOpacity?: number
  width?: number   // for bars
  height?: number  // for bars
}

/**
 * The parts of a new point's style that come from its case (e.g. its legend color, shape and selection),
 * overriding the uniform style a match applies, so a point a match adds is drawn as the next style
 * refresh would draw it rather than in the uniform style until then. Existing points keep their styles
 * until that refresh.
 */
export type GetCasePointStyle = (caseData: CaseDataWithSubPlot) => Partial<IPointStyle>

/**
 * Metadata associated with each point
 */
export interface IPointMetadata extends CaseData {
  datasetID: string
  style: IPointStyle
  x: number
  y: number
}

/**
 * Event handler for point interactions
 */
export type PointEventHandler = (
  event: PointerEvent,
  point: IPoint,
  metadata: IPointMetadata
) => void

/**
 * Renderer capability type
 */
export type RendererCapability = "webgl" | "canvas" | "svg" | "null"

/**
 * Options for initializing a point renderer
 */
export interface IPointRendererOptions {
  resizeTo?: HTMLElement
  backgroundEventDistribution?: IBackgroundEventDistributionOptions
}

/**
 * Options for background event distribution (for layers underneath the renderer)
 */
export interface IBackgroundEventDistributionOptions {
  elementToHide: HTMLElement | SVGElement
  interactiveElClassName?: string
}

/**
 * Event names for background pass-through events.
 * Used by D3/SVG elements that need to receive events forwarded from the renderer's background.
 * The values match standard DOM event names since the renderer dispatches standard events.
 */
export enum BackgroundPassThroughEvent {
  Click = "click",
  MouseMove = "mousemove",
  PointerDown = "pointerdown",
  MouseOver = "mouseover",
  MouseOut = "mouseout"
}

/**
 * State for an individual point (used by PointsState)
 */
export interface IPointState {
  id: string
  caseID: string
  plotNum: number
  subPlotNum?: number
  datasetID: string
  x: number
  y: number
  scale: number
  style: IPointStyle
  isRaised: boolean
  isVisible: boolean
  // false until the point's position is first set; renderers don't draw a point without one (except in
  // Pixi's fused-bars layer), which would otherwise appear at (0, 0) until the next position refresh
  // places it
  isPositioned: boolean
}

/**
 * Options for the transition method
 */
export interface ITransitionOptions {
  duration: number
}

// Re-export types used by consumers
export type { CaseData, CaseDataWithSubPlot, PointDisplayType }
