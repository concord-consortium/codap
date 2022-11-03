import { Menu, MenuItem, MenuList, MenuButton, MenuDivider, useToast, forwardRef } from "@chakra-ui/react"
import React, { CSSProperties } from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { attrRoleToAxisPlace, axisPlaceToAttrRole, GraphPlace, graphPlaceToAttrPlace } from "../models/axis-model"
import { IGraphModel } from "../models/graph-model"
import { useGraphLayoutContext } from "../models/graph-layout"
import { usePlotResponders } from "../hooks/graph-hooks"
import { measureText } from "../../../hooks/use-measure-text"

import "./axis-attribute-menu"

interface IProps {
  attrId: string
  place: GraphPlace,
  graphModel: IGraphModel
}

export const AxisAttributeMenu = ({ attrId, place, graphModel }: IProps ) => {
  const data = useDataSetContext()
  const attribute = data?.attrFromID(attrId)
  const attrList = data?.attributes.map(attr => {
    return { name: attr.name, id: attr.id }
  })
  const treatAs = attribute?.type === "numeric" ? "categorical" : "numeric"
  const layout = useGraphLayoutContext()
  //console.log("calc with layout: ", {layout})
  const textLength = measureText(attribute?.name as string)
  const h = layout.plotHeight
  const toast = useToast()

  const handleSelectAttribute = (newAttrId: string) => {
    graphModel.setAttributeID(graphPlaceToAttrPlace(place), newAttrId)
  }

  const handleRemoveAttribute = () => {
    toast({
      title: `Remove attribute`,
      description: `remove ${attribute?.name} from ${place}`,
      status: 'success', duration: 5000, isClosable: true,
    })
    graphModel.setAttributeID(graphPlaceToAttrPlace(place), "")
  }

  const handleTreatAs = () => {
    toast({
      title: `Treat attribute as`,
      description:`treat ${attribute?.name} as ${treatAs}`,
      status: 'success', duration: 5000, isClosable: true,
    })
  }

  // proof-of-concept: position chakra menu button over existing axis title
  // there may be a better way to do this using existing bounds
  const menuButtonStyles: CSSProperties = {
    position: "absolute",
    color: "transparent",
    rotate: place === "left" ? "270deg" : "0deg",
    top: place === "left" ? (.5 * layout.plotHeight) - (.25 * textLength) : layout.plotHeight + 20,
    left: place === "left" ? layout.margin.left * -.5 : (.5 * layout.plotWidth + layout.margin.left/2),
    opacity:.05,
    background: "blue"
  }

  return (
    <div className="axis-attribute-menu">
      <Menu>
        <MenuButton style={menuButtonStyles}>{attribute?.name}</MenuButton>
        <MenuList>
          { attrList?.map((attr) => {
            return (
              <MenuItem onClick={() => handleSelectAttribute(attr.id)} key={attr.id}>
                {attr.name}
              </MenuItem>
            )
          })}
          <MenuDivider />
          <MenuItem onClick={() => handleRemoveAttribute()}>Remove {attribute?.name}</MenuItem>
          <MenuItem onClick={() => handleTreatAs()}>Treat as {treatAs}</MenuItem>
        </MenuList>
      </Menu>
    </div>
  )
}