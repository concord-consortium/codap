import React, { useRef } from "react"
import { Flex, FormControl, FormLabel, HStack, NumberDecrementStepper, NumberIncrementStepper, NumberInput,
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
    <Flex flexDirection="column">
      <FormControl className="form-control">
        <FormLabel mb="0" aria-label={t("DG.CaseTable.insertCasesDialog.numCasesPrompt")}>
          {t("DG.CaseTable.insertCasesDialog.numCasesPrompt")}
        </FormLabel>
        <NumberInput size="xs" w="80px" min={0} ml={5} defaultValue={1} data-testid="num-case-input"
                    value={numCasesToInsert} onFocus={(e) => e.target.select()}
                    onChange={value => onChangeNumCasesToInsert(value)}>
          <NumberInputField ref={initialRef} placeholder="0"
            aria-label={t("DG.CaseTable.insertCasesDialog.numCasesPrompt")} />
          <NumberInputStepper>
            <NumberIncrementStepper data-testid="num-case-input-increment-up"/>
            <NumberDecrementStepper data-testid="num-case-input-incement-down"/>
          </NumberInputStepper>
        </NumberInput>
      </FormControl>
      <FormControl className="form-control">
        <FormLabel mb="0" aria-label={t("DG.CaseTable.insertCasesDialog.beforeAfter.prompt")}>
          {t("DG.CaseTable.insertCasesDialog.beforeAfter.prompt")}
        </FormLabel>
        <RadioGroup value={insertPosition} ml={5} aria-label={t("DG.CaseTable.insertCasesDialog.beforeAfter.prompt")}
            onChange={value => onChangeInsertPosition(value)}>
          <HStack>
            <Radio value="before" data-testid="add-before">
              {t("DG.CaseTable.insertCasesDialog.beforeAfter.before")}
            </Radio>
            <Radio value="after" data-testid="add-after">
              {t("DG.CaseTable.insertCasesDialog.beforeAfter.after")}
            </Radio>
          </HStack>
        </RadioGroup>
      </FormControl>
    </Flex>
  )
}
