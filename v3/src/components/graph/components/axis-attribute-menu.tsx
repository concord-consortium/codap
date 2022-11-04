import { Menu, MenuItem, MenuList, MenuButton, MenuDivider, useToast } from "@chakra-ui/react"
import React, { CSSProperties, useEffect, useState } from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { GraphPlace } from "../models/axis-model"
import { Bounds, useGraphLayoutContext } from "../models/graph-layout"
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
  const textLength = measureText(attribute?.name as string)
  const foundBounds = layout.getAxisBounds(place as any)
  const axisWidth = foundBounds ? foundBounds.width : 0
  const [menuButtonLeft, setMenuButtonLeft] = useState<CSSProperties>({ left: 0 })

  useEffect(()=>{
    if (foundBounds){
      if (place === "left"){
        const lCalc = axisWidth < 60 ? -1 * axisWidth : 0
        setMenuButtonLeft({ left: lCalc })
        console.log("I have axisWidth: ", axisWidth, " setting menuButtonLeft to:  ", lCalc)
      }
      else {
        const bCalc = (axisWidth * .5) - (textLength * .5) + margin.left - 5 //compensate for non-centered text?
        setMenuButtonLeft({ left: bCalc })
      }
    }
  }, [attrId])

  const menuButtonStyles: CSSProperties = {
    position: "absolute",
    color: "transparent",
    rotate: place === "left" ? "270deg" : "0deg",
    top: place === "left" ? (.5 * layout.plotHeight) - (.2 * textLength) : layout.plotHeight + 20,
    opacity:.2,
    background: "blue"
  }

  return (
    <div className="axis-attribute-menu">
      <Menu>
        <MenuButton style={{...menuButtonStyles, ...menuButtonLeft}}>{attribute?.name}</MenuButton>
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
