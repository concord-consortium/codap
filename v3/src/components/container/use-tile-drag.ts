import { useCallback } from "react"
import { useDocumentContainerContext } from "../../hooks/use-document-container-context"
import { logStringifiedObjectMessage } from "../../lib/log-message"
import { inBoundsScaling } from "../../models/document/inbounds-scaling"
import { IFreeTileLayout, IFreeTileRow } from "../../models/document/free-tile-row"
import { getTileComponentInfo } from "../../models/tiles/tile-component-info"
import { ITileModel } from "../../models/tiles/tile-model"
import { updateTileNotification } from "../../models/tiles/tile-notifications"
import { uiState } from "../../models/ui-state"
import { getUnscaledPosition, kInspectorPanelWidth } from "../../utilities/inbounds-utils"
import { IChangingTileStyle, kTileDragGridSize, kTitleBarHeight } from "../constants"

interface IProps {
  row: IFreeTileRow
  tile: ITileModel
  tileLayout?: IFreeTileLayout
  setChangingTileStyle: (style: Maybe<IChangingTileStyle>) => void
}

export function useTileDrag({ row, tile, tileLayout, setChangingTileStyle }: IProps) {
  const containerRef = useDocumentContainerContext()

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.currentTarget && tileLayout) {
      let isDragging = false

      const { x: xStart, y: yStart } = tileLayout.position
      const xPageStart = e.pageX
      const yPageStart = e.pageY

      // Get current scale factor and container dimensions for inbounds mode
      const { scaleFactor } = inBoundsScaling
      const scaledXStart = xStart * scaleFactor
      const scaledYStart = yStart * scaleFactor
      const scaledWidth = (tileLayout.width ?? 0) * scaleFactor
      const scaledHeight = (tileLayout.height ?? 0) * scaleFactor

      // Determine if this tile has an inspector panel
      const componentInfo = getTileComponentInfo(tile.content.type)
      const hasInspector = !!componentInfo?.InspectorPanel
      const inspectorWidth = hasInspector ? kInspectorPanelWidth : 0

      const constrainToGrid = (n: number) => Math.ceil(n / kTileDragGridSize) * kTileDragGridSize

      const constrainX = (dx: number) => {
        // Work in scaled coordinates during drag
        let newX = constrainToGrid(scaledXStart + dx)

        // Apply inbounds constraints if active
        if (uiState.inboundsMode && containerRef.current) {
          const containerWidth = containerRef.current.clientWidth
          const maxX = containerWidth - scaledWidth - inspectorWidth
          newX = Math.max(0, Math.min(newX, maxX))
        }

        return newX
      }

      const constrainY = (dy: number) => {
        // Work in scaled coordinates during drag
        let newY = Math.max(0, constrainToGrid(scaledYStart + dy))

        // Apply inbounds constraints if active
        if (uiState.inboundsMode && containerRef.current) {
          const containerHeight = containerRef.current.clientHeight
          const maxY = containerHeight - scaledHeight
          newY = Math.max(0, Math.min(newY, maxY))
        }

        return newY
      }

      function handleDragTile(event: Event) {
        const ptrEvt = event as PointerEvent
        const xDelta = ptrEvt.pageX - xPageStart
        const yDelta = ptrEvt.pageY - yPageStart

        // Require a minimum drag distance to start dragging
        if (!isDragging && Math.abs(xDelta) + Math.abs(yDelta) > kTileDragGridSize) {
          isDragging = true
          uiState.setIsDraggingTile(true)
        }

        if (isDragging) {
          setChangingTileStyle({
            left: constrainX(xDelta),
            top: constrainY(yDelta),
            width: scaledWidth,
            height: tileLayout?.isMinimized ? kTitleBarHeight : scaledHeight,
            zIndex: tileLayout?.zIndex,
            transition: "none"
          })
        }
      }

      function handleDropTile(event: Event) {
        document.body.removeEventListener("pointermove", handleDragTile, { capture: true })
        document.body.removeEventListener("pointerup", handleDropTile, { capture: true })

        if (isDragging) {
          const ptrEvt = event as PointerEvent
          const xDelta = ptrEvt.pageX - xPageStart
          const yDelta = ptrEvt.pageY - yPageStart
          const scaledNewX = constrainX(xDelta)
          const scaledNewY = constrainY(yDelta)

          // Convert from scaled (rendered) to unscaled (model) coordinates
          const { x: unscaledX, y: unscaledY } = uiState.inboundsMode
            ? getUnscaledPosition(scaledNewX, scaledNewY, scaleFactor)
            : { x: scaledNewX, y: scaledNewY }

          if (tileLayout && (unscaledX !== tileLayout.x || unscaledY !== tileLayout.y)) {
            row.applyModelChange(() => {
              tileLayout.setPosition(unscaledX, unscaledY)
            }, {
              notify: () => updateTileNotification("move", {}, tile),
              undoStringKey: "DG.Undo.componentMove",
              redoStringKey: "DG.Redo.componentMove",
              log: logStringifiedObjectMessage("Moved component %@", {tileType: tile.content.type, tileId: tile.id})
            })
          }

          setChangingTileStyle(undefined)
          uiState.setIsDraggingTile(false)
          isDragging = false
        }
      }

      document.body.addEventListener("pointermove", handleDragTile, { capture: true })
      document.body.addEventListener("pointerup", handleDropTile, { capture: true })
    }
  }, [containerRef, row, setChangingTileStyle, tile, tileLayout])

  return { handlePointerDown }
}
