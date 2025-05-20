import { Menu, MenuItem, MenuList, MenuButton, MenuDivider } from "@chakra-ui/react"
import React, {CSSProperties, useRef} from "react"
import { t } from "../../../utilities/translation/translate"
import {GraphPlace} from "../../axis-graph-shared"
import { graphPlaceToAttrRole } from "../../data-display/data-display-types"
import { useDataConfigurationContext } from "../../data-display/hooks/use-data-configuration-context"
import { useOutsidePointerDown } from "../../../hooks/use-outside-pointer-down"
import { useOverlayBounds } from "../../../hooks/use-overlay-bounds"
import { AttributeType } from "../../../models/data/attribute-types"
import { IDataSet } from "../../../models/data/data-set"
import {IUseDraggableAttribute, useDraggableAttribute} from "../../../hooks/use-drag-drop"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"

interface IProps {
  place: GraphPlace,
  target: SVGGElement | null
  portal: HTMLElement | null
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

export const AxisOrLegendAttributeMenu = ({ place, target, portal,
                                      onChangeAttribute, onRemoveAttribute, onTreatAttributeAs }: IProps) => {
  const dataConfiguration = useDataConfigurationContext()
  const metadata = dataConfiguration?.metadata
  const data = dataConfiguration?.dataset
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

  const draggableOptions: IUseDraggableAttribute = {
    prefix: instanceId, dataSet: data, attributeId: attrId
  }
  const { attributes, listeners, setNodeRef: setDragNodeRef } = useDraggableAttribute(draggableOptions)

  useOutsidePointerDown({
    ref: menuRef,
    handler: () => onCloseRef.current?.(),
    info: { name: "AxisOrLegendAttributeMenu", attrId, attrName: attribute?.name }
  })

  return (
    <div className={`axis-legend-attribute-menu ${place}`} ref={menuRef}>
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
                { data?.attributes?.filter(attr => !metadata?.isHidden(attr.id)).map((attr) => {
                  return (
                    <MenuItem onClick={() => onChangeAttribute(place, data, attr.id)} key={attr.id}>
                      {attr.name}
                    </MenuItem>
                  )
                })}
                { attribute &&
                  <>
                    <MenuDivider />
                    <MenuItem onClick={() => onRemoveAttribute(place, attrId)}>
                      {removeAttrItemLabel}
                    </MenuItem>
                    {attribute.type !== "color" &&
                      <MenuItem onClick={() => onTreatAttributeAs(place, attribute?.id, treatAs)}>
                        {treatAs === "categorical" && t("DG.DataDisplayMenu.treatAsCategorical")}
                        {treatAs === "numeric" && t("DG.DataDisplayMenu.treatAsNumeric")}
                        {treatAs === "date" && t("V3.DataDisplayMenu.treatAsDate")}
                      </MenuItem>
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
}
