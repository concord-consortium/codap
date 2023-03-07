import React from "react"
import { FreeTileRowComponent } from "./free-tile-row"
import { MosaicTileRowComponent } from "./mosaic-tile-row"
import { IDocumentContentModel } from "../models/document/document-content"
import { isFreeTileRow } from "../models/document/free-tile-row"
import { isMosaicTileRow } from "../models/document/mosaic-tile-row"
import { getDragTileId, useContainerDroppable } from "../hooks/use-drag-drop"

import "./container.scss"

interface IProps {
  content?: IDocumentContentModel
}
export const Container: React.FC<IProps> = ({ content }) => {
  // TODO: handle the possibility of multiple rows
  const row = content?.getRowByIndex(0)
  const getTile = (tileId: string) => content?.getTile(tileId)


  const { setNodeRef } = useContainerDroppable("codap-container", evt => {
    const dragTileId = getDragTileId(evt.active)
    if (dragTileId) {
      if (isFreeTileRow(row)) {
        const rowTile = row.getNode(dragTileId)
        rowTile?.setPosition(rowTile.x + evt.delta.x, rowTile.y + evt.delta.y)
      }
    }
  })

  return (
    <div className="codap-container" ref={setNodeRef}>
      {isMosaicTileRow(row) &&
        <MosaicTileRowComponent content={content} row={row} getTile={getTile} />}
      {isFreeTileRow(row) &&
        <FreeTileRowComponent content={content} row={row} getTile={getTile} />}
    </div>
  )
}
