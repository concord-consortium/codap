import React from "react"
import { FreeTileRowComponent } from "./free-tile-row"
import { MosaicTileRowComponent } from "./mosaic-tile-row"
import { IDocumentContentModel } from "../models/document/document-content"
import { isFreeTileRow } from "../models/document/free-tile-row"
import { isMosaicTileRow } from "../models/document/mosaic-tile-row"

import "./container.scss"
import { getDragTileId, useContainerDroppable } from "../hooks/use-drag-drop"

interface IProps {
  content?: IDocumentContentModel
}
export const Container: React.FC<IProps> = ({ content }) => {
  // TODO: handle the possibility of multiple rows
  const row = content?.getRowByIndex(0)
  const getTile = (tileId: string) => content?.getTile(tileId)


  const { setNodeRef } = useContainerDroppable("codap-container", active => {
    const dragTileId = getDragTileId(active)
    if (dragTileId) {
      console.log("active.rect:", active.rect)
      if (isFreeTileRow(row)) {
        const rowTile = row.getNode(dragTileId)
        console.log(rowTile)
        // rowTile?.setPosition(50,50)
      }
    }
  })

  return (
    <div id="codap-container" className="codap-container" ref={setNodeRef}>
      {isMosaicTileRow(row) &&
        <MosaicTileRowComponent content={content} row={row} getTile={getTile} />}
      {isFreeTileRow(row) &&
        <FreeTileRowComponent content={content} row={row} getTile={getTile} />}
    </div>
  )
}
