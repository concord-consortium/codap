import React, { forwardRef } from "react"
import { MenuItem, MenuList, useDisclosure, useToast } from "@chakra-ui/react"
import { CalculatedColumn } from "react-data-grid"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { TRow } from "./case-table-types"
import { EditAttributePropertiesModal } from "./edit-attribute-properties"
import { createPortal } from "react-dom"

interface IProps {
  column: CalculatedColumn<TRow, unknown>
  onRenameAttribute: () => void
}

// eslint-disable-next-line react/display-name
export const AttributeMenuList = forwardRef<HTMLDivElement, IProps>(({onRenameAttribute, column}, ref) => {
  const toast = useToast()
  const data = useDataSetContext()
  const {isOpen, onOpen, onClose} = useDisclosure()

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

  const handleEditAttributeProps  = () => {
    onOpen()
  }

  return (
    <MenuList ref={ref} data-testid="attribute-menu-list">
      <MenuItem onClick={onRenameAttribute}>Rename</MenuItem>
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
