import { useCallback } from "react"
import { observer } from "mobx-react-lite"
import { ComponentTitleBar } from "../component-title-bar"
import { useDocumentContent } from "../../hooks/use-document-content"
import { ITileTitleBarProps } from "../tiles/tile-base-props"
import { kCalculatorTileType } from "./calculator-defs"
import { logStringifiedObjectMessage } from "../../lib/log-message"
import { isFreeTileLayout } from "../../models/document/free-tile-row"
import { componentShowHideNotification } from "../../models/tiles/tile-notifications"

export const CalculatorTitleBar =
  observer(function CalculatorTitleBar({ tile, onCloseTile, ...others }: ITileTitleBarProps) {
    const documentContent = useDocumentContent()
    const closeCalculator = useCallback(() => {
      // `toggleSingletonTileVisibility` only actually hides the tile when its layout is
      // a FreeTileLayout (per document-content.ts:225). In non-free layouts the click is
      // a no-op visually, so suppress the V2 `hide` notification — emitting it would be
      // a lie. Other code paths (e.g. tool-shelf re-click) handle this with a fall-through;
      // here we just skip the notification.
      const tileLayout = tile && documentContent?.getTileLayoutById(tile.id)
      const willActuallyHide = isFreeTileLayout(tileLayout)
      documentContent?.applyModelChange(() => {
        documentContent?.toggleSingletonTileVisibility(kCalculatorTileType)
      }, {
        notify: () => willActuallyHide ? componentShowHideNotification(tile, "hide") : undefined,
        undoStringKey: "DG.Undo.toggleComponent.delete.calcView",
        redoStringKey: "DG.Redo.toggleComponent.delete.calcView",
        log: logStringifiedObjectMessage("Close calculator", { type: kCalculatorTileType}, "component")
      })
    }, [documentContent, tile])
    return (
      <ComponentTitleBar tile={tile} onCloseTile={closeCalculator} {...others} />
    )
  })
