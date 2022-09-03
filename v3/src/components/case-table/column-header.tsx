import { Tooltip, Menu, MenuButton, MenuItem, MenuList  } from "@chakra-ui/react"
import { useDndContext } from "@dnd-kit/core"
import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
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


  const [cellElt, setCellElt] = useState<HTMLElement | null>(null)
  const [codapComponentElt, setCodapComponentElt] = useState<HTMLElement | null>(null)

  const setNodeRef = (elt: HTMLDivElement | null) => {
    setCellElt(elt)
  }

  // Find the parent CODAP component to display the index menu above the grid
  useEffect(() => {
    if (cellElt && !codapComponentElt) {
      let parent: HTMLElement | null
      for (parent = cellElt; parent; parent = parent.parentElement) {
        if (parent.classList.contains("codap-component")) {
          setCodapComponentElt(parent)
          break
        }
      }
    }
  }, [cellElt, codapComponentElt])

  const handleRenameAttribute = () => {
    alert("Rename")
  }

  const handleFitWidth = () => {
    alert("Fit Width")
  }

  const handleEditAttributeProps  = () => {
    alert("Edit Attribute props")
  }

  const handleEditFormula = () => {
    //todo
  }

  const handleDeleteFormula = () => {
    //todo
  }

  const handleRerandomize = () => {
    //todo
  }

  const handleSortAscending = () => {
//todo
  }

  const handleSortDescending = () => {
//todo
  }

  const handleHideAttribute = () => {
    //todo
  }

  const handleDeleteAttribute = () => {
    //todo
  }

  return (
    <Tooltip label={column?.name ||"attribute"} h="20px" fontSize="12px" color="white"
       openDelay={1000} placement="bottom" bottom="15px" left="15px"  isDisabled={disableTooltips}>
	  <div className="codap-column-header-content" ref={setNodeRef} {...attributes} {...listeners}>
	      <Menu isLazy>
	        <MenuButton className="codap-index-content" data-testid="codap-index-content">
	          {column?.name}
	        </MenuButton>
	        {codapComponentElt && createPortal((
	          <MenuList>
	            <MenuItem onClick={handleRenameAttribute}>Rename</MenuItem>
	            <MenuItem onClick={handleFitWidth}>Fit width to content</MenuItem>
	            <MenuItem onClick={handleEditAttributeProps}>Edit Attribute Properties...</MenuItem>
	            <MenuItem onClick={handleEditFormula}>Edit Formula...</MenuItem>
	            <MenuItem onClick={handleDeleteFormula}>Delete Formlula (Keeping Values)</MenuItem>
	            <MenuItem onClick={handleRerandomize}>Rerandomize</MenuItem>
	            <MenuItem onClick={handleSortAscending}>Sort Ascending (A→Z, 0→9)</MenuItem>
	            <MenuItem onClick={handleSortDescending}>Sort Descending (9→0, Z→A)</MenuItem>
	            <MenuItem onClick={handleHideAttribute}>Hide Attribute</MenuItem>
	            <MenuItem onClick={handleDeleteAttribute}>Delete Attribute</MenuItem>
	          </MenuList>
	        ), codapComponentElt)}
	      </Menu>
	      {column &&
        	<ColumnHeaderDivider key={column?.key} columnKey={column?.key} cellElt={cellElt}/>}
    	</div>
      </Tooltip>
  )
}
