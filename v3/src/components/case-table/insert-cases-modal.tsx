import React, { useRef } from "react"
import { FormControl, FormLabel, HStack, NumberDecrementStepper, NumberIncrementStepper, NumberInput,
  NumberInputField, NumberInputStepper, Radio, RadioGroup } from "@chakra-ui/react"

interface IInsertCasesModalProps {
  numCasesToInsert: number
  insertPosition: string
  onChangeNumCasesToInsert: (value: string) => void
  onChangeInsertPosition: (value: string) => void
}

export const InsertCasesModalContent: React.FC<IInsertCasesModalProps> =
  ({numCasesToInsert, insertPosition, onChangeNumCasesToInsert, onChangeInsertPosition}: IInsertCasesModalProps) => {
  const initialRef = useRef(null)

  return (
    <FormControl display="flex" flexDirection="column">
      <FormLabel display="flex" flexDirection="row"># cases to insert:
        <NumberInput size="xs" w="75" min={0} ml={5} defaultValue={1}
                    value={numCasesToInsert} onFocus={(e) => e.target.select()}
                    onChange={value => onChangeNumCasesToInsert(value)}>
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
  )
}
