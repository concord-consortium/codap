import React, { useRef } from "react"
import { FormControl, FormLabel, HStack, NumberDecrementStepper, NumberIncrementStepper, NumberInput,
  NumberInputField, NumberInputStepper, Radio, RadioGroup } from "@chakra-ui/react"
import t from "../../utilities/translation/translate"

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
      <FormLabel h="20px" display="flex" flexDirection="row" alignItems="center">
        {t("DG.CaseTable.insertCasesDialog.numCasesPrompt")}
        <NumberInput size="xs" w="80px" min={0} ml={5} defaultValue={1} data-testid="num-case-input"
                    value={numCasesToInsert} onFocus={(e) => e.target.select()}
                    onChange={value => onChangeNumCasesToInsert(value)}>
          <NumberInputField ref={initialRef} placeholder="0" />
          <NumberInputStepper>
            <NumberIncrementStepper data-testid="num-case-input-increment-up"/>
            <NumberDecrementStepper data-testid="num-case-input-incement-down"/>
          </NumberInputStepper>
        </NumberInput>
      </FormLabel>
      <FormLabel display="flex" flexDirection="row">{t("DG.CaseTable.insertCasesDialog.beforeAfter.prompt")}
        <RadioGroup onChange={value => onChangeInsertPosition(value)} value={insertPosition} ml={5}>
          <HStack>
            <Radio value="before" data-testid="add-before">
              {t("DG.CaseTable.insertCasesDialog.beforeAfter.before")}
            </Radio>
            <Radio value="after" data-testid="add-after">
              {t("DG.CaseTable.insertCasesDialog.beforeAfter.after")}
            </Radio>
          </HStack>
        </RadioGroup>
      </FormLabel>
    </FormControl>
  )
}
