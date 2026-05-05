import {
  Button, FormControl, FormLabel, Input, ModalBody, ModalFooter, ModalHeader, Tooltip
} from "@chakra-ui/react"
import React, { useRef, useState } from "react"
import { CodapModal } from "../codap-modal"
import { t } from "../../utilities/translation/translate"
import MediaToolIcon from "../../assets/icons/icon-media-tool.svg"

interface IProps {
  currentValue?: string
  isOpen: boolean
  onAccept: (value: string) => void
  onClose: () => void
  onRemoveEmptyWebView: () => void
}

export const WebViewUrlModal = ({
  currentValue = "",
  isOpen,
  onAccept,
  onClose,
  onRemoveEmptyWebView
}: IProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [value, setValue] = useState(currentValue)

  const applyValue = () => {
    if (value !== "") {
      onAccept(value)
    }

    closeModal()
  }

  const closeModal = () => {
    if (value === "" && currentValue === "") {
      onRemoveEmptyWebView()
    }

    onClose()
  }

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)
  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      closeModal()
    } else if (e.key === "Enter") {
      applyValue()
    }
  }
  const focusInput = () => inputRef.current?.focus()

  const buttons = [{
    label: t("DG.AttrFormView.cancelBtnTitle"),
    tooltip: t("DG.AttrFormView.cancelBtnTooltip"),
    testId: "web-view-url-cancel-button",
    onClick: closeModal
  }, {
    label: t("V3.WebView.Modal.okBtnTitle"),
    tooltip: t("DG.DocumentController.enterViewWebPageOKTip"),
    testId: "web-view-url-ok-button",
    onClick: applyValue,
    default: true,
    disabled: !value
  }]

  return (
    <CodapModal
      data-testid="web-view-url-modal"
      closeOnOverlayClick={false}
      isOpen={isOpen}
      modalHeight={"120px"}
      modalWidth={"400px"}
      onClick={focusInput}
      onClose={closeModal}
    >
      <ModalHeader
        className="codap-modal-header"
        data-testid="codap-modal-header"
        fontSize="md"
        h="30"
      >
        <div className="codap-modal-icon-container" aria-hidden="true">
          <MediaToolIcon className="codap-modal-icon"/>
        </div>
        <div className="codap-header-title"/>
      </ModalHeader>
      <ModalBody>
        <FormControl display="flex" flexDirection="column" data-testid="web-view-url-form">
          <FormLabel className="web-view-url-prompt">
            {t("DG.DocumentController.enterURLPrompt")}
            <Input
              data-testid="web-view-url-input"
              onChange={handleValueChange}
              onKeyDown={e => e.stopPropagation()}
              onKeyUp={handleKeyUp}
              placeholder={t("V3.WebView.Modal.PlaceholderText")}
              ref={inputRef}
              value={value}
            />
          </FormLabel>
        </FormControl>
      </ModalBody>
      <ModalFooter mt="-5">
        {
          buttons.map((b, idx) => (
            <Tooltip key={idx} label={b.tooltip} h="20px" fontSize="12px" color="white" openDelay={1000}
              placement="bottom" bottom="15px" left="15px" data-testid="modal-tooltip">
              <Button size="xs" variant={b.default ? "v3Default" : "v3"} ml="5" onClick={b.onClick}
                data-testid={b.testId} isDisabled={b.disabled ?? false}>
                {b.label}
              </Button>
            </Tooltip>
          ))
        }
      </ModalFooter>
    </CodapModal>
  )
}
