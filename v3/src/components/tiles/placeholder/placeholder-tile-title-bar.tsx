import React from "react"
import { observer } from "mobx-react-lite"
import { ComponentTitleBar  } from "../../component-title-bar"
import { CloseButton, Flex } from "@chakra-ui/react"
import t from "../../../utilities/translation/translate"
import { ITileTitleBarProps } from "../tile-base-props"
import MinimizeIcon from "../../../assets/icons/icon-minimize.svg"
import { useDataSetContext } from "../../../hooks/use-data-set-context"

export const PlaceholderTileTitleBar = observer(
function PlaceholderTileTitleBar({tile, onCloseTile}: ITileTitleBarProps) {
  const dataset = useDataSetContext()
  const title = tile?.title || dataset?.name || ""
  const tileId = tile?.id || ""
  const tileType = tile?.content.type
  return (
    <ComponentTitleBar tile={tile} component={"placeholder-tile"} title={title}
        draggableId={`${tileType}-${tileId}`}>
      <Flex className="header-right">
        <MinimizeIcon className="component-minimize-icon" title={t("DG.Component.minimizeComponent.toolTip")}/>
        <CloseButton className="component-close-button" title={t("DG.Component.closeComponent.toolTip")}
          onClick={() => onCloseTile(tileId)}/>
      </Flex>
    </ComponentTitleBar>
  )
})
