import { Menu, MenuItem, MenuList, MenuButton, MenuDivider, position } from "@chakra-ui/react"
import React, { useRef, useState, CSSProperties } from "react"
import t from "../../../../utilities/translation/translate"
import { useOverlayBounds } from "../../../../hooks/use-overlay-bounds"
import { useOutsidePointerDown } from "../../../../hooks/use-outside-pointer-down"
import { useDataConfigurationContext } from "../../hooks/use-data-configuration-context"
import { useDataSetContext } from "../../../../hooks/use-data-set-context"

interface IProps {
  target: SVGGElement | null
  portal: HTMLElement | null
}

const buttonStyles: CSSProperties = {
  position: "absolute",
  backgroundColor: "rgba(100, 220, 120, .8)" // temporary
}

export const LegendAttributeMenu = ({ target, portal }: IProps) => {
  const data = useDataSetContext()
  const dataConfig = useDataConfigurationContext()
  const attrId = dataConfig?.attributeID("legend")
  const menu = useRef<HTMLDivElement>(null)
  const [menuIsOpen, setMenuIsOpen] = useState(false)

  const overlayBounds = useOverlayBounds({target, portal})

  const toggleMenu = () => {
    console.log("toggle the legend attr menu")
    setMenuIsOpen(!menuIsOpen)
  }

  useOutsidePointerDown({ref: menu, handler: () => setMenuIsOpen(false)})

  return (
    <div className="legend-attribute-menu">
      <Menu isOpen={menuIsOpen}>
        <MenuButton onClick={toggleMenu} style={{ ...overlayBounds, ...buttonStyles }}></MenuButton>
        <MenuList onClick={toggleMenu}>
          <MenuItem>foo</MenuItem>
          <MenuItem>Bar</MenuItem>
        </MenuList>
      </Menu>
    </div>
  )
}
