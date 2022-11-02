import { Menu, MenuItem, MenuList, MenuButton, MenuDivider } from "@chakra-ui/react"
import { useDndContext } from "@dnd-kit/core"
import React, { useRef, useState } from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { useGraphModel } from "../hooks/use-graph-model"
import { GraphPlace, graphPlaceToAttrPlace } from "../models/axis-model"
import { IGraphModel } from "../models/graph-model"

import "./axis-attribute-menu"

interface IProps {
  attrId: string
  place: GraphPlace,
  graphModel: IGraphModel
}

export const AxisAttributeMenu = ({ attrId, place, graphModel }: IProps ) => {
  const { active } = useDndContext()
  const data = useDataSetContext()
  const attribute = data?.attrFromID(attrId)
  const attrList = data?.attributes.map(attr => {
    return { name: attr.name, id: attr.id }
  })

  // params will be place: GraphPlace, newAttrId: string
  const handleSelectAttribute = (newAttrId: string) => {
    console.log(`change ${attribute?.name} to ${data?.attrFromID(newAttrId).name}`)
    // const computedPlace = place === 'plot' && graphModel.config.noAttributesAssigned ? 'bottom' : place
    // const attrPlace = graphPlaceToAttrPlace(computedPlace)
    // const attrName = dataset?.attrFromID(attrId)?.name
    graphModel.setAttributeID(graphPlaceToAttrPlace(place), newAttrId)
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
          <MenuItem>Remove {attribute?.name}</MenuItem>
          <MenuItem>Treat as {attribute?.type === "numeric" ? "categorical" : "numeric"}</MenuItem>
        </MenuList>
      </Menu>
    </div>
  )
}