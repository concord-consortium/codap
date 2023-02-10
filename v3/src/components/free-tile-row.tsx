import React, { useRef, useState } from "react"
import { IFreeTileLayout, IFreeTileRow } from "../models/document/free-tile-row"
import { getTileComponentInfo } from "../models/tiles/tile-component-info"
import { ITileModel } from "../models/tiles/tile-model"
import { CodapComponent } from "./codap-component"

import "./free-tile-row.scss"

interface IFreeTileRowProps {
  row: IFreeTileRow
  getTile: (tileId: string) => ITileModel | undefined
}
export const FreeTileRowComponent = ({ row, getTile }: IFreeTileRowProps) => {
  const [resizingTileStyle, setResizingTileStyle] =
    useState<{left: number, top: number, width: number, height: number}>()
  const [resizingTileId, setResizingTileId] = useState("")
  const tempWidth = useRef<number>(0)
  const tempHeight = useRef<number>(0)
  const tempLeft = useRef<number>(0)

  const handleResizePointerDown = (e: React.PointerEvent, tile: IFreeTileLayout, direction: string) => {
    const startWidth = tile.width
    const startHeight = tile.height
    const startPosition = {x: e.pageX, y: e.pageY}
    tempLeft.current = tile.x
    tempWidth.current = startWidth
    tempHeight.current = startHeight
    let resizingWidth = startWidth, resizingHeight = startHeight, resizingWidthLeft = tile.x
    // Because user can start drag 8px within the border, the component's startPosition.x moves by number of pixels
    // the pointer down event location, which moves the entire component to the right by the same number of pixels.
    // So we force it to always be the left position of the component
    const leftStartPosition = startPosition.x > tile.x ? tile.x : startPosition.x

    const onPointerMove = (pointerMoveEvent: { pageX: number; pageY: number }) => {
      setResizingTileId(tile.tileId)
      switch (direction) {
        case "bottom-right":
          resizingWidth = startWidth - startPosition.x + pointerMoveEvent.pageX
          resizingHeight = startHeight - startPosition.y + pointerMoveEvent.pageY
          break
        case "bottom-left":
          resizingWidth = startWidth + leftStartPosition - pointerMoveEvent.pageX
          resizingHeight = startHeight - startPosition.y + pointerMoveEvent.pageY
          resizingWidthLeft = pointerMoveEvent.pageX
          break
        case "left":
          resizingWidth = startWidth + leftStartPosition - pointerMoveEvent.pageX

          resizingWidthLeft = pointerMoveEvent.pageX
          break
        case "bottom":
          resizingHeight = startHeight - startPosition.y + pointerMoveEvent.pageY
          break
        case "right":
          resizingWidth = startWidth - startPosition.x + pointerMoveEvent.pageX
          break
      }

      setResizingTileStyle({left: resizingWidthLeft, top: tile.y, width: resizingWidth, height: resizingHeight})
      tempLeft.current = resizingWidthLeft
      tempWidth.current = resizingWidth
      tempHeight.current = resizingHeight
    }
    const onPointerUp = () => {
      document.body.removeEventListener("pointermove", onPointerMove)
      document.body.removeEventListener("pointerup", onPointerUp)
      tile.setSize(tempWidth.current, tempHeight.current)
      tile.setPosition(tempLeft.current, tile.y)
      setResizingTileId("")
    }

    document.body.addEventListener("pointermove", onPointerMove)
    document.body.addEventListener("pointerup", onPointerUp)
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
          const style = tileId === resizingTileId ? resizingTileStyle : tileStyle
          const info = getTileComponentInfo(tileType)
          return (
            <div className="free-tile-component" style={style} key={tileId}>
              {tile && info && rowTile &&
                <CodapComponent tile={tile} TitleBar={info.TitleBar} Component={info.Component}
                    tileEltClass={info.tileEltClass}
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
}
