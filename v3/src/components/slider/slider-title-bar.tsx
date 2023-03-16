import React from "react"
import { CloseButton, Flex } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import { ComponentTitleBar  } from "../component-title-bar"
import t from "../../utilities/translation/translate"
import MinimizeIcon from "../../assets/icons/icon-minimize.svg"
import { ITileTitleBarProps } from "../tiles/tile-base-props"

export const SliderTitleBar = observer(function SliderTitleBar({ tile, onCloseTile }: ITileTitleBarProps) {
  const title = tile?.title || t("DG.DocumentController.sliderTitle")
  const tileId = tile?.id || ""
  const tileType = tile?.content.type
  return (
    <ComponentTitleBar tile={tile} component={"slider"} title={title}
        draggableId={`${tileType}-${tileId}`}>
      <Flex className="header-right">
        <MinimizeIcon className="component-minimize-icon" title={t("DG.Component.minimizeComponent.toolTip")}/>
        <CloseButton className="component-close-button" title={t("DG.Component.closeComponent.toolTip")}
          onClick={() => onCloseTile(tileId)}/>
      </Flex>
    </ComponentTitleBar>
  )
})
