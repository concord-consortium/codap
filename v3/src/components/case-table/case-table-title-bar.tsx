import React, { useState } from "react"
import { ComponentTitleBar  } from "../component-title-bar"
import { useDraggable } from "@dnd-kit/core"
import { Box, CloseButton, Editable, EditableInput, EditablePreview, Flex } from "@chakra-ui/react"
import t from "../../utilities/translation/translate"
import MinimizeIcon from "../../assets/icons/icon-minimize.svg"
import TableIcon from "../../assets/icons/icon-table.svg"
import CardIcon from "../../assets/icons/icon-case-card.svg"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { ITileTitleBarProps } from "../tiles/tile-base-props"

import "./case-table-title-bar.scss"

export const CaseTableTitleBar = ({tile, onCloseTile}: ITileTitleBarProps) => {
  const dataset = useDataSetContext()
  const [title, setTitle] = useState(dataset?.name || "Dataset")
  const [showSwitchMessage, setShowSwitchMessage] = useState(false)
  const [showCaseCard, setShowCaseCard] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const tileId = tile?.id || ""
  const tileType = tile?.content.type

  const {attributes, listeners, setActivatorNodeRef} = useDraggable({id: `${tileType}-${tileId}`, disabled: isEditing})

  const handleShowCardTableToggleMessage = () => {
    setShowSwitchMessage(true)
  }

  const handleToggleCardTable = (e:React.MouseEvent) => {
    e.stopPropagation()
    setShowSwitchMessage(false)
    setShowCaseCard(!showCaseCard)
  }

  const handleTitleChange = (newTitle?: string) => {
    newTitle && setTitle(newTitle)
    setIsEditing(false)
  }

  const cardTableToggleString = showCaseCard
                                  ? t("DG.DocumentController.toggleToCaseTable")
                                  : t("DG.DocumentController.toggleToCaseCard")

  return (
    <ComponentTitleBar component={"case-table"} tileId={tileId} title={dataset?.name || "Dataset"}
        draggableId={`tileType-${tileId}`}>
      <div className="header-left"
            title={cardTableToggleString}
            onClick={handleShowCardTableToggleMessage}>
        {showCaseCard
          ? <TableIcon className="table-icon" />
          : <CardIcon className="card-icon"/>
        }
        {showSwitchMessage &&
          <Box className={`card-table-toggle-message`}
                onClick={handleToggleCardTable}>
            {cardTableToggleString}
          </Box>
        }
      </div>
      <Editable defaultValue={title} className="title-bar" isPreviewFocusable={true} submitOnBlur={true}
          onEdit={()=>setIsEditing(true)} ref={setActivatorNodeRef} {...attributes} {...listeners}
          onSubmit={handleTitleChange} onCancel={()=>setIsEditing(false)}>
        <EditablePreview className="title-text"/>
        <EditableInput className="title-text-input"/>
      </Editable>
      <Flex className="header-right">
        <MinimizeIcon className="component-minimize-icon" title={t("DG.Component.minimizeComponent.toolTip")}/>
        <CloseButton className="component-close-button" title={t("DG.Component.closeComponent.toolTip")}
            onClick={()=>onCloseTile(tileId)}/>
      </Flex>
    </ComponentTitleBar>
  )
}
