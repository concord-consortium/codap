import { getTileComponentInfo } from "../models/tiles/tile-component-info"
import { IFreeTileRow } from "../models/document/free-tile-row"
import { IDocumentContentModel } from "../models/document/document-content"
import { kTileDragGridSize } from "../components/constants"

// Inspector panel width (normal width, from inspector-panel.scss)
export const kInspectorPanelWidth = 72

// Minimum scale factor to prevent components from becoming unusably small
const kMinScaleFactor = 0.1

/**
 * Round value down to grid boundary.
 * Matches V2's DG.ViewUtilities.floorToGrid behavior.
 */
export function floorToGrid(value: number, gridSize = kTileDragGridSize): number {
  return Math.floor(value / gridSize) * gridSize
}

/**
 * Compute the bounds required to display all visible components at 100% scale.
 * Includes inspector panel width in calculations for tiles that have inspectors.
 *
 * @returns The required dimensions { x, y } to fit all components at full size
 */
export function computeScaleBounds(
  row: IFreeTileRow,
  documentContent: IDocumentContentModel
): { x: number; y: number } {
  let maxX = 0
  let maxY = 0

  row.tileIds.forEach(tileId => {
    const layout = row.tiles.get(tileId)

    if (!layout || layout.isHidden || layout.isMinimized) return

    const tile = documentContent.getTile(tileId)
    const componentInfo = tile ? getTileComponentInfo(tile.content.type) : undefined

    const x = layout.x
    const y = layout.y
    const width = layout.width ?? componentInfo?.defaultWidth ?? 0
    const height = layout.height ?? componentInfo?.defaultHeight ?? 0

    // Include inspector panel width if tile has one
    const inspectorWidth = componentInfo?.InspectorPanel ? kInspectorPanelWidth : 0

    // Calculate rightmost and bottommost edges
    const rightEdge = x + width + inspectorWidth
    const bottomEdge = y + height

    maxX = Math.max(maxX, rightEdge)
    maxY = Math.max(maxY, bottomEdge)
  })

  return { x: maxX, y: maxY }
}

/**
 * Compute the uniform scale factor required to fit all components in the container.
 * Returns 1 if no scaling is needed (container is large enough).
 * Returns a value < 1 if components need to be scaled down.
 */
export function computeScaleFactor(
  containerWidth: number,
  containerHeight: number,
  scaleBoundsX: number,
  scaleBoundsY: number
): number {
  if (scaleBoundsX <= 0 || scaleBoundsY <= 0) return 1

  if (containerWidth >= scaleBoundsX && containerHeight >= scaleBoundsY) {
    // Container is large enough - no scaling needed
    return 1
  }

  // Container is too small - compute uniform scale factor
  const widthRatio = containerWidth / scaleBoundsX
  const heightRatio = containerHeight / scaleBoundsY
  return Math.max(kMinScaleFactor, Math.min(widthRatio, heightRatio))
}

/**
 * Convert original (unscaled) coordinates to scaled coordinates for rendering.
 * Pure scaling without grid snapping.
 */
export function getScaledPosition(
  x: number,
  y: number,
  scaleFactor: number
): { x: number; y: number } {
  return {
    x: x * scaleFactor,
    y: y * scaleFactor
  }
}

/**
 * Convert original (unscaled) coordinates to scaled coordinates with grid snapping.
 * Use for tile positions which must align to the grid.
 */
export function getScaledPositionSnapped(
  x: number,
  y: number,
  scaleFactor: number
): { x: number; y: number } {
  return {
    x: floorToGrid(x * scaleFactor),
    y: floorToGrid(y * scaleFactor)
  }
}

/**
 * Convert original (unscaled) dimensions to scaled dimensions for rendering.
 * Pure scaling without grid snapping.
 */
export function getScaledDimensions(
  width: number,
  height: number,
  scaleFactor: number,
  minWidth = 50,
  minHeight = 50
): { width: number; height: number } {
  return {
    width: Math.max(minWidth, width * scaleFactor),
    height: Math.max(minHeight, height * scaleFactor)
  }
}

/**
 * Convert original (unscaled) dimensions to scaled dimensions with grid snapping.
 * Use for tile dimensions which must align to the grid.
 */
export function getScaledDimensionsSnapped(
  width: number,
  height: number,
  scaleFactor: number,
  minWidth = 50,
  minHeight = 50
): { width: number; height: number } {
  return {
    width: Math.max(minWidth, floorToGrid(width * scaleFactor)),
    height: Math.max(minHeight, floorToGrid(height * scaleFactor))
  }
}

/**
 * Convert scaled (rendered) coordinates back to original (unscaled) coordinates.
 * Used when storing user interactions (drag/resize) back to the MST model.
 */
export function getUnscaledPosition(
  scaledX: number,
  scaledY: number,
  scaleFactor: number
): { x: number; y: number } {
  if (scaleFactor <= 0 || scaleFactor > 1) {
    return { x: scaledX, y: scaledY }
  }
  return {
    x: scaledX / scaleFactor,
    y: scaledY / scaleFactor
  }
}

/**
 * Convert scaled (rendered) dimensions back to original (unscaled) dimensions.
 */
export function getUnscaledDimensions(
  scaledWidth: number,
  scaledHeight: number,
  scaleFactor: number
): { width: number; height: number } {
  if (scaleFactor <= 0 || scaleFactor > 1) {
    return { width: scaledWidth, height: scaledHeight }
  }
  return {
    width: scaledWidth / scaleFactor,
    height: scaledHeight / scaleFactor
  }
}

/**
 * Constrain a position to stay within container bounds (in scaled coordinates).
 * Accounts for component dimensions and inspector panel width.
 */
export function constrainPositionToBounds(
  x: number,
  y: number,
  width: number,
  height: number,
  containerWidth: number,
  containerHeight: number,
  hasInspector: boolean
): { x: number; y: number } {
  const inspectorWidth = hasInspector ? kInspectorPanelWidth : 0

  const maxX = containerWidth - width - inspectorWidth
  const maxY = containerHeight - height

  return {
    x: Math.max(0, Math.min(x, maxX)),
    y: Math.max(0, Math.min(y, maxY))
  }
}

/**
 * Constrain dimensions to stay within container bounds (in scaled coordinates).
 * Accounts for component position and inspector panel width.
 */
export function constrainDimensionsToBounds(
  x: number,
  y: number,
  width: number,
  height: number,
  containerWidth: number,
  containerHeight: number,
  hasInspector: boolean,
  minWidth = 50,
  minHeight = 50
): { width: number; height: number } {
  const inspectorWidth = hasInspector ? kInspectorPanelWidth : 0

  const maxWidth = containerWidth - x - inspectorWidth
  const maxHeight = containerHeight - y

  return {
    width: Math.max(minWidth, Math.min(width, maxWidth)),
    height: Math.max(minHeight, Math.min(height, maxHeight))
  }
}
