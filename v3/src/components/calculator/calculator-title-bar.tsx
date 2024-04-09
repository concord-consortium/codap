import React, {useCallback} from "react"
import {observer} from "mobx-react-lite"
import {ComponentTitleBar} from "../component-title-bar"
import {t} from "../../utilities/translation/translate"
import {ITileTitleBarProps} from "../tiles/tile-base-props"
import {useDocumentContent} from "../../hooks/use-document-content"
import {kCalculatorTileType} from "./calculator-defs"

export const CalculatorTitleBar =
  observer(function CalculatorTitleBar({tile, onCloseTile, ...others}: ITileTitleBarProps) {
    const getTitle = () => tile?.title || t("DG.DocumentController.calculatorTitle")
    const documentContent = useDocumentContent()
    const closeCalculator = useCallback(() => {
      documentContent?.toggleSingletonTileVisibility(kCalculatorTileType)
    }, [documentContent])
    return (
      <ComponentTitleBar tile={tile} getTitle={getTitle} onCloseTile={closeCalculator} {...others} />
    )
  })
