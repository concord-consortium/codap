import { Menu, MenuButton, MenuList, Portal, useDisclosure } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import React, { useRef } from "react"
import { useDocumentContainerContext } from "../../hooks/use-document-container-context"
import { useMenuHeightAdjustment } from "../../hooks/use-menu-height-adjustment"
import { useMenuItemScrollIntoView } from "../../hooks/use-menu-item-scroll-into-view"
import { useSubmenuOpenOnArrowRight } from "../../hooks/use-submenu-keyboard-nav"
import { IDataSet } from "../../models/data/data-set"
import { getDataSets } from "../../models/shared/shared-data-utils"
import { ITileModel } from "../../models/tiles/tile-model"
import { t } from "../../utilities/translation/translate"
import {
  AttributePickerMenuItems, getAttributePickerEntries, useAttributePickerSubmenus
} from "../common/attribute-picker-menu-items"
import { configureSliderFromAttribute, isSliderAttributeDropAllowed } from "./slider-attribute-drop"
import { isSliderModel } from "./slider-model"

import DropdownArrow from "../../assets/icons/arrow.svg"

const kMaxMenuHeight = "50vh"

interface IProps {
  tile?: ITileModel
  className?: string
  children: React.ReactNode  // the trigger's content
}
// A menu of the attributes that can configure the slider (those a drop would accept), across all datasets.
// Choosing one configures the slider from it, as a drop does.
export const SliderAttributeMenu = observer(function SliderAttributeMenu({ tile, className, children }: IProps) {
  const slider = isSliderModel(tile?.content) ? tile?.content : undefined
  const containerRef = useDocumentContainerContext()
  const menuListRef = useRef<HTMLDivElement>(null)
  const submenus = useAttributePickerSubmenus()
  const { handleOpenSubmenu, handleCloseSubmenu } = submenus
  const handleMenuItemFocus = useMenuItemScrollIntoView()
  const handleMenuKeyDown = useSubmenuOpenOnArrowRight("collection-id", handleOpenSubmenu)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const adjustedMaxHeight = useMenuHeightAdjustment({ menuRef: menuListRef, containerRef, isOpen })

  if (!tile || !slider) return null

  const entries = getAttributePickerEntries(getDataSets(slider))
  const isAttributeAllowed = (dataSet: IDataSet, attrId: string) =>
    isSliderAttributeDropAllowed(slider, dataSet, attrId)
  // an attribute chosen in a collection's submenu closes only the submenu, so the menu is closed here
  const handleSelect = (dataSet: IDataSet, attrId: string) => {
    configureSliderFromAttribute(tile, dataSet, attrId)
    onClose()
  }

  return (
    <Menu placement="bottom" isLazy isOpen={isOpen}
          onOpen={() => { handleCloseSubmenu(); onOpen() }}
          onClose={() => { handleCloseSubmenu(); onClose() }}>
      {/* the visible text names the button; the arrow is an icon, so it adds nothing to the text or the name */}
      <MenuButton className={className} title={t("V3.Slider.attributeMenu")}
                  data-testid="slider-attribute-menu-button">
        {children}
        <DropdownArrow className="slider-attribute-menu-arrow" aria-hidden="true"/>
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
