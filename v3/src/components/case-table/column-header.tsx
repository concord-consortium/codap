import { Tooltip, Menu, MenuButton, Input } from "@chakra-ui/react"
import { useDndContext } from "@dnd-kit/core"
import React, { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { kIndexColumnKey, THeaderRendererProps } from "./case-table-types"
import { ColumnHeaderDivider } from "./column-header-divider"
import { IUseDraggableAttribute, useDraggableAttribute } from "../../hooks/use-drag-drop"
import { useInstanceIdContext } from "../../hooks/use-instance-id-context"
import { AttributeMenuList } from "./attribute-menu"
import { useDataSetContext } from "../../hooks/use-data-set-context"

const isClickInElement = (click: MouseEvent, elt: HTMLElement | null) => {
  const bounds = elt?.getBoundingClientRect()
  return !!bounds && (bounds.left <= click.clientX) && (click.clientX <= bounds.right) &&
                      (bounds.top <= click.clientY) && (click.clientY <= bounds.bottom)
}

export const ColumnHeader = ({ column }: Pick<THeaderRendererProps, "column">) => {
  const { active } = useDndContext()
  const data = useDataSetContext()
  const instanceId = useInstanceIdContext() || "table"
  const [contentElt, setContentElt] = useState<HTMLElement | null>(null)
  const cellElt = contentElt?.parentElement || null
  const [codapComponentElt, setCodapComponentElt] = useState<HTMLElement | null>(null)
  const isMenuOpen = useRef(false)
  const menuListElt = useRef<HTMLDivElement>(null)
  const [editingAttrId, setEditingAttrId] = useState("")
  const [editingAttrName, setEditingAttrName] = useState("")
  // disable tooltips when there is an active drag in progress
  const dragging = !!active

  const draggableOptions: IUseDraggableAttribute = { prefix: instanceId, attributeId: column.key }
  const { attributes, listeners, setNodeRef: setDragNodeRef } = useDraggableAttribute(draggableOptions)

  const setCellRef = (elt: HTMLDivElement | null) => {
    setContentElt(elt)
    setDragNodeRef(elt?.parentElement || null)
  }

  useEffect(() => {
    // Find the parent CODAP component to display the attribute menu above the grid
    const codapComponent = contentElt?.closest(".codap-component") as HTMLDivElement
    setCodapComponentElt(codapComponent ?? null)

    // There is a bizarre bug somewhere in the intersection of Chrome, React, Chakra menus, and
    // ReactDataGrid that causes clicks on menu items roughly to the right of the original column
    // bounds to be dispatched _by the browser_ directly to the .codap-component, bypassing the
    // menu and its items altogether. Clicks on the left side of the menu items are dispatched
    // properly, however. Furthermore, the problem doesn't occur in Firefox or Safari.
    // The same menu works fine when used in other components besides the case table, and the
    // index menu works fine within the case table. It's only the column header menus that fail.
    // The workaround in this case is to detect that this has occurred and manually dispatch a
    // copy of the event to the appropriate menu item. ¯\_(ツ)_/¯
    const handleClick = (e: MouseEvent) => {
      const targetIsComponent = (e.target as HTMLElement).className.includes("codap-component")
      if (isMenuOpen.current && targetIsComponent && isClickInElement(e, menuListElt.current)) {
        const items = menuListElt.current?.querySelectorAll("button")
        const clickedItem = Array.from(items || []).find(item => isClickInElement(e, item))
        clickedItem?.dispatchEvent(new MouseEvent(e.type, e))
      }
    }

    codapComponent?.addEventListener("click", handleClick)
    return () => codapComponent?.removeEventListener("click", handleClick)
  }, [contentElt])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { key } = e
    e.stopPropagation()
    switch (key) {
      case "Escape":
        handleClose(false)
        break
      case "Enter":
      case "Tab":
        handleClose(true)
        e.currentTarget.blur()
        break
    }
  }
  const handleClose = (accept: boolean) => {
    const trimTitle = editingAttrName?.trim()
    if (accept && editingAttrId && trimTitle) {
      data?.setAttributeName(editingAttrId, trimTitle)
    }
    setEditingAttrId("")
    setEditingAttrName("")
  }
  const handleRenameAttribute = () => {
    setEditingAttrId(column.key)
    setEditingAttrName(column.name as string)
  }
  return (
    <Menu isLazy>
      {({ isOpen }) => {
        isMenuOpen.current = isOpen
        return (
          <>
            <Tooltip label={column.name || "attribute"} h="20px" fontSize="12px" color="white"
                openDelay={1000} placement="bottom" bottom="15px" left="15px"
                isDisabled={dragging || editingAttrId === column.key} closeOnMouseDown={true}>
              <div className="codap-column-header-content" ref={setCellRef} {...attributes} {...listeners}>
                { editingAttrId
                  ? <Input value={editingAttrName} data-testid="column-name-input" size="xs" autoFocus={true}
                      variant="unstyled" onChange={event => setEditingAttrName(event.target.value)}
                      onKeyDown={handleKeyDown} onBlur={()=>handleClose(true)} onFocus={(e) => e.target.select()}
                    />
                  : <MenuButton className="codap-attribute-button" disabled={column?.key === kIndexColumnKey}
                        fontWeight="bold" data-testid={`codap-attribute-button ${column?.name}`}>
                      {column?.name}
                    </MenuButton>
                }
                {column &&
                  <ColumnHeaderDivider key={column?.key} columnKey={column?.key} cellElt={cellElt}/>}
              </div>
            </Tooltip>
            {codapComponentElt && createPortal((
              <AttributeMenuList ref={menuListElt} column={column} onRenameAttribute={handleRenameAttribute}/>
            ), codapComponentElt)}
          </>
        )
    }}
    </Menu>
  )
}
