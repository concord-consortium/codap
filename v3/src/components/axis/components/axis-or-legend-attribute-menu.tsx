import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { Menu, MenuItem, MenuList, MenuButton, MenuDivider } from "@chakra-ui/react"
import React, {CSSProperties, useRef} from "react"
import {IUseDraggableAttribute, useDraggableAttribute} from "../../../hooks/use-drag-drop"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import { useOutsidePointerDown } from "../../../hooks/use-outside-pointer-down"
import { useOverlayBounds } from "../../../hooks/use-overlay-bounds"
import { AttributeType } from "../../../models/data/attribute-types"
import { ICollectionModel } from "../../../models/data/collection"
import { IDataSet } from "../../../models/data/data-set"
import { IDataSetMetadata } from "../../../models/shared/data-set-metadata"
import { t } from "../../../utilities/translation/translate"
import {GraphPlace} from "../../axis-graph-shared"
import { graphPlaceToAttrRole } from "../../data-display/data-display-types"
import { useDataConfigurationContext } from "../../data-display/hooks/use-data-configuration-context"

import "./axis-or-legend-attribute-menu.scss"

interface IMenuItemsForCollectionProps {
  collection: ICollectionModel
  data: IDataSet
  metadata?: IDataSetMetadata
  onChangeAttribute: (place: GraphPlace, dataSet: IDataSet, attrId: string) => void
  place: GraphPlace
}
function MenuItemsForCollection({
  collection, data, metadata, onChangeAttribute, place
}: IMenuItemsForCollectionProps) {
  const attrs = collection.attributes.filter(attr => !!attr)
  return attrs.filter(attr => !metadata?.isHidden(attr.id)).map((attr) => {
    return (
      <MenuItem onClick={() => onChangeAttribute(place, data, attr.id)} key={attr.id}>
        {attr.name}
      </MenuItem>
    )
  })
}

interface ICollectionMenuProps {
  collection: ICollectionModel
  data: IDataSet
  isOpen: boolean
  metadata?: IDataSetMetadata
  onChangeAttribute: (place: GraphPlace, dataSet: IDataSet, attrId: string) => void
  onPointerOver?: React.PointerEventHandler<HTMLButtonElement>
  place: GraphPlace
}

const CollectionMenu = observer(function CollectionMenu({
  collection, data, isOpen, metadata, onChangeAttribute, onPointerOver, place
}: ICollectionMenuProps) {
  return (
    <MenuItem key={collection.id} onPointerOver={onPointerOver}>
      {collection.name}
      <Menu isOpen={isOpen}>
        <MenuList>
          <MenuItemsForCollection
            collection={collection}
            data={data}
            metadata={metadata}
            onChangeAttribute={onChangeAttribute}
            place={place}
          />
        </MenuList>
      </Menu>
    </MenuItem>
  )
})

interface IProps {
  place: GraphPlace,
  target: SVGGElement | null
  portal: HTMLElement | null
  layoutBounds: string  // Used to signal need to re-render because layout has changed
  onChangeAttribute: (place: GraphPlace, dataSet: IDataSet, attrId: string) => void
  onRemoveAttribute: (place: GraphPlace, attrId: string) => void
  onTreatAttributeAs: (place: GraphPlace, attrId: string, treatAs: AttributeType) => void
}

const removeAttrItemLabelKeys: Record<string, string> = {
  "x": "DG.DataDisplayMenu.removeAttribute_x",
  "y": "DG.DataDisplayMenu.removeAttribute_y",
  "rightNumeric": "DG.DataDisplayMenu.removeAttribute_y2",
  "legend": "DG.DataDisplayMenu.removeAttribute_legend",
  "topSplit": "DG.DataDisplayMenu.removeAttribute_top",
  "rightSplit": "DG.DataDisplayMenu.removeAttribute_right"
}

export const AxisOrLegendAttributeMenu = observer(function AxisOrLegendAttributeMenu({
  place, target, portal, layoutBounds, onChangeAttribute, onRemoveAttribute, onTreatAttributeAs
}: IProps) {
  const dataConfiguration = useDataConfigurationContext()
  const metadata = dataConfiguration?.metadata
  const data = dataConfiguration?.dataset
  const collections = data?.collections || []
  const role = graphPlaceToAttrRole[place]
  const attrId = dataConfiguration?.attributeID(role) || ''
  const instanceId = useInstanceIdContext()
  const attribute = attrId ? data?.attrFromID(attrId) : null
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
    prefix: instanceId, dataSet: data, attributeId: attrId
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

  const renderMenuItems = () => {
    if (!data) return null

    if (collections.length === 1) {
      return (
        <MenuItemsForCollection
          collection={collections[0]}
          data={data}
          metadata={metadata}
          onChangeAttribute={onChangeAttribute}
          place={place}
        />
      )
    } else {
      return collections.map(collection => (
        <CollectionMenu
          collection={collection}
          data={data}
          isOpen={openCollectionId === collection.id}
          key={collection.id}
          metadata={metadata}
          onChangeAttribute={onChangeAttribute}
          onPointerOver={() => setOpenCollectionId(collection.id)}
          place={place}
        />
      ))
    }
  }

  return (
    <div className={clsx("axis-legend-attribute-menu", place)} ref={menuRef} title={description + clickLabel}>
      <Menu boundary="scrollParent">
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
