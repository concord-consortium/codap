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
  modalWidth?: string
  modalHeight?: string
}

export const CodapModal = forwardRef(({
  children, initialRef, isOpen, onClick, onClose, modalWidth, modalHeight
}: IProps, ref: React.Ref<HTMLElement> | undefined) => {

  return (
    <Modal
      data-testid="codap-modal"
      initialFocusRef={initialRef}
      isOpen={isOpen}
      onClose={onClose}
      size="xs"
    >
      <ModalOverlay />
      <DraggableModalContent
          fowardRef={ref}
          modalWidth={modalWidth}
          modalHeight={modalHeight}
          onClick={onClick}
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
  fowardRef: React.Ref<HTMLElement> | undefined
  isOpen: boolean
}

const DraggableModalContent = ({children, modalWidth, modalHeight, onClick, fowardRef, isOpen
    }: IDraggableModalContentProps) => {
  const [modalPos, setModalPos] = useState({left: 350, top: 250})
  const modalRef = useRef<HTMLElement | null>(null)
  const mergedRef = useMergeRefs(fowardRef, modalRef)

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

    const onMouseDown = (e: MouseEvent) => {
      e.stopPropagation()
      e.preventDefault() // Prevent the default behavior
      isDragging = true
      startX = e.clientX
      startY = e.clientY
      if (modalElement) {
        initialX = modalElement.offsetLeft
        initialY = modalElement.offsetTop
      }

      document.addEventListener("mousemove", onMouseMove)
      document.addEventListener("mouseup", onMouseUp)
    }

    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - startX
        const deltaY = e.clientY - startY
        modalElement.style.left = `${initialX + deltaX}px`
        modalElement.style.top = `${initialY + deltaY}px`
        setModalPos({left: initialX + deltaX, top: initialY + deltaY})
      }
    }

    const onMouseUp = (e: MouseEvent) => {
      isDragging = false
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
    }

    modalElement.addEventListener("mousedown", onMouseDown)

    return () => {
      modalElement.removeEventListener("mousedown", onMouseDown)
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
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
      className="codap-modal-content"
    >
      {children}
    </ModalContent>
  )
}
