import { useMergeRefs } from "@chakra-ui/react"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { useCallback, useRef } from "react"
import { dataInteractiveState } from "../../data-interactive/data-interactive-state"
import { DocumentContainerContext } from "../../hooks/use-document-container-context"
import { useDocumentContent } from "../../hooks/use-document-content"
import { useContainerDroppable, getDragTileId } from "../../hooks/use-drag-drop"
import { logMessageWithReplacement, logStringifiedObjectMessage } from "../../lib/log-message"
import { isFreeTileRow } from "../../models/document/free-tile-row"
import { isMosaicTileRow } from "../../models/document/mosaic-tile-row"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { deleteTileNotification } from "../../models/tiles/tile-notifications"
import { urlParams } from "../../utilities/url-params"
import { EditAttributeFormulaModal } from "../common/edit-attribute-formula-modal"
import { AttributeDragOverlay } from "../drag-drop/attribute-drag-overlay"
import { PluginAttributeDrag } from "../drag-drop/plugin-attribute-drag"
import { kContainerClass } from "./container-constants"
import { FreeTileRowComponent } from "./free-tile-row"
import { MosaicTileRowComponent } from "./mosaic-tile-row"

import "./container.scss"

export const Container: React.FC = observer(function Container() {
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
      notify: deleteTileNotification(tile),
      log: logMessageWithReplacement("Close component: %@", {tileType: tile?.content.type}, "component"),
      undoStringKey: "DG.Undo.component.close",
      redoStringKey: "DG.Redo.component.close"
    })
  }, [documentContent, getTile])

  const { setNodeRef } = useContainerDroppable(kContainerClass, evt => {
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
  const mergedContainerRef = useMergeRefs<HTMLDivElement | null>(containerRef, setNodeRef)

  const classes = clsx(kContainerClass, { "scroll-behavior-auto": isScrollBehaviorAuto })
  return (
    <DocumentContainerContext.Provider value={containerRef}>
      <div className={classes} ref={mergedContainerRef}>
        {isMosaicTileRow(row) &&
          <MosaicTileRowComponent row={row} getTile={getTile} onCloseTile={handleCloseTile}/>}
        {isFreeTileRow(row) &&
          <FreeTileRowComponent row={row} getTile={getTile} onCloseTile={handleCloseTile}/>}
        <PluginAttributeDrag />
        <AttributeDragOverlay
          dragIdPrefix="plugin"
          overlayHeight={dataInteractiveState.draggingOverlayHeight}
          overlayWidth={dataInteractiveState.draggingOverlayWidth}
          xOffset={dataInteractiveState.draggingXOffset}
          yOffset={dataInteractiveState.draggingYOffset}
        />
        <EditAttributeFormulaModal />
      </div>
    </DocumentContainerContext.Provider>
  )
})
