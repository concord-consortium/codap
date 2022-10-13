import { MenuItem, MenuList, useDisclosure, useToast } from "@chakra-ui/react"
import React, { useState } from "react"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { CodapModal } from "../codap-modal"
import { InsertCasesModalContent } from "./insert-cases-modal"

interface IProps {
  caseId: string
  index?: number
}

export const IndexMenuList = ({caseId, index}: IProps) => {
  const toast = useToast()
  const data = useDataSetContext()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [numCasesToInsert, setNumCasesToInsert] = useState(1)
  const [insertPosition, setInsertPosition] = useState("after")
  const deleteCasesItemText = data?.selection.size === 1 ? "Delete Case" : "Delete Cases"

  const handleInsertPositionChange = (value: any) => {
    setInsertPosition(value)
  }

  const handleNumCasesToInsertChange = (value: string) => {
    setNumCasesToInsert(parseInt(value, 10))
  }

  const handleInsertCase = () => {
    data?.addCases([{}], {before: caseId})
  }

  const handleInsertCases = () => {
    onOpen()
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

  const handleDeleteCases = () => {
    data?.removeCases(Array.from(data.selection))
  }

  const insertCases = () => {
    onClose()
    const casesToAdd = []
    if (numCasesToInsert) {
      for (let i=0; i < numCasesToInsert; i++) {
        casesToAdd.push({})
      }
    }
    data?.addCases(casesToAdd, {[insertPosition]: caseId})
  }

  return (
    <>
      <MenuList data-testid="index-menu-list" lineHeight="none" fontSize="small">
        <MenuItem onClick={()=>handleMenuItemClick("Move Data Entry Row")}>Move Data Entry Row Here</MenuItem>
        <MenuItem onClick={handleInsertCase}>Insert Case</MenuItem>
        <MenuItem onClick={handleInsertCases}>Insert Cases...</MenuItem>
        <MenuItem onClick={handleDeleteCases}>{deleteCasesItemText}</MenuItem>
      </MenuList>
      <CodapModal
          isOpen={isOpen}
          onClose={onClose}
          title="Insert Cases"
          hasCloseButton={true}
          Content={InsertCasesModalContent}
          contentProps={{numCasesToInsert,
                          insertPosition,
                          onChangeNumCasesToInsert: handleNumCasesToInsertChange,
                          onChangeInsertPosition: handleInsertPositionChange}}
          buttons={[{ label: "Cancel", onClick: onClose },{ label: "Insert Cases", onClick: insertCases }]}
      />
    </>
  )
}
