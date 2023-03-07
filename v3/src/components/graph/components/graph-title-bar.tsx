import React, { useState } from "react"
import { ComponentTitleBar  } from "../../component-title-bar"
import { CloseButton, Flex } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import t from "../../../utilities/translation/translate"
import MinimizeIcon from "../../../assets/icons/icon-minimize.svg"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { ITileTitleBarProps } from "../../tiles/tile-base-props"

export const GraphTitleBar = observer(function GraphTitleBar({tile, onCloseTile}: ITileTitleBarProps) {
  const dataset = useDataSetContext()
  const [customTitle, setCustomTitle] = useState<string | null>(null)
  const title = customTitle ?? (dataset?.name || "Dataset")
  const tileId = tile?.id || ""
  const tileType = tile?.content.type
  return (
    <ComponentTitleBar tile={tile} component={"graph"} title={title}
        draggableId={`${tileType}-${tileId}`}>
      <Flex className="header-right">
        <MinimizeIcon className="component-minimize-icon" title={t("DG.Component.minimizeComponent.toolTip")}/>
        <CloseButton className="component-close-button" title={t("DG.Component.closeComponent.toolTip")}
          onClick={() => onCloseTile(tileId)}/>
      </Flex>
    </ComponentTitleBar>
  )
})
