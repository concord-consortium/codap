import React, { useCallback } from "react"
import { observer } from "mobx-react-lite"
import { ComponentTitleBar } from "../component-title-bar"
import { useDocumentContent } from "../../hooks/use-document-content"
import { ITileTitleBarProps } from "../tiles/tile-base-props"
import { kCalculatorTileType } from "./calculator-defs"
import { getTileContentInfo } from "../../models/tiles/tile-content-info"

export const CalculatorTitleBar =
  observer(function CalculatorTitleBar({ tile, onCloseTile, ...others }: ITileTitleBarProps) {
    const tileContentInfo = getTileContentInfo(tile?.content.type)
    const getTitle = () => {
      return tile ? tileContentInfo?.getTitle?.(tile) : undefined
    }
    const documentContent = useDocumentContent()
    const closeCalculator = useCallback(() => {
      documentContent?.applyModelChange(() => {
        documentContent?.toggleSingletonTileVisibility(kCalculatorTileType)
      }, {
        undoStringKey: "DG.Undo.toggleComponent.delete.calcView",
        redoStringKey: "DG.Redo.toggleComponent.delete.calcView"
      })
    }, [documentContent])
    return (
      <ComponentTitleBar tile={tile} getTitle={getTitle} onCloseTile={closeCalculator} {...others} />
    )
  })
