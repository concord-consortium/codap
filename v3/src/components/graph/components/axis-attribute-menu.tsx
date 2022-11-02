import { Menu, MenuItem, MenuList, MenuButton, MenuDivider } from "@chakra-ui/react"
import React, { CSSProperties } from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { AxisPlace, GraphPlace } from "../models/axis-model"
import { useGraphLayoutContext} from "../models/graph-layout"
import { measureText } from "../../../hooks/use-measure-text"

import "./axis-attribute-menu"

interface IProps {
  attrId: string
  place: GraphPlace,
  onChangeAttribute: (place: string, attrid: string) => void
  onTreatAs: (place: string, attrid: string, treatAs: string) => void
}

export const AxisAttributeMenu = ({ attrId, place, onChangeAttribute, onTreatAs }: IProps ) => {
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
              <MenuItem onClick={() => onChangeAttribute(place, attr.id)} key={attr.id}>
                {attr.name}
              </MenuItem>
            )
          })}
          <MenuDivider />
          <MenuItem onClick={() => onChangeAttribute(place, "")}>Remove {attribute?.name}</MenuItem>
          <MenuItem onClick={() => onTreatAs(place, attrId, treatAs)}>Treat as {treatAs}</MenuItem>
        </MenuList>
      </Menu>
    </div>
  )
}
