import React, { forwardRef } from "react"
import { MenuItem, MenuList, useDisclosure, useToast } from "@chakra-ui/react"
import { CalculatedColumn } from "react-data-grid"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { TRow } from "./case-table-types"
import { EditAttributePropertiesModal } from "./edit-attribute-properties"
import { createPortal } from "react-dom"

interface IProps {
  column: CalculatedColumn<TRow, unknown>
  codapComponentElt: HTMLElement
}

// eslint-disable-next-line react/display-name
export const AttributeMenuList = forwardRef<HTMLDivElement, IProps>(({column, codapComponentElt}, ref) => {
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
  const handleDeleteAttribute = () => {
    const attrId = data?.attrIDFromName(column.name as string)
    attrId && data?.removeAttribute(attrId)
  }

  const handleEditAttributeProps  = () => {
    onOpen()
  }

  return (
    <>
      <MenuList ref={ref}>
        <MenuItem onClick={()=>handleMenuItemClick("Rename")}>Rename</MenuItem>
        <MenuItem onClick={()=>handleMenuItemClick("Fit width")}>Fit width to content</MenuItem>
        <MenuItem onClick={handleEditAttributeProps}>Edit Attribute Properties...</MenuItem>
        <MenuItem onClick={()=>handleMenuItemClick("Edit Formula")}>Edit Formula...</MenuItem>
        <MenuItem onClick={()=>handleMenuItemClick("Delete Formula")}>Delete Formula (Keeping Values)</MenuItem>
        <MenuItem onClick={()=>handleMenuItemClick("Rerandomize")}>Rerandomize</MenuItem>
        <MenuItem onClick={()=>handleMenuItemClick("Sort Ascending")}>Sort Ascending (A→Z, 0→9)</MenuItem>
        <MenuItem onClick={()=>handleMenuItemClick("Sort Descending")}>Sort Descending (9→0, Z→A)</MenuItem>
        <MenuItem onClick={()=>handleMenuItemClick("Hide Attribute")}>Hide Attribute</MenuItem>
        <MenuItem onClick={handleDeleteAttribute}>Delete Attribute</MenuItem>
      </MenuList>
      {codapComponentElt && createPortal((
        <EditAttributePropertiesModal ref={ref} isOpen={isOpen} onClose={onClose}/>
      ), codapComponentElt)}
    </>
  )
})
