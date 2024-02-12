import { clsx } from "clsx"
import React, { useCallback } from "react"
import { useDocumentContext } from "../../hooks/use-document-context"
import { useContainerDroppable, getDragTileId } from "../../hooks/use-drag-drop"
import { isFreeTileRow } from "../../models/document/free-tile-row"
import { isMosaicTileRow } from "../../models/document/mosaic-tile-row"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { urlParams } from "../../utilities/url-params"
import { FreeTileRowComponent } from "./free-tile-row"
import { MosaicTileRowComponent } from "./mosaic-tile-row"

import "./container.scss"

export const Container: React.FC = () => {
  const content = useDocumentContext()?.content
  const isScrollBehaviorAuto = urlParams.scrollBehavior === "auto"
  // TODO: handle the possibility of multiple rows
  const row = content?.getRowByIndex(0)
  const getTile = useCallback((tileId: string) => content?.getTile(tileId), [content])

  const handleCloseTile = useCallback((tileId: string) => {
    content?.applyUndoableAction(() => {
      const manager = getSharedModelManager(content)
      const tile = getTile(tileId)
      const sharedModels = manager?.getTileSharedModels(tile?.content)
      sharedModels?.forEach(model => {
        manager?.removeTileSharedModel(tile?.content, model)
      })
      tileId && content?.deleteTile(tileId)
    }, "DG.Undo.component.close", "DG.Redo.component.close")
  }, [content, getTile])

  const { setNodeRef } = useContainerDroppable("codap-container", evt => {
    const dragTileId = getDragTileId(evt.active)
    if (dragTileId) {
      if (isFreeTileRow(row)) {
        const rowTile = row.getNode(dragTileId)
        rowTile?.setPosition(rowTile.x + evt.delta.x, rowTile.y + evt.delta.y)
      }
    }
  })

  const classes = clsx("codap-container", { "scroll-behavior-auto": isScrollBehaviorAuto })
  return (
    <div className={classes} ref={setNodeRef}>
      {isMosaicTileRow(row) &&
        <MosaicTileRowComponent row={row} getTile={getTile} onCloseTile={handleCloseTile}/>}
      {isFreeTileRow(row) &&
        <FreeTileRowComponent row={row} getTile={getTile} onCloseTile={handleCloseTile}/>}
    </div>
  )
}
