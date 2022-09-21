import { MenuItem, MenuList, useToast } from "@chakra-ui/react"
import React from "react"
import { useDataSetContext } from "../../hooks/use-data-set-context"

interface IProps {
  caseId: string
  index?: number
}
export const IndexMenuList = ({caseId, index}: IProps) => {
  const toast = useToast()
  const data = useDataSetContext()

  const handleInsertCase = () => {
    data?.addCases([{}], {before: caseId})
  }

  const handleMenuItemClick = (menuItem: string) => {
    toast({
      title: 'Menu item clicked',
      description: `You clicked on ${menuItem} on index=${index} id=${caseId}`,
      status: 'success',
      duration: 9000,
      isClosable: true,
    })
  }

  return (
    <MenuList>
      <MenuItem onClick={()=>handleMenuItemClick("Move Data Entry Row")}>Move Data Entry Row Here</MenuItem>
      <MenuItem onClick={handleInsertCase}>Insert Case</MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Insert Cases")}>Insert Cases...</MenuItem>
      <MenuItem onClick={()=>handleMenuItemClick("Delete Case")}>Delete Case</MenuItem>
    </MenuList>
  )
}
