import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { Menu, MenuButton, MenuDivider, MenuItem, MenuList } from "@chakra-ui/react"
import React, { useCallback, useRef, useState } from "react"
import { useMenuHeightAdjustment } from "../../hooks/use-menu-height-adjustment"
import { useMenuItemScrollIntoView } from "../../hooks/use-menu-item-scroll-into-view"
import { useSubmenuCloseOnArrowLeft } from "../../hooks/use-submenu-keyboard-nav"
import { ICollectionModel, isCollectionModel } from "../../models/data/collection"
import { IDataSet } from "../../models/data/data-set"
import { IDataSetMetadata } from "../../models/shared/data-set-metadata"
import { getMetadataFromDataSet } from "../../models/shared/shared-data-utils"
import { t } from "../../utilities/translation/translate"
import { If } from "./if"

import RightArrow from "../../assets/icons/arrow-right.svg"

import "./attribute-picker-menu-items.scss"

export interface IAttributePickerCollection {
  collection: ICollectionModel
  data: IDataSet
  metadata?: IDataSetMetadata
}
export type AttributePickerEntry = IAttributePickerCollection | "divider"
export type AttributePickerFilter = (dataSet: IDataSet, attrId: string) => boolean
export type AttributePickerSelect = (dataSet: IDataSet, attrId: string) => void

// every collection of the given datasets, with a divider between datasets
export function getAttributePickerEntries(dataSets: IDataSet[], getMetadata = getMetadataFromDataSet) {
  const entries: AttributePickerEntry[] = []
  dataSets.forEach((data, index) => {
    const metadata = getMetadata(data)
    data.collections.forEach(collection => {
      if (isCollectionModel(collection)) {
        entries.push({ collection, data, metadata })
      }
    })
    if (index < dataSets.length - 1) {
      entries.push("divider")
    }
  })
  return entries
}

// Which collection's submenu is open. Pointer hovers switch submenus after a short delay, to prevent accidental
// switches when moving to a submenu that appears above/below the trigger item; keyboard navigation is immediate.
export function useAttributePickerSubmenus() {
  const [openCollectionId, setOpenCollectionId] = useState<string | null>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cancel any pending hover timer (called when mouse enters the open submenu)
  const cancelPendingHover = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }, [])

  const handleCollectionHover = useCallback((collectionId: string | null) => {
    cancelPendingHover()
    // If hovering over the already-open collection, no delay needed
    if (collectionId === openCollectionId) return
    hoverTimerRef.current = setTimeout(() => {
      setOpenCollectionId(collectionId)
      hoverTimerRef.current = null
    }, 150)
  }, [cancelPendingHover, openCollectionId])

  // Open a collection submenu immediately (for keyboard navigation)
  const handleOpenSubmenu = useCallback((collectionId: string) => {
    cancelPendingHover()
    setOpenCollectionId(collectionId)
  }, [cancelPendingHover])

  // Close the current collection submenu (for keyboard navigation and when the menu closes)
  const handleCloseSubmenu = useCallback(() => {
    cancelPendingHover()
    setOpenCollectionId(null)
  }, [cancelPendingHover])

  return { openCollectionId, cancelPendingHover, handleCollectionHover, handleOpenSubmenu, handleCloseSubmenu }
}
export type AttributePickerSubmenus = ReturnType<typeof useAttributePickerSubmenus>

// MenuItems for all attributes in a single collection
interface IMenuItemsForCollectionProps {
  collectionInfo: IAttributePickerCollection
  isAttributeAllowed?: AttributePickerFilter
  onSelect: AttributePickerSelect
}
function MenuItemsForCollection({ collectionInfo, isAttributeAllowed, onSelect }: IMenuItemsForCollectionProps) {
  const { collection, data, metadata } = collectionInfo
  const attrs = collection.attributes.filter(attr => !!attr)
  return attrs.filter(attr =>
    !metadata?.isHidden(attr.id) && (!isAttributeAllowed || isAttributeAllowed(data, attr.id))
  ).map((attr) => {
    return (
      <MenuItem onClick={() => onSelect(data, attr.id)} key={attr.id}>
        {attr.name}
      </MenuItem>
    )
  })
}

// A MenuItem for a collection, which contains a submenu of the collection's attributes
interface ICollectionMenuProps {
  collectionInfo: IAttributePickerCollection
  containerRef: React.RefObject<HTMLElement | null>
  isAttributeAllowed?: AttributePickerFilter
  isOpen: boolean
  maxMenuHeight: string
  onCancelPendingHover?: () => void
  onCloseSubmenu?: () => void
  onOpenSubmenu?: () => void
  onPointerOver?: React.PointerEventHandler<HTMLButtonElement>
  onSelect: AttributePickerSelect
  submenuClassName?: string
  submenuTestId?: string
}
const CollectionMenu = observer(function CollectionMenu({
  collectionInfo, containerRef, isAttributeAllowed, isOpen, maxMenuHeight, onCancelPendingHover,
  onCloseSubmenu, onOpenSubmenu, onPointerOver, onSelect, submenuClassName, submenuTestId
}: ICollectionMenuProps) {
  const { collection } = collectionInfo
  const submenuRef = useRef<HTMLDivElement>(null)
  const collectionItemRef = useRef<HTMLDivElement>(null)
  const adjustedMaxHeight = useMenuHeightAdjustment({ menuRef: submenuRef, containerRef, isOpen })
  const handleMenuItemFocus = useMenuItemScrollIntoView()
  const handleSubmenuKeyDown = useSubmenuCloseOnArrowLeft({
    isOpen, submenuRef, triggerRef: collectionItemRef, onClose: onCloseSubmenu ?? (() => {})
  })

  const handleSubmenuPointerEnter = () => {
    onCancelPendingHover?.()
  }

  return (
    <>
      <If condition={isOpen}>
        <Menu isOpen={isOpen} placement="auto">
          <MenuButton as="div" className="collection-menu-button" aria-hidden="true" tabIndex={-1} />
          <MenuList ref={submenuRef} className={clsx("attribute-picker-submenu", submenuClassName)}
                    maxH={adjustedMaxHeight ?? maxMenuHeight} overflowY="auto"
                    onFocus={handleMenuItemFocus}
                    onKeyDown={handleSubmenuKeyDown}
                    onPointerEnter={handleSubmenuPointerEnter}
                    data-testid={submenuTestId}>
            <MenuItemsForCollection
              collectionInfo={collectionInfo}
              isAttributeAllowed={isAttributeAllowed}
              onSelect={onSelect}
            />
          </MenuList>
        </Menu>
      </If>
      <MenuItem
        ref={collectionItemRef}
        as="div"
        className="collection-menu-item"
        closeOnSelect={false}
        data-collection-id={collection.id}
        key={collection.id}
        onClick={onOpenSubmenu}
        onPointerOver={onPointerOver}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span>{collection.name}</span>
        <RightArrow className="collection-menu-arrow" aria-hidden="true" />
      </MenuItem>
    </>
  )
})

// The attribute items of a menu: a single collection's attributes directly, or a submenu for each collection,
// with dividers between datasets. The caller supplies the Menu and MenuList (and their keyboard handling).
interface IAttributePickerMenuItemsProps {
  containerRef: React.RefObject<HTMLElement | null>
  entries: AttributePickerEntry[]
  isAttributeAllowed?: AttributePickerFilter
  maxMenuHeight: string
  onSelect: AttributePickerSelect
  submenus: AttributePickerSubmenus
  submenuClassName?: string
  submenuTestId?: (collectionId: string) => string
}
export const AttributePickerMenuItems = observer(function AttributePickerMenuItems({
  containerRef, entries, isAttributeAllowed, maxMenuHeight, onSelect, submenus, submenuClassName, submenuTestId
}: IAttributePickerMenuItemsProps) {
  const { openCollectionId, cancelPendingHover, handleCollectionHover, handleOpenSubmenu, handleCloseSubmenu } =
    submenus

  const hasAttributes = entries.some(entry => entry !== "divider" &&
    entry.collection.attributes.some(attr =>
      attr && !entry.metadata?.isHidden(attr.id) &&
      (!isAttributeAllowed || isAttributeAllowed(entry.data, attr.id))
    )
  )

  if (!hasAttributes) {
    return (
      <MenuItem isDisabled isFocusable>{t("V3.DataDisplayMenu.noAttributesAvailable")}</MenuItem>
    )
  }
  if (entries.length === 1 && entries[0] !== "divider") {
    return (
      <MenuItemsForCollection
        collectionInfo={entries[0]}
        isAttributeAllowed={isAttributeAllowed}
        onSelect={onSelect}
      />
    )
  }
  let dividerCount = 0
  return (
    <>
      {entries.map(entry => {
        if (entry === "divider") {
          return <MenuDivider key={`divider-${dividerCount++}`} />
        }
        const { collection } = entry
        return (
          <CollectionMenu
            collectionInfo={entry}
            containerRef={containerRef}
            isAttributeAllowed={isAttributeAllowed}
            isOpen={openCollectionId === collection.id}
            key={collection.id}
            maxMenuHeight={maxMenuHeight}
            onCancelPendingHover={cancelPendingHover}
            onCloseSubmenu={handleCloseSubmenu}
            onOpenSubmenu={() => handleOpenSubmenu(collection.id)}
            onPointerOver={() => handleCollectionHover(collection.id)}
            onSelect={onSelect}
            submenuClassName={submenuClassName}
            submenuTestId={submenuTestId?.(collection.id)}
          />
        )
      })}
    </>
  )
})
