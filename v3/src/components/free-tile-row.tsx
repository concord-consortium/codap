import { observer } from "mobx-react-lite"
import React from "react"
import { IDocumentContentModel } from "../models/document/document-content"
import { IFreeTileRow } from "../models/document/free-tile-row"
import { ITileModel } from "../models/tiles/tile-model"
import { FreeTileComponent } from "./free-tile-component"

import "./free-tile-row.scss"

interface IFreeTileRowProps {
  content?: IDocumentContentModel
  row: IFreeTileRow
  getTile: (tileId: string) => ITileModel | undefined
}
export const FreeTileRowComponent = observer(({ content, row, getTile }: IFreeTileRowProps) => {
  const handleCloseTile = (tileId: string) => {
    if (!tileId) return
    content?.deleteTile(tileId)
  }

  return (
    <div className="free-tile-row">
      {
        row?.tileIds.map(tileId => {
          const tile = getTile(tileId)
          return (
            tile && <FreeTileComponent row={row} tile={tile} onCloseTile={handleCloseTile} key={tileId}/>
          )
        })
      }
    </div>
  )
})
