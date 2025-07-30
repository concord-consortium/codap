import { MenuItem } from "@chakra-ui/react"
import React from "react"

import ConstructionIcon from "../../assets/icons/icon-alert.svg"

import "./unimplemented-menu-item.scss"

interface IUnimplementedMenuItemProps {
  label: string
  testId?: string
}
export function UnimplementedMenuItem({ label, testId }: IUnimplementedMenuItemProps) {
  return (
    <MenuItem icon={<ConstructionIcon className="construction-icon" />} isDisabled data-testid={testId}>
      {label}
    </MenuItem>
  )
}
