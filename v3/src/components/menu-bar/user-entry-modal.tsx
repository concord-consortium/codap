import { Button, Modal, ModalContent, ModalOverlay } from "@chakra-ui/react"
import { RefObject, useRef } from "react"
import { useCfmContext } from "../../hooks/use-cfm-context"
import { t } from "../../utilities/translation/translate"

import "./user-entry-modal.scss"

interface IProps {
  isOpen: boolean
  onClose: () => void
  containerRef?: RefObject<HTMLElement>
}

export const UserEntryModal = ({ isOpen, onClose, containerRef }: IProps) => {
  const cfm = useCfmContext()
  const defaultButtonRef = useRef<HTMLButtonElement>(null)

  const openDocument = () => {
    cfm?.client.openFileDialog()
    onClose()
  }

  const createNewDocument = () => {
    onClose()
  }

  const buttons = [{
    label: t("DG.main.userEntryView.openDocument"),
    onClick: openDocument,
    default: true
  }, {
    label: t("DG.main.userEntryView.newDocument"),
    onClick: createNewDocument
  }]

  return (
    <Modal isOpen={isOpen} onClose={onClose} initialFocusRef={defaultButtonRef} isCentered
      portalProps={containerRef ? { containerRef } : undefined}
    >
      <ModalOverlay />
      <ModalContent className="user-entry-modal-container" aria-labelledby="user-entry-title">
        <div className="user-entry-modal-header">
          <div className="user-entry-modal-title" id="user-entry-title">
            {t("DG.main.userEntryView.title")}
          </div>
        </div>
        <div className="user-entry-modal-body">
          {buttons.map((b, idx) => (
            <Button
              key={`${b.label}-${idx}`}
              ref={b.default ? defaultButtonRef : undefined}
              size="md"
              ml="15"
              className={`user-entry-button ${b.default ? "default" : ""}`}
              onClick={b.onClick}
              data-testid={`${b.label}-button`}
            >
              {b.label}
            </Button>
          ))}
        </div>
      </ModalContent>
    </Modal>
  )
}
