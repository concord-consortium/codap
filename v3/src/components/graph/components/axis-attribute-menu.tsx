import { Menu, MenuItem, MenuList, MenuButton, MenuDivider } from "@chakra-ui/react"
import React, { useRef, useState } from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { GraphPlace, graphPlaceToAttrPlace } from "../models/axis-model"
import { IGraphModel } from "../models/graph-model"

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

  // TODO
  // remove fram graph or from dataset, guessing it is from graph
  // render properly
  // treat-as

  const handleSelectAttribute = (newAttrId: string) => {
    console.log(`change ${attribute?.name} to ${data?.attrFromID(newAttrId).name}`)
    graphModel.setAttributeID(graphPlaceToAttrPlace(place), newAttrId)
  }

  const handleRemoveAttribute = () => {
    console.log(`remove ${attribute?.name} from ${place}`)

    //graphModel.setAttributeID(graphPlaceToAttrPlace(place), kDefaultAttributeName)
  }

  return (
    <div className="axis-attribute-menu" style={{ position: "absolute", background: "#cafada"}}>
      <Menu>
        <MenuButton>{attribute?.name}</MenuButton>
        <MenuList>
          { attrList?.map((attr) => {
            return <MenuItem onClick={() => handleSelectAttribute(attr.id)} key={attr.id}>{attr.name}</MenuItem>
          })}
          <MenuDivider />
          <MenuItem onClick={() => handleRemoveAttribute()}>Remove {attribute?.name}</MenuItem>
          <MenuItem>Treat as {attribute?.type === "numeric" ? "categorical" : "numeric"}</MenuItem>
        </MenuList>
      </Menu>
    </div>
  )
}