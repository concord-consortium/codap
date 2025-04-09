import { Button, ModalBody, ModalHeader } from "@chakra-ui/react"
import React from "react"
import { useCfmContext } from "../../hooks/use-cfm-context"
import { t } from "../../utilities/translation/translate"
import { CodapModal } from "../codap-modal"
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
    <CodapModal
      closeOnOverlayClick={false}
      isOpen={isOpen}
      modalHeight={"120px"}
      modalWidth={"400px"}
      onClose={onClose}
      data-testid="user-entry-modal"
      isCentered={true}
      noOverlay={false}
    >
      <ModalHeader className="user-entry-modal codap-modal-header"
                  data-testid="codap-modal-header" fontSize="md" h="30">
        <div className="codap-header-title">
          {t("DG.main.userEntryView.title")}
        </div>
      </ModalHeader>
      <ModalBody className="user-entry-modal-body">
        { buttons.map((b, idx) => (
            <Button key={`${b.label}-${idx}`} size="md" variant={`${b.default ? "default" : ""}`} ml="15"
                    onClick={b.onClick} _hover={{backgroundColor: "#3c94a1", color: "white"}}
                    data-testid={`${b.label}-button`}>
              {b.label}
            </Button>
          ))
        }
      </ModalBody>
    </CodapModal>
  )
}
