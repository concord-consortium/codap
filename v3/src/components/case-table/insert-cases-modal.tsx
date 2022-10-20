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
      <FormLabel h="20px" display="flex" flexDirection="row" alignItems="center"># cases to insert:
        <NumberInput size="xs" w="80px" min={0} ml={5} defaultValue={1} data-testid="num-case-input"
                    value={numCasesToInsert} onFocus={(e) => e.target.select()}
                    onChange={value => onChangeNumCasesToInsert(value)}>
          <NumberInputField ref={initialRef} placeholder="Number of cases" />
          <NumberInputStepper>
            <NumberIncrementStepper data-testid="num-case-input-increment-up"/>
            <NumberDecrementStepper data-testid="num-case-input-incement-down"/>
          </NumberInputStepper>
        </NumberInput>
      </FormLabel>
      <FormLabel display="flex" flexDirection="row">location
        <RadioGroup onChange={value => onChangeInsertPosition(value)} value={insertPosition} ml={5}>
          <HStack>
            <Radio value="before" data-testid="add-before">before</Radio>
            <Radio value="after" data-testid="add-after">after</Radio>
          </HStack>
        </RadioGroup>
      </FormLabel>
    </FormControl>
  )
}
