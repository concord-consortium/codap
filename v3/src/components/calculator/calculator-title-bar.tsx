import { useCallback } from "react"
import { observer } from "mobx-react-lite"
import { ComponentTitleBar } from "../component-title-bar"
import { useDocumentContent } from "../../hooks/use-document-content"
import { ITileTitleBarProps } from "../tiles/tile-base-props"
import { kCalculatorTileType } from "./calculator-defs"
import { logStringifiedObjectMessage } from "../../lib/log-message"

export const CalculatorTitleBar =
  observer(function CalculatorTitleBar({ tile, onCloseTile, ...others }: ITileTitleBarProps) {
    const documentContent = useDocumentContent()
    const closeCalculator = useCallback(() => {
      documentContent?.applyModelChange(() => {
        documentContent?.toggleSingletonTileVisibility(kCalculatorTileType)
      }, {
        undoStringKey: "DG.Undo.toggleComponent.delete.calcView",
        redoStringKey: "DG.Redo.toggleComponent.delete.calcView",
        log: logStringifiedObjectMessage("Close calculator", { type: kCalculatorTileType}, "component")
      })
    }, [documentContent])
    return (
      <ComponentTitleBar tile={tile} onCloseTile={closeCalculator} {...others} />
    )
  })
