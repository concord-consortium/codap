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


  const handleResizePointerDown = (e: React.PointerEvent, tile: IFreeTileLayout) => {
    const startWidth = tile.width
    const startHeight = tile.height
    const startPosition = {x: e.pageX, y: e.pageY}
    tempWidth.current = startWidth
    tempHeight.current = startHeight

    const onPointerMove = (pointerMoveEvent: { pageX: number; pageY: number }) => {
      setResizingTileId(tile.tileId)
      const resizingWidth = startWidth - startPosition.x + pointerMoveEvent.pageX
      const resizingHeight = startHeight - startPosition.y + pointerMoveEvent.pageY
      setResizingTileStyle({left: tile.x, top: tile.y, width: resizingWidth, height: resizingHeight})
      tempWidth.current = resizingWidth
      tempHeight.current = resizingHeight
    }
    const onPointerUp = () => {
      document.body.removeEventListener("pointermove", onPointerMove)
      document.body.removeEventListener("pointerup", onPointerUp)
      tile.setSize(tempWidth.current, tempHeight.current)
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
                    onPointerDown={(e)=>handleResizePointerDown(e, rowTile)}/>
              }
            </div>
          )
        })
      }
    </div>
  )
}
