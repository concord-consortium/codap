import { Button } from "@chakra-ui/react"
import React, { useEffect, useRef } from "react"
import { useCfmContext } from "../../hooks/use-cfm-context"
import { t } from "../../utilities/translation/translate"

import "./user-entry-modal.scss"

interface IProps {
  isOpen: boolean
  onClose: () => void
}

export const UserEntryModal = ({ isOpen, onClose }: IProps) => {
  const cfm = useCfmContext()
  const modalRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      onClose()
    }
    if (event.key === "Enter") {
      openDocument()
    }
  }

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

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus()
    }
  }, [isOpen])

  return (
    <div ref={modalRef} tabIndex={-1} className="user-entry-modal-container" onKeyDown={handleKeyDown}>
      <div className="user-entry-modal-header">
        <div className="user-entry-modal-title">
          {t("DG.main.userEntryView.title")}
        </div>
      </div>
      <div className="user-entry-modal-body">
        { buttons.map((b, idx) => (
            <Button key={`${b.label}-${idx}`} size="md" ml="15"
                    className={`user-entry-button ${b.default ? "default" : ""}`}
                    onClick={b.onClick} data-testid={`${b.label}-button`}>
              {b.label}
            </Button>
          ))
        }
      </div>
    </div>
  )
}
