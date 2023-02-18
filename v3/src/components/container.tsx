import React from "react"
import {DndContext, useDroppable} from '@dnd-kit/core'
import { FreeTileRowComponent } from "./free-tile-row"
import { MosaicTileRowComponent } from "./mosaic-tile-row"
import { IDocumentContentModel } from "../models/document/document-content"
import { isFreeTileRow } from "../models/document/free-tile-row"
import { isMosaicTileRow } from "../models/document/mosaic-tile-row"

import "./container.scss"
import { getDragTileId, useContainerDroppable } from "../hooks/use-drag-drop"

const kCodapContainerIdBase = "codap-container"

interface IProps {
  content?: IDocumentContentModel
}
export const Container: React.FC<IProps> = ({ content }) => {
  // TODO: handle the possibility of multiple rows
  const row = content?.getRowByIndex(0)
  const getTile = (tileId: string) => content?.getTile(tileId)
  const handleTileDrop = (tileId: string) => {
    console.log("in handleTileDrop")
  }
  const {setNodeRef} = useContainerDroppable(kCodapContainerIdBase,  active => {
    const dragAttributeID = getDragTileId(active)
    dragAttributeID && handleTileDrop(dragAttributeID)
  })

  return (
    <DndContext>
      <div id="codap-container" className="codap-container" ref={setNodeRef}>
        {isMosaicTileRow(row) &&
          <MosaicTileRowComponent content={content} row={row} getTile={getTile} />}
        {isFreeTileRow(row) &&
          <FreeTileRowComponent content={content} row={row} getTile={getTile} />}
      </div>
    </DndContext>

  )
}
