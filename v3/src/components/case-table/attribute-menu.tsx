import { MenuItem, MenuList, useToast } from "@chakra-ui/react"
import React, { forwardRef } from "react"
import { CalculatedColumn } from "react-data-grid"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { TRow } from "./case-table-types"

interface IProps {
  disableToolTips?: (show: boolean) => void
  column: CalculatedColumn<TRow, unknown>
}

// eslint-disable-next-line react/display-name
export const AttributeMenuList = forwardRef<HTMLDivElement, IProps>(({disableToolTips, column}, ref) => {
  const toast = useToast()
  const data = useDataSetContext()

  const handleMenuItemClick = (menuItem: string) => {
    toast({
      title: 'Menu item clicked',
      description: `You clicked on ${menuItem} on ${column.name}`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    })
  }
  const handleHideAttribute = () => {
    const attrId = data?.attrIDFromName(column.name as string)
    attrId && data?.attrFromID(attrId).setHidden(true)
  }
  const handleShowAllAttributes = () => {
    data?.showAllAttributes()
  }
  const handleDeleteAttribute = () => {
    const attrId = data?.attrIDFromName(column.name as string)
    attrId && data?.removeAttribute(attrId)
  }

  return (
    <MenuList ref={ref}>
      <MenuItem onClick={()=>handleMenuItemClick("Rename")}>Rename</MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Fit width")}>Fit width to content</MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Edit Attribute Properties")}>Edit Attribute Properties...</MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Edit Formula")}>Edit Formula...</MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Delete Formula")}>Delete Formula (Keeping Values)</MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Rerandomize")}>Rerandomize</MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Sort Ascending")}>Sort Ascending (A→Z, 0→9)</MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Sort Descending")}>Sort Descending (9→0, Z→A)</MenuItem>
      <MenuItem onClick={handleHideAttribute}>Hide Attribute</MenuItem>
      {/* temporary until table tool palette is implemented */}
      <MenuItem onClick={handleShowAllAttributes}>Show All Attributes</MenuItem>
      <MenuItem onClick={()=>handleDeleteAttribute()}>Delete Attribute</MenuItem>
    </MenuList>
  )
})
