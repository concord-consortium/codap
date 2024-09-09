import { Tooltip, Menu, MenuButton, Input, VisuallyHidden } from "@chakra-ui/react"
import { useDndContext } from "@dnd-kit/core"
import { autorun } from "mobx"
import { observer } from "mobx-react-lite"
import React, { useEffect, useRef, useState } from "react"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { IUseDraggableAttribute, useDraggableAttribute } from "../../hooks/use-drag-drop"
import { useInstanceIdContext } from "../../hooks/use-instance-id-context"
import { updateAttributesNotification } from "../../models/data/data-set-notifications"
import { uiState } from "../../models/ui-state"
import { uniqueName } from "../../utilities/js-utils"
import { AttributeMenuList } from "./attribute-menu/attribute-menu-list"
import { CaseTilePortal } from "./case-tile-portal"
import { IDividerProps, kIndexColumnKey } from "./case-tile-types"
import { useParentChildFocusRedirect } from "./use-parent-child-focus-redirect"

interface IProps {
  attributeId: string
  beforeHeaderDivider?: boolean
  HeaderDivider?: React.ComponentType<IDividerProps>
  // returns the draggable parent element for use with DnDKit
  onSetContentElt?: (contentElt: HTMLDivElement | null) => HTMLElement | null
  onBeginEdit?: () => void
  onEndEdit?: () => void
  onOpenMenu?: () => void
}

export const AttributeHeader = observer(function ColumnHeader({
  attributeId, beforeHeaderDivider, HeaderDivider, onSetContentElt, onBeginEdit, onEndEdit, onOpenMenu
}: IProps) {
  const { active } = useDndContext()
  const data = useDataSetContext()
  const instanceId = useInstanceIdContext() || "table"
  const parentRef = useRef<HTMLElement | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const isMenuOpen = useRef(false)
  const [editingAttrId, setEditingAttrId] = useState("")
  const [editingAttrName, setEditingAttrName] = useState("")
  const [modalIsOpen, setModalIsOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const onCloseMenuRef = useRef<() => void>()
  // disable tooltips when there is an active drag in progress
  const dragging = !!active

  const attribute = data?.attrFromID(attributeId)
  const attrName = attribute?.name ?? ""

  const draggableOptions: IUseDraggableAttribute = {
    prefix: instanceId, dataSet: data, attributeId
  }
  const { attributes, listeners, setNodeRef: setDragNodeRef } = useDraggableAttribute(draggableOptions)

  const setContentRef = (elt: HTMLDivElement | null) => {
    contentRef.current = elt
    parentRef.current = onSetContentElt?.(elt) ?? null
    setDragNodeRef(parentRef.current ?? elt)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current && editingAttrId === attributeId) {
        inputRef.current.focus()
        inputRef.current.select()
      }
    }, 100) // delay to ensure the input is rendered

    return () => clearTimeout(timer)
  }, [attributeId, editingAttrId])

  useEffect(() => {
    onCloseMenuRef.current?.()
  }, [dragging])

  useEffect(() => {
    return autorun(() => {
      if (uiState.attrIdToEdit === attributeId) {
        setEditingAttrId(attributeId)
        setEditingAttrName(attrName)
        onBeginEdit?.()
      } else {
        setEditingAttrId("")
        setEditingAttrName("")
        onEndEdit?.()
      }
    })
  }, [attributeId, attrName, onBeginEdit, onEndEdit])

  // focus our content when the cell is focused
  useParentChildFocusRedirect(parentRef.current, menuButtonRef.current)

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
        data.setAttributeName(editingAttrId, () => uniqueName(trimTitle,
          (aName: string) => (aName === attrName) || !data.attributes.find(attr => aName === attr.name)
        ))
      }, {
        notify: () => {
          if (editingAttribute && editingAttribute?.name !== oldName) {
            return updateAttributesNotification([editingAttribute], data)
          }
        },
        undoStringKey: "DG.Undo.caseTable.editAttribute",
        redoStringKey: "DG.Redo.caseTable.editAttribute"
      })
    }
    setEditingAttrId("")
    setEditingAttrName("")
    uiState.setAttrIdToEdit?.()
  }
  const handleRenameAttribute = () => {
    setEditingAttrId(attributeId)
    setEditingAttrName(attrName)
  }

  const handleModalOpen = (open: boolean) => {
    setModalIsOpen(open)
  }

  const handleInputBlur = (e: any) => {
    if (isFocused) {
      handleClose(true)
    }
  }

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    setIsFocused(false)
    const input = inputRef.current
    if (input) {
      const { selectionStart, selectionEnd } = input
      if (selectionStart != null && selectionEnd != null) {
        // Because the input value is automatically selected when user creates a new attribute,
        // we deselect current selection and place cursor at the position of the click
        if (selectionStart === selectionEnd) {
          input.setSelectionRange(selectionStart, selectionEnd)
        }
      }
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const units = attribute?.units ? ` (${attribute.units})` : ""
  const description = attribute?.description ? `: ${attribute.description}` : ""
  return (
    <Menu isLazy>
      {({ isOpen, onClose }) => {
        const disableTooltip = dragging || isOpen || modalIsOpen || editingAttrId === attributeId
        isMenuOpen.current = isOpen
        onCloseMenuRef.current = onClose
        // ensure selected header is styled correctly.
        if (isMenuOpen.current) onOpenMenu?.()
        return (
          <Tooltip label={`${attrName ?? ""} ${description}`} h="20px" fontSize="12px"
              color="white" openDelay={1000} placement="bottom" bottom="15px" left="15px"
              isDisabled={disableTooltip}
          >
            <div className="codap-column-header-content" ref={setContentRef} {...attributes} {...listeners}
            data-testid="codap-column-header-content">
            { editingAttrId
                  ? <Input ref={inputRef} value={editingAttrName} data-testid="column-name-input"
                            className="column-name-input" size="xs"
                            autoFocus={true} variant="unstyled" onClick={handleInputClick}
                            onChange={event => setEditingAttrName(event.target.value)}
                            onKeyDown={handleInputKeyDown} onBlur={handleInputBlur} onFocus={handleFocus}
                    />
                  : <>
                      <MenuButton className="codap-attribute-button" ref={menuButtonRef}
                          disabled={attributeId === kIndexColumnKey}
                          fontWeight="bold" onKeyDown={handleButtonKeyDown}
                          data-testid={`codap-attribute-button ${attrName}`}
                          aria-describedby={`sr-column-header-drag-instructions-${instanceId}`}>
                        {`${attrName ?? ""}${units}`}
                      </MenuButton>
                      {attributeId !== kIndexColumnKey &&
                        <VisuallyHidden id={`sr-column-header-drag-instructions-${instanceId}`}>
                          <pre> Press Space to drag the attribute within the table or to a graph.
                                Press Enter to open the attribute menu.
                          </pre>
                        </VisuallyHidden>
                      }
                    </>
                }
              {attributeId !== kIndexColumnKey &&
                <CaseTilePortal>
                  <AttributeMenuList attributeId={attributeId} onRenameAttribute={handleRenameAttribute}
                    onModalOpen={handleModalOpen}
                  />
                </CaseTilePortal>
              }
              {attributeId && HeaderDivider && !beforeHeaderDivider &&
                <HeaderDivider
                  key={attributeId}
                  columnKey={attributeId}
                  cellElt={parentRef.current}
                  isCardDivider={instanceId.includes("case-card-")}
                />
              }
            </div>
          </Tooltip>
        )
    }}
    </Menu>
  )
})
