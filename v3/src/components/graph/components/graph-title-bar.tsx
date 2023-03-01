import React from "react"
import { ComponentTitleBar  } from "../../component-title-bar"
import { CloseButton, Flex } from "@chakra-ui/react"
import t from "../../../utilities/translation/translate"
import MinimizeIcon from "../../../assets/icons/icon-minimize.svg"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { ITileTitleBarProps } from "../../tiles/tile-base-props"

export const GraphTitleBar = ({tile, onCloseTile}: ITileTitleBarProps) => {
  const dataset = useDataSetContext()
  const tileId = tile?.id || ""
  const title = dataset?.name || "Dataset"
  const tileType = tile?.content.type

  return (
    <ComponentTitleBar component={"graph"} tileId={tileId} title={title}
        draggableId={`${tileType}-${tileId}`}>
      <Flex className="header-right">
        <MinimizeIcon className="component-minimize-icon" title={t("DG.Component.minimizeComponent.toolTip")}/>
        <CloseButton className="component-close-button" title={t("DG.Component.closeComponent.toolTip")}
          onClick={() => onCloseTile(tileId)}/>
      </Flex>
    </ComponentTitleBar>
  )
}
