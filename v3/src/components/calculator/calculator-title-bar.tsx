import React from "react"
import { observer } from "mobx-react-lite"
import { ComponentTitleBar  } from "../component-title-bar"
import { t } from "../../utilities/translation/translate"
import { ITileTitleBarProps } from "../tiles/tile-base-props"

export const CalculatorTitleBar = observer(function CalculatorTitleBar({ tile, ...others }: ITileTitleBarProps) {
  const getTitle = () => tile?.title || t("DG.DocumentController.calculatorTitle")
  return (
    <ComponentTitleBar tile={tile} getTitle={getTitle} {...others} />
  )
})
