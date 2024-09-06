import {
  Button, FormControl, FormLabel, HStack, ModalBody, ModalCloseButton, ModalFooter, ModalHeader,
  NumberDecrementStepper, NumberIncrementStepper, NumberInput, NumberInputField, NumberInputStepper,
  Radio, RadioGroup, Tooltip
} from "@chakra-ui/react"
import React, { useRef, useState } from "react"
import { t } from "../../utilities/translation/translate"
import { CodapModal } from "../codap-modal"

export interface IInsertSpec {
  count: number
  position: "before" | "after"
}

interface IProps {
  caseId: string
  isOpen: boolean
  onClose: (insertSpec?: IInsertSpec) => void
}

export const InsertCasesModal: React.FC<IProps> =
  ({caseId, isOpen, onClose}: IProps) => {
  const [numCasesToInsert, setNumCasesToInsert] = useState(1)
  const [insertPosition, setInsertPosition] = useState<"before" | "after">("after")
  const numCasesToInsertRef = useRef<HTMLInputElement | null>(null)

  const handleSubmit = (e: React.KeyboardEvent<HTMLElement>) => {
    const key = e.key
    if (key === "Enter") {
      onClose({ count: numCasesToInsert, position: insertPosition })
    }
  }

  const handleInsertPositionChange = (value: any) => {
    setInsertPosition(value)
  }

  const handleNumCasesToInsertChange = (value: string) => {
    setNumCasesToInsert(parseInt(value, 10))
  }

  const buttons=[{  label: t("DG.AttrFormView.cancelBtnTitle"),
                    tooltip: t("DG.AttrFormView.cancelBtnTooltip"),
                    onClick: () => onClose() },
                 {  label: t("DG.CaseTable.insertCasesDialog.applyBtnTitle"),
                    tooltip: t("DG.CaseTable.insertCasesDialog.applyBtnTooltip"),
                    onClick: () => onClose({ count: numCasesToInsert, position: insertPosition }),
                    default: true }
                ]

  return (
    <CodapModal
      initialRef={numCasesToInsertRef}
      isOpen={isOpen}
      onClose={() => onClose()}
      modalWidth={"215px"}
      modalHeight={"130px"}
    >
      <ModalHeader h="30" className="codap-modal-header" fontSize="md" data-testid="codap-modal-header">
        <div className="codap-modal-icon-container" />
        <div className="codap-header-title">{t("DG.CaseTable.insertCasesDialog.title")}</div>
        <ModalCloseButton onClick={() => onClose()} data-testid="modal-close-button"/>
      </ModalHeader>
      <ModalBody>
        <FormControl display="flex" flexDirection="column">
          <FormLabel h="20px" display="flex" flexDirection="row" alignItems="center">
            {t("DG.CaseTable.insertCasesDialog.numCasesPrompt")}
            <NumberInput size="xs" w="80px" min={0} ml={5} defaultValue={1} value={numCasesToInsert}
                        data-testid="num-case-input" onFocus={(e) => e.target.select()}
                        onChange={value => handleNumCasesToInsertChange(value)}
                        onKeyDown={handleSubmit}>
              <NumberInputField ref={numCasesToInsertRef} placeholder="0"/>
              <NumberInputStepper>
                <NumberIncrementStepper data-testid="num-case-input-increment-up"/>
                <NumberDecrementStepper data-testid="num-case-input-increment-down"/>
              </NumberInputStepper>
            </NumberInput>
          </FormLabel>
          <FormLabel display="flex" flexDirection="row">{t("DG.CaseTable.insertCasesDialog.beforeAfter.prompt")}
            <RadioGroup onChange={value => handleInsertPositionChange(value)} value={insertPosition} ml={5}>
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
      </ModalBody>
      <ModalFooter mt="-5">
        {buttons.map((b: any, i)=>{
          const key = `${i}-${b.className}`
          return (
            <Tooltip key={key} label={b.tooltip} h="20px" fontSize="12px"
              color="white" openDelay={1000} placement="bottom" bottom="15px" left="15px"
              data-testid="modal-tooltip">
              <Button key={key} size="xs" variant={`${b.default ? "default" : ""}`}
                  _hover={{backgroundColor: "#72bfca", color: "white"}} ml="5" onClick={b.onClick}
                  data-testid={`${b.label}-button`}>
                {b.label}
              </Button>
            </Tooltip>
          )
        })}
      </ModalFooter>
    </CodapModal>
  )
}
