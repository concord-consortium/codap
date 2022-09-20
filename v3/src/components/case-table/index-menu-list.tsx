import { FormControl, FormLabel, HStack, Input, MenuItem, MenuList, Radio, RadioGroup,
  useDisclosure, useToast } from "@chakra-ui/react"
import React, { useRef, useState } from "react"
import { IDataSet } from "../../data-model/data-set"
import { CodapModal } from "../codap-modal"

interface IProps {
  caseId: string
  index?: number
  data?: IDataSet
}
export const IndexMenuList = ({caseId, index, data}: IProps) => {
  const toast = useToast()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [numCasesToInsert, setNumCasesToInsert] = useState(1)
  const [insertPosition, setInsertPosition] = useState("after")

  const InsertCasesModalContent = () => {
    const initialRef = useRef(null)
    return (
      <FormControl display="flex" flexDirection="row">
        <FormLabel># cases to insert:</FormLabel>
        <Input size="xs" w="75" ref={initialRef} placeholder="1"
                value={numCasesToInsert} onFocus={(e) => e.target.select()}
                onChange={event => setNumCasesToInsert(parseInt(event.target.value, 10))}
        />
        <FormLabel>location</FormLabel>
        <RadioGroup onChange={setInsertPosition} value={insertPosition}>
          <HStack>
            <Radio value="before">before</Radio>
            <Radio value="after">after</Radio>
          </HStack>
        </RadioGroup>
      </FormControl>
    )
  }

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
    onOpen()
    toast({
      title: 'Menu item clicked',
      description: `You clicked on Insert Cases on index=${index} id=${caseId}`,
      status: 'success',
      duration: 9000,
      isClosable: true,
    })
  }

  const handleDeleteCase = () => {
    toast({
      title: 'Menu item clicked',
      description: `You clicked on Delete Case on index=${index} id=${caseId}`,
      status: 'success',
      duration: 9000,
      isClosable: true,
    })
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
      <MenuList>
        <MenuItem onClick={handleMoveEntryRow}>Move Data Entry Row Here</MenuItem>
        <MenuItem onClick={handleInsertCase}>Insert Case</MenuItem>
        <MenuItem onClick={handleInsertCases}>Insert Cases...</MenuItem>
        <MenuItem onClick={handleDeleteCase}>Delete Case</MenuItem>
      </MenuList>
      <CodapModal
          isOpen={isOpen}
          onClose={onClose}
          title="Insert Cases"
          hasCloseButton={true}
          Content={InsertCasesModalContent}
          buttons={[{ label: "Cancel", onClick: onClose },{ label: "Insert Cases", onClick: insertCases }]}
      />
    </>

  )
}
