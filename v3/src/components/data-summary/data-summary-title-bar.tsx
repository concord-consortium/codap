import React, { useState } from "react"
import { ComponentTitleBar  } from "../component-title-bar"
import { CloseButton, Editable, EditableInput, EditablePreview, Flex } from "@chakra-ui/react"
import t from "../../utilities/translation/translate"
import MinimizeIcon from "../../assets/icons/icon-minimize.svg"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { ITileTitleBarProps } from "../tiles/tile-base-props"
import { useDraggable } from "@dnd-kit/core"

export const DataSummaryTitleBar = ({tile, onCloseTile}: ITileTitleBarProps) => {
  const dataset = useDataSetContext()
  const tileId = tile?.id || ""
  const [title, setTitle] = useState(dataset?.name || "Dataset")
  const [isEditing, setIsEditing] = useState(false)
  const tileType = tile?.content.type
  const {attributes, listeners, setActivatorNodeRef} = useDraggable({id: `${tileType}-${tileId}`, disabled: isEditing})

  const handleTitleChange = (newTitle?: string) => {
    newTitle && setTitle(newTitle)
    setIsEditing(false)
  }

  return (
    <ComponentTitleBar component={"data-summary"} tileId={tileId} title={dataset?.name || "Dataset"}
        draggableId={`summary-${tileId}`}>
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
