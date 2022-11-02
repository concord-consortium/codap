import { Menu, MenuItem, MenuList, MenuButton } from "@chakra-ui/react"
import { useDndContext } from "@dnd-kit/core"
import React, { useRef, useState } from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"

import "./axis-attribute-menu"

interface IProps {
  attrId: string
}

export const AxisAttributeMenu = ({ attrId }: IProps ) => {
  const { active } = useDndContext()
  const data = useDataSetContext()

  const attribute = data?.attrFromID(attrId)
  const units = attribute?.units ? ` (${attribute.units})` : ""
  const description = attribute?.userDescription ? `: ${attribute.userDescription}` : ""

  return (
    <div className="axis-attribute-menu" style={{ position: "absolute", background: "#cafada"}}>
      <Menu>
        <MenuButton>
        {attribute?.name}
        </MenuButton>
        <MenuList>
          <MenuItem>Download</MenuItem>
          <MenuItem>Create a Copy</MenuItem>
          <MenuItem>Mark as Draft</MenuItem>
          <MenuItem>Delete</MenuItem>
          <MenuItem>Attend a Workshop</MenuItem>
        </MenuList>
      </Menu>
    </div>
  )
}