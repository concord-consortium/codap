import { FormControl, FormLabel, HStack, MenuItem, MenuList,
  NumberDecrementStepper, NumberIncrementStepper, NumberInput, NumberInputField,
  NumberInputStepper, Radio, RadioGroup, useDisclosure, useToast } from "@chakra-ui/react"
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

  const handleInsertPositionChange = (value: any) => {
    setInsertPosition(value)
  }

  const handleNumCasesToInsertChange = (value: any) => {
    setNumCasesToInsert(value)
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
          contentProps={{numCasesToInsert,
                          insertPosition,
                          onChangeNumCasesToInsert: handleNumCasesToInsertChange,
                          onChangeInsertPosition: handleInsertPositionChange}}
          buttons={[{ label: "Cancel", onClick: onClose },{ label: "Insert Cases", onClick: insertCases }]}
      />
    </>

  )
}

interface IInsertCasesModalProps {
  numCasesToInsert: number
  insertPosition: string
  onChangeNumCasesToInsert: (value: any) => void
  onChangeInsertPosition: (value: any) => void
}

export const InsertCasesModalContent: React.FC<IInsertCasesModalProps> =
  ({numCasesToInsert, insertPosition, onChangeNumCasesToInsert, onChangeInsertPosition}: IInsertCasesModalProps) => {
  const initialRef = useRef(null)

  return (
    <>
      <FormControl display="flex" flexDirection="column">
        <FormLabel display="flex" flexDirection="row"># cases to insert:
          <NumberInput size="xs" w="75" min={0} ml={5} defaultValue={1}
                      value={numCasesToInsert} onFocus={(e) => e.target.select()}
                      onChange={(value: any) => onChangeNumCasesToInsert(value)}>
            <NumberInputField ref={initialRef} placeholder="Number of cases" />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormLabel>
        <FormLabel display="flex" flexDirection="row">location
          <RadioGroup onChange={value => onChangeInsertPosition(value)} value={insertPosition} ml={5}>
            <HStack>
              <Radio value="before">before</Radio>
              <Radio value="after">after</Radio>
            </HStack>
          </RadioGroup>
        </FormLabel>
      </FormControl>
    </>
  )
}
