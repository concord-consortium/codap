// PROTOTYPE: attribute menu for visibility/selection sliders. Per the Visibility/Selection slider doc it behaves
// like a graph axis's attribute menu but offers only numeric and date attributes. It's both the empty state's
// "Drag an attribute or click here" and the attribute label under the number line.
// Built like the graph's (axis-or-legend-attribute-menu.tsx), with its classes so it looks the same: with more
// than one collection, each collection is an item ("Tracks ▸") opening a submenu of its attributes -- on
// hover (after the graph's 150ms delay), click, or Right Arrow; Left Arrow or Escape closes it.
import { Menu, MenuButton, MenuDivider, MenuItem, MenuList, Portal } from "@chakra-ui/react"
import { useDndContext } from "@dnd-kit/core"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { useCallback, useRef, useState } from "react"
import RightArrow from "../../assets/icons/arrow-right.svg"
import { useDocumentContainerContext } from "../../hooks/use-document-container-context"
import { useSubmenuCloseOnArrowLeft, useSubmenuOpenOnArrowRight } from "../../hooks/use-submenu-keyboard-nav"
import { IAttribute } from "../../models/data/attribute"
import { ICollectionModel } from "../../models/data/collection"
import { IDataSet } from "../../models/data/data-set"
import { getDataSets } from "../../models/shared/shared-data-utils"
import { ISliderModel } from "./slider-model"

import "../axis/components/axis-or-legend-attribute-menu.scss"

export function isSliderAttribute(attr?: IAttribute) {
  return attr?.type === "numeric" || attr?.type === "date"
}

export function attributeLabel(attr?: IAttribute) {
  if (!attr) return ""
  return attr.units ? `${attr.name} (${attr.units})` : attr.name
}

interface ICollectionGroup {
  data: IDataSet
  collection: ICollectionModel
  attrs: IAttribute[]
}

interface ICollectionMenuProps {
  group: ICollectionGroup
  isOpen: boolean
  onOpen: () => void
  onHover: () => void
  onClose: () => void
  onCancelPendingHover: () => void
  onChoose: (dataSet: IDataSet, attrId: string) => void
}

// a collection item with its submenu of attributes (as the graph's CollectionMenu)
function CollectionMenu({
  group, isOpen, onOpen, onHover, onClose, onCancelPendingHover, onChoose
}: ICollectionMenuProps) {
  const submenuRef = useRef<HTMLDivElement>(null)
  const itemRef = useRef<HTMLDivElement>(null)
  const handleSubmenuKeyDown = useSubmenuCloseOnArrowLeft({ isOpen, submenuRef, triggerRef: itemRef, onClose })
  return (
    <>
      {isOpen &&
        <Menu isOpen={isOpen} placement="auto">
          <MenuButton as="div" className="collection-menu-button" aria-hidden="true" tabIndex={-1} />
          <MenuList ref={submenuRef} className="axis-legend-submenu" onKeyDown={handleSubmenuKeyDown}
                    onPointerEnter={onCancelPendingHover} data-testid="slider-attribute-submenu">
            {group.attrs.map(attr => (
              <MenuItem key={attr.id} onClick={() => onChoose(group.data, attr.id)}
                        data-testid="slider-attribute-option">
                {attributeLabel(attr)}
              </MenuItem>
            ))}
          </MenuList>
        </Menu>
      }
      <MenuItem ref={itemRef} as="div" className="collection-menu-item" closeOnSelect={false}
                data-collection-id={group.collection.id} data-testid="slider-attribute-collection"
                onClick={onOpen} onPointerOver={onHover} aria-haspopup="menu" aria-expanded={isOpen}>
        <span>{group.collection.name}</span>
        <RightArrow className="collection-menu-arrow" aria-hidden="true" />
      </MenuItem>
    </>
  )
}

interface IProps {
  sliderModel: ISliderModel
  onChooseAttribute: (dataSet: IDataSet, attrId: string) => void
  onRemoveAttribute: () => void
}

export const SliderAttributeMenu = observer(function SliderAttributeMenu({
  sliderModel, onChooseAttribute, onRemoveAttribute
}: IProps) {
  const containerRef = useDocumentContainerContext()
  const { attribute, hasAttribute } = sliderModel
  const [openCollectionId, setOpenCollectionId] = useState<string | null>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const groups: ICollectionGroup[] = getDataSets(sliderModel).flatMap(data => data.collections.map(collection => ({
    data, collection,
    attrs: collection.attributes.filter((attr): attr is IAttribute => !!attr && isSliderAttribute(attr))
  }))).filter(group => group.attrs.length > 0)

  const cancelPendingHover = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }, [])
  // the graph's short delay before switching submenus on hover
  const handleCollectionHover = useCallback((collectionId: string | null) => {
    cancelPendingHover()
    if (collectionId === openCollectionId) return
    hoverTimerRef.current = setTimeout(() => {
      setOpenCollectionId(collectionId)
      hoverTimerRef.current = null
    }, 150)
  }, [cancelPendingHover, openCollectionId])
  const openNow = useCallback((collectionId: string) => {
    cancelPendingHover()
    setOpenCollectionId(collectionId)
  }, [cancelPendingHover])
  const handleMainMenuKeyDown = useSubmenuOpenOnArrowRight("collection-id", openNow)
  // like the graph's axis label (axis-or-legend-attribute-menu.tsx): no hover look while an attribute is being
  // dragged, even when the pointer passes over the button (Mike)
  const isDragActive = !!useDndContext().active

  return (
    <Menu placement="bottom" isLazy onClose={() => { cancelPendingHover(); setOpenCollectionId(null) }}>
      {({ isOpen, onClose }) => {
        const choose = (dataSet: IDataSet, attrId: string) => {
          onChooseAttribute(dataSet, attrId)
          onClose()
        }
        return (
          <>
            <MenuButton className={clsx("slider-attribute-button",
                                        hasAttribute ? "slider-attribute-label" : "slider-attribute-prompt",
                                        { open: isOpen, "drag-active": isDragActive })}
                        // says what the menu is for, in the graph's words ("Choose horizontal axis attribute"),
                        // and keeps the visible label in the name (WCAG 2.4.6 / 2.5.3, ship-check #16). The empty
                        // prompt's own text already says it.
                        aria-label={hasAttribute ? `Choose slider attribute, ${attributeLabel(attribute)}` : undefined}
                        data-testid="slider-attribute-menu-button">
              <span className="prompt-content">
                <span>{hasAttribute ? attributeLabel(attribute) : "Drag an attribute or click here"}</span>
                {/* the graph's label caret (axis-utils.ts): hidden until hover/focus/selected tile */}
                <svg className="prompt-caret" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m12 15-5-5h10z" />
                </svg>
              </span>
            </MenuButton>
            <Portal containerRef={containerRef}>
              <MenuList className="axis-legend-menu" onKeyDown={handleMainMenuKeyDown}
                        data-testid="slider-attribute-menu">
                {groups.length === 1
                  ? groups[0].attrs.map(attr => (
                      <MenuItem key={attr.id} onClick={() => choose(groups[0].data, attr.id)}
                                data-testid="slider-attribute-option">
                        {attributeLabel(attr)}
                      </MenuItem>
                    ))
                  : groups.map(group => (
                      <CollectionMenu key={`${group.data.id}-${group.collection.id}`} group={group}
                                      isOpen={openCollectionId === group.collection.id}
                                      onOpen={() => openNow(group.collection.id)}
                                      onHover={() => handleCollectionHover(group.collection.id)}
                                      onClose={() => setOpenCollectionId(null)}
                                      onCancelPendingHover={cancelPendingHover}
                                      onChoose={choose} />
                    ))}
                {groups.length === 0 &&
                  <MenuItem isDisabled data-testid="slider-attribute-none">No numeric or date attributes</MenuItem>}
                {hasAttribute && <MenuDivider />}
                {hasAttribute &&
                  <MenuItem onClick={onRemoveAttribute} onPointerOver={() => handleCollectionHover(null)}
                            data-testid="slider-attribute-remove">
                    Remove {attributeLabel(attribute)}
                  </MenuItem>
                }
              </MenuList>
            </Portal>
          </>
        )
      }}
    </Menu>
  )
})
