import React from "react"
import { IFreeTileRow } from "../models/document/free-tile-row"
import { getTileComponentInfo } from "../models/tiles/tile-component-info"
import { ITileModel } from "../models/tiles/tile-model"
import { CodapComponent } from "./codap-component"

import "./free-tile-row.scss"

interface IFreeTileRowProps {
  row: IFreeTileRow
  getTile: (tileId: string) => ITileModel | undefined
}
export const FreeTileRowComponent = ({ row, getTile }: IFreeTileRowProps) => {
  return (
    <div className="free-tile-row">
      {
        row?.tileIds.map(tileId => {
          const tile = getTile(tileId)
          const tileType = tile?.content.type
          const { x: left, y: top, width, height } = row.tiles.get(tileId) || {}
          const style: React.CSSProperties = { left, top, width, height }
          const info = getTileComponentInfo(tileType)
          return (
            <div className="free-tile-component" style={style} key={tileId}>
              {tile && info &&
                <CodapComponent tile={tile} Component={info.Component} tileEltClass={info.tileEltClass} />}
            </div>
          )
        })
      }
    </div>
  )
}
