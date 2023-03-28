import React from "react"
import { observer } from "mobx-react-lite"
import { ComponentTitleBar  } from "../component-title-bar"
import t from "../../utilities/translation/translate"
import { ITileTitleBarProps } from "../tiles/tile-base-props"
import { isSliderModel } from "./slider-model"

export const SliderTitleBar = observer(function SliderTitleBar({ tile, onCloseTile }: ITileTitleBarProps) {
  const sliderModel = isSliderModel(tile?.content) ? tile?.content : undefined
  const getTitle = () => tile?.title || sliderModel?.name || t("DG.DocumentController.sliderTitle")
  return (
    <ComponentTitleBar tile={tile} getTitle={getTitle} onCloseTile={onCloseTile} />
  )
})
