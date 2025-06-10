import {
  AlertDialog, AlertDialogBody, AlertDialogContent, AlertDialogFooter, AlertDialogOverlay, Button
} from "@chakra-ui/react"
import React, { useRef } from "react"
import { t } from "../../utilities/translation/translate"

import "./copied-cases-alert.scss"

interface ICopiedCasesAlertProps {
  copiedCasesString: string
  isOpen: boolean
  onClose: () => void
}
export function CopiedCasesAlert({ copiedCasesString, isOpen, onClose }: ICopiedCasesAlertProps) {
  const okRef = useRef<HTMLButtonElement>(null)

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={okRef}
      onClose={onClose}
    >
      <AlertDialogOverlay className="copied-cases-alert-overlay">
        <AlertDialogContent className="copied-cases-alert-content" style={{ width: 500 }}>
          <AlertDialogBody>
            {t("DG.Inspector.caseTable.exportCaseDialog.copiedData", { vars: [copiedCasesString] })}
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button ref={okRef} onClick={onClose} colorScheme="blue">
              {t("DG.SingleTextDialog.okButton.title")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  )
}
