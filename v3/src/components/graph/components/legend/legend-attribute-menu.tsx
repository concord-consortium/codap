import { Menu, MenuItem, MenuList, MenuButton, MenuDivider } from "@chakra-ui/react"
import React, { useRef, useState, CSSProperties, memo } from "react"
import t from "../../../../utilities/translation/translate"
import { useOverlayBounds } from "../../../../hooks/use-overlay-bounds"
import { useOutsidePointerDown } from "../../../../hooks/use-outside-pointer-down"
import { useDataConfigurationContext } from "../../hooks/use-data-configuration-context"
import { useDataSetContext } from "../../../../hooks/use-data-set-context"
import { GraphPlace } from "../../graphing-types"

interface IProps {
  target: SVGGElement | null
  portal: HTMLElement | null
  onChangeAttribute: (place: GraphPlace, attrId: string) => void
  onTreatAttributeAs: (place: GraphPlace, attrId: string, treatAs: string) => void
}

const buttonStyles: CSSProperties = {
  position: "absolute",
  color: "transparent"
}

const _LegendAttributeMenu = ({ target, portal, onChangeAttribute, onTreatAttributeAs }: IProps) => {
  const data = useDataSetContext()
  const dataConfig = useDataConfigurationContext()
  const attrId = dataConfig?.attributeID("legend")
  const attribute = attrId ? data?.attrFromID(attrId) : null
  const treatAs = dataConfig?.attributeType("legend") === "numeric" ? "categorical" : "numeric"
  const menu = useRef<HTMLDivElement>(null)
  const [menuIsOpen, setMenuIsOpen] = useState(false)
  const overlayBounds = useOverlayBounds({target, portal})

  const toggleMenu = () => {
    setMenuIsOpen(!menuIsOpen)
  }

  useOutsidePointerDown({ref: menu, handler: () => setMenuIsOpen(false)})

  return (
    <div className="legend-attribute-menu" ref={menu}>
      <Menu isOpen={menuIsOpen}>
        <MenuButton onClick={toggleMenu} style={{ ...overlayBounds, ...buttonStyles }}>
          {/* this attribute name is invisible but might be needed for A11y ? */}
          {attribute?.name}
        </MenuButton>
        <MenuList onClick={()=> setMenuIsOpen(false)} >
          { data?.attributes?.map((attr) => {
              return (
                <MenuItem onClick={() => onChangeAttribute("legend", attr.id)} key={attr.id}>
                  {attr.name}
                </MenuItem>
              )
            })
          }
          { attribute &&
            <>
              <MenuDivider />
              <MenuItem>
                {t("DG.DataDisplayMenu.removeAttribute_legend", {vars: [attribute?.name]})}
              </MenuItem>
              <MenuItem onClick={() => onTreatAttributeAs("legend", attribute?.id, treatAs)}>
                {treatAs === "categorical" && t("DG.DataDisplayMenu.treatAsCategorical")}
                {treatAs === "numeric" && t("DG.DataDisplayMenu.treatAsNumeric")}
              </MenuItem>
            </>
          }
        </MenuList>
      </Menu>
    </div>
  )
}
export const LegendAttributeMenu = memo(_LegendAttributeMenu)
