import { useDndContext } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React, { useState } from "react"
import { IDocumentContentModel } from "../models/document/document-content"
import { IFreeTileLayout, IFreeTileRow, isFreeTileRow } from "../models/document/free-tile-row"
import { getTileComponentInfo } from "../models/tiles/tile-component-info"
import { ITileModel } from "../models/tiles/tile-model"
import { CodapComponent } from "./codap-component"

import "./free-tile-row.scss"
import { getDragTileId, IUseDraggableTile, useDraggableTile } from "../hooks/use-drag-drop"

interface IFreeTileRowProps {
  content?: IDocumentContentModel
  row: IFreeTileRow
  getTile: (tileId: string) => ITileModel | undefined
}
export const FreeTileRowComponent = observer(({ content, row, getTile }: IFreeTileRowProps) => {
  const [resizingTileStyle, setResizingTileStyle] =
    useState<{left: number, top: number, width: number, height: number}>()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [resizingTileId, setResizingTileId] = useState("")

  const handleCloseTile = (tileId: string) => {
    if (!tileId) return
    content?.deleteTile(tileId)
  }

  const handleResizePointerDown = (e: React.PointerEvent, tile: IFreeTileLayout, direction: string) => {
    const startWidth = tile.width
    const startHeight = tile.height
    const startPosition = {x: e.pageX, y: e.pageY}

    let resizingWidth = startWidth, resizingHeight = startHeight, resizingLeft = tile.x
    // Because user can start drag 8px within the border, the component's startPosition.x moves by number of pixels
    // the pointer down event location, which moves the entire component to the right by the same number of pixels.
    // So we force it to always be the left position of the component
    // const startLeft = startPosition.x > tile.x ? tile.x : startPosition.x
    const startLeft = tile.x

    const onResizePointerMove = (pointerMoveEvent: { pageX: number; pageY: number }) => {
      setResizingTileId(tile.tileId)
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

      setResizingTileStyle({left: resizingLeft, top: tile.y, width: resizingWidth, height: resizingHeight})
    }
    const onResizePointerUp = () => {
      document.body.removeEventListener("pointermove", onResizePointerMove, { capture: true })
      document.body.removeEventListener("pointerup", onResizePointerUp, { capture: true })
      tile.setSize(resizingWidth, resizingHeight)
      tile.setPosition(resizingLeft, tile.y)
      setResizingTileId("")
    }

    document.body.addEventListener("pointermove", onResizePointerMove, { capture: true })
    document.body.addEventListener("pointerup", onResizePointerUp, { capture: true })
  }

  const handleTitleBarClick = (evt: React.PointerEvent) => {
    setIsEditingTitle(true)
  }

  return (
    <div className="free-tile-row">
      {
        row?.tileIds.map(tileId => {
          const tile = getTile(tileId)
          const tileType = tile?.content.type
          const rowTile = row.tiles.get(tileId)
          const { x: left, y: top, width, height } = rowTile || {}
          const { active } = useDndContext()
          const tileStyle: React.CSSProperties = { left, top, width, height }
          const info = getTileComponentInfo(tileType)
          console.log("tile type:", tileType)
          const draggableOptions: IUseDraggableTile = { prefix: tileType || "tile", tileId }
          const {setNodeRef, transform} = useDraggableTile(draggableOptions,
            activeDrag => {
            const dragTileId = getDragTileId(activeDrag)
            console.log("in activeDrag")
            if (dragTileId) {
              if (isFreeTileRow(row)) {
                row.moveTileToTop(dragTileId)
              }
            }
          })

          console.log("transfrom", transform)
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
                    tileEltClass={info.tileEltClass} onCloseTile={handleCloseTile}
                    isEditingTitle={isEditingTitle} setIsEditingTitle={setIsEditingTitle}
                    onHandleTitleBarClick={handleTitleBarClick}
                    onBottomRightPointerDown={(e)=>handleResizePointerDown(e, rowTile, "bottom-right")}
                    onBottomLeftPointerDown={(e)=>handleResizePointerDown(e, rowTile, "bottom-left")}
                    onRightPointerDown={(e)=>handleResizePointerDown(e, rowTile, "right")}
                    onBottomPointerDown={(e)=>handleResizePointerDown(e, rowTile, "bottom")}
                    onLeftPointerDown={(e)=>handleResizePointerDown(e, rowTile, "left")}
                />
              }
            </div>
          )
        })
      }
    </div>
  )
})
