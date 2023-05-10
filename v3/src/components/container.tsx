import React from "react"
import { FreeTileRowComponent } from "./free-tile-row"
import { MosaicTileRowComponent } from "./mosaic-tile-row"
import { IDocumentModel } from "../models/document/document"
import { getSharedModelManager } from "../models/tiles/tile-environment"
import { isFreeTileRow } from "../models/document/free-tile-row"
import { isMosaicTileRow } from "../models/document/mosaic-tile-row"
import { getDragTileId, useContainerDroppable } from "../hooks/use-drag-drop"

import "./container.scss"

interface IProps {
  document: IDocumentModel
}
export const Container: React.FC<IProps> = ({ document }) => {
  // TODO: handle the possibility of multiple rows
  const content = document.content
  const row = content?.getRowByIndex(0)
  const getTile = (tileId: string) => content?.getTile(tileId)

  const handleCloseTile = (tileId: string) => {
    const manager = getSharedModelManager(document)
    const tile = getTile(tileId)
    const sharedModels = manager?.getTileSharedModels(tile?.content)
    sharedModels?.forEach(model => {
      manager?.removeTileSharedModel(tile?.content, model)
    })
    tileId && content?.deleteTile(tileId)
  }

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
        <MosaicTileRowComponent content={content} row={row} getTile={getTile} onCloseTile={handleCloseTile}/>}
      {isFreeTileRow(row) &&
        <FreeTileRowComponent row={row} getTile={getTile} onCloseTile={handleCloseTile}/>}
    </div>
  )
}
