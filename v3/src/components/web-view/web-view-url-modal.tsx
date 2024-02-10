import {
  Button, FormControl, Input, ModalBody, ModalFooter, ModalHeader, Tooltip
} from "@chakra-ui/react"
import React, { useState } from "react"
import { CodapModal } from "../codap-modal"
import t from "../../utilities/translation/translate"

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

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)

  const buttons = [{
    label: t("DG.AttrFormView.cancelBtnTitle"),
    tooltip: t("DG.AttrFormView.cancelBtnTooltip"),
    onClick: closeModal
  }, {
    label: t("V3.WebView.Modal.okBtnTitle"),
    tooltip: t("DG.DocumentController.enterViewWebPageOKTip"),
    onClick: applyValue
  }]

  return (
    <CodapModal
      isOpen={isOpen}
      modalHeight={"140px"}
      modalWidth={"350px"}
      onClose={closeModal}
    >
      <ModalHeader h="30" className="codap-modal-header" fontSize="md" data-testid="codap-modal-header">
        <div className="codap-header-title-simple">
          {t("DG.DocumentController.enterURLPrompt")}
        </div>
      </ModalHeader>
      <ModalBody>
        <FormControl display="flex" flexDirection="column" data-testid="web-view-url-form">
          <Input value={value} onChange={handleValueChange} placeholder={t("V3.WebView.Modal.PlaceholderText")}
            onKeyDown={(e) => e.stopPropagation()} data-testid="web-view-url-input" />
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
