import { Tooltip } from "@chakra-ui/react"
import { useDndContext } from "@dnd-kit/core"
import React, { useState } from "react"
import { THeaderRendererProps } from "./case-table-types"
import { ColumnHeaderDivider } from "./column-header-divider"
import { IUseDraggableAttribute, useDraggableAttribute } from "../../hooks/use-drag-drop"
import { useInstanceIdContext } from "../../hooks/use-instance-id-context"

export const ColumnHeader = ({ column }: Pick<THeaderRendererProps, "column">) => {
  const { active } = useDndContext()
  const instanceId = useInstanceIdContext() || "table"
  const [contentElt, setContentElt] = useState<HTMLElement | null>(null)
  const cellElt = contentElt?.parentElement || null
  // disable tooltips when there is an active drag in progress
  const disableTooltips = !!active

  const draggableOptions: IUseDraggableAttribute = { prefix: instanceId, attributeId: column.key }
  const { attributes, listeners, setNodeRef: setDragNodeRef } = useDraggableAttribute(draggableOptions)

  const setCellRef = (elt: HTMLDivElement | null) => {
    setContentElt(elt)
    setDragNodeRef(elt?.parentElement || null)
  }

  return (
    <>
      <Tooltip label={column?.name || "attribute"} h="20px" fontSize="12px" color="white"
          openDelay={1000} placement="bottom" bottom="15px" left="15px" isDisabled={disableTooltips}>
        <div className="codap-column-header-content" ref={setCellRef} {...attributes} {...listeners}>
          {column?.name}
        </div>
      </Tooltip>
      {column &&
        <ColumnHeaderDivider key={column?.key} columnKey={column?.key} cellElt={cellElt}/>}
    </>
  )
}
