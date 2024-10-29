import {
  Box, Button, Flex, FormControl, FormLabel, Input, ModalBody, ModalCloseButton, ModalFooter, ModalHeader, Tooltip
} from "@chakra-ui/react"
import React, { useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { clsx } from "clsx"
import { t } from "../../utilities/translation/translate"
import { FormulaEditor } from "./formula-editor"
import { FormulaEditorContext, useFormulaEditorState } from "./formula-editor-context"
import { CodapModal } from "../codap-modal"
import { InsertFunctionMenu } from "./formula-insert-function-menu"
import { InsertValuesMenu } from "./formula-insert-values-menu"

import "./edit-formula-modal.scss"

interface IProps {
  applyFormula: (formula: string) => void
  isOpen: boolean
  onClose: () => void
  titleInput?: string
  titleLabel: string
  value?: string
}

export const EditFormulaModal = observer(function EditFormulaModal({
  applyFormula, isOpen, onClose, titleInput, titleLabel, value
}: IProps) {
  const [showValuesMenu, setShowValuesMenu] = useState(false)
  const [showFunctionMenu, setShowFunctionMenu] = useState(false)

  const formulaEditorState = useFormulaEditorState(value ?? "")
  const { formula, setFormula } = formulaEditorState


  useEffect(() => {
    setFormula(value || "")
  }, [value, setFormula])

  const handleApplyClick = () => {
    applyFormula(formula)
    closeModal()
  }

  const closeModal = () => {
    setShowValuesMenu(false)
    setShowFunctionMenu(false)
    onClose()
  }

  const handleModalWhitespaceClick = () => {
    setShowValuesMenu(false)
    setShowFunctionMenu(false)
  }

  const handleInsertValuesOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowValuesMenu(true)
    setShowFunctionMenu(false)
  }

  const handleInsertFunctionsOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowFunctionMenu(true)
    setShowValuesMenu(false)
  }

  const footerButtons = [{
    label: t("DG.AttrFormView.cancelBtnTitle"),
    tooltip: t("DG.AttrFormView.cancelBtnTooltip"),
    onClick: closeModal
  }, {
    label: t("DG.AttrFormView.applyBtnTitle"),
    onClick: handleApplyClick,
    default: true
  }]

  return (
    <FormulaEditorContext.Provider value={formulaEditorState}>
      <CodapModal
        isOpen={isOpen}
        onClose={closeModal}
        modalWidth={"400px"}
        modalHeight={"180px"}
        onClick={handleModalWhitespaceClick}
      >
        <ModalHeader h="30" className="codap-modal-header" fontSize="md" data-testid="codap-modal-header">
          <div className="codap-modal-icon-container" />
          <div className="codap-header-title" />
          <ModalCloseButton onClick={closeModal} data-testid="modal-close-button" />
        </ModalHeader>
        <ModalBody className="formula-modal-body" onKeyDown={e => e.stopPropagation()}>
          <FormControl display="flex" flexDirection="column" className="formula-form-control">
            <FormLabel display="flex" flexDirection="row">{titleLabel}
              <Input
                size="xs"
                ml={5}
                placeholder="attribute"
                value={titleInput ?? ""}
                data-testid="attr-name-input"
                disabled
              />
            </FormLabel>
            <FormLabel>{t("DG.AttrFormView.formulaPrompt")}
              <FormulaEditor />
            </FormLabel>
          </FormControl>
          <Flex flexDirection="row" justifyContent="flex-start">
            <Box position="relative">
              <Button className={clsx("formula-editor-button", "insert-value", {"menu-open": showValuesMenu})}
                      size="xs" ml="5" onClick={handleInsertValuesOpen} data-testid="formula-insert-value-button">
                {t("DG.AttrFormView.operandMenuTitle")}
              </Button>
              {showValuesMenu &&
                <InsertValuesMenu setShowValuesMenu={setShowValuesMenu} />
              }
            </Box>
            <Box position="relative">
              <Button 
                className={clsx("formula-editor-button", "insert-function", {"menu-open": showFunctionMenu})}
                size="xs" ml="5" onClick={handleInsertFunctionsOpen} data-testid="formula-insert-function-button"
              >
                {t("DG.AttrFormView.functionMenuTitle")}
              </Button>
              {showFunctionMenu &&
                <InsertFunctionMenu setShowFunctionMenu={setShowFunctionMenu} />
              }
            </Box>
          </Flex>
        </ModalBody>
        <ModalFooter mt="-5" className="formula-modal-footer">
          { footerButtons.map((b, idx) => {
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
    </FormulaEditorContext.Provider>
  )
})
