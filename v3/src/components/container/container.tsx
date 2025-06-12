import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { useCallback, useRef } from "react"
import { dataInteractiveState } from "../../data-interactive/data-interactive-state"
import { DocumentContainerContext } from "../../hooks/use-document-container-context"
import { useDocumentContent } from "../../hooks/use-document-content"
import { logMessageWithReplacement } from "../../lib/log-message"
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

  const classes = clsx(kContainerClass, { "scroll-behavior-auto": isScrollBehaviorAuto })
  return (
    <DocumentContainerContext.Provider value={containerRef}>
      <div className={classes} ref={containerRef}>
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
