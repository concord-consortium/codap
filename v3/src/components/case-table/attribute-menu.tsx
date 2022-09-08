import { MenuItem, MenuList, useToast } from "@chakra-ui/react"
import React from "react"
import { CalculatedColumn } from "react-data-grid"
import { TRow } from "./case-table-types"

interface IProps {
  disableToolTips?: (show: boolean) => void;
  column: CalculatedColumn<TRow, unknown>;
}

export const AttributeMenuList = ({disableToolTips, column}: IProps) => {
  const toast = useToast()

  const handleRenameAttribute = (e: any) => {
    console.log("in handleRename")

    e.preventDefault()
    toast({
      title: 'Menu item clicked',
      description: `You clicked on Rename ${column.name}`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    })
  }

  const handleFitWidth = (e: any) => {
    console.log("in handleFitWidth")

    e.preventDefault()
    toast({
      title: 'Menu item clicked',
      description: `You clicked on Fit Width ${column.name}`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    })
  }

  const handleEditAttributeProps  = (e: any) => {
    console.log("in handleEditAt")

    e.preventDefault()
    toast({
      title: 'Menu item clicked',
      description: `You clicked on Edit Attribute ${column.name}`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    })
  }

  const handleEditFormula = (e: any) => {
    console.log("in handleEditFormula")

    e.preventDefault()
    toast({
      title: 'Menu item clicked',
      description: `You clicked on Edit Fomula ${column.name}`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    })
  }

  const handleDeleteFormula = (e: any) => {
    console.log("in handleDelete")

    e.preventDefault()
    toast({
      title: 'Menu item clicked',
      description: `You clicked on Delete Formula ${column.name}`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    })
  }

  const handleRerandomize = (e: any) => {
    console.log("in handleRerandomize")

    e.preventDefault()
    toast({
      title: 'Menu item clicked',
      description: `You clicked on Rerandomize ${column.name}`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    })
  }

  const handleSortAscending = (e: any) => {
    console.log("in handleSortAsc")

    e.preventDefault()
    toast({
      title: 'Menu item clicked',
      description: `You clicked on Sort Ascending ${column.name}`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    })
  }

  const handleSortDescending = (e: any) => {
    console.log("in handleSortDesc")

    e.preventDefault()
    toast({
      title: 'Menu item clicked',
      description: `You clicked on Sort Descending ${column.name}`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    })
  }

  const handleHideAttribute = (e: any) => {
    console.log("in handleHide")
    e.preventDefault()
    toast({
      title: 'Menu item clicked',
      description: `You clicked on Hide Attribute ${column.name}`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    })
  }

  const handleDeleteAttribute = (e: any) => {
    console.log("in handleDelete")
    e.preventDefault()
    toast({
      title: 'Menu item clicked',
      description: `You clicked on Delete Attribute ${column.name}`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    })
  }
  return (
    <MenuList>
      <MenuItem onClick={handleRenameAttribute}>Rename</MenuItem>
      <MenuItem onClick={handleFitWidth}>Fit width to content</MenuItem>
      <MenuItem onClick={handleEditAttributeProps}>Edit Attribute Properties...</MenuItem>
      <MenuItem onClick={handleEditFormula}>Edit Formula...</MenuItem>
      <MenuItem onClick={handleDeleteFormula}>Delete Formula (Keeping Values)</MenuItem>
      <MenuItem onClick={handleRerandomize}>Rerandomize</MenuItem>
      <MenuItem onClick={handleSortAscending}>Sort Ascending (A→Z, 0→9)</MenuItem>
      <MenuItem onClick={handleSortDescending}>Sort Descending (9→0, Z→A)</MenuItem>
      <MenuItem onClick={handleHideAttribute}>Hide Attribute</MenuItem>
      <MenuItem onClick={handleDeleteAttribute}>Delete Attribute</MenuItem>
    </MenuList>
  )
}
