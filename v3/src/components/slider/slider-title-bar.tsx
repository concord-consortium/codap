import React, { useState } from "react"
import { ComponentTitleBar, EditableComponentTitle  } from "../component-title-bar"
import { CloseButton, Flex } from "@chakra-ui/react"
import t from "../../utilities/translation/translate"
import MinimizeIcon from "../../assets/icons/icon-minimize.svg"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { observer } from "mobx-react-lite"
import { isSliderModel } from "./slider-model"

export const SliderTitleBar = observer(({ tile }: ITileBaseProps) => {
  const sliderModel = tile?.content
  const [title, setTitle] = useState((isSliderModel(sliderModel) && sliderModel.name) || "Slider")

  const handleTitleChange = (newTitle?: string) => {
    newTitle && setTitle(newTitle)
  }

  return (
    <ComponentTitleBar component={"slider"}>
      <EditableComponentTitle componentTitle={title} onEndEdit={handleTitleChange} />
      <Flex className="header-right">
        <MinimizeIcon className="component-minimize-icon" title={t("DG.Component.minimizeComponent.toolTip")}/>
        <CloseButton className="component-close-button" title={t("DG.Component.closeComponent.toolTip")}/>
      </Flex>
    </ComponentTitleBar>
  )
})
