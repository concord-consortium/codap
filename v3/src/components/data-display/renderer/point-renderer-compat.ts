/**
 * Backward compatibility layer for migrating from PixiPoints to PointRendererBase.
 * This allows existing code that expects PixiPoints to work with PointRendererBase
 * during the incremental migration.
 */

import { PixiPoints, PixiPointsArray, IPixiPointMetadata } from "../pixi/pixi-points"
import { PointRendererBase } from "./point-renderer-base"
import { PixiPointRenderer } from "./pixi-point-renderer"
import { IPoint, IPointMetadata } from "./point-renderer-types"

/**
 * Type that represents either old PixiPoints or new PointRendererBase.
 * Used during migration to allow gradual transition.
 */
export type PixiPointsCompatible = PixiPoints | PointRendererBase

/**
 * Array type that can hold either old or new renderer types.
 */
export type PixiPointsCompatibleArray = Array<Maybe<PixiPointsCompatible>>

/**
 * Check if a renderer is a PixiPoints instance (old API)
 */
export function isPixiPoints(renderer: PixiPointsCompatible | undefined): renderer is PixiPoints {
  return renderer instanceof PixiPoints
}

/**
 * Check if a renderer is a PointRendererBase instance (new API)
 */
export function isPointRenderer(renderer: PixiPointsCompatible | undefined): renderer is PointRendererBase {
  return renderer instanceof PointRendererBase
}

/**
 * Check if a renderer is a PixiPointRenderer (new WebGL renderer)
 */
export function isPixiPointRenderer(renderer: PixiPointsCompatible | undefined): renderer is PixiPointRenderer {
  return renderer instanceof PixiPointRenderer
}

/**
 * Get the canvas from either renderer type
 */
export function getCanvas(renderer: PixiPointsCompatible | undefined): HTMLCanvasElement | null {
  if (!renderer) return null
  return renderer.canvas
}

/**
 * Check if a renderer has WebGL capability
 */
export function hasWebGLCapability(renderer: PixiPointsCompatible | undefined): boolean {
  if (!renderer) return false
  if (isPixiPoints(renderer)) {
    return renderer.renderer != null
  }
  return renderer.capability === "webgl"
}

/**
 * Adapter function to convert new IPoint to work with old API expectations.
 * During migration, some code expects PIXI.Sprite but we're passing IPoint.
 * This creates a compatibility object that has both id and sprite access.
 */
export interface IPointWithSprite extends IPoint {
  /** The underlying PIXI sprite (if available) */
  _sprite?: unknown
}

/**
 * Convert PointRendererBase array to PixiPointsArray for backward compatibility.
 * This is a temporary bridge during migration.
 */
export function toPixiPointsArray(renderers: Array<PointRendererBase | undefined>): PixiPointsArray {
  // For now, just cast - the APIs are designed to be similar enough
  // In the future, this can be removed once all consumers are migrated
  return renderers as unknown as PixiPointsArray
}

/**
 * Convert IPointMetadata to IPixiPointMetadata for backward compatibility.
 */
export function toPixiMetadata(metadata: IPointMetadata): IPixiPointMetadata {
  return metadata as IPixiPointMetadata
}
