import { useDndContext, useDraggable } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React, { useState } from "react"
import {CSS} from "@dnd-kit/utilities"
import { IDocumentContentModel } from "../models/document/document-content"
import { IFreeTileLayout, IFreeTileRow } from "../models/document/free-tile-row"
import { getTileComponentInfo } from "../models/tiles/tile-component-info"
import { ITileModel } from "../models/tiles/tile-model"
import { CodapComponent } from "./codap-component"

import "./free-tile-row.scss"
import { IUseDraggableTile, useDraggableTile } from "../hooks/use-drag-drop"

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
  const [draggingTileId, setDraggingTileId] = useState("")

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

    const onPointerMove = (pointerMoveEvent: { pageX: number; pageY: number }) => {
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
    const onPointerUp = () => {
      document.body.removeEventListener("pointermove", onPointerMove, { capture: true })
      document.body.removeEventListener("pointerup", onPointerUp, { capture: true })
      tile.setSize(resizingWidth, resizingHeight)
      tile.setPosition(resizingLeft, tile.y)
      setResizingTileId("")
    }

    document.body.addEventListener("pointermove", onPointerMove, { capture: true })
    document.body.addEventListener("pointerup", onPointerUp, { capture: true })
  }

  const handleTitleBarClick = (evt: React.PointerEvent) => {
    evt.preventDefault()
    console.log("ComponentTitleBar handleClick")
    setIsEditingTitle?.(true)
  }

  const handleDragTile = (evt: any, tile: IFreeTileLayout) => {
    console.log("in handleDragTile evt", evt)
    setDraggingTileId(tile.tileId)
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
          // tileId === draggingTileId && console.log("transform: ", CSS.Translate.toString(transform))
          // const style = tileId === resizingTileId
          //                 ? resizingTileStyle
          //                 : tileId === draggingTileId
          //                     ? {transform: CSS.Translate.toString(transform)}
          //                     : tileStyle
          const info = getTileComponentInfo(tileType)
          const draggableOptions: IUseDraggableTile = { prefix: "case-table", tileId }
          const {setNodeRef, transform} = useDraggableTile(draggableOptions)
          console.log("tileId === draggingTileId:",tileId === draggingTileId, "transform: ", CSS.Translate.toString(transform))
          const style = tileId === resizingTileId
                          ? resizingTileStyle
                          : active
                              ? {transform: CSS.Translate.toString(transform)}
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
