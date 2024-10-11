import {  Box, Button, Flex, FormControl, FormLabel, Input, ModalBody, ModalCloseButton,
          ModalFooter, ModalHeader, Tooltip } from "@chakra-ui/react"
import React, { useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { logStringifiedObjectMessage } from "../../../lib/log-message"
import { updateAttributesNotification, updateCasesNotification } from "../../../models/data/data-set-notifications"
import { t } from "../../../utilities/translation/translate"
import { FormulaEditor } from "../../common/formula-editor"
import { CodapModal } from "../../codap-modal"
import { InsertFunctionMenu } from "./formula-insert-function-menu"
import { InsertValuesMenu } from "./formula-insert-values-menu"
import { clsx } from "clsx"

import "./attribute-menu.scss"

interface IProps {
  attributeId: string
  isOpen: boolean
  onClose: () => void
}

export const EditFormulaModal = observer(function EditFormulaModal({ attributeId, isOpen, onClose }: IProps) {
  const dataSet = useDataSetContext()
  const attribute = dataSet?.attrFromID(attributeId)
  const [formula, setFormula] = useState(attribute?.formula?.display || "")
  const [showValuesMenu, setShowValuesMenu] = useState(false)
  const [showFunctionMenu, setShowFunctionMenu] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [editorSelection, setEditorSelection] = useState({from: 0, to: 0})

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
        redoStringKey: "DG.Redo.caseTable.editAttributeFormula",
        log: logStringifiedObjectMessage("Edit attribute formula: %@",
              {name: attribute.name, collection: dataSet?.getCollectionForAttribute(attributeId)?.name, formula},
              "data")
      })
    }
    closeModal()
  }

  const closeModal = () => {
    setShowValuesMenu(false)
    setShowFunctionMenu(false)
    onClose()
  }

  const handleModalWhitspaceClick = () => {
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
    onClick: applyFormula,
    default: true
  }]

  return (
    <CodapModal
      isOpen={isOpen}
      onClose={closeModal}
      modalWidth={"400px"}
      modalHeight={"180px"}
      onClick={handleModalWhitspaceClick}
    >
      <ModalHeader h="30" className="codap-modal-header" fontSize="md" data-testid="codap-modal-header">
        <div className="codap-modal-icon-container" />
        <div className="codap-header-title" />
        <ModalCloseButton onClick={closeModal} data-testid="modal-close-button" />
      </ModalHeader>
      <ModalBody className="formula-modal-body" onKeyDown={e => e.stopPropagation()}>
        <FormControl display="flex" flexDirection="column" className="formula-form-control">
          <FormLabel display="flex" flexDirection="row">{t("DG.AttrFormView.attrNamePrompt")}
            <Input
              size="xs" ml={5} placeholder="attribute" value={attribute?.name} data-testid="attr-name-input" disabled
            />
          </FormLabel>
          <FormLabel>{t("DG.AttrFormView.formulaPrompt")}
            <FormulaEditor formula={formula} setFormula={setFormula} setCursorPosition={setCursorPosition}
                setEditorSelection={(from, to) => setEditorSelection({ from, to })}/>
          </FormLabel>
        </FormControl>
        <Flex flexDirection="row" justifyContent="flex-start">
          <Box position="relative">
            <Button className={clsx("formula-editor-button", "insert-value", {"menu-open": showValuesMenu})}
                    size="xs" ml="5" onClick={handleInsertValuesOpen}>
              {t("DG.AttrFormView.operandMenuTitle")}
            </Button>
            {showValuesMenu &&
              <InsertValuesMenu setShowValuesMenu={setShowValuesMenu}
                    setFormula={setFormula} formula={formula} cursorPosition={cursorPosition}
                    editorSelection={editorSelection} />
            }
          </Box>
          <Box position="relative">
            <Button className={clsx("formula-editor-button", "insert-function", {"menu-open": showFunctionMenu})}
                    size="xs" ml="5" onClick={handleInsertFunctionsOpen}>
              {t("DG.AttrFormView.functionMenuTitle")}
            </Button>
            {showFunctionMenu &&
                <InsertFunctionMenu setShowFunctionMenu={setShowFunctionMenu}
                    setFormula={setFormula} formula={formula} />
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
  )
})
