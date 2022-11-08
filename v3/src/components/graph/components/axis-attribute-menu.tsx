import { Menu, MenuItem, MenuList, MenuButton, MenuDivider } from "@chakra-ui/react"
import React, { CSSProperties } from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { GraphPlace } from "../models/axis-model"
import { useGraphLayoutContext} from "../models/graph-layout"
import t from "../../../utilities/translation/translate"
import { useOverlayBounds } from "../../../hooks/use-overlay-bounds"
import { useDataConfigurationContext } from "../hooks/use-data-configuration-context"

interface IProps {
  place: GraphPlace,
  target: SVGGElement | null
  portal: HTMLElement | null
  onChangeAttr: (place: GraphPlace, attrId: string) => void
  onTreatAttrAs: (place: GraphPlace, attrId: string, treatAs: string) => void
}

export const AxisAttributeMenu = ({ place, target, portal, onChangeAttr, onTreatAttrAs }: IProps ) => {
  const data = useDataSetContext()
  const dataConfig = useDataConfigurationContext()
  const { plotWidth, plotHeight, margin } = useGraphLayoutContext()
  const role = place === "left" ? "y" : "x"
  const attrId = dataConfig?.attributeID(role)
  const attribute = attrId ? data?.attrFromID(attrId) : null
  const treatAs = attribute?.type === "numeric" ? "categorical" : "numeric"
  const overlayBounds = useOverlayBounds({target, portal})
  const buttonStyles: CSSProperties = { position: "absolute", color: "transparent" }

  if (attrId === undefined && place === "bottom"){
    buttonStyles.top = plotHeight + 4
    buttonStyles.left = ( plotWidth * .5 ) - margin.right - 8 // ~ width of y scale
  }

  return (
    <div className="axis-attribute-menu">
      <Menu>
        <MenuButton style={{ ...overlayBounds, ...buttonStyles }}>{attribute?.name}</MenuButton>
        <MenuList>
          { data?.attributes?.map((attr) => {
            return (
              <MenuItem onClick={() => onChangeAttr(place, attr.id)} key={attr.id}>
                {attr.name}
              </MenuItem>
            )
          })}
          { attribute &&
            <>
              <MenuDivider />
              <MenuItem onClick={() => onChangeAttr(place, "")}>
                { place === "left" &&
                  t("DG.DataDisplayMenu.removeAttribute_y", {vars: [attribute?.name]})
                }
                { place === "bottom" &&
                  t("DG.DataDisplayMenu.removeAttribute_x", {vars: [attribute?.name]})
                }
              </MenuItem>
              <MenuItem onClick={() => onTreatAttrAs(place, attribute?.id, treatAs)}>
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
