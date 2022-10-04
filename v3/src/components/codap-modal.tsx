import { Modal,
  ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  Button } from "@chakra-ui/react"
import React, { forwardRef, useEffect } from "react"

import "./codap-modal.scss"

interface IModalButton {
  className?: string;
  label: string | React.FC<any>;
  isDefault?: boolean;
  isDisabled?: boolean;
  onClick?: (() => void) | (() => boolean); // close dialog on falsy return value
}

interface IProps<TContentProps> {
  children?: any
  isOpen: boolean
  onClose: () => void
  className?: string
  title: string
  Icon?: React.FC<any>
  Content: React.FC<TContentProps>
  contentProps?: TContentProps | any
  focusElement?: string
  canCancel?: boolean
  hasCloseButton?: boolean //top right "X" button
  // defined left-to-right, e.g. Extra Button, Cancel, OK
  buttons: IModalButton[]
  onCustomClose?: () => void
}

const isClickInElement = (click: MouseEvent, elt: HTMLElement | null) => {
  const bounds = elt?.getBoundingClientRect()
  return !!bounds && (bounds.left <= click.clientX) && (click.clientX <= bounds.right) &&
                      (bounds.top <= click.clientY) && (click.clientY <= bounds.bottom)
}
// eslint-disable-next-line react/display-name
export const CodapModal = forwardRef(<IContentProps,>({ isOpen, onClose,
  className, Icon, title, Content, contentProps, hasCloseButton, buttons, onCustomClose
}: IProps<IContentProps>, ref: React.LegacyRef<HTMLElement> | undefined) => {
  const portal = Array.from(document.querySelectorAll(".chakra-portal")).pop()
  useEffect(() => {
    const codapModalContent = portal?.querySelector(".codap-modal-content")

    const handleClick = (e: MouseEvent) => {
      console.log(e)
      const buttonEls = codapModalContent?.querySelectorAll("button")
      const radios = codapModalContent?.querySelectorAll("input[type=radio]")
      const buttonItems = buttonEls && Array.from(buttonEls)
      const radioItems = radios && Array.from(radios) as HTMLElement[]
      const clickedItem = Array.from(buttonItems || radioItems || [])
                            .find(item => isClickInElement(e, item))
      clickedItem?.dispatchEvent(new MouseEvent(e.type, e))
    }
    codapModalContent?.addEventListener("click", handleClick)
    return () => codapModalContent?.removeEventListener("click", handleClick)
  }, [portal])

  return (
    <Modal isOpen={isOpen} onClose={onClose} data-testid="codap-modal">
      <ModalOverlay />
      <ModalContent ref={ref} className="codap-modal-content">
        <ModalHeader h="30" className="codap-modal-header" data-testid="codap-modal-header">
          <div className="codap-modal-icon-container">
            {Icon && <Icon />}
          </div>
          <div className="codap-header-title">{title}</div>
          {hasCloseButton && <ModalCloseButton onClick={onClose} data-testid="modal-close-button"/>}
        </ModalHeader>
        <ModalBody>
          <Content {...contentProps} />
        </ModalBody>
        <ModalFooter mt="-5">
          {buttons.map((b: any, i)=>{
            const key = `${i}-${b.className}`
            return (
              <Button key={key} size="xs" variant="ghost" ml="5" onClick={b.onClick} data-testid={`${b.label}-button`}>
                {b.label}
              </Button>
            )
          })}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
})
