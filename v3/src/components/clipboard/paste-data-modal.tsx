import { Button, ModalBody, ModalCloseButton, ModalFooter, ModalHeader, Textarea } from "@chakra-ui/react"
import React, { useEffect, useRef, useState } from "react"
import { IClipboardContent } from "../../lib/clipboard/clipboard-utils"
import { t } from "../../utilities/translation/translate"
import { CodapModal } from "../codap-modal"

import "./paste-data-modal.scss"

interface IProps {
  isOpen: boolean
  permissionDenied: boolean
  // Where focus should go when the dialog closes
  returnFocus?: HTMLElement
  onImport: (content: IClipboardContent) => void
  onCancel: () => void
}

// Fallback for importing clipboard data when the browser won't let CODAP read the clipboard directly.
// A paste event needs no permission or user activation, and it provides text/html as well as text/plain,
// so pasted HTML tables can still be imported as tables.
export function PasteDataModal({ isOpen, permissionDenied, returnFocus, onImport, onCancel }: IProps) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  // Holds the return-focus element past the render that closes the dialog, which may no longer provide it
  const returnFocusRef = useRef<HTMLElement | null>(null)
  if (isOpen) returnFocusRef.current = returnFocus ?? null
  const [value, setValue] = useState("")
  // The HTML from the most recent paste, and the text area's value right after that paste. The HTML is
  // only imported if that paste was the text area's entire content and the text hasn't been edited since,
  // so the HTML matches everything the user sees. Otherwise the text is imported as CSV.
  const pastedHtml = useRef<string>()
  const valueAfterPaste = useRef<string>()
  const justPasted = useRef(false)

  useEffect(() => {
    if (isOpen) {
      setValue("")
      pastedHtml.current = undefined
      valueAfterPaste.current = undefined
      justPasted.current = false
    }
  }, [isOpen])

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastingIntoEmpty = !e.currentTarget.value.trim()
    pastedHtml.current = pastingIntoEmpty ? e.clipboardData.getData("text/html") || undefined : undefined
    justPasted.current = true
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    if (justPasted.current) {
      valueAfterPaste.current = e.target.value
      justPasted.current = false
    }
  }

  const handleImport = () => {
    const html = pastedHtml.current && value === valueAfterPaste.current ? pastedHtml.current : undefined
    onImport({ text: value, ...(html ? { html } : {}) })
  }

  const canImport = !!value.trim()

  return (
    <CodapModal initialRef={textAreaRef} finalFocusRef={returnFocusRef} isOpen={isOpen} onClose={onCancel}
        closeOnOverlayClick={false} modalWidth="400px">
      <ModalHeader h="30" className="codap-modal-header" fontSize="md" data-testid="codap-modal-header">
        <div className="codap-modal-icon-container" />
        <div className="codap-header-title">{t("V3.clipboard.pasteDialog.title")}</div>
        <ModalCloseButton data-testid="modal-close-button" />
      </ModalHeader>
      <ModalBody className="paste-data-modal-body">
        <label htmlFor="paste-data-text-area" className="paste-data-prompt">
          {t("V3.clipboard.pasteDialog.prompt")}
        </label>
        {permissionDenied &&
          <p className="paste-data-permission-note">{t("V3.clipboard.pasteDialog.permissionDenied")}</p>}
        <Textarea id="paste-data-text-area" ref={textAreaRef} className="paste-data-text-area"
          value={value} onPaste={handlePaste} onChange={handleChange} size="sm" rows={8}
          data-testid="paste-data-text-area" />
      </ModalBody>
      <ModalFooter>
        <Button size="xs" variant="v3Clear" ml="5" onClick={onCancel} data-testid="paste-data-cancel-button">
          {t("DG.AttrFormView.cancelBtnTitle")}
        </Button>
        <Button size="xs" variant="v3Default" ml="5" onClick={handleImport} isDisabled={!canImport}
            data-testid="paste-data-import-button">
          {t("V3.clipboard.pasteDialog.importButton")}
        </Button>
      </ModalFooter>
    </CodapModal>
  )
}
