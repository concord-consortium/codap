import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { Menu, MenuItem, MenuList, MenuButton, MenuDivider, Portal } from "@chakra-ui/react"
import React, { CSSProperties, useRef, useState } from "react"
import { IUseDraggableAttribute, useDraggableAttribute } from "../../../hooks/use-drag-drop"
import { useInstanceIdContext } from "../../../hooks/use-instance-id-context"
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
  isOpen: boolean
  onChangeAttribute: (place: GraphPlace, dataSet: IDataSet, attrId: string) => void
  onPointerOver?: React.PointerEventHandler<HTMLButtonElement>
  place: GraphPlace
}
const CollectionMenu = observer(function CollectionMenu({
  collectionInfo, isOpen, onChangeAttribute, onPointerOver, place
}: ICollectionMenuProps) {
  const { collection } = collectionInfo
  return (
    <>
      <Menu isOpen={isOpen} placement="right-start">
        <MenuButton as="div" className="collection-menu-button" />
        <MenuList>
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
}
export const AxisOrLegendAttributeMenu = observer(function AxisOrLegendAttributeMenu({
  place, target, portal, layoutBounds, onChangeAttribute, onRemoveAttribute, onTreatAttributeAs
}: IProps) {
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
  const attrId = dataConfiguration?.attributeID(role) || ''
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
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const onCloseMenuRef = useRef<() => void>()
  const [openCollectionId, setOpenCollectionId] = React.useState<string | null>(null)

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
              isOpen={openCollectionId === collection.id}
              key={collection.id}
              onChangeAttribute={handleChangeAttribute}
              onPointerOver={() => setOpenCollectionId(collection.id)}
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
              <Portal>
                <MenuList data-testid={`axis-legend-attribute-menu-list-${place}`}>
                  {renderMenuItems()}
                  { attribute &&
                    <>
                      <MenuDivider />
                      <MenuItem
                        onClick={() => onRemoveAttribute(place, attrId)}
                        onPointerOver={() => setOpenCollectionId(null)}
                      >
                        {removeAttrItemLabel}
                      </MenuItem>
                      {attribute.type !== "color" &&
                        <MenuItem
                          onClick={() => onTreatAttributeAs(place, attribute?.id, treatAs)}
                          onPointerOver={() => setOpenCollectionId(null)}
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
