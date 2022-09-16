import { Modal,
  ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  Button } from "@chakra-ui/react"
import React from "react"

import "./codap-modal.scss"

interface IModalButton {
  className?: string;
  label: string | React.FC<any>;
  isDefault?: boolean;
  isDisabled?: boolean;
  onClick?: (() => void) | (() => boolean); // close dialog on falsy return value
}

interface IProps<IContentProps> {
  children?: any
  isOpen: boolean
  onClose: () => void
  className?: string
  title: string
  Icon?: React.FC<any>
  Content: React.FC<IContentProps>
  contentProps?: IContentProps | any
  focusElement?: string
  canCancel?: boolean
  hasCloseButton?: boolean //top right "X" button
  // defined left-to-right, e.g. Extra Button, Cancel, OK
  buttons: IModalButton[]
  onCustomClose?: () => void
}
export const CodapModal = <IContentProps,>({ isOpen, onClose,
  className, Icon, title, Content, contentProps, hasCloseButton, buttons, onCustomClose
}: IProps<IContentProps>) => {

  return (
    <Modal isOpen={isOpen} onClose={onClose} >
    <ModalOverlay />
    <ModalContent>
      <ModalHeader h="30" className="codap-modal-header" data-testid="codap-modal-header">
        <div className="codap-modal-icon-container">
          {Icon && <Icon />}
        </div>
        <div className="codap-header-title">{title}</div>
        {hasCloseButton && <ModalCloseButton onClick={onClose}/>}
      </ModalHeader>
      <ModalBody>
        <Content {...(contentProps)} />
      </ModalBody>
      <ModalFooter mt="-5">
        {buttons.map((b: any, i)=>{
          const key = `${i}-${b.className}`
          return (
            <Button key={key} size="xs" variant="ghost" ml="5" onClick={b.onClick} data-testid={b.label}>
              {b.label}
            </Button>
          )
        })}
      </ModalFooter>
    </ModalContent>
    </Modal>
  )
}
