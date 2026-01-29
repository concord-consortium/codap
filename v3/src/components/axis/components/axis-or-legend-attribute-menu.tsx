import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { Menu, MenuItem, MenuList, MenuButton, MenuDivider, Portal } from "@chakra-ui/react"
import React, { CSSProperties, useCallback, useRef, useState } from "react"
import { useDocumentContainerContext } from "../../../hooks/use-document-container-context"
import { useFreeTileLayoutContext } from "../../../hooks/use-free-tile-layout-context"
import { IUseDraggableAttribute, useDraggableAttribute } from "../../../hooks/use-drag-drop"
import { useInstanceIdContext } from "../../../hooks/use-instance-id-context"
import { useMenuHeightAdjustment } from "../../../hooks/use-menu-height-adjustment"
import { useOutsidePointerDown } from "../../../hooks/use-outside-pointer-down"
import { useOverlayBounds } from "../../../hooks/use-overlay-bounds"
import { AttributeType } from "../../../models/data/attribute-types"
import { ICollectionModel, isCollectionModel } from "../../../models/data/collection"
import { IDataSet } from "../../../models/data/data-set"
import { IDataSetMetadata } from "../../../models/shared/data-set-metadata"
import { getDataSets, getMetadataFromDataSet } from "../../../models/shared/shared-data-utils"
import { t } from "../../../utilities/translation/translate"
import { GraphPlace } from "../../axis-graph-shared"
import { graphPlaceToAttrRole } from "../../data-display/data-display-types"
import { useDataConfigurationContext } from "../../data-display/hooks/use-data-configuration-context"

import RightArrow from "../../../assets/icons/arrow-right.svg"

import "./axis-or-legend-attribute-menu.scss"

interface ICollectionInfo {
  collection: ICollectionModel
  data: IDataSet
  metadata?: IDataSetMetadata
}

// MenuItems for all attributes in a single collection
interface IMenuItemsForCollectionProps {
  collectionInfo: ICollectionInfo
  onChangeAttribute: (place: GraphPlace, dataSet: IDataSet, attrId: string) => void
  place: GraphPlace
}
function MenuItemsForCollection({ collectionInfo, onChangeAttribute, place }: IMenuItemsForCollectionProps) {
  const { collection, data, metadata } = collectionInfo
  const attrs = collection.attributes.filter(attr => !!attr)
  return attrs.filter(attr => !metadata?.isHidden(attr.id)).map((attr) => {
    return (
      <MenuItem onClick={() => onChangeAttribute(place, data, attr.id)} key={attr.id}>
        {attr.name}
      </MenuItem>
    )
  })
}

// A MenuItem for a collection, which contains a submenu of the collection's attributes
interface ICollectionMenuProps {
  collectionInfo: ICollectionInfo
  containerRef: React.RefObject<HTMLDivElement | null>
  isOpen: boolean
  maxMenuHeight: string
  onCancelPendingHover?: () => void
  onChangeAttribute: (place: GraphPlace, dataSet: IDataSet, attrId: string) => void
  onPointerOver?: React.PointerEventHandler<HTMLButtonElement>
  place: GraphPlace
}
const CollectionMenu = observer(function CollectionMenu({
  collectionInfo, containerRef, isOpen, maxMenuHeight, onCancelPendingHover,
  onChangeAttribute, onPointerOver, place
}: ICollectionMenuProps) {
  const { collection } = collectionInfo
  const submenuRef = useRef<HTMLDivElement>(null)
  const adjustedMaxHeight = useMenuHeightAdjustment({ menuRef: submenuRef, containerRef, isOpen })

  const handleSubmenuPointerEnter = () => {
    onCancelPendingHover?.()
  }

  return (
    <>
      <Menu isOpen={isOpen} placement="auto">
        <MenuButton as="div" className="collection-menu-button" />
        <MenuList ref={submenuRef} className="axis-legend-submenu"
                  maxH={adjustedMaxHeight ?? maxMenuHeight} overflowY="auto"
                  onPointerEnter={handleSubmenuPointerEnter}
                  data-testid={`axis-legend-attribute-menu-list-${place}-${collection.id}`}>
          <MenuItemsForCollection
            collectionInfo={collectionInfo}
            onChangeAttribute={onChangeAttribute}
            place={place}
          />
        </MenuList>
      </Menu>
      <MenuItem
        as="div"
        className="collection-menu-item"
        closeOnSelect={false}
        key={collection.id}
        onClick={onPointerOver}
        onPointerOver={onPointerOver}
      >
        <span>{collection.name}</span>
        <RightArrow className="collection-menu-arrow" />
      </MenuItem>
    </>
  )
})

const removeAttrItemLabelKeys: Record<string, string> = {
  "x": "DG.DataDisplayMenu.removeAttribute_x",
  "y": "DG.DataDisplayMenu.removeAttribute_y",
  "rightNumeric": "DG.DataDisplayMenu.removeAttribute_y2",
  "legend": "DG.DataDisplayMenu.removeAttribute_legend",
  "topSplit": "DG.DataDisplayMenu.removeAttribute_top",
  "rightSplit": "DG.DataDisplayMenu.removeAttribute_right"
}

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
  const maxMenuHeight = `min(${layout?.height ?? 300}px, 50vh)`
  const dataConfiguration = useDataConfigurationContext()
  const dataSet = dataConfiguration?.dataset
  const dataSets = dataConfiguration ? getDataSets(dataConfiguration) : []
  const allCollectionInfo: (ICollectionInfo|"divider")[] = []
  dataSets.forEach((data, index) => {
    const metadata = getMetadataFromDataSet(data)
    data.collections.forEach(collection => {
      if (isCollectionModel(collection)) {
        allCollectionInfo.push({ collection, data, metadata })
      }
    })
    if (index < dataSets.length - 1) {
      allCollectionInfo.push("divider")
    }
  })
  const role = graphPlaceToAttrRole[place]
  const attrId = attrIdOverride || dataConfiguration?.attributeID(role) || ''
  const instanceId = useInstanceIdContext()
  const attribute = attrId ? dataSet?.attrFromID(attrId) : null
  const nativeType = attribute?.type || ''
  const removeAttrItemLabel = t(removeAttrItemLabelKeys[role], {vars: [attribute?.name]})
  const attrType = dataConfiguration?.attributeType(role) || ''
  const treatAs = (nativeType === 'date' && attrType === 'categorical') ? 'date'
    : ['numeric', 'date'].includes(attrType) ? "categorical" : "numeric"
  const overlayStyle: CSSProperties = { position: "absolute", ...useOverlayBounds({target, portal}) }
  const buttonStyle: CSSProperties = { position: "absolute", width: "100%", height: "100%", color: "transparent" }
  const menuRef = useRef<HTMLDivElement>(null)
  const mainMenuListRef = useRef<HTMLDivElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const onCloseMenuRef = useRef<() => void>()
  const [openCollectionId, setOpenCollectionId] = React.useState<string | null>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const adjustedMainMenuHeight = useMenuHeightAdjustment({
    menuRef: mainMenuListRef, containerRef, isOpen: isMenuOpen
  })

  // Delayed submenu switching to prevent accidental switches when moving to a submenu
  // that appears above/below the trigger item
  const handleCollectionHover = useCallback((collectionId: string | null) => {
    // Clear any pending timer
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }

    // If hovering over the already-open collection, no delay needed
    if (collectionId === openCollectionId) return

    // Add a short delay before switching submenus
    hoverTimerRef.current = setTimeout(() => {
      setOpenCollectionId(collectionId)
      hoverTimerRef.current = null
    }, 150)
  }, [openCollectionId])

  // Cancel any pending hover timer (called when mouse enters the open submenu)
  const cancelPendingHover = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }, [])

  const draggableOptions: IUseDraggableAttribute = {
    prefix: instanceId, dataSet, attributeId: attrId, disabled: !!openCollectionId || isMenuOpen
  }
  const { attributes, listeners, setNodeRef: setDragNodeRef } = useDraggableAttribute(draggableOptions)

  function handleOpenMenu() {
    setOpenCollectionId(null)
    setIsMenuOpen(true)
  }

  function handleCloseMenu() {
    setOpenCollectionId(null)
    onCloseMenuRef.current?.()
    setIsMenuOpen(false)
  }

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

  const handleChangeAttribute = (_place: GraphPlace, data: IDataSet, _attrId: string) => {
    onChangeAttribute(_place, data, _attrId)
    handleCloseMenu()
  }

  const renderMenuItems = () => {
    if (allCollectionInfo.length === 1 && allCollectionInfo[0] !== "divider") {
      return (
        <MenuItemsForCollection
          collectionInfo={allCollectionInfo[0]}
          onChangeAttribute={handleChangeAttribute}
          place={place}
        />
      )
    } else {
      let dividerCount = 0
      return allCollectionInfo.map(collectionInfo => {
        if (collectionInfo === "divider") {
          return <MenuDivider key={`divider-${dividerCount++}`} />
        } else {
          const { collection } = collectionInfo
          return (
            <CollectionMenu
              collectionInfo={collectionInfo}
              containerRef={containerRef}
              isOpen={openCollectionId === collection.id}
              key={collection.id}
              maxMenuHeight={maxMenuHeight}
              onCancelPendingHover={cancelPendingHover}
              onChangeAttribute={handleChangeAttribute}
              onPointerOver={() => handleCollectionHover(collection.id)}
              place={place}
            />
          )
        }
      })
    }
  }

  return (
    <div className={clsx("axis-legend-attribute-menu", place)} ref={menuRef} title={description + clickLabel}>
      <Menu placement="auto" onOpen={handleOpenMenu}>
        {({ isOpen, onClose }) => {
          if (isOpen !== isMenuOpen) {
            setIsMenuOpen(isOpen)
          }
          onCloseMenuRef.current = onClose
          return (
            <div className="attribute-label-menu" ref={setDragNodeRef}
                style={overlayStyle} {...attributes} {...listeners}
                data-testid={`attribute-label-menu-${place}`}>
              <MenuButton style={buttonStyle} data-testid={`axis-legend-attribute-button-${place}`}>
                {attribute?.name}
              </MenuButton>
              <Portal containerRef={containerRef}>
                <MenuList ref={mainMenuListRef} className="axis-legend-menu"
                          maxH={adjustedMainMenuHeight ?? maxMenuHeight} overflowY="auto"
                          data-testid={`axis-legend-attribute-menu-list-${place}`}>
                  {renderMenuItems()}
                  { attribute &&
                    <>
                      <MenuDivider />
                      <MenuItem
                        onClick={() => onRemoveAttribute(place, attrId)}
                        onPointerOver={() => handleCollectionHover(null)}
                      >
                        {removeAttrItemLabel}
                      </MenuItem>
                      {attribute.type !== "color" &&
                        <MenuItem
                          onClick={() => onTreatAttributeAs(place, attribute?.id, treatAs)}
                          onPointerOver={() => handleCollectionHover(null)}
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
