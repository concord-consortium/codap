import { MenuItem, MenuList, useToast } from "@chakra-ui/react"
import React from "react"
import { IDataSet } from "../../data-model/data-set"

interface IProps {
  caseId: string
  index?: number
  data?: IDataSet
}
export const IndexMenuList = ({data, caseId, index}: IProps) => {
  const toast = useToast()
  const handleMoveEntryRow = () => {
    toast({
      title: 'Menu item clicked',
      description: `You clicked on Move Data Row on index=${index}  id=${caseId}`,
      status: 'success',
      duration: 9000,
      isClosable: true,
    })
  }

  const handleInsertCase = () => {
    toast({
      title: 'Menu item clicked',
      description: `You clicked on Insert Case on index=${index} id=${caseId}`,
      status: 'success',
      duration: 9000,
      isClosable: true,
    })
  }

  const handleInsertCases = () => {
    toast({
      title: 'Menu item clicked',
      description: `You clicked on Insert Cases on index=${index} id=${caseId}`,
      status: 'success',
      duration: 9000,
      isClosable: true,
    })
  }

  const handleDeleteCase = () => {
    data?.removeCases([caseId])
    toast({
      title: 'Menu item clicked',
      description: `You clicked on Delete Case on index=${index} id=${caseId}`,
      status: 'success',
      duration: 9000,
      isClosable: true,
    })
  }
  return (
    <MenuList>
      <MenuItem onClick={handleMoveEntryRow}>Move Data Entry Row Here</MenuItem>
      <MenuItem onClick={handleInsertCase}>Insert Case</MenuItem>
      <MenuItem onClick={handleInsertCases}>Insert Cases...</MenuItem>
      <MenuItem onClick={handleDeleteCase}>Delete Case</MenuItem>
    </MenuList>
  )
}
