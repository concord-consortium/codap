import React from "react"
import { ComponentTitleBar  } from "../component-title-bar"
import { CloseButton, Flex } from "@chakra-ui/react"
import t from "../../utilities/translation/translate"
import MinimizeIcon from "../../assets/icons/icon-minimize.svg"
import { ITileTitleBarProps } from "../tiles/tile-base-props"

export const CalculatorTitleBar = ({tile, onCloseTile}: ITileTitleBarProps) => {
  const tileId = tile?.id || ""
  const title = "Calculator"
  const tileType = tile?.content.type

  return (
    <ComponentTitleBar component={"calculator"} title={title}
        draggableId={`${tileType}-${tileId}`}>
      <Flex className="header-right">
        <MinimizeIcon className="component-minimize-icon" title={t("DG.Component.minimizeComponent.toolTip")}/>
        <CloseButton className="component-close-button" title={t("DG.Component.closeComponent.toolTip")}
          onClick={()=>onCloseTile(tileId)}/>
      </Flex>
    </ComponentTitleBar>
  )
}
