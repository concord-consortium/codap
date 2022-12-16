import { Modal,
  ModalOverlay, ModalContent } from "@chakra-ui/react"
import React, { ReactNode, forwardRef } from "react"

import "./codap-modal.scss"

interface IProps {
  children?: ReactNode
  isOpen: boolean
  onClose: () => void
  modalWidth?: string

}

export const CodapModal = forwardRef(({ children, isOpen, onClose, modalWidth
}: IProps, ref: React.LegacyRef<HTMLElement> | undefined) => {

  return (
    <Modal isOpen={isOpen} onClose={onClose} data-testid="codap-modal" size="xs">
      <ModalOverlay />
      <ModalContent ref={ref} className="codap-modal-content" w={modalWidth || "400px"}>
        {children}
      </ModalContent>
    </Modal>
  )
})
CodapModal.displayName = "CodapModal"
