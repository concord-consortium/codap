import { Menu, MenuItem, MenuList, MenuButton, MenuDivider } from "@chakra-ui/react"
import React, { CSSProperties, useLayoutEffect, useState } from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { AxisPlace, GraphPlace } from "../models/axis-model"
import { useGraphLayoutContext, Bounds} from "../models/graph-layout"
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
  const [buttonLeft, setButtonLeft] = useState<CSSProperties>({ left: 0 })

  const buttonStyles: CSSProperties = {
    position: "absolute",
    color: "transparent",
    background: "blue",
    opacity: 0.1,
    rotate: place === "left" ? "270deg" : "0deg",
    top: place === "left" ? (.5 * layout.plotHeight) - (.2 * textLength) : layout.plotHeight + 20
  }

  const calculateButtonLeft = (bounds: Bounds) => {
    const axisWidth = bounds.width
    if (place === "left") return { left: 0 - (.5 * axisWidth) }
    if (place === "bottom") return { left: (axisWidth * .5) - (textLength * .5) + margin.left - 5 }
  }

  useLayoutEffect(() => {
    setTimeout(()=>{
      const foundBounds = layout.getAxisBounds(place as AxisPlace)
      if (foundBounds){
        const newLeft = calculateButtonLeft(foundBounds)
        setButtonLeft(newLeft || { left: 0 })
      }
    }, 100)
  },[attrId])

  const compiledStyles = {...buttonStyles, ...buttonLeft }

  return (
    <div className="axis-attribute-menu">
      <Menu>
        <MenuButton style={{...compiledStyles }}>{attribute?.name}</MenuButton>
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
