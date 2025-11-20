import {
  Box, Button, Flex, FormControl, FormLabel, ModalBody, ModalFooter, Tooltip
} from "@chakra-ui/react"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { observer } from "mobx-react-lite"
import { clsx } from "clsx"
import { isCommandKeyDown } from "../../utilities/platform-utils"
import { t } from "../../utilities/translation/translate"
import { FormulaEditor } from "./formula-editor"
import { FormulaEditorContext, useFormulaEditorState } from "./formula-editor-context"
import { CodapModal } from "../codap-modal"
import { InsertFunctionMenu } from "./formula-insert-function-menu"
import { InsertValuesMenu } from "./formula-insert-values-menu"
import ResizeHandle from "../../assets/icons/icon-corner-resize-handle.svg"

import styles from './edit-formula-modal.scss'

interface IProps {
  applyFormula: (formula: string, attrName: string) => void
  formulaPrompt?: string
  isOpen: boolean
  onClose?: () => void
  titleInput?: string
  titleLabel: string
  titlePlaceholder?: string
  value?: string
}

export const EditFormulaModal = observer(function EditFormulaModal({
  applyFormula, formulaPrompt, isOpen, onClose, titleInput, titleLabel, titlePlaceholder, value
}: IProps) {
  const minWidth = +styles.editFormulaModalMinWidth
  const minHeight = +styles.editFormulaModalMinHeight
  const headerHeight = 36
  const footerHeight = 56
  const insertButtonsHeight = 35

  const modalContentRef = React.useRef<HTMLDivElement>(null)
  const [showValuesMenu, setShowValuesMenu] = useState(false)
  const [showFunctionMenu, setShowFunctionMenu] = useState(false)
  const formulaEditorState = useFormulaEditorState(value ?? "")
  const { formula, setFormula } = formulaEditorState
  const [dimensions, setDimensions] = useState({ width: minWidth, height: minHeight })
  const editorHeight = dimensions.height - headerHeight - footerHeight - insertButtonsHeight
  const attrInputRef = useRef("")
  const isAutoCompleteMenuOpen = useRef(false)

  useEffect(() => {
    setFormula(value || "")
  }, [value, setFormula])

  const applyAndClose = () => {
    applyFormula(formula, attrInputRef.current)
    closeModal()
  }

  const closeModal = () => {
    setShowValuesMenu(false)
    setShowFunctionMenu(false)
    setFormula(value || "")
    onClose?.()
    setDimensions({ width: minWidth, height: minHeight })
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
    variant: "v3Clear",
    label: t("DG.AttrFormView.cancelBtnTitle"),
    tooltip: t("DG.AttrFormView.cancelBtnTooltip"),
    onClick: closeModal
  }, {
    variant: "v3Default",
    label: t("DG.AttrFormView.applyBtnTitle"),
    onClick: applyAndClose
  }]

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" && isCommandKeyDown(event)) {
      applyAndClose()
    }
    if (event.key === "Escape") {
      if (showValuesMenu) {
        setShowValuesMenu(false)
      } else if (showFunctionMenu) {
        setShowFunctionMenu(false)
      } else if (!isAutoCompleteMenuOpen.current) {
        closeModal()
      }
    }
    event.stopPropagation()
  }

  const handleResizeModal = useCallback((e: React.PointerEvent) => {
    if (e.pointerId !== undefined) {
      e.currentTarget.setPointerCapture(e.pointerId)
    }

    const modalRect = modalContentRef.current?.getBoundingClientRect()
    const startWidth = modalRect?.width ?? dimensions.width
    const startHeight = modalRect?.height ?? dimensions.height
    const startPosition = {x: e.pageX, y: e.pageY}

    let resizingWidth = startWidth, resizingHeight = startHeight

    const onPointerMove = (pointerMoveEvent: { pageX: number; pageY: number }) => {
      const xDelta = pointerMoveEvent.pageX - startPosition.x
      const yDelta = pointerMoveEvent.pageY - startPosition.y
      resizingWidth = Math.max(startWidth + xDelta, minWidth)
      resizingHeight = Math.max(startHeight + yDelta, minHeight)
      setDimensions({width: Math.round(resizingWidth), height: Math.round(resizingHeight)})
    }
    const onPointerUp = () => {
      document.body.removeEventListener("pointermove", onPointerMove, { capture: true })
      document.body.removeEventListener("pointerup", onPointerUp, { capture: true })
    }
    document.body.addEventListener("pointermove", onPointerMove, { capture: true })
    document.body.addEventListener("pointerup", onPointerUp, { capture: true })
  }, [dimensions.height, dimensions.width, minHeight, minWidth])

  const handleAttributeNameInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const trimmedValue = e.target.value.trim()
    attrInputRef.current = trimmedValue
  }

  return (
    <FormulaEditorContext.Provider value={formulaEditorState}>
      <CodapModal
        isOpen={isOpen}
        closeOnOverlayClick={false}
        onClose={closeModal}
        modalWidth={`${dimensions.width}px`}
        modalHeight={`${dimensions.height}px`}
        onClick={handleModalWhitespaceClick}
      >
        <ModalBody className="formula-modal-body" onKeyDown={handleKeyDown}>
          <FormControl display="flex" flexDirection="column" className="formula-form-control">
            <FormLabel display="flex" flexDirection="row"
                      className={clsx("attr-name-form-label", {"disabled": !titleInput})}>
              <span className="title-label">{titleLabel}</span>
              <input
                className="attr-name-input"
                defaultValue={titleInput}
                data-testid="attr-name-input"
                onBlur={handleAttributeNameInputBlur}
              />
              <span>=</span>
            </FormLabel>
            <FormLabel className="formula-editor-container">
              {formulaPrompt ?? t("DG.AttrFormView.formulaPrompt")}
              <FormulaEditor editorHeight={editorHeight} isAutoCompleteMenuOpen={isAutoCompleteMenuOpen}/>
            </FormLabel>
          </FormControl>
          <Flex className="formula-insert-buttons-container" flexDirection="row" justifyContent="flex-start">
            <Box position="relative">
              <Button variant="v3"
                className={clsx("formula-editor-button", "insert-value", {"menu-open": showValuesMenu})}
                size="xs" ml="5" onClick={handleInsertValuesOpen} data-testid="formula-insert-value-button"
              >
                {t("DG.AttrFormView.operandMenuTitle")}
              </Button>
              {showValuesMenu &&
                <InsertValuesMenu setShowValuesMenu={setShowValuesMenu} />
              }
            </Box>
            <Box position="relative">
              <Button variant="v3"
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
                  <Button key={key} size="xs" variant={b.variant} ml="5" onClick={b.onClick}
                        data-testid={`${b.label}-button`}>
                    {b.label}
                  </Button>
                </Tooltip>
              )
            })
          }
          <div className="codap-modal-corner bottom-right" onPointerDown={handleResizeModal}>
            <ResizeHandle className="component-resize-handle"/>
          </div>
        </ModalFooter>
      </CodapModal>
    </FormulaEditorContext.Provider>
  )
})
