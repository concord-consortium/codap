import { Menu, MenuItem, MenuList, MenuButton, MenuDivider } from "@chakra-ui/react"
import React, { CSSProperties, useRef } from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { attrRoleToAxisPlace, AxisPlace, axisPlaceToAttrRole, GraphPlace } from "../models/axis-model"
import { useGraphLayoutContext} from "../models/graph-layout"
import { measureText } from "../../../hooks/use-measure-text"
import t from "../../../utilities/translation/translate"
import { useOverlayBounds } from "../../../hooks/use-overlay-bounds"
import { useDataConfigurationContext } from "../hooks/use-data-configuration-context"

interface IProps {
  place: GraphPlace,
  target: SVGGElement | null
  portal: HTMLElement | null
}

export const AxisAttributeMenu = ({ place, target, portal }: IProps ) => {
  const data = useDataSetContext()
  const dataConfig = useDataConfigurationContext()
  const role = place === "left" ? "y" : "x"
  const attrId = dataConfig?.attributeID(role)
  const attribute = attrId ? data?.attrFromID(attrId) : null
  const treatAs = attribute?.type === "numeric" ? "categorical" : "numeric"
  const overlayBounds = useOverlayBounds({target, portal})

  const buttonStyles: CSSProperties = {
    background: "blue", opacity: 0.2,  //only for debugging during development
    position: "absolute",
    color: "transparent"
  }

  // TODO
  // 1 if no attr on axis yet, we need to manually position over the labels
  // 2 in above state, make menu not render stuff it shouldn't like "remove..."
  // 3 reimplement the functionality

  const style = { ...overlayBounds, ...buttonStyles }
  console.log({place, style})

  return (
    <div className="axis-attribute-menu">
      <Menu>
        <MenuButton style={style}>{attribute?.name}</MenuButton>
        <MenuList>
          { data?.attributes?.map((attr) => {
            return (
              <MenuItem onClick={() => console.log("change: ", place, attr.id)} key={attr.id}>
                {attr.name}
              </MenuItem>
            )
          })}
          <MenuDivider />
          <MenuItem onClick={() => console.log(place, "")}>
            { place === "left" &&
              t("DG.DataDisplayMenu.removeAttribute_y", { vars: [ attribute?.name ] })
            }
            { place === "bottom" &&
              t("DG.DataDisplayMenu.removeAttribute_x", { vars: [ attribute?.name ] })
            }
          </MenuItem>
          <MenuItem onClick={() => console.log(place, attrId, treatAs)}>
            {treatAs === "categorical" && t("DG.DataDisplayMenu.treatAsCategorical")}
            {treatAs === "numeric" && t("DG.DataDisplayMenu.treatAsNumeric")}
          </MenuItem>
        </MenuList>
      </Menu>
    </div>
  )
}



/*
import { Menu, MenuItem, MenuList, MenuButton, MenuDivider } from "@chakra-ui/react"
import React, { CSSProperties } from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { AxisPlace, GraphPlace } from "../models/axis-model"
import { useGraphLayoutContext} from "../models/graph-layout"
import { measureText } from "../../../hooks/use-measure-text"
import t from "../../../utilities/translation/translate"

interface IProps {
  attrId: string
  place: GraphPlace,
  onChangeAttr: (place: GraphPlace, attrId: string) => void
  onTreatAttrAs: (place: GraphPlace, attrId: string, treatAs: string) => void
}

export const AxisAttributeMenu = ({ attrId, place, onChangeAttr, onTreatAttrAs }: IProps ) => {
  const data = useDataSetContext()
  const attribute = data?.attrFromID(attrId)
  const treatAs = attribute?.type === "numeric" ? "categorical" : "numeric"
  const layout = useGraphLayoutContext()
  const { margin } = layout
  const textLength = measureText(attribute?.name || "")

  // TODO - replace with a more reliable calculation or way of placing button
  const calcLeft = () => {
    const bounds = layout.getAxisBounds(place as AxisPlace)
    if (!bounds) return 0
    return place === "left" ? -30 : (bounds.width * .5) - (textLength * .5) + margin.left - 5
  }

  const buttonStyles: CSSProperties = {
    border: "1px dashed blue",  //only for debugging during development
    opacity: 0.3,               //only for debugging during development
    position: "absolute",
    color: "transparent",
    rotate: place === "left" ? "270deg" : "0deg",
    top: place === "left" ? (.5 * layout.plotHeight) - (.2 * textLength) : layout.plotHeight + 20,
    left: calcLeft()
  }

  return (
    <div className="axis-attribute-menu">
      <Menu>
        <MenuButton style={{...buttonStyles }}>{attribute?.name}</MenuButton>
        <MenuList>
          { data?.attributes?.map((attr) => {
            return (
              <MenuItem onClick={() => onChangeAttr(place, attr.id)} key={attr.id}>
                {attr.name}
              </MenuItem>
            )
          })}
          <MenuDivider />
          <MenuItem onClick={() => onChangeAttr(place, "")}>
            { place === "left" &&
              t("DG.DataDisplayMenu.removeAttribute_y", { vars: [ attribute?.name ] })
            }
            { place === "bottom" &&
              t("DG.DataDisplayMenu.removeAttribute_x", { vars: [ attribute?.name ] })
            }
          </MenuItem>
          <MenuItem onClick={() => onTreatAttrAs(place, attrId, treatAs)}>
            {treatAs === "categorical" && t("DG.DataDisplayMenu.treatAsCategorical")}
            {treatAs === "numeric" && t("DG.DataDisplayMenu.treatAsNumeric")}
          </MenuItem>
        </MenuList>
      </Menu>
    </div>
  )
}

*/