import React from "react"
import { ComponentTitleBar  } from "../component-title-bar"
import { CloseButton, Flex } from "@chakra-ui/react"
import t from "../../utilities/translation/translate"
import MinimizeIcon from "../../assets/icons/icon-minimize.svg"
import { ITileTitleBarProps } from "../tiles/tile-base-props"
import { observer } from "mobx-react-lite"
import { isSliderModel } from "./slider-model"

export const SliderTitleBar = observer(({ tile, onCloseTile }: ITileTitleBarProps) => {
  const sliderModel = tile?.content
  const tileId = tile?.id || ""
  const title = (isSliderModel(sliderModel) && sliderModel.name) || "Slider"
  const tileType = tile?.content.type

  return (
    <ComponentTitleBar component={"slider"} title={title}
        draggableId={`${tileType}-${tileId}`}>
      <Flex className="header-right">
        <MinimizeIcon className="component-minimize-icon" title={t("DG.Component.minimizeComponent.toolTip")}/>
        <CloseButton className="component-close-button" title={t("DG.Component.closeComponent.toolTip")}
          onClick={() => onCloseTile(tileId)}/>
      </Flex>
    </ComponentTitleBar>
  )
})
