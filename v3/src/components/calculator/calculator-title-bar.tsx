import React, { useCallback } from "react"
import { observer } from "mobx-react-lite"
import { ComponentTitleBar } from "../component-title-bar"
import { useDocumentContent } from "../../hooks/use-document-content"
import { t } from "../../utilities/translation/translate"
import { ITileTitleBarProps } from "../tiles/tile-base-props"
import { kCalculatorTileType } from "./calculator-defs"

export const CalculatorTitleBar =
  observer(function CalculatorTitleBar({ tile, onCloseTile, ...others }: ITileTitleBarProps) {
    const getTitle = () => tile?.title || t("DG.DocumentController.calculatorTitle")
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
