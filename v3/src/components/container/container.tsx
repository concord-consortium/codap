import { useMergeRefs } from "@chakra-ui/react"
import { clsx } from "clsx"
import React, { useCallback, useRef } from "react"
import { DocumentContainerContext } from "../../hooks/use-document-container-context"
import { useDocumentContent } from "../../hooks/use-document-content"
import { useContainerDroppable, getDragTileId } from "../../hooks/use-drag-drop"
import { isFreeTileRow } from "../../models/document/free-tile-row"
import { isMosaicTileRow } from "../../models/document/mosaic-tile-row"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { urlParams } from "../../utilities/url-params"
import { FreeTileRowComponent } from "./free-tile-row"
import { MosaicTileRowComponent } from "./mosaic-tile-row"
import { logMessageWithReplacement, logStringifiedObjectMessage } from "../../lib/log-message"

import "./container.scss"

export const Container: React.FC = () => {
  const documentContent = useDocumentContent()
  const isScrollBehaviorAuto = urlParams.scrollBehavior === "auto"
  // TODO: handle the possibility of multiple rows
  const row = documentContent?.getRowByIndex(0)
  const getTile = useCallback((tileId: string) => documentContent?.getTile(tileId), [documentContent])
  const containerRef = useRef<HTMLDivElement>(null)

  const handleCloseTile = useCallback((tileId: string) => {
    const tile = getTile(tileId)
    documentContent?.applyModelChange(() => {
      const manager = getSharedModelManager(documentContent)
      const sharedModels = manager?.getTileSharedModels(tile?.content)
      sharedModels?.forEach(model => {
        manager?.removeTileSharedModel(tile?.content, model)
      })
      tileId && documentContent?.deleteTile(tileId)
    }, {
      log: logMessageWithReplacement("Close component: %@", {tileType: tile?.content.type}),
      undoStringKey: "DG.Undo.component.close",
      redoStringKey: "DG.Redo.component.close"
    })
  }, [documentContent, getTile])

  const { setNodeRef } = useContainerDroppable("codap-container", evt => {
    const dragTileId = getDragTileId(evt.active)
    if (dragTileId) {
      if (isFreeTileRow(row)) {
        const rowTile = row.getNode(dragTileId)
        const tile = getTile(dragTileId)
        if (rowTile && (evt.delta.x || evt.delta.y)) {
          documentContent?.applyModelChange(() => {
            rowTile.setPosition(rowTile.x + evt.delta.x, rowTile.y + evt.delta.y)
          }, {
            undoStringKey: "DG.Undo.componentMove",
            redoStringKey: "DG.Redo.componentMove",
            log: logStringifiedObjectMessage("Moved component %@", {tileType: tile?.content.type, tileId: dragTileId})
          })
        }
      }
    }
  })
  const mergedContainerRef = useMergeRefs<HTMLDivElement>(containerRef, setNodeRef)

  const classes = clsx("codap-container", { "scroll-behavior-auto": isScrollBehaviorAuto })
  return (
    <DocumentContainerContext.Provider value={containerRef}>
      <div className={classes} ref={mergedContainerRef}>
        {isMosaicTileRow(row) &&
          <MosaicTileRowComponent row={row} getTile={getTile} onCloseTile={handleCloseTile}/>}
        {isFreeTileRow(row) &&
          <FreeTileRowComponent row={row} getTile={getTile} onCloseTile={handleCloseTile}/>}
      </div>
    </DocumentContainerContext.Provider>
  )
}
