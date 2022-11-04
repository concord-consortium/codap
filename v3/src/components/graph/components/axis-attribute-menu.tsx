import { Menu, MenuItem, MenuList, MenuButton, MenuDivider, useToast } from "@chakra-ui/react"
import React, { CSSProperties, useEffect, useState } from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { GraphPlace, graphPlaceToAttrPlace } from "../models/axis-model"
import { Bounds, useGraphLayoutContext } from "../models/graph-layout"
import { measureText } from "../../../hooks/use-measure-text"

import "./axis-attribute-menu"


interface IProps {
  attrId: string
  place: GraphPlace,
  onChangeAttribute: (place: string, attrid: string) => void
}

export const AxisAttributeMenu = ({ attrId, place, onChangeAttribute }: IProps ) => {
  const data = useDataSetContext()
  const attribute = data?.attrFromID(attrId)
  const attrList = data?.attributes.map(attr => {
    return { name: attr.name, id: attr.id }
  })
  const treatAs = attribute?.type === "numeric" ? "categorical" : "numeric"
  const layout = useGraphLayoutContext()
  const textLength = measureText(attribute?.name as string)
  const foundBounds = layout.getAxisBounds(place as any)
  const toast = useToast()

  const foundAxisWidth = layout.getAxisBounds(place as any)?.width
  console.log("1 FOUND AXIS WIDTH")

  const [menuButtonLeft, setMenuButtonLeft] = useState<CSSProperties>({ left: 0 })

  const handleTreatAs = () => {
    toast({
      title: `Treat attribute as`,
      description:`treat ${attribute?.name} as ${treatAs}`,
      status: 'success', duration: 5000, isClosable: true,
    })
  }

  useEffect(()=>{
    if (foundBounds){
      console.log("2 recalculating! foundWidth is: ", foundAxisWidth)
      const { margin } = layout
      const { width } = foundBounds as Bounds
      if (place === "left"){
        // for now, if width of axis is larger than 60, we have a different calculation
        console.log({width, margin})
        if (width < 60 ){
          setMenuButtonLeft({ left: -60 });
        }
      }
      else {
        const calc = (width * .5) - (textLength * .5) + margin.left - 5 //compensate for non-centered text?
        setMenuButtonLeft({left: calc })
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
          { attrList?.map((attr) => {
            return (
              <MenuItem onClick={() => onChangeAttribute(place, attr.id)} key={attr.id}>
                {attr.name}
              </MenuItem>
            )
          })}
          <MenuDivider />
          <MenuItem onClick={() => onChangeAttribute(place, "")}>Remove {attribute?.name}</MenuItem>
          <MenuItem onClick={() => handleTreatAs()}>Treat as {treatAs}</MenuItem>
        </MenuList>
      </Menu>
    </div>
  )
}
