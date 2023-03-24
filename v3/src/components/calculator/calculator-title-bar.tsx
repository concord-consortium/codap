import React from "react"
import { observer } from "mobx-react-lite"
import { ComponentTitleBar  } from "../component-title-bar"
import { CloseButton, Flex } from "@chakra-ui/react"
import t from "../../utilities/translation/translate"
import MinimizeIcon from "../../assets/icons/icon-minimize.svg"
import { ITileTitleBarProps } from "../tiles/tile-base-props"

export const CalculatorTitleBar = observer(function CalculatorTitleBar({tile, onCloseTile}: ITileTitleBarProps) {
  const title = tile?.title || t("DG.DocumentController.calculatorTitle")
  const tileId = tile?.id || ""
  const tileType = tile?.content.type

  return (
    <ComponentTitleBar tile={tile} component={"calculator"} title={title}
        draggableId={`${tileType}-${tileId}`}>
      <Flex className="header-right">
        <MinimizeIcon className="component-minimize-icon" title={t("DG.Component.minimizeComponent.toolTip")}/>
        <CloseButton className="component-close-button" title={t("DG.Component.closeComponent.toolTip")}
          onPointerDown={()=>onCloseTile(tileId)}/>
      </Flex>
    </ComponentTitleBar>
  )
})
