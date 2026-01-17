import { CaseData, CaseDataWithSubPlot } from "../d3-types"
import { PointDisplayType } from "../data-display-types"

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
  fill: string
  stroke: string
  strokeWidth: number
  strokeOpacity?: number
  width?: number   // for bars
  height?: number  // for bars
}

/**
 * Metadata associated with each point
 */
export interface IPointMetadata extends CaseData {
  datasetID: string
  style: IPointStyle
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
export type RendererCapability = "webgl" | "svg" | "null"

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
}

/**
 * Options for the transition method
 */
export interface ITransitionOptions {
  duration: number
}

/**
 * Array of point renderers (for multi-layer support)
 */
export type PointRendererArray = Array<Maybe<import("./point-renderer-base").PointRendererBase>>

// Re-export types used by consumers
export type { CaseData, CaseDataWithSubPlot, PointDisplayType }
