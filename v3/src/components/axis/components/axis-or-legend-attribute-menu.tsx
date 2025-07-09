import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { Menu, MenuItem, MenuList, MenuButton, MenuDivider } from "@chakra-ui/react"
import React, { CSSProperties, useRef } from "react"
import { IUseDraggableAttribute, useDraggableAttribute } from "../../../hooks/use-drag-drop"
import { useInstanceIdContext } from "../../../hooks/use-instance-id-context"
import { useOutsidePointerDown } from "../../../hooks/use-outside-pointer-down"
import { useOverlayBounds } from "../../../hooks/use-overlay-bounds"
import { AttributeType } from "../../../models/data/attribute-types"
import { ICollectionModel, isCollectionModel } from "../../../models/data/collection"
import { gDataBroker } from "../../../models/data/data-broker"
import { IDataSet } from "../../../models/data/data-set"
import { IDataSetMetadata } from "../../../models/shared/data-set-metadata"
import { getMetadataFromDataSet } from "../../../models/shared/shared-data-utils"
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
        <RightArrow />
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
  const dataSets = Array.from(gDataBroker.dataSets.values())
  const allCollectionInfo: ICollectionInfo[] = []
  dataSets.forEach(data => {
    const metadata = getMetadataFromDataSet(data)
    data.collections.forEach(collection => {
      if (isCollectionModel(collection)) {
        allCollectionInfo.push({ collection, data, metadata })
      }
    })
  })
  const dataConfiguration = useDataConfigurationContext()
  const dataSet = dataConfiguration?.dataset
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
  const onCloseRef = useRef<() => void>()
  const [openCollectionId, setOpenCollectionId] = React.useState<string | null>(null)

  const draggableOptions: IUseDraggableAttribute = {
    prefix: instanceId, dataSet, attributeId: attrId
  }
  const { attributes, listeners, setNodeRef: setDragNodeRef } = useDraggableAttribute(draggableOptions)

  useOutsidePointerDown({
    ref: menuRef,
    handler: () => {
      setOpenCollectionId(null)
      onCloseRef.current?.()
    },
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
    onCloseRef.current?.()
  }

  const renderMenuItems = () => {
    if (allCollectionInfo.length === 1) {
      return (
        <MenuItemsForCollection
          collectionInfo={allCollectionInfo[0]}
          onChangeAttribute={handleChangeAttribute}
          place={place}
        />
      )
    } else {
      return allCollectionInfo.map(collectionInfo => {
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
      })
    }
  }

  return (
    <div className={clsx("axis-legend-attribute-menu", place)} ref={menuRef} title={description + clickLabel}>
      <Menu boundary="scrollParent" onOpen={() => setOpenCollectionId(null)}>
        {({ onClose }) => {
          onCloseRef.current = onClose
          return (
            <div className="attribute-label-menu" ref={setDragNodeRef}
                style={overlayStyle} {...attributes} {...listeners}
                data-testid={`attribute-label-menu-${place}`}>
              <MenuButton style={buttonStyle} data-testid={`axis-legend-attribute-button-${place}`}>
                {attribute?.name}
              </MenuButton>
              <MenuList>
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
                    { /** We add a spacer to prevent a ChakraUI problem whereby the bottom item disappears **/
                      place === 'bottom' && <MenuItem onPointerOver={() => setOpenCollectionId(null)}>&nbsp;</MenuItem>
                    }
                  </>
                }
              </MenuList>
            </div>
          )
        }}
      </Menu>
    </div>
  )
})
