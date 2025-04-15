import { Button } from "@chakra-ui/react"
import React from "react"
import { useCfmContext } from "../../hooks/use-cfm-context"
import { t } from "../../utilities/translation/translate"

import "./user-entry-modal.scss"

interface IProps {
  isOpen: boolean
  onClose: () => void
}

export const UserEntryModal = ({ isOpen, onClose }: IProps) => {
  const cfm = useCfmContext()

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
    <div className="user-entry-modal-container" aria-modal="true">
      <div className="user-entry-modal-header">
        <div className="user-entry-modal-title">
          {t("DG.main.userEntryView.title")}
        </div>
      </div>
      <div className="user-entry-modal-body">
        { buttons.map((b, idx) => (
            <Button key={`${b.label}-${idx}`} size="md" variant={`${b.default ? "default" : ""}`} ml="15"
                    onClick={b.onClick} _hover={{backgroundColor: "#3c94a1", color: "white"}}
                    data-testid={`${b.label}-button`}>
              {b.label}
            </Button>
          ))
        }
      </div>
    </div>
  )
}
