import { Tooltip, Menu, MenuButton, useDisclosure } from "@chakra-ui/react"
import { useDndContext } from "@dnd-kit/core"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { THeaderRendererProps } from "./case-table-types"
import { ColumnHeaderDivider } from "./column-header-divider"
import { IUseDraggableAttribute, useDraggableAttribute } from "../../hooks/use-drag-drop"
import { useInstanceIdContext } from "../../hooks/use-instance-id-context"
import { AttributeMenuList } from "./attribute-menu"

export const ColumnHeader = ({ column }: Pick<THeaderRendererProps, "column">) => {
  const { active } = useDndContext()
  const instanceId = useInstanceIdContext() || "table"
  const [contentElt, setContentElt] = useState<HTMLElement | null>(null)
  const cellElt = contentElt?.parentElement || null
  const [codapComponentElt, setCodapComponentElt] = useState<HTMLElement | null>(null)
  // disable tooltips when there is an active drag in progress
  const dragging = !!active

  const draggableOptions: IUseDraggableAttribute = { prefix: instanceId, attributeId: column.key }
  const { attributes, listeners, setNodeRef: setDragNodeRef } = useDraggableAttribute(draggableOptions)

  const setCellRef = (elt: HTMLDivElement | null) => {
    setContentElt(elt)
    setDragNodeRef(elt?.parentElement || null)
  }

  // Find the parent CODAP component to display the index menu above the grid
  useEffect(() => {
    setCodapComponentElt(contentElt?.closest(".codap-component") as HTMLDivElement ?? null)
  }, [contentElt])

  const { isOpen, onOpen, onClose } = useDisclosure()
  const [isHovering, setIsHovering] = useState(false)
  const hoveringTimeout = useRef<number | undefined>(undefined)
  const hovering = useRef<boolean>(false)
  const cancelHoveringDelay = () => {
    setIsHovering(false)
    hovering.current = false
    window.clearTimeout(hoveringTimeout.current)
    hoveringTimeout.current = undefined
  }
  const handleOnOpen = useCallback((): void => {
    onOpen()
    cancelHoveringDelay()
  }, [onOpen])
  const handleButtonEnter = () => {
    if (!hoveringTimeout.current && !isOpen) {
      hovering.current = true
      hoveringTimeout.current = window.setTimeout(() => {
        hoveringTimeout.current = undefined
        if (hovering.current) {
          setIsHovering(true)
        }
        hovering.current = false
      }, 1000)
    }
  }
  const handleButtonLeave = () => {
    cancelHoveringDelay()
  }

  return (
    <div className="codap-column-header-content" ref={setCellRef} {...attributes} {...listeners}>
      <Menu isLazy isOpen={isOpen} onOpen={handleOnOpen} onClose={onClose}>
        <Tooltip label={column?.name ||"attribute"} h="20px" fontSize="12px" color="white"
            openDelay={1000} closeDelay={5} placement="bottom" bottom="15px" left="15px"
            isDisabled={dragging} closeOnMouseDown={true}>
          <MenuButton className="codap-attribute-button" data-testid={`codap-attribute-button ${column?.name}`}
              onMouseEnter={handleButtonEnter} onMouseLeave={handleButtonLeave}>
            {column?.name}
          </MenuButton>
        </Tooltip>
        {codapComponentElt && createPortal((
          <AttributeMenuList column={column} />
        ), codapComponentElt)}
      </Menu>
      {column &&
        <ColumnHeaderDivider key={column?.key} columnKey={column?.key} cellElt={cellElt}/>}
    </div>
  )
}
