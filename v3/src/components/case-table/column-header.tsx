import { Tooltip, Menu, MenuButton, Input, VisuallyHidden } from "@chakra-ui/react"
import { useDndContext } from "@dnd-kit/core"
import React, { useEffect, useRef, useState } from "react"
import { uniqueName } from "../../utilities/js-utils"
import { kIndexColumnKey, THeaderRendererProps } from "./case-table-types"
import { ColumnHeaderDivider } from "./column-header-divider"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { IUseDraggableAttribute, useDraggableAttribute } from "../../hooks/use-drag-drop"
import { useInstanceIdContext } from "../../hooks/use-instance-id-context"
import { AttributeMenuList } from "./attribute-menu"
import { CaseTablePortal } from "./case-table-portal"
import { kDefaultAttributeName } from "../../models/data/attribute"

export const ColumnHeader = ({ column }: Pick<THeaderRendererProps, "column">) => {
  const { active } = useDndContext()
  const data = useDataSetContext()
  const instanceId = useInstanceIdContext() || "table"
  const [contentElt, setContentElt] = useState<HTMLElement | null>(null)
  const cellElt = contentElt?.parentElement || null
  const isMenuOpen = useRef(false)
  const menuListElt = useRef<HTMLDivElement>(null)
  const [editingAttrId, setEditingAttrId] = useState("")
  const [editingAttrName, setEditingAttrName] = useState("")
  const [modalIsOpen, setModalIsOpen] = useState(false)
  // disable dragging when the column header menu is open
  const disabled = isMenuOpen.current
  // disable tooltips when there is an active drag in progress
  const dragging = !!active
  const attribute = data?.attrFromID(column.key)

  const draggableOptions: IUseDraggableAttribute = { prefix: instanceId, attributeId: column.key, disabled }
  const { attributes, listeners, setNodeRef: setDragNodeRef } = useDraggableAttribute(draggableOptions)

  const setCellRef = (elt: HTMLDivElement | null) => {
    setContentElt(elt)
    setDragNodeRef(elt?.parentElement || null)
  }

  useEffect(() => {
    const parent = cellElt?.closest(".rdg-cell")

    // During cell navigation, RDG sets the focus to the .rdg-cell. For keyboard invocation
    // of the column header menu, however, the focus needs to be on the Chakra MenuButton.
    // Therefore, we intercept attempts to focus the .rdg-cell and focus our content instead.

    const handleFocus = (e: FocusEvent) => {
      if (e.target === e.currentTarget) {
        const menuButton = contentElt?.querySelector("button")
        menuButton?.focus()
      }
    }

    parent?.addEventListener("focusin", handleFocus)
    return () => parent?.removeEventListener("focusin", handleFocus)
  }, [cellElt, contentElt])

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { key } = e
    e.stopPropagation()
    switch (key) {
      case "Escape":
        handleClose(false)
        break
      case "Enter":
      case "Tab":
        handleClose(true)
        break
    }
  }

    const handleButtonKeyDown = (e: React.KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp"].includes(e.key)) {
      // Prevent Chakra from bringing up the menu in favor of cell navigation
      e.preventDefault()
    }
  }

  const handleClose = (accept: boolean) => {
    const trimTitle = editingAttrName?.trim()
    if (accept && editingAttrId && trimTitle) {
      data?.setAttributeName(editingAttrId, () => uniqueName(trimTitle,
        (aName: string) => (aName === column.name) || !data.attributes.find(attr => aName === attr.name)
       ))
    }
    setEditingAttrId("")
    setEditingAttrName("")
  }
  const handleRenameAttribute = () => {
    setEditingAttrId(column.key)
    setEditingAttrName(column.name as string)
  }

  const handleModalOpen = (open: boolean) => {
    setModalIsOpen(open)
  }

  const units = attribute?.units ? ` (${attribute.units})` : ""
  const description = attribute?.userDescription ? `: ${attribute.userDescription}` : ""
  
  return (
    <Menu isLazy>
      {({ isOpen }) => {
        const disableTooltip = dragging || isOpen || modalIsOpen || editingAttrId === column.key
        isMenuOpen.current = isOpen
        return (
          <Tooltip label={`${column.name} ${description}` || kDefaultAttributeName} h="20px" fontSize="12px"
              color="white" openDelay={1000} placement="bottom" bottom="15px" left="15px"
              data-testid="case-table-attribute-tooltip" isDisabled={disableTooltip}
          >
            <div className="codap-column-header-content" ref={setCellRef} {...attributes} {...listeners}>
            { editingAttrId
                  ? <Input value={editingAttrName} data-testid="column-name-input" size="xs" autoFocus={true}
                      variant="unstyled" onChange={event => setEditingAttrName(event.target.value)}
                      onKeyDown={handleInputKeyDown} onBlur={()=>handleClose(true)} onFocus={(e) => e.target.select()}
                    />
                  : <>
                      <MenuButton className="codap-attribute-button" disabled={column?.key === kIndexColumnKey}
                          fontWeight="bold" onKeyDown={handleButtonKeyDown}
                          data-testid={`codap-attribute-button ${column?.name}`}
                          aria-describedby={`sr-column-header-drag-instructions-${instanceId}`}>
                        {column.name ? `${column?.name}${units}` : kDefaultAttributeName}
                      </MenuButton>
                      {column.key !== kIndexColumnKey &&
                        <VisuallyHidden id={`sr-column-header-drag-instructions-${instanceId}`}>
                          <pre> Press Space to drag the attribute within the table or to a graph.
                                Press Enter to open the attribute menu.
                          </pre>
                        </VisuallyHidden>
                      }
                    </>
                }
              <CaseTablePortal>
                <AttributeMenuList ref={menuListElt} column={column} onRenameAttribute={handleRenameAttribute}
                  onModalOpen={handleModalOpen}
                />
              </CaseTablePortal>
              {column &&
                <ColumnHeaderDivider key={column?.key} columnKey={column?.key} cellElt={cellElt}/>}
            </div>
          </Tooltip>
        )
    }}
    </Menu>
  )
}
