import { useDndContext } from "@dnd-kit/core"
import React, { useState } from "react"
import { getDragTileId, IUseDraggableTile, useDraggableTile } from "../hooks/use-drag-drop"
import { IFreeTileLayout, IFreeTileRow, isFreeTileRow } from "../models/document/free-tile-row"
import { getTileComponentInfo } from "../models/tiles/tile-component-info"
import { ITileModel } from "../models/tiles/tile-model"
import { CodapComponent } from "./codap-component"

interface IProps {
  row: IFreeTileRow;
  tile: ITileModel;
  onCloseTile: (tileId: string) => void;
}

export const FreeTileComponent = ({ row, tile, onCloseTile}: IProps) => {
  const [resizingTileStyle, setResizingTileStyle] =
    useState<{left: number, top: number, width: number, height: number}>()
  const [resizingTileId, setResizingTileId] = useState("")
  const tileId = tile.id
  const tileType = tile.content.type
  const rowTile = row.tiles.get(tileId)
  const { x: left, y: top, width, height } = rowTile || {}
  const { active } = useDndContext()
  const tileStyle: React.CSSProperties = { left, top, width, height }
  const info = getTileComponentInfo(tileType)
  const draggableOptions: IUseDraggableTile = { prefix: tileType || "tile", tileId }
  const {setNodeRef, transform} = useDraggableTile(draggableOptions,
    activeDrag => {
    const dragTileId = getDragTileId(activeDrag)
    if (dragTileId) {
      if (isFreeTileRow(row)) {
        row.moveTileToTop(dragTileId)
      }
    }
  })

  const handleResizePointerDown = (e: React.PointerEvent, mtile: IFreeTileLayout, direction: string) => {
    const startWidth = mtile.width
    const startHeight = mtile.height
    const startPosition = {x: e.pageX, y: e.pageY}

    let resizingWidth = startWidth, resizingHeight = startHeight, resizingLeft = mtile.x
    // Because user can start drag 8px within the border, the component's startPosition.x moves by number of pixels
    // the pointer down event location, which moves the entire component to the right by the same number of pixels.
    // So we force it to always be the left position of the component
    // const startLeft = startPosition.x > tile.x ? tile.x : startPosition.x
    const startLeft = mtile.x

    const onPointerMove = (pointerMoveEvent: { pageX: number; pageY: number }) => {
      setResizingTileId(mtile.tileId)
      const xDelta = pointerMoveEvent.pageX - startPosition.x
      const yDelta = pointerMoveEvent.pageY - startPosition.y
      switch (direction) {
        case "bottom-right":
          resizingWidth = startWidth + xDelta
          resizingHeight = startHeight + yDelta
          break
        case "bottom-left":
          resizingWidth = startWidth - xDelta
          resizingHeight = startHeight + yDelta
          resizingLeft = startLeft + xDelta
          break
        case "left":
          resizingWidth = startWidth - xDelta
          resizingLeft = startLeft + xDelta
          break
        case "bottom":
          resizingHeight = startHeight + yDelta
          break
        case "right":
          resizingWidth = startWidth + xDelta
          break
      }

      setResizingTileStyle({left: resizingLeft, top: mtile.y, width: resizingWidth, height: resizingHeight})
    }
    const onPointerUp = () => {
      document.body.removeEventListener("pointermove", onPointerMove, { capture: true })
      document.body.removeEventListener("pointerup", onPointerUp, { capture: true })
      mtile.setSize(resizingWidth, resizingHeight)
      mtile.setPosition(resizingLeft, mtile.y)
      setResizingTileId("")
    }

    document.body.addEventListener("pointermove", onPointerMove, { capture: true })
    document.body.addEventListener("pointerup", onPointerUp, { capture: true })
  }

  const startStyleTop = top || 0
  const startStyleLeft = left || 0
  const movingStyle = transform && {top: startStyleTop + transform.y, left: startStyleLeft + transform.x,
    width, height}
  const style = tileId === resizingTileId
                  ? resizingTileStyle
                  : active && movingStyle
                      ? movingStyle
                      : tileStyle
  return (
    <div className="free-tile-component" style={style} key={tileId} ref={setNodeRef}>
      {tile && info && rowTile &&
        <CodapComponent tile={tile} TitleBar={info.TitleBar} Component={info.Component}
            tileEltClass={info.tileEltClass} onCloseTile={onCloseTile}
            isFixedSize={info.isFixedSize}
            onBottomRightPointerDown={(e)=>handleResizePointerDown(e, rowTile, "bottom-right")}
            onBottomLeftPointerDown={(e)=>handleResizePointerDown(e, rowTile, "bottom-left")}
            onRightPointerDown={(e)=>handleResizePointerDown(e, rowTile, "right")}
            onBottomPointerDown={(e)=>handleResizePointerDown(e, rowTile, "bottom")}
            onLeftPointerDown={(e)=>handleResizePointerDown(e, rowTile, "left")}
        />
      }
    </div>
  )
}
