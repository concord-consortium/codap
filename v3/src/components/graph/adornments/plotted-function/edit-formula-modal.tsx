import {
  Button, FormControl, FormLabel, ModalBody, ModalCloseButton, ModalFooter, ModalHeader,
  Textarea, Tooltip
} from "@chakra-ui/react"
import React, { useState } from "react"
import { CodapModal } from "../../../codap-modal"
import { t } from "../../../../utilities/translation/translate"

interface IProps {
  currentValue?: string
  isOpen: boolean
  onClose: (value: string) => void
}

export const EditFormulaModal = ({ currentValue="", isOpen, onClose }: IProps) => {
  const [value, setValue] = useState(currentValue)

  const applyValue = () => {
    closeModal()
  }

  const closeModal = () => {
    onClose(value)
  }

  const handleValueChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value)

  const buttons = [{
    label: t("DG.AttrFormView.cancelBtnTitle"),
    tooltip: t("DG.AttrFormView.cancelBtnTooltip"),
    onClick: closeModal
  }, {
    label: t("DG.AttrFormView.applyBtnTitle"),
    onClick: applyValue
  }]

  return (
    <CodapModal
      isOpen={isOpen}
      onClose={closeModal}
      modalWidth={"350px"}
    >
      <ModalHeader h="30" className="codap-modal-header" fontSize="md" data-testid="codap-modal-header">
        <div className="codap-modal-icon-container" />
        <div className="codap-header-title">
          {t("DG.Inspector.graphPlottedFunction")}
        </div>
        <ModalCloseButton onClick={closeModal} data-testid="modal-close-button" />
      </ModalHeader>
      <ModalBody>
        <FormControl display="flex" flexDirection="column" data-testid="edit-formula-value-form">
          <FormLabel>
            {t("DG.PlottedFunction.formulaPrompt")}
          </FormLabel>
          <Textarea size="xs" value={value} onChange={handleValueChange}
            placeholder={t("DG.PlottedFunction.formulaHint")}
            onKeyDown={(e) => e.stopPropagation()} data-testid="formula-value-input" />
        </FormControl>
      </ModalBody>
      <ModalFooter mt="-5">
        {
          buttons.map((b, idx) => (
            <Tooltip key={idx} label={b.tooltip} h="20px" fontSize="12px" color="white" openDelay={1000}
              placement="bottom" bottom="15px" left="15px" data-testid="modal-tooltip">
              <Button size="xs" variant="ghost" ml="5" onClick={b.onClick} data-testid={`${b.label}-button`}>
                {b.label}
              </Button>
            </Tooltip>
          ))
        }
      </ModalFooter>
    </CodapModal>
  )
}
