import { Tooltip, Menu, MenuButton, Input, VisuallyHidden, SystemStyleObject } from "@chakra-ui/react"
import { useDndContext } from "@dnd-kit/core"
import { autorun } from "mobx"
import { observer } from "mobx-react-lite"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { clsx } from "clsx"
import DropdownArrow from "../../assets/icons/arrow.svg"
import { OverflowMode, useAdjustHeaderForOverflow } from "../../hooks/use-adjust-header-overflow"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { IUseDraggableAttribute, useDraggableAttribute } from "../../hooks/use-drag-drop"
import { useInstanceIdContext } from "../../hooks/use-instance-id-context"
import { useOutsidePointerDown } from "../../hooks/use-outside-pointer-down"
import { updateAttributesNotification } from "../../models/data/data-set-notifications"
import { uiState } from "../../models/ui-state"
import { uniqueName } from "../../utilities/js-utils"
import { t } from "../../utilities/translation/translate"
import { AttributeHeaderDivider } from "./attribute-header-divider"
import { AttributeHeaderJoinTarget } from "./attribute-header-join-target"
import { AttributeMenuList } from "./attribute-menu/attribute-menu-list"
import { CaseTilePortal } from "./case-tile-portal"
import { GetDividerBoundsFn, kIndexColumnKey } from "./case-tile-types"
import { useParentChildFocusRedirect } from "./use-parent-child-focus-redirect"

interface IProps {
  attributeId: string
  beforeHeaderDivider?: boolean
  customButtonStyle?: SystemStyleObject
  disableTooltip?: boolean
  draggable?: boolean
  getDividerBounds?: GetDividerBoundsFn
  showUnits?: boolean
  allowTwoLines?: boolean
  // returns the draggable parent element for use with DnDKit
  onSetHeaderContentElt?: (contentElt: HTMLDivElement | null) => HTMLElement | null
  onBeginEdit?: () => void
  onButtonKeyDown?: (e: React.KeyboardEvent) => void
  onEndEdit?: () => void
  onOpenMenu?: () => void
  onCloseMenu?: () => void
}

export const AttributeHeader = observer(function AttributeHeader({
  attributeId, beforeHeaderDivider, customButtonStyle, disableTooltip, draggable = true, allowTwoLines,
  getDividerBounds, showUnits=true, onSetHeaderContentElt, onBeginEdit, onButtonKeyDown, onEndEdit,
  onOpenMenu, onCloseMenu
}: IProps) {
  const { active } = useDndContext()
  const data = useDataSetContext()
  const instanceId = useInstanceIdContext() || "table"
  const parentRef = useRef<HTMLElement | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const menuListRef = useRef<HTMLDivElement | null>(null)
  const isMenuOpen = useRef(false)
  const [isMenuOpenState, setIsMenuOpenState] = useState(false)
  const [editingAttrId, setEditingAttrId] = useState("")
  const [editingAttrName, setEditingAttrName] = useState("")
  const [modalIsOpen, setModalIsOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const onCloseMenuRef = useRef<() => void>()
  // disable tooltips when there is an active drag in progress
  const dragging = !!active

  const attribute = data?.attrFromID(attributeId)
  const attrName = attribute?.name ?? ""
  const attrUnits = attribute?.units ? ` (${attribute.units})` : ""
  const { fullText, reversedText, overflowMode } =
            useAdjustHeaderForOverflow(menuButtonRef.current, attrName, attrUnits)
  const draggableOptions: IUseDraggableAttribute = {
    prefix: instanceId, dataSet: data, attributeId
  }
  const { attributes, listeners, setNodeRef: setDragNodeRef } = useDraggableAttribute(draggableOptions)
  const draggableProps = draggable ? { ...attributes, ...listeners } : {}
  // TODO: we really should only enable the outside pointer down listener when the menu is open.
  // However there doesn't seem to be simple way to do that.
  // `isMenuOpen` is a ref so we won't be re-rendered when that changes.
  useOutsidePointerDown({
    ref: menuListRef,
    handler: () => onCloseMenuRef.current?.(),
    info: {name: "AttributeHeader menuList", attributeId, attrName}
   })

  const setHeaderContentRef = (elt: HTMLDivElement | null) => {
    contentRef.current = elt
    parentRef.current = onSetHeaderContentElt?.(elt) ?? null
    if (draggable) setDragNodeRef(parentRef.current ?? elt)
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
  useParentChildFocusRedirect(parentRef, menuButtonRef)
  useOutsidePointerDown({
    ref: inputRef,
    handler: () => {
      if (isFocused) {
        handleClose(true)
      }
    },
    enabled: isFocused,
    info: {name: "AttributeHeader input", attributeId, attrName}
  })

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
    if (dragging && e.key === "Enter") {
      // During keyboard drag, prevent menu from opening so dnd-kit handles the drop
      e.preventDefault()
    }
    onButtonKeyDown?.(e)
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
    setIsFocused(false)
    uiState.setAttrIdToEdit?.()
    // Restore focus to the menu button after React re-renders the Input back to a MenuButton.
    // Also re-set aria-selected on the cell so RDG's selection outline is visible.
    setTimeout(() => {
      menuButtonRef.current?.focus()
      parentRef.current?.setAttribute("aria-selected", "true")
    })
  }
  const handleRenameAttribute = useCallback(() => {
    setEditingAttrId(attributeId)
    setEditingAttrName(attrName)
  }, [attrName, attributeId])

  const handleModalOpen = useCallback((open: boolean) => {
    setModalIsOpen(open)
  }, [])

  const handleInputBlur = (e: any) => {
    if (isFocused) {
      handleClose(true)
    }
  }

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
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

  const renderAttributeLabel = useMemo(() => {
    const renderers: Record<OverflowMode, () => JSX.Element> = {
      'single-line': () => <span className="one-line-header">{fullText}</span>,
      'wrap': () => <span className="two-line-header-wrap">{fullText}</span>,
      'truncated': () => (
        <>
          <span className="two-line-header-line-1">{fullText}</span>
          <span className="two-line-header-line-2 truncated">{reversedText}</span>
        </>
      )
    }
    return renderers[overflowMode]()
  }, [fullText, reversedText, overflowMode])

  const renderTooltipLabel = useMemo(() => {
    const description = attribute?.description ? `: ${attribute.description}` : ""

    return (
      <>
        {`${attrName}${description}`}
        {attribute?.formula &&
          <>
            <br />
            {`${attrName} = ${attribute.formula.display}`}
          </>
        }
      </>
    )
  }, [attribute?.description, attribute?.formula, attrName])

  // Notify parent of menu open/close as a side effect (not during render).
  // Skip the initial mount (isMenuOpenState starts false) to avoid a spurious onCloseMenu call.
  const didMount = useRef(false)
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      return
    }
    if (isMenuOpenState) {
      onOpenMenu?.()
    } else {
      onCloseMenu?.()
    }
  }, [isMenuOpenState, onOpenMenu, onCloseMenu])

  const isIndex = attributeId === kIndexColumnKey
  const headerContentClasses = clsx("codap-column-header-content", { "index-column-header": isIndex })
  return (
    <Menu isLazy>
      {({ isOpen, onClose }) => {
        const tooltipDisabled = disableTooltip || dragging || isOpen || modalIsOpen || editingAttrId === attributeId
        isMenuOpen.current = isOpen
        onCloseMenuRef.current = onClose
        if (isOpen !== isMenuOpenState) setIsMenuOpenState(isOpen)
        return (
          <Tooltip label={renderTooltipLabel} fontSize="12px" color="white"
              openDelay={1000} placement="bottom" bottom="15px" left="15px" isDisabled={tooltipDisabled}
          >
            <div className={headerContentClasses} ref={setHeaderContentRef} {...draggableProps}
            data-testid="codap-column-header-content">
              { !isIndex &&
                (editingAttrId
                  ? <Input ref={inputRef} value={editingAttrName} data-testid="column-name-input"
                            className="column-name-input" size="xs"
                            aria-label={t("V3.CaseTable.renameAriaLabel", { vars: [attrName] })}
                            autoFocus={true} variant="unstyled" onClick={handleInputClick}
                            onChange={event => setEditingAttrName(event.target.value)}
                            onKeyDown={handleInputKeyDown} onBlur={handleInputBlur} onFocus={handleFocus}
                    />
                  : <>
                      <MenuButton
                          className={clsx("codap-attribute-button", {"allow-two-lines": allowTwoLines})}
                          ref={menuButtonRef}
                          disabled={attributeId === kIndexColumnKey}
                          sx={customButtonStyle}
                          fontWeight="bold" onKeyDown={handleButtonKeyDown}
                          data-testid={`codap-attribute-button ${attrName}`}
                          aria-label={t("V3.CaseTable.attributeAriaLabel", { vars: [attrName] })}
                          aria-describedby={
                            `sr-column-header-drag-instructions-${instanceId}-${attributeId}`
                          }>
                        {allowTwoLines ? renderAttributeLabel
                                        : `${attrName ?? ""}${showUnits ? attrUnits : ""}`.trim()}
                      </MenuButton>
                      <DropdownArrow className="attr-header-dropdown-arrow" aria-hidden="true" />
                      <VisuallyHidden
                        id={`sr-column-header-drag-instructions-${instanceId}-${attributeId}`}
                      >
                        {t("V3.CaseTable.attributeDragInstructions")}
                      </VisuallyHidden>
                    </>
                )
              }
              {attributeId !== kIndexColumnKey &&
                <CaseTilePortal>
                  <AttributeMenuList ref={menuListRef} attributeId={attributeId}
                    finalFocusRef={menuButtonRef}
                    onRenameAttribute={handleRenameAttribute} onModalOpen={handleModalOpen}
                  />
                </CaseTilePortal>
              }
              {attributeId && !beforeHeaderDivider &&
                <>
                  <AttributeHeaderDivider
                    key={attributeId}
                    columnKey={attributeId}
                    cellElt={parentRef.current}
                    getDividerBounds={getDividerBounds}
                  />
                  <AttributeHeaderJoinTarget
                    attributeId={attributeId}
                    parentElt={parentRef.current}
                  />
                </>
              }
            </div>
          </Tooltip>
        )
    }}
    </Menu>
  )
})
