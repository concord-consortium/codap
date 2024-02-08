import {
  Button, FormControl, FormLabel, ModalBody, ModalCloseButton, ModalFooter, ModalHeader,
  Textarea, Tooltip
} from "@chakra-ui/react"
import React, { useState } from "react"
import { CodapModal } from "../../codap-modal"
import t from "../../../utilities/translation/translate"

// TODO These should be translated strings
const placeholderText = "URL";
const okButtonText = "OK";

interface IProps {
  currentValue?: string
  isOpen: boolean
  onAccept: (value: string) => void
  onClose: () => void
}

export const WebViewUrlModal = ({ currentValue="", isOpen, onAccept, onClose }: IProps) => {
  const [value, setValue] = useState(currentValue)

  const applyValue = () => {
    onAccept(value)
    closeModal()
  }

  const closeModal = () => {
    onClose()
  }

  const handleValueChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value)

  const buttons = [{
    // TODO These are the same as CODAP v2, but should they be separate from the attribute form?
    label: t("DG.AttrFormView.cancelBtnTitle"),
    tooltip: t("DG.AttrFormView.cancelBtnTooltip"),
    onClick: closeModal
  }, {
    label: okButtonText,
    tooltip: t("DG.DocumentController.enterViewWebPageOKTip"),
    onClick: applyValue
  }]

  return (
    <CodapModal
      isOpen={isOpen}
      onClose={closeModal}
      modalWidth={"350px"}
    >
      <ModalHeader h="30" className="codap-modal-header" fontSize="md" data-testid="codap-modal-header">
        <div className="codap-header-title">
          {t("DG.DocumentController.enterURLPrompt")}
        </div>
      </ModalHeader>
      <ModalBody>
        <FormControl display="flex" flexDirection="column" data-testid="edit-formula-value-form">
          <Textarea size="xs" value={value} onChange={handleValueChange}
            placeholder={placeholderText}
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
