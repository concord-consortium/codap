import { Menu, MenuButton, MenuList, Portal, useDisclosure } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import React, { useEffect, useRef } from "react"
import { useDocumentContainerContext } from "../../hooks/use-document-container-context"
import { useMenuHeightAdjustment } from "../../hooks/use-menu-height-adjustment"
import { useMenuItemScrollIntoView } from "../../hooks/use-menu-item-scroll-into-view"
import { useSubmenuOpenOnArrowRight } from "../../hooks/use-submenu-keyboard-nav"
import { useTileModelContext } from "../../hooks/use-tile-model-context"
import { IDataSet } from "../../models/data/data-set"
import { getDataSets } from "../../models/shared/shared-data-utils"
import { t } from "../../utilities/translation/translate"
import { AttributeLabelCaret } from "../common/attribute-label-caret"
import {
  AttributePickerMenuItems, getAttributePickerEntries, useAttributePickerSubmenus
} from "../common/attribute-picker-menu-items"
import { configureSliderFromAttribute, isSliderAttributeUsable } from "./slider-attribute-drop"
import { isSliderModel } from "./slider-model"


const kMaxMenuHeight = "50vh"

interface IProps {
  className?: string
  // focuses the trigger whenever it becomes true, e.g. when the trigger replaces another that had the focus
  autoFocus?: boolean
  onAutoFocus?: () => void
  onSelect?: () => void
  children: React.ReactNode  // the trigger's content
}
// A menu of the attributes that can configure the slider, across all datasets. Choosing one configures the slider
// from it, as a drop does; choosing the one it's already bound to does nothing.
export const SliderAttributeMenu = observer(function SliderAttributeMenu({
  className, autoFocus, onAutoFocus, onSelect, children
}: IProps) {
  const { tile } = useTileModelContext()
  const slider = isSliderModel(tile?.content) ? tile?.content : undefined
  const containerRef = useDocumentContainerContext()
  const menuListRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const submenus = useAttributePickerSubmenus()
  const { handleOpenSubmenu, handleCloseSubmenu } = submenus
  const handleMenuItemFocus = useMenuItemScrollIntoView()
  const handleMenuKeyDown = useSubmenuOpenOnArrowRight("collection-id", handleOpenSubmenu)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const adjustedMaxHeight = useMenuHeightAdjustment({ menuRef: menuListRef, containerRef, isOpen })

  useEffect(() => {
    if (autoFocus) {
      buttonRef.current?.focus()
      onAutoFocus?.()
    }
  }, [autoFocus, onAutoFocus])

  if (!tile || !slider) return null

  const entries = getAttributePickerEntries(getDataSets(slider))
  const isAttributeAllowed = (dataSet: IDataSet, attrId: string) =>
    isSliderAttributeUsable(slider, dataSet, attrId)
  // an attribute chosen in a collection's submenu closes only the submenu, so the menu is closed here
  const handleSelect = (dataSet: IDataSet, attrId: string) => {
    configureSliderFromAttribute(tile, dataSet, attrId)
    onClose()
    onSelect?.()
  }

  return (
    <Menu placement="bottom" isLazy isOpen={isOpen}
          onOpen={() => { handleCloseSubmenu(); onOpen() }}
          onClose={() => { handleCloseSubmenu(); onClose() }}>
      {/* the visible text names the button; the caret is an icon, so it adds nothing to the text or the name */}
      <MenuButton ref={buttonRef} className={className} title={t("V3.Slider.attributeMenu")}
                  data-testid="slider-attribute-menu-button">
        <span className="slider-attribute-menu-text">{children}</span>
        <AttributeLabelCaret className="slider-attribute-menu-arrow"/>
      </MenuButton>
      <Portal containerRef={containerRef}>
        <MenuList ref={menuListRef} className="attribute-picker-menu"
                  maxH={adjustedMaxHeight ?? kMaxMenuHeight} overflowY="auto"
                  onFocus={handleMenuItemFocus}
                  onKeyDown={handleMenuKeyDown}
                  data-testid="slider-attribute-menu-list">
          <AttributePickerMenuItems
            containerRef={containerRef}
            entries={entries}
            isAttributeAllowed={isAttributeAllowed}
            maxMenuHeight={kMaxMenuHeight}
            onSelect={handleSelect}
            submenus={submenus}
          />
        </MenuList>
      </Portal>
    </Menu>
  )
})
