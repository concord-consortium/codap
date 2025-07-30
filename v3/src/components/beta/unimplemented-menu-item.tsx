import { MenuItem } from "@chakra-ui/react"
import React from "react"

interface IUnimplementedMenuItemProps {
  label: string
  testId?: string
}
export function UnimplementedMenuItem({ label, testId }: IUnimplementedMenuItemProps) {
  return (
    <MenuItem isDisabled data-testid={testId}>
      {`${label} 🚧`}
    </MenuItem>
  )
}
