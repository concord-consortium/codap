import React from "react"
import { MosaicTileRowComponent } from "./mosaic-tile-row"
import { IDocumentContentModel } from "../models/document/document-content"
import { isMosaicTileRow } from "../models/document/mosaic-tile-row"

import "./container.scss"

interface IProps {
  content?: IDocumentContentModel
}
export const Container: React.FC<IProps> = ({ content }) => {
  // TODO: handle the possibility of multiple rows
  const row = content?.getRowByIndex(0)
  const getTile = (tileId: string) => content?.getTile(tileId)
  return (
    <div className="codap-container">
      {isMosaicTileRow(row) &&
        <MosaicTileRowComponent row={row} getTile={getTile} />}
    </div>
  )
}
