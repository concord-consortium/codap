import { Tooltip, Menu, MenuButton, Input, VisuallyHidden } from "@chakra-ui/react"
import { useDndContext } from "@dnd-kit/core"
import React, { useEffect, useRef, useState } from "react"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { IUseDraggableAttribute, useDraggableAttribute } from "../../hooks/use-drag-drop"
import { useInstanceIdContext } from "../../hooks/use-instance-id-context"
import { uniqueName } from "../../utilities/js-utils"
import { AttributeMenuList } from "./attribute-menu/attribute-menu-list"
import { CaseTablePortal } from "./case-table-portal"
import { kIndexColumnKey, TRenderHeaderCellProps } from "./case-table-types"
import { ColumnHeaderDivider } from "./column-header-divider"
import { useRdgCellFocus } from "./use-rdg-cell-focus"
import { updateAttributesNotification } from "../../models/data/data-set-utils"

export function ColumnHeader({ column }: Pick<TRenderHeaderCellProps, "column">) {
  const { active } = useDndContext()
  const data = useDataSetContext()
  const instanceId = useInstanceIdContext() || "table"
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)
  const [contentElt, setContentElt] = useState<HTMLDivElement | null>(null)
  const cellElt: HTMLDivElement | null = contentElt?.closest(".rdg-cell") ?? null
  const isMenuOpen = useRef(false)
  const [editingAttrId, setEditingAttrId] = useState("")
  const [editingAttrName, setEditingAttrName] = useState("")
  const [modalIsOpen, setModalIsOpen] = useState(false)
  const onCloseRef = useRef<() => void>()
  // disable tooltips when there is an active drag in progress
  const dragging = !!active
  const attribute = data?.attrFromID(column.key)

  const draggableOptions: IUseDraggableAttribute = {
    prefix: instanceId, dataSet: data, attributeId: column.key
  }
  const { attributes, listeners, setNodeRef: setDragNodeRef } = useDraggableAttribute(draggableOptions)

  const setCellRef = (elt: HTMLDivElement | null) => {
    setContentElt(elt)
    setDragNodeRef(elt?.closest(".rdg-cell") || null)
  }

  useEffect(() => {
    onCloseRef.current?.()
  }, [dragging])

  // focus our content when the cell is focused
  useRdgCellFocus(cellElt, menuButtonRef.current)

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
      const editingAttribute = data?.getAttribute(editingAttrId)
      const oldName = editingAttribute?.name
      data?.applyModelChange(() => {
        data?.setAttributeName(editingAttrId, () => uniqueName(trimTitle,
          (aName: string) => (aName === column.name) || !data.attributes.find(attr => aName === attr.name)
        ))
      }, {
        notifications: () => {
          if (editingAttribute && editingAttribute?.name !== oldName) {
            return updateAttributesNotification([editingAttribute], data)
          }
        }
      })
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
  const description = attribute?.description ? `: ${attribute.description}` : ""
  return (
    <Menu isLazy>
      {({ isOpen, onClose }) => {
        const disableTooltip = dragging || isOpen || modalIsOpen || editingAttrId === column.key
        isMenuOpen.current = isOpen
        onCloseRef.current = onClose
        return (
          <Tooltip label={`${column.name ?? ""} ${description}`} h="20px" fontSize="12px"
              color="white" openDelay={1000} placement="bottom" bottom="15px" left="15px"
              isDisabled={disableTooltip}
          >
            <div className="codap-column-header-content" ref={setCellRef} {...attributes} {...listeners}
            data-testid="codap-column-header-content">
            { editingAttrId
                  ? <Input value={editingAttrName} data-testid="column-name-input" size="xs" autoFocus={true}
                      variant="unstyled" onChange={event => setEditingAttrName(event.target.value)}
                      onKeyDown={handleInputKeyDown} onBlur={()=>handleClose(true)} onFocus={(e) => e.target.select()}
                    />
                  : <>
                      <MenuButton className="codap-attribute-button" ref={menuButtonRef}
                          disabled={column?.key === kIndexColumnKey}
                          fontWeight="bold" onKeyDown={handleButtonKeyDown}
                          data-testid={`codap-attribute-button ${column?.name}`}
                          aria-describedby={`sr-column-header-drag-instructions-${instanceId}`}>
                        {`${column?.name ?? ""}${units}`}
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
                <AttributeMenuList column={column} onRenameAttribute={handleRenameAttribute}
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
