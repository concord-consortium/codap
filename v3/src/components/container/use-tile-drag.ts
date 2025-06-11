import { useCallback } from "react"
import { IFreeTileLayout, IFreeTileRow } from "../../models/document/free-tile-row"
import { IChangingTileStyle, kTileDragGridSize, kTitleBarHeight } from "../constants"
import { logStringifiedObjectMessage } from "../../lib/log-message"
import { ITileModel } from "../../models/tiles/tile-model"

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
      let pointerId = e.pointerId
      const targetElt = e.currentTarget

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
          pointerId = ptrEvt.pointerId
          targetElt.setPointerCapture(pointerId)
          isDragging = true
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
        targetElt.removeEventListener("pointermove", handleDragTile)
        targetElt.removeEventListener("pointerup", handleDropTile)

        if (isDragging) {
          targetElt.releasePointerCapture(pointerId)

          const ptrEvt = event as PointerEvent
          const xDelta = ptrEvt.pageX - xPageStart
          const yDelta = ptrEvt.pageY - yPageStart
          const newX = constrainX(xDelta)
          const newY = constrainY(yDelta)

          if (tileLayout && (newX !== tileLayout.x || newY !== tileLayout.y)) {
            row.applyModelChange(() => {
              tileLayout.setPosition(newX, newY)
            }, {
              undoStringKey: "DG.Undo.componentMove",
              redoStringKey: "DG.Redo.componentMove",
              log: logStringifiedObjectMessage("Moved component %@", {tileType: tile.content.type, tileId: tile.id})
            })
          }

          setChangingTileStyle(undefined)
          isDragging = false
        }
      }

      targetElt.addEventListener("pointermove", handleDragTile)
      targetElt.addEventListener("pointerup", handleDropTile)
    }
  }, [row, setChangingTileStyle, tile, tileLayout])

  return { handlePointerDown }
}
