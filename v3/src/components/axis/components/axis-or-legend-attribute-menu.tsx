import { Menu, MenuItem, MenuList, MenuButton, MenuDivider } from "@chakra-ui/react"
import React, {CSSProperties, useRef, memo} from "react"
import t from "../../../utilities/translation/translate"
import {GraphPlace} from "../../axis-graph-shared"
import { graphPlaceToAttrRole } from "../../graph/graphing-types"
import { useDataConfigurationContext } from "../../graph/hooks/use-data-configuration-context"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { useOutsidePointerDown } from "../../../hooks/use-outside-pointer-down"
import { useOverlayBounds } from "../../../hooks/use-overlay-bounds"
import { AttributeType } from "../../../models/data/attribute"
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

const _AxisOrLegendAttributeMenu = ({ place, target, portal,
                                      onChangeAttribute, onRemoveAttribute, onTreatAttributeAs }: IProps) => {
  const data = useDataSetContext()
  const dataConfig = useDataConfigurationContext()
  const role = graphPlaceToAttrRole[place]
  const attrId = dataConfig?.attributeID(role) || ''
  const instanceId = useInstanceIdContext()
  const attribute = attrId ? data?.attrFromID(attrId) : null
  const removeAttrItemLabel = t(removeAttrItemLabelKeys[role], {vars: [attribute?.name]})
  const treatAs = dataConfig?.attributeType(role) === "numeric" ? "categorical" : "numeric"
  const overlayStyle: CSSProperties = { position: "absolute", ...useOverlayBounds({target, portal}) }
  const buttonStyle: CSSProperties = { position: "absolute", width: "100%", height: "100%", color: "transparent" }
  const menuRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef<() => void>()

  const draggableOptions: IUseDraggableAttribute = {
    prefix: instanceId, dataSet: data, attributeId: attrId
  }
  const { attributes, listeners, setNodeRef: setDragNodeRef } = useDraggableAttribute(draggableOptions)

  useOutsidePointerDown({ref: menuRef, handler: () => onCloseRef.current?.()})

  return (
    <div className={`axis-legend-attribute-menu ${place}`} ref={menuRef}>
      <Menu>
        {({ onClose }) => {
          onCloseRef.current = onClose
          return (
            <div className="codap-graph-attribute-label" ref={setDragNodeRef}
                style={overlayStyle} {...attributes} {...listeners}>
              <MenuButton style={buttonStyle}>{attribute?.name}</MenuButton>
              <MenuList>
                { data?.attributes?.map((attr) => {
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
                    <MenuItem onClick={() => onTreatAttributeAs(place, attribute?.id, treatAs)}>
                      {treatAs === "categorical" && t("DG.DataDisplayMenu.treatAsCategorical")}
                      {treatAs === "numeric" && t("DG.DataDisplayMenu.treatAsNumeric")}
                    </MenuItem>
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
export const AxisOrLegendAttributeMenu = memo(_AxisOrLegendAttributeMenu)
