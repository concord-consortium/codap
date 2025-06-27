import { useCallback } from "react"
import { logStringifiedObjectMessage } from "../../lib/log-message"
import { IFreeTileLayout, IFreeTileRow } from "../../models/document/free-tile-row"
import { ITileModel } from "../../models/tiles/tile-model"
import { updateTileNotification } from "../../models/tiles/tile-notifications"
import { uiState } from "../../models/ui-state"
import { IChangingTileStyle, kTileDragGridSize, kTitleBarHeight } from "../constants"

interface IProps {
  row: IFreeTileRow
  tile: ITileModel
  tileLayout?: IFreeTileLayout
  setChangingTileStyle: (style: Maybe<IChangingTileStyle>) => void
}

export function useTileDrag({ row, tile, tileLayout, setChangingTileStyle }: IProps) {

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.currentTarget && tileLayout) {
      let isDragging = false

      const { x: xStart, y: yStart } = tileLayout.position
      const xPageStart = e.pageX
      const yPageStart = e.pageY

      const constrainToGrid = (n: number) => Math.ceil(n / kTileDragGridSize) * kTileDragGridSize
      const constrainX = (dx: number) => constrainToGrid(xStart + dx)
      const constrainY = (dy: number) => Math.max(0, constrainToGrid(yStart + dy))

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
            width: tileLayout?.width,
            height: tileLayout?.isMinimized ? kTitleBarHeight : tileLayout?.height,
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
          const newX = constrainX(xDelta)
          const newY = constrainY(yDelta)

          if (tileLayout && (newX !== tileLayout.x || newY !== tileLayout.y)) {
            row.applyModelChange(() => {
              tileLayout.setPosition(newX, newY)
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
  }, [row, setChangingTileStyle, tile, tileLayout])

  return { handlePointerDown }
}
