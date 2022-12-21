import { Menu, MenuItem, MenuList, MenuButton, MenuDivider, position } from "@chakra-ui/react"
import React, { CSSProperties } from "react"
import t from "../../../../utilities/translation/translate"
import { useOverlayBounds } from "../../../../hooks/use-overlay-bounds"

interface IProps {
  target: SVGGElement | null
  portal: HTMLElement | null
}

const buttonStyles: CSSProperties = {
  position: "absolute",
  backgroundColor: "rgba(100, 220, 120, .8)" // temporary
}

export const LegendAttributeMenu = ({ target, portal }: IProps) => {
  const overlayBounds = useOverlayBounds({target, portal})
  return (
    <div className="legend-attribute-menu" style={{ ...overlayBounds, ...buttonStyles  }}></div>
  )
}
