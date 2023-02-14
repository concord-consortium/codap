import { observer } from "mobx-react-lite"
import React, { useRef, useState } from "react"
import { flushSync } from "react-dom"
import { IDocumentContentModel } from "../models/document/document-content"
import { IFreeTileLayout, IFreeTileRow } from "../models/document/free-tile-row"
import { getTileComponentInfo } from "../models/tiles/tile-component-info"
import { ITileModel } from "../models/tiles/tile-model"
import { CodapComponent } from "./codap-component"

import "./free-tile-row.scss"

interface IFreeTileRowProps {
  content?: IDocumentContentModel
  row: IFreeTileRow
  getTile: (tileId: string) => ITileModel | undefined
}
export const FreeTileRowComponent = observer(({ content, row, getTile }: IFreeTileRowProps) => {
  const [resizingTileStyle, setResizingTileStyle] =
    useState<{left: number, top: number, width: number, height: number}>()
  const [resizingTileId, setResizingTileId] = useState("")
  const [movingTileId, setMovingTileId] = useState("")
  const [movingTileStyle, setMovingTileStyle] = useState<{left: number, top: number, width: number, height: number}>()
  const [isEditingTitle, setIsEditingTitle] = useState(false)

  const handleCloseTile = (tileId: string) => {
    if (!tileId) return
    content?.deleteTile(tileId)
  }

  const handleResizePointerDown = (e: React.PointerEvent, tile: IFreeTileLayout, direction: string) => {
    const startWidth = tile.width
    const startHeight = tile.height
    const startPosition = {x: e.pageX, y: e.pageY}
    const startLeft = tile.x
    let resizingWidth = startWidth, resizingHeight = startHeight, resizingLeft = tile.x

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

  const handleTitleBarClick = () => {
    console.log("ComponentTitleBar handleClick")
    setIsEditingTitle?.(true)
  }

  const handleComponentDragPointerDown = (e: React.MouseEvent, tile: IFreeTileLayout) => {
    console.log("handleComponentDragPointerDown")
    const startPosition = {x: e.pageX, y: e.pageY}
    const startTop = tile.y
    const startLeft = tile.x
    let movingLeft = startLeft, movingTop = startTop

    const onPointerMove = (pointerMoveEvent: { pageX: number; pageY: number }) => {
      e.preventDefault()
      e.stopPropagation()
      setMovingTileId(tile.tileId)
      const xDelta = pointerMoveEvent.pageX - startPosition.x
      const yDelta = pointerMoveEvent.pageY - startPosition.y
      movingLeft = startLeft + xDelta
      movingTop = startTop + yDelta
      setMovingTileStyle({left: movingLeft, top: movingTop, width: tile.width, height: tile.height})
    }
    const onPointerUp = () => {
      if ((movingLeft === startLeft) && (movingTop === startTop)) {
        console.log("pointer didn't move")
        setIsEditingTitle?.(true)
      }
      document.body.removeEventListener("mousemove", onPointerMove, { capture: true })
      document.body.removeEventListener("mouseup", onPointerUp, { capture: true })
      tile.setPosition(movingLeft, movingTop)
      setMovingTileId("")
    }
    document.body.addEventListener("mousemove", onPointerMove, { capture: true })
    document.body.addEventListener("mouseup", onPointerUp, { capture: true })
  }
  return (
    <div className="free-tile-row">
      {
        row?.tileIds.map(tileId => {
          const tile = getTile(tileId)
          const tileType = tile?.content.type
          const rowTile = row.tiles.get(tileId)
          const { x: left, y: top, width, height } = rowTile || {}
          const tileStyle: React.CSSProperties = { left, top, width, height }
          const style = tileId === resizingTileId
                          ? resizingTileStyle
                          : tileId === movingTileId ? movingTileStyle : tileStyle
          const info = getTileComponentInfo(tileType)
          return (
            <div className="free-tile-component" style={style} key={tileId}>
              {tile && info && rowTile &&
                <CodapComponent tile={tile} TitleBar={info.TitleBar} Component={info.Component}
                    tileEltClass={info.tileEltClass} onCloseTile={handleCloseTile}
                    isEditingTitle={isEditingTitle} setIsEditingTitle={setIsEditingTitle}
                    onComponentMovePointerDown={(e)=>handleComponentDragPointerDown(e, rowTile)}
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
