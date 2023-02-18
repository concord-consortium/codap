import React, { useState } from "react"
import { ComponentTitleBar, EditableComponentTitle  } from "../../component-title-bar"
import { Box, CloseButton, Flex } from "@chakra-ui/react"
import t from "../../../utilities/translation/translate"
import { ITileTitleBarProps } from "../tile-base-props"
import MinimizeIcon from "../../../assets/icons/icon-minimize.svg"

export const PlaceholderTileTitleBar = ({tile, isEditingTitle, onCloseTile, setIsEditingTitle, onHandleTitleBarClick}: ITileTitleBarProps) => {
  const [title, setTitle] = useState("")
  const tileId = tile?.id || ""
  const handleTitleChange = (newTitle?: string) => {
    newTitle && setTitle(newTitle)
  }
  return (
    <ComponentTitleBar component={"placeholder-tile"} tileId={tileId}>
      {/* <EditableComponentTitle componentTitle={title} onEndEdit={handleTitleChange} /> */}
      {isEditingTitle
        ? <EditableComponentTitle componentTitle={title} onEndEdit={handleTitleChange}
              setIsEditing={setIsEditingTitle}/>
        : <Box className="title-bar" onMouseDown={(e)=>e.preventDefault()}>
            <Box className="title-text" onClick={onHandleTitleBarClick}>{title}</Box>
          </Box>
      }
      <Flex className="header-right">
        <MinimizeIcon className="component-minimize-icon" title={t("DG.Component.minimizeComponent.toolTip")}/>
        <CloseButton className="component-close-button" title={t("DG.Component.closeComponent.toolTip")}
          onClick={() => onCloseTile(tileId)}/>
      </Flex>
    </ComponentTitleBar>
  )
}
