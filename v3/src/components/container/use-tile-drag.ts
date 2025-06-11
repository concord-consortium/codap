import { useCallback } from "react"
import { IFreeTileLayout, IFreeTileRow } from "../../models/document/free-tile-row"
import { IChangingTileStyle, kTileDragGridSize } from "../constants"

interface IProps {
  row: IFreeTileRow
  tileLayout?: IFreeTileLayout
  setChangingTileStyle: (style: Maybe<IChangingTileStyle>) => void
}

export function useTileDrag({ row, tileLayout, setChangingTileStyle }: IProps) {

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.currentTarget && tileLayout) {
      const targetElt = e.currentTarget
      if (e.pointerId != null) {
        targetElt.setPointerCapture(e.pointerId)
      }

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
        setChangingTileStyle({
          left: constrainX(xDelta),
          top: constrainY(yDelta),
          width: tileLayout?.width,
          height: tileLayout?.height,
          zIndex: tileLayout?.zIndex,
          transition: "none"
        })
      }

      function handleDropTile(event: Event) {
        targetElt.releasePointerCapture(e.pointerId)
        targetElt.removeEventListener("pointermove", handleDragTile)
        targetElt.removeEventListener("pointerup", handleDropTile)

        const ptrEvt = event as PointerEvent
        const xDelta = ptrEvt.pageX - xPageStart
        const yDelta = ptrEvt.pageY - yPageStart

        row.applyModelChange(() => {
          tileLayout?.setPosition(constrainX(xDelta), constrainY(yDelta))
        })

        setChangingTileStyle(undefined)
      }

      targetElt.addEventListener("pointermove", handleDragTile)
      targetElt.addEventListener("pointerup", handleDropTile)
    }
  }, [row, setChangingTileStyle, tileLayout])

  return { handlePointerDown }
}
