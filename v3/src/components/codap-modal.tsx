import { Modal, ModalContent, ModalOverlay, useMergeRefs } from "@chakra-ui/react"
import React, { ReactNode, forwardRef, useEffect, useRef, useState } from "react"

import "./codap-modal.scss"

interface IProps {
  children?: ReactNode
  closeOnOverlayClick?: boolean
  initialRef?: any
  isOpen: boolean
  onClick?: () => void
  onClose: () => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  modalWidth?: string
  modalHeight?: string
}

export const CodapModal = forwardRef(({
  children, initialRef, isOpen, closeOnOverlayClick, onClick, onClose, onKeyDown, modalWidth, modalHeight
}: IProps, ref: React.Ref<HTMLElement> | undefined) => {

  return (
    <Modal
      data-testid="codap-modal"
      initialFocusRef={initialRef}
      isOpen={isOpen}
      closeOnOverlayClick={closeOnOverlayClick}
      onClose={onClose}
      size="xs"
    >
      <ModalOverlay />
      <DraggableModalContent
        fRef={ref}
        modalWidth={modalWidth}
        modalHeight={modalHeight}
        onClick={onClick}
        onKeyDown={onKeyDown}
        isOpen={isOpen}
      >
        {children}
      </DraggableModalContent>
    </Modal>
  )
})
CodapModal.displayName = "CodapModal"

interface IDraggableModalContentProps {
  children: ReactNode
  modalWidth?: string
  modalHeight?: string
  onClick?: () => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  fRef: React.Ref<HTMLElement> | undefined
  isOpen: boolean
}

const DraggableModalContent = ({children, modalWidth, modalHeight, onClick, onKeyDown, fRef, isOpen
    }: IDraggableModalContentProps) => {
  const [modalPos, setModalPos] = useState({left: 350, top: 250})
  const modalRef = useRef<HTMLElement | null>(null)
  const mergedRef = useMergeRefs(fRef, modalRef)

  useEffect(() => {
    const modalElement = modalRef.current
    if (!modalElement) {
      return
    }

    let isDragging = false
    let startX = 0
    let startY = 0
    let initialX = 0
    let initialY = 0

    const handleMouseDown = (e: MouseEvent) => {
      // Prevent dragging if the target is an interactive element (like Select, button, input, etc.)
      const interactiveTags = ["INPUT", "TEXTAREA", "SELECT", "OPTION", "BUTTON"]
      const targetElt = e.target as HTMLElement
      if (interactiveTags.includes(targetElt.tagName) ||
          targetElt.getAttribute("contenteditable") === "true" ||
          // client can add .input-element to indicate that an element should be treated like an input
          targetElt.closest(".input-element") != null ||
          // Resizing the component
          targetElt.closest(".component-resize-handle") != null) {
        return
      }

      e.stopPropagation()
      isDragging = true
      startX = e.clientX
      startY = e.clientY
      if (modalElement) {
        initialX = modalElement.offsetLeft
        initialY = modalElement.offsetTop
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - startX
        const deltaY = e.clientY - startY
        modalElement.style.left = `${initialX + deltaX}px`
        modalElement.style.top = `${initialY + deltaY}px`
        setModalPos({left: initialX + deltaX, top: initialY + deltaY})
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      isDragging = false
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    modalElement.addEventListener("mousedown", handleMouseDown)

    return () => {
      modalElement.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [])



  const style: React.CSSProperties = {
    width: modalWidth || "400px",
    height: modalHeight || "400px",
    cursor: "move",
    top: modalPos.top,
    left: modalPos.left,
    position: "absolute"
  }

  const varStyle = {
    "--modal-width": modalWidth || "400px",
    "--modal-height": modalHeight || "400px"
  }

  return (
    <ModalContent
      ref={mergedRef}
      style={{...style, ...varStyle}}
      onClick={onClick}
      onKeyDownCapture={onKeyDown}
      className="codap-modal-content"
    >
      {children}
    </ModalContent>
  )
}
