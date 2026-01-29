import { comparer, reaction } from "mobx"
import { useCallback, useEffect } from "react"
import { isFreeTileRow } from "../models/document/free-tile-row"
import { inBoundsScaling } from "../models/document/inbounds-scaling"
import { uiState } from "../models/ui-state"
import { computeScaleBounds, computeScaleFactor } from "../utilities/inbounds-utils"
import { useDocumentContainerContext } from "./use-document-container-context"
import { useDocumentContent } from "./use-document-content"

/**
 * Hook to manage inbounds scaling.
 *
 * When inboundsMode is active, this hook:
 * 1. Tracks container size via ResizeObserver
 * 2. Computes scale bounds from all visible tiles
 * 3. Computes and updates the scale factor
 * 4. Reacts to tile layout changes
 *
 * The scale factor is stored in the inBoundsScaling singleton and
 * used by FreeTileComponent to render tiles at the appropriate size.
 */
export function useInBoundsScaling() {
  const documentContent = useDocumentContent()
  const containerRef = useDocumentContainerContext()

  const recomputeScaling = useCallback(() => {
    if (!uiState.inboundsMode || !documentContent || !containerRef.current) return

    const row = documentContent.getRowByIndex(0)
    if (!isFreeTileRow(row)) return

    // Update container dimensions
    const containerWidth = containerRef.current.clientWidth
    const containerHeight = containerRef.current.clientHeight
    inBoundsScaling.setContainerSize(containerWidth, containerHeight)

    // Compute scale bounds from all visible tiles
    const bounds = computeScaleBounds(row, documentContent)
    inBoundsScaling.setScaleBounds(bounds.x, bounds.y)

    // Compute and set the scale factor
    const scaleFactor = computeScaleFactor(
      containerWidth, containerHeight,
      bounds.x, bounds.y
    )
    inBoundsScaling.setScaleFactor(scaleFactor)
  }, [documentContent, containerRef])

  // Track container size changes with ResizeObserver
  useEffect(() => {
    if (!uiState.inboundsMode) return

    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver(() => {
      recomputeScaling()
    })

    resizeObserver.observe(container)

    // Initial computation
    recomputeScaling()

    return () => resizeObserver.disconnect()
  }, [containerRef, recomputeScaling])

  // React to tile layout changes (position, size, visibility)
  useEffect(() => {
    if (!uiState.inboundsMode || !documentContent) return

    const row = documentContent.getRowByIndex(0)
    if (!isFreeTileRow(row)) return

    // Observe changes to tile layouts
    const disposer = reaction(
      // Track tile count and all tile positions/sizes
      () => {
        const tileData = row.tileIds.map(tileId => {
          const layout = row.tiles.get(tileId)
          return layout
            ? { id: tileId, x: layout.x, y: layout.y, w: layout.width, h: layout.height, hidden: layout.isHidden }
            : null
        })
        return { count: row.tileCount, tiles: tileData }
      },
      () => {
        recomputeScaling()
      },
      { name: "useInBoundsScaling.tileLayoutReaction", equals: comparer.structural }
    )

    return () => disposer()
  }, [documentContent, recomputeScaling])

  return { recomputeScaling }
}
