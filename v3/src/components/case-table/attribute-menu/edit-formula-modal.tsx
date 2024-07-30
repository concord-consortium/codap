import {
  Button, FormControl, FormLabel, Input, ModalBody, ModalCloseButton, ModalFooter, ModalHeader,
  Textarea, Tooltip
} from "@chakra-ui/react"
import React, { useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { updateAttributesNotification, updateCasesNotification } from "../../../models/data/data-set-notifications"
import { t } from "../../../utilities/translation/translate"
import { CodapModal } from "../../codap-modal"

import "./attribute-menu.scss"

interface IProps {
  attributeId: string
  isOpen: boolean
  onClose: () => void
}

export const EditFormulaModal = observer(function EditFormulaModal({ attributeId, isOpen, onClose }: IProps) {
  const dataSet = useDataSetContext()
  const attribute = dataSet?.attrFromID(attributeId)
  const [formula, setFormula] = useState("")

  useEffect(() => {
    setFormula(attribute?.formula?.display || "")
  }, [attribute?.formula?.display])

  const applyFormula = () => {
    if (attribute) {
      dataSet?.applyModelChange(() => {
        attribute.setDisplayExpression(formula)
      }, {
        // TODO Should also broadcast notify component edit formula notification
        notify: [
          updateCasesNotification(dataSet),
          updateAttributesNotification([attribute], dataSet)
        ],
        undoStringKey: "DG.Undo.caseTable.editAttributeFormula",
        redoStringKey: "DG.Redo.caseTable.createAttribute"
      })
    }
    closeModal()
  }

  const closeModal = () => {
    onClose()
  }

  const handleFormulaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setFormula(e.target.value)

  const buttons = [{
    label: t("DG.AttrFormView.cancelBtnTitle"),
    tooltip: t("DG.AttrFormView.cancelBtnTooltip"),
    onClick: closeModal
  }, {
    label: t("DG.AttrFormView.applyBtnTitle"),
    onClick: applyFormula,
    default: true
  }]

  return (
    <CodapModal
      isOpen={isOpen}
      onClose={onClose}
      modalWidth={"400px"}
      modalHeight={"180px"}
    >
      <ModalHeader h="30" className="codap-modal-header" fontSize="md" data-testid="codap-modal-header">
        <div className="codap-modal-icon-container" />
        <div className="codap-header-title" />
        <ModalCloseButton onClick={onClose} data-testid="modal-close-button" />
      </ModalHeader>
      <ModalBody>
        <FormControl display="flex" flexDirection="column" className="formula-form-control">
          <FormLabel display="flex" flexDirection="row">{t("DG.AttrFormView.attrNamePrompt")}
            <Input
              size="xs" ml={5} placeholder="attribute" value={attribute?.name} data-testid="attr-name-input" disabled
            />
          </FormLabel>
          <FormLabel>{t("DG.AttrFormView.formulaPrompt")}
            <Textarea size="xs" value={formula} onChange={handleFormulaChange}
              onKeyDown={(e) => e.stopPropagation()} data-testid="attr-formula-input" />
          </FormLabel>
        </FormControl>
      </ModalBody>
      <ModalFooter mt="-5">
        {
          buttons.map((b, idx) => {
            const key = `${idx}-${b.label}`
            return (
              <Tooltip key={idx} label={b.tooltip} h="20px" fontSize="12px" color="white" openDelay={1000}
                placement="bottom" bottom="15px" left="15px" data-testid="modal-tooltip"
              >
                <Button key={key} size="xs" variant={`${b.default ? "default" : ""}`} ml="5" onClick={b.onClick}
                      _hover={{backgroundColor: "#72bfca", color: "white"}} data-testid={`${b.label}-button`}>
                  {b.label}
                </Button>
              </Tooltip>
            )
          })
        }
      </ModalFooter>
    </CodapModal>
  )
})
