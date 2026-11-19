import { useDndContext } from "@dnd-kit/core"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { Menu, MenuItem, MenuList, MenuButton, MenuDivider, Portal } from "@chakra-ui/react"
import React, { CSSProperties, useEffect, useId, useRef, useState } from "react"
import { useDocumentContainerContext } from "../../../hooks/use-document-container-context"
import { useFreeTileLayoutContext } from "../../../hooks/use-free-tile-layout-context"
import { IUseDraggableAttribute, useDraggableAttribute } from "../../../hooks/use-drag-drop"
import { useInstanceIdContext } from "../../../hooks/use-instance-id-context"
import { useMenuHeightAdjustment } from "../../../hooks/use-menu-height-adjustment"
import { useMenuItemScrollIntoView } from "../../../hooks/use-menu-item-scroll-into-view"
import { useOutsidePointerDown } from "../../../hooks/use-outside-pointer-down"
import { useSubmenuOpenOnArrowRight } from "../../../hooks/use-submenu-keyboard-nav"
import { useOverlayBounds } from "../../../hooks/use-overlay-bounds"
import { AttributeType } from "../../../models/data/attribute-types"
import { IDataSet } from "../../../models/data/data-set"
import { getDataSets } from "../../../models/shared/shared-data-utils"
import { t } from "../../../utilities/translation/translate"
import {
  AttributePickerMenuItems, getAttributePickerEntries, useAttributePickerSubmenus
} from "../../common/attribute-picker-menu-items"
import { GraphPlace } from "../../axis-graph-shared"
import { graphPlaceToAttrRole } from "../../data-display/data-display-types"
import { removeAttributeLabel } from "../../data-display/remove-attribute-label"
import { useDataConfigurationContext } from "../../data-display/hooks/use-data-configuration-context"
import { placeTestId as axisPlaceTestId, isAxisPlace } from "../axis-types"

// Maps GraphPlace values to lowercase kebab-case for data-testid values.
// yPlus is the only camelCase value outside AxisPlace; others delegate to axisPlaceTestId.
const graphPlaceTestId = (place: GraphPlace): string => {
  if (place === "yPlus") return "y-plus"
  if (isAxisPlace(place)) return axisPlaceTestId(place)
  return place
}

import "./axis-or-legend-attribute-menu.scss"

// The full menu
interface IProps {
  place: GraphPlace,
  target: SVGGElement | null
  portal: HTMLElement | null
  layoutBounds: string  // Used to signal need to re-render because layout has changed
  onChangeAttribute: (place: GraphPlace, dataSet: IDataSet, attrId: string) => void
  onRemoveAttribute: (place: GraphPlace, attrId: string) => void
  onTreatAttributeAs: (place: GraphPlace, attrId: string, treatAs: AttributeType) => void
  // Optional override for attribute ID - used when rendering separate labels for multiple y-attributes
  attrIdOverride?: string
}
export const AxisOrLegendAttributeMenu = observer(function AxisOrLegendAttributeMenu({
  place, target, portal, layoutBounds, onChangeAttribute, onRemoveAttribute, onTreatAttributeAs, attrIdOverride
}: IProps) {
  const containerRef = useDocumentContainerContext()
  const layout = useFreeTileLayoutContext()
  const maxMenuHeight = `min(${layout?.height ?? 340}px, 50vh)`
  // Chakra's useIds(menuIdBase, "menu-button", "menu-list") produces id="menu-button-{menuIdBase}" on the
  // rendered MenuButton and id="menu-list-{menuIdBase}" on the MenuList. We reference the button id from
  // aria-labelledby so SR users get axis context on menu entry. The test guards the prefix convention.
  const menuIdBase = useId()
  const buttonId = `menu-button-${menuIdBase}`
  const dataConfiguration = useDataConfigurationContext()
  const isAttributeAllowed = dataConfiguration?.placeCanAcceptAttributeIDDrop
    ? (aPlace: GraphPlace, data: IDataSet, anAttrId: string) =>
        dataConfiguration.placeCanAcceptAttributeIDDrop(aPlace, data, anAttrId, { allowSameAttr: true })
    : undefined
  const dataSet = dataConfiguration?.dataset
  const dataSets = dataConfiguration ? getDataSets(dataConfiguration) : []
  const pickerEntries = getAttributePickerEntries(dataSets)
  const role = graphPlaceToAttrRole[place]
  const attrId = attrIdOverride || dataConfiguration?.attributeID(role) || ''
  const instanceId = useInstanceIdContext()
  const attribute = attrId ? dataSet?.attrFromID(attrId) : null
  const nativeType = attribute?.type || ''
  const removeAttrItemLabel = removeAttributeLabel(role, attribute?.name)
  const attrType = dataConfiguration?.attributeType(role) || ''
  const treatAs = (nativeType === 'date' && attrType === 'categorical') ? 'date'
    : ['numeric', 'date'].includes(attrType) ? "categorical" : "numeric"
  const overlayStyle: CSSProperties = { position: "absolute", ...useOverlayBounds({target, portal}) }
  const buttonStyle: CSSProperties = { width: "100%", height: "100%", color: "transparent" }
  const menuRef = useRef<HTMLDivElement>(null)
  const mainMenuListRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const onCloseMenuRef = useRef<() => void>()
  const { active: dndActive } = useDndContext()
  const submenus = useAttributePickerSubmenus()
  const { openCollectionId, handleCollectionHover, handleOpenSubmenu, handleCloseSubmenu } = submenus
  const adjustedMainMenuHeight = useMenuHeightAdjustment({
    menuRef: mainMenuListRef, containerRef, isOpen: isMenuOpen
  })

  // Enable snapToCursor for vertical (Y) axis labels since the rotated label's bounding box
  // causes the drag overlay to appear far from the mouse position
  const isVerticalAxis = ['left', 'rightCat', 'rightNumeric'].includes(place)
  const draggableOptions: IUseDraggableAttribute = {
    prefix: instanceId, dataSet, attributeId: attrId, disabled: !!openCollectionId || isMenuOpen,
    snapToCursor: isVerticalAxis
  }
  const { attributes, listeners, setNodeRef: setDragNodeRef } = useDraggableAttribute(draggableOptions)

  function handleOpenMenu() {
    handleCloseSubmenu()
    setIsMenuOpen(true)
  }

  // Chakra invokes this from its own event handlers (Escape, item selection, outside click),
  // so the menu state stays in sync without updating during the Menu's render.
  function resetMenuState() {
    handleCloseSubmenu()
    setIsMenuOpen(false)
  }

  // Chakra's onClose prop fires unconditionally, so closing the menu resets our state too.
  function handleCloseMenu() {
    onCloseMenuRef.current?.()
  }

  // Sync menu-open class with actual menu state, and clean up all visual state classes on close/unmount
  useEffect(() => {
    if (isMenuOpen) {
      target?.classList.add("menu-open")
    } else {
      target?.classList.remove("menu-open")
      target?.classList.remove("focused")
    }
    return () => {
      target?.classList.remove("menu-open")
      target?.classList.remove("focused")
      target?.classList.remove("hovered")
    }
  }, [isMenuOpen, target])

  // Strip hover/focus state while a drag is in progress, so the label doesn't
  // compete visually with the drop-zone outline. On drag end, restore the
  // focus ring if the button is still keyboard-focused (e.g. after an Escape
  // cancel by a keyboard user).
  useEffect(() => {
    if (!target) return
    if (dndActive) {
      target.classList.remove("hovered")
      target.classList.remove("focused")
    } else {
      const overlay = overlayRef.current
      const active = document.activeElement
      if (overlay && active instanceof Element && overlay.contains(active) && active.matches(":focus-visible")) {
        target.classList.add("focused")
      }
    }
  }, [dndActive, target])

  useOutsidePointerDown({
    ref: menuRef,
    handler: handleCloseMenu,
    info: { name: "AxisOrLegendAttributeMenu", attrId, attrName: attribute?.name }
  })
  const description = attribute?.description || ''
  let orientation = ''
  switch (place) {
    case 'left':
    case 'rightCat':
    case 'rightNumeric':
      orientation = t("DG.AxisView.vertical")
      break
    case 'top':
    case 'bottom':
      orientation = t("DG.AxisView.horizontal")
      break
  }
  const clickLabel = place === 'legend' ? `—${t("DG.LegendView.attributeTooltip")}`
    : t("DG.AxisView.labelTooltip", { vars: [orientation]})
  const ariaLabel = place === 'legend'
    ? attribute?.name
      ? t("DG.AxisView.legendAriaLabel", { vars: [attribute.name] })
      : t("DG.AxisView.emptyLegendAriaLabel")
    : attribute?.name
      ? t("DG.AxisView.axisAriaLabel", { vars: [orientation, attribute.name] })
      : t("DG.AxisView.emptyAxisAriaLabel", { vars: [orientation] })

  const handleMenuItemFocus = useMenuItemScrollIntoView()
  const handleMainMenuKeyDown = useSubmenuOpenOnArrowRight("collection-id", handleOpenSubmenu)

  const isAttributeAllowedHere = isAttributeAllowed
    ? (data: IDataSet, anAttrId: string) => isAttributeAllowed(place, data, anAttrId)
    : undefined

  const handleSelectAttribute = (data: IDataSet, _attrId: string) => {
    onChangeAttribute(place, data, _attrId)
    handleCloseMenu()
  }

  const handlePointerEnter = () => {
    if (dndActive) return
    target?.classList.add("hovered")
  }

  const handlePointerLeave = () => {
    target?.classList.remove("hovered")
  }

  const handleFocusCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    // Only show the focus ring for keyboard-driven focus, not mouse clicks.
    if (event.target.matches(":focus-visible")) {
      target?.classList.add("focused")
    }
  }

  const handleBlurCapture = () => {
    target?.classList.remove("focused")
  }

  return (
    <div className={clsx("axis-legend-attribute-menu", place)} ref={menuRef} title={description + clickLabel}>
      <Menu id={menuIdBase} placement="auto" onOpen={handleOpenMenu} onClose={resetMenuState}>
        {({ isOpen, onClose }) => {
          onCloseMenuRef.current = onClose
          return (
            <div className={`attribute-label-menu ${place}`}
                ref={el => { setDragNodeRef(el); overlayRef.current = el }}
                style={overlayStyle} {...attributes} {...listeners}
                onPointerEnter={handlePointerEnter}
                onPointerLeave={handlePointerLeave}
                onFocusCapture={handleFocusCapture}
                onBlurCapture={handleBlurCapture}
                data-testid={`attribute-label-menu-${place}`}>
              <MenuButton style={buttonStyle} aria-label={ariaLabel}
                           data-testid={`axis-legend-attribute-button-${place}`}>
                {attribute?.name}
              </MenuButton>
              <Portal containerRef={containerRef}>
                <MenuList ref={mainMenuListRef} className="attribute-picker-menu axis-legend-menu"
                          aria-labelledby={buttonId}
                          maxH={adjustedMainMenuHeight ?? maxMenuHeight} overflowY="auto"
                          onFocus={handleMenuItemFocus}
                          onKeyDown={handleMainMenuKeyDown}
                          data-testid={`axis-attr-menu-${graphPlaceTestId(place)}`}>
                  <AttributePickerMenuItems
                    containerRef={containerRef}
                    entries={pickerEntries}
                    isAttributeAllowed={isAttributeAllowedHere}
                    maxMenuHeight={maxMenuHeight}
                    onSelect={handleSelectAttribute}
                    submenus={submenus}
                    submenuClassName="axis-legend-submenu"
                    submenuTestId={index => `axis-attr-submenu-${graphPlaceTestId(place)}-${index}`}
                  />
                  { attribute &&
                    <>
                      <MenuDivider />
                      <MenuItem
                        onClick={() => onRemoveAttribute(place, attrId)}
                        onPointerOver={() => handleCollectionHover(null)}
                        data-testid={`remove-attribute-menu-item-${graphPlaceTestId(place)}`}
                      >
                        {removeAttrItemLabel}
                      </MenuItem>
                      {attribute.type !== "color" &&
                        <MenuItem
                          onClick={() => onTreatAttributeAs(place, attribute?.id, treatAs)}
                          onPointerOver={() => handleCollectionHover(null)}
                          data-testid={`treat-as-menu-item-${graphPlaceTestId(place)}-${treatAs}`}
                        >
                          {treatAs === "categorical" && t("DG.DataDisplayMenu.treatAsCategorical")}
                          {treatAs === "numeric" && t("DG.DataDisplayMenu.treatAsNumeric")}
                          {treatAs === "date" && t("V3.DataDisplayMenu.treatAsDate")}
                        </MenuItem>
                      }
                    </>
                  }
                </MenuList>
              </Portal>
            </div>
          )
        }}
      </Menu>
    </div>
  )
})
