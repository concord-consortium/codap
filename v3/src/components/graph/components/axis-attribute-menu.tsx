import { Menu, MenuItem, MenuList, MenuButton, MenuDivider, useToast } from "@chakra-ui/react"
import React, { useRef, useState } from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { GraphPlace, graphPlaceToAttrPlace } from "../models/axis-model"
import { IGraphModel } from "../models/graph-model"
import { usePlotResponders } from "../hooks/graph-hooks"

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

  return (
    <div className="axis-attribute-menu">
      <Menu>
        <MenuButton>{attribute?.name}</MenuButton>
        <MenuList>
          { attrList?.map((attr) => {
            return <MenuItem onClick={() => handleSelectAttribute(attr.id)} key={attr.id}>{attr.name}</MenuItem>
          })}
          <MenuDivider />
          <MenuItem onClick={() => handleRemoveAttribute()}>Remove {attribute?.name}</MenuItem>
          <MenuItem onClick={() => handleTreatAs()}>Treat as {treatAs}</MenuItem>
        </MenuList>
      </Menu>
    </div>
  )
}