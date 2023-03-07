import React from "react"
import { ComponentTitleBar  } from "../../component-title-bar"
import { CloseButton, Flex } from "@chakra-ui/react"
import t from "../../../utilities/translation/translate"
import { ITileTitleBarProps } from "../tile-base-props"
import MinimizeIcon from "../../../assets/icons/icon-minimize.svg"

export const PlaceholderTileTitleBar = ({tile, onCloseTile}: ITileTitleBarProps) => {
  const tileId = tile?.id || ""
  const title = ""
  const tileType = tile?.content.type

  return (
    <ComponentTitleBar component={"placeholder-tile"} title={title}
        draggableId={`${tileType}-${tileId}`}>
      <Flex className="header-right">
        <MinimizeIcon className="component-minimize-icon" title={t("DG.Component.minimizeComponent.toolTip")}/>
        <CloseButton className="component-close-button" title={t("DG.Component.closeComponent.toolTip")}
          onClick={() => onCloseTile(tileId)}/>
      </Flex>
    </ComponentTitleBar>
  )
}
