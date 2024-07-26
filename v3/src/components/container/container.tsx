import { clsx } from "clsx"
import React, { useCallback } from "react"
import { useDocumentContent } from "../../hooks/use-document-content"
import { useContainerDroppable, getDragTileId } from "../../hooks/use-drag-drop"
import { isFreeTileRow } from "../../models/document/free-tile-row"
import { isMosaicTileRow } from "../../models/document/mosaic-tile-row"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { urlParams } from "../../utilities/url-params"
import { Logger } from "../../lib/logger"
import { FreeTileRowComponent } from "./free-tile-row"
import { MosaicTileRowComponent } from "./mosaic-tile-row"

import "./container.scss"

export const Container: React.FC = () => {
  const documentContent = useDocumentContent()
  const isScrollBehaviorAuto = urlParams.scrollBehavior === "auto"
  // TODO: handle the possibility of multiple rows
  const row = documentContent?.getRowByIndex(0)
  const getTile = useCallback((tileId: string) => documentContent?.getTile(tileId), [documentContent])

  const handleCloseTile = useCallback((tileId: string) => {
    const tile = getTile(tileId)
    documentContent?.applyModelChange(() => {
      const manager = getSharedModelManager(documentContent)
      const sharedModels = manager?.getTileSharedModels(tile?.content)
      sharedModels?.forEach(model => {
        manager?.removeTileSharedModel(tile?.content, model)
      })
      tileId && documentContent?.deleteTile(tileId)
      Logger.log(`${tile?.content.type} is closed`)
    }, {
      log: `${tile?.content.type} is closed`,
      undoStringKey: "DG.Undo.component.close",
      redoStringKey: "DG.Redo.component.close"
    })
  }, [documentContent, getTile])

  const { setNodeRef } = useContainerDroppable("codap-container", evt => {
    const dragTileId = getDragTileId(evt.active)
    if (dragTileId) {
      if (isFreeTileRow(row)) {
        const rowTile = row.getNode(dragTileId)
        if (rowTile && (evt.delta.x || evt.delta.y)) {
          documentContent?.applyModelChange(() => {
            rowTile.setPosition(rowTile.x + evt.delta.x, rowTile.y + evt.delta.y)
          }, {
            undoStringKey: "DG.Undo.componentMove",
            redoStringKey: "DG.Redo.componentMove"
          })
        }
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
