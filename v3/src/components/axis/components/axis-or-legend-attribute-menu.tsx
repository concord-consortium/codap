import { Menu, MenuItem, MenuList, MenuButton, MenuDivider } from "@chakra-ui/react"
import React, { CSSProperties, useRef, memo } from "react"
import { GraphPlace, graphPlaceToAttrRole } from "../../graph/graphing-types"
import { useDataConfigurationContext } from "../../graph/hooks/use-data-configuration-context"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { useOutsidePointerDown } from "../../../hooks/use-outside-pointer-down"
import { useOverlayBounds } from "../../../hooks/use-overlay-bounds"
import t from "../../../utilities/translation/translate"

interface IProps {
  place: GraphPlace,
  target: SVGGElement | null
  portal: HTMLElement | null
  onChangeAttribute: (place: GraphPlace, attrId: string) => void
  onRemoveAttribute: (place: GraphPlace, attrId: string) => void
  onTreatAttributeAs: (place: GraphPlace, attrId: string, treatAs: string) => void
}

const removeAttrItemLabelKeys: Record<string, string> = {
  "x": "DG.DataDisplayMenu.removeAttribute_x",
  "y": "DG.DataDisplayMenu.removeAttribute_y",
  "y2": "DG.DataDisplayMenu.removeAttribute_y2",
  "legend": "DG.DataDisplayMenu.removeAttribute_legend"
}

const _AxisOrLegendAttributeMenu = ({ place, target, portal,
                                      onChangeAttribute, onRemoveAttribute, onTreatAttributeAs }: IProps) => {
  const data = useDataSetContext()
  const dataConfig = useDataConfigurationContext()
  const role = graphPlaceToAttrRole[place]
  const attrId = dataConfig?.attributeID(role)
  const attribute = attrId ? data?.attrFromID(attrId) : null
  const removeAttrItemLabel = t(removeAttrItemLabelKeys[role], {vars: [attribute?.name]})
  const treatAs = dataConfig?.attributeType(role) === "numeric" ? "categorical" : "numeric"
  const overlayBounds = useOverlayBounds({target, portal})
  const buttonStyles: CSSProperties = { position: "absolute", color: "transparent" }
  const menuRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef<() => void>()

  useOutsidePointerDown({ref: menuRef, handler: () => onCloseRef.current?.()})

  return (
    <div className="axis-legend-attribute-menu" ref={menuRef}>
      <Menu>
        {({ isOpen, onClose }) => {
          onCloseRef.current = onClose
          return (
            <>
              <MenuButton style={{ ...overlayBounds, ...buttonStyles }}>{attribute?.name}</MenuButton>
              <MenuList>
                { data?.attributes?.map((attr) => {
                  return (
                    <MenuItem onClick={() => onChangeAttribute(place, attr.id)} key={attr.id}>
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
            </>
          )
        }}
      </Menu>
    </div>
  )
}
export const AxisOrLegendAttributeMenu = memo(_AxisOrLegendAttributeMenu)
