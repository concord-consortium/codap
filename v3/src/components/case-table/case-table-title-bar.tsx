import React, { useState } from "react"
import { ComponentTitleBar  } from "../component-title-bar"
import { Box, CloseButton, Editable, EditableInput, EditablePreview, Flex } from "@chakra-ui/react"
import t from "../../utilities/translation/translate"
import MinimizeIcon from "../../assets/icons/icon-minimize.svg"
import TableIcon from "../../assets/icons/icon-table.svg"
import CardIcon from "../../assets/icons/icon-case-card.svg"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { ITileTitleBarProps } from "../tiles/tile-base-props"

import "./case-table-title-bar.scss"
import { IUseDraggableTile, useDraggableTile } from "../../hooks/use-drag-drop"
import { useDraggable } from "@dnd-kit/core"

export const CaseTableTitleBar = ({tile, isEditingTitle, onCloseTile, setIsEditingTitle, onHandleTitleBarClick}: ITileTitleBarProps) => {
  const dataset = useDataSetContext()
  const [title, setTitle] = useState(dataset?.name || "Dataset")
  const [showSwitchMessage, setShowSwitchMessage] = useState(false)
  const [showCaseCard, setShowCaseCard] = useState(false)
  const tileId = tile?.id || ""
  const draggableOptions: IUseDraggableTile = { prefix: "case-table", tileId }
  const {attributes, listeners, setActivatorNodeRef} = useDraggable({id: `case-table-${tileId}`})
  // , () => {
  //   // const dragTileId = getDragTileId(tileId)
  //   if (tileId) {
  //     console.log("in case table title bar useDraggableTile startDrag:")
  //     // if (isFreeTileRow(row)) {
  //     //   row.moveTileToTop(tileId)
  //     //   // rowTile?.setPosition(50,50)
  //     // }
  //   }
  // })

  const handleTitleChange = (newTitle?: string) => {
    newTitle && setTitle(newTitle)
  }

  const handleShowCardTableToggleMessage = () => {
    setShowSwitchMessage(true)
  }

  const handleToggleCardTable = (e:React.MouseEvent) => {
    e.stopPropagation()
    setShowSwitchMessage(false)
    setShowCaseCard(!showCaseCard)
  }

  const cardTableToggleString = showCaseCard
                                  ? t("DG.DocumentController.toggleToCaseTable")
                                  : t("DG.DocumentController.toggleToCaseCard")
  return (
    <ComponentTitleBar component={"case-table"} tileId={tileId}>
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
      {/* {isEditingTitle
        ? <EditableComponentTitle componentTitle={title} onEndEdit={handleTitleChange}
              setIsEditing={setIsEditingTitle}/>
        : <Box className="title-bar case-table-box" ref={setActivatorNodeRef} {...attributes} {...listeners} data-testid="case-table-title-bar">
            <Box className="title-text" onClick={onHandleTitleBarClick}>{title}</Box>
          </Box>
      } */}
      <Editable defaultValue={title} className="title-bar case-table-box" ref={setActivatorNodeRef} {...attributes} {...listeners}>
        <EditablePreview className="title-text"/>
        <EditableInput className="title-text"/>
      </Editable>
      {/* <EditableComponentTitle componentTitle={title} onEndEdit={handleTitleChange} /> */}
      <Flex className="header-right">
        <MinimizeIcon className="component-minimize-icon" title={t("DG.Component.minimizeComponent.toolTip")}/>
        <CloseButton className="component-close-button" title={t("DG.Component.closeComponent.toolTip")}
            onClick={()=>onCloseTile(tileId)}/>
      </Flex>
    </ComponentTitleBar>
  )
}
