import { Modal, ModalContent, ModalOverlay } from "@chakra-ui/react"
import React, { ReactNode, forwardRef } from "react"

import "./codap-modal.scss"

interface IProps {
  children?: ReactNode
  closeOnOverlayClick?: boolean
  initialRef?: any
  isOpen: boolean
  onClick?: () => void
  onClose: () => void
  modalWidth?: string
  modalHeight?: string
}

export const CodapModal = forwardRef(({
  children, closeOnOverlayClick=true, initialRef, isOpen, onClick, onClose, modalWidth, modalHeight
}: IProps, ref: React.LegacyRef<HTMLElement> | undefined) => {
  return (
    <Modal
      closeOnOverlayClick={closeOnOverlayClick}
      data-testid="codap-modal"
      initialFocusRef={initialRef}
      isOpen={isOpen}
      onClose={onClose}
      size="xs"
    >
      <ModalOverlay />
      <ModalContent
        className="codap-modal-content"
        h={modalHeight || "500px"}
        onClick={onClick}
        ref={ref}
        w={modalWidth || "400px"}
      >
        {children}
      </ModalContent>
    </Modal>
  )
})
CodapModal.displayName = "CodapModal"
