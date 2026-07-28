import { ModalBody, ModalFooter, ModalHeader } from "@chakra-ui/react"
import React, { useCallback, useRef, useState } from "react"
import { observer } from "mobx-react-lite"
import { clsx } from "clsx"
import { isCommandKeyDown } from "../../utilities/platform-utils"
import { stripTrailingColon } from "../../utilities/translation/label-utils"
import { stripLabelDecoration } from "../../utilities/translation/strip-label-decoration"
import { t } from "../../utilities/translation/translate"
import { FormulaEditor } from "./formula-editor"
import { FormulaEditorContext, useFormulaEditorState } from "./formula-editor-context"
import { CodapModal } from "../codap-modal"
import { InsertFunctionMenu } from "./formula-insert-function-menu"
import { InsertValuesMenu } from "./formula-insert-values-menu"

import styles from './edit-formula-modal.scss'

interface IProps {
  // The `title` is the optional secondary value (e.g. an attribute name) edited alongside the
  // formula. Only some clients use it; most clients pass a `(formula) => void` callback and
  // ignore the second argument.
  applyFormula: (formula: string, title?: string) => void
  finalFocusRef?: React.RefObject<HTMLElement>
  formulaPrompt?: string
  isOpen: boolean
  // Text shown in the modal's header bar, e.g. "Edit Formula" or "Add Filter Formula".
  modalTitle: string
  onClose?: () => void
  returnFocusOnClose?: boolean
  titleInput?: string
  titleLabel: string
  titlePlaceholder?: string
  value?: string
}

export const EditFormulaModal = observer(function EditFormulaModal({
  applyFormula, finalFocusRef, formulaPrompt, isOpen, modalTitle, onClose, returnFocusOnClose, titleInput, titleLabel,
  titlePlaceholder, value
}: IProps) {
  const minWidth = +styles.editFormulaModalMinWidth
  // without a name row the modal is shorter by that row's height
  const minHeight = titleInput != null
                      ? +styles.editFormulaModalMinHeight
                      : +styles.editFormulaModalFilterMinHeight

  const modalContentRef = React.useRef<HTMLElement>(null)
  const formulaEditorContainerRef = useRef<HTMLLabelElement>(null)
  const insertValueButtonRef = useRef<HTMLButtonElement>(null)
  const insertFunctionButtonRef = useRef<HTMLButtonElement>(null)
  const [showValuesMenu, setShowValuesMenu] = useState(false)
  const [showFunctionMenu, setShowFunctionMenu] = useState(false)
  const formulaEditorState = useFormulaEditorState(value ?? "")
  const { formula, setFormula } = formulaEditorState
  // Set once the user drags the formula field's resize grip. Until then the modal takes its
  // default size, which depends on whether a name row is present — and that is not known on the
  // first render, since callers derive titleInput from a model that may still be resolving.
  const [userSize, setUserSize] = useState<{ width: number, height: number }>()
  const dimensions = userSize ?? { width: minWidth, height: minHeight }
  const [title, setTitle] = useState(titleInput ?? "")
  const isAutoCompleteMenuOpen = useRef(false)
  // Sync formula and title state from props using React's recommended
  // "adjust state during render" pattern. Without this, a title typed during a
  // previous editing session would carry over and overwrite the next session's title on Apply.
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    setFormula(value || "")
  }
  const [prevTitleInput, setPrevTitleInput] = useState(titleInput)
  if (titleInput !== prevTitleInput) {
    setPrevTitleInput(titleInput)
    setTitle(titleInput ?? "")
  }

  const applyAndClose = () => {
    applyFormula(formula, title.trim())
    closeModal()
  }

  const closeModal = () => {
    setShowValuesMenu(false)
    setShowFunctionMenu(false)
    setFormula(value || "")
    setTitle(titleInput ?? "")
    setPrevTitleInput(titleInput)
    isAutoCompleteMenuOpen.current = false
    onClose?.()
    setUserSize(undefined)
  }

  // Empties the formula without applying it or dismissing the modal, so the user can start over.
  const clearFormula = () => {
    setShowValuesMenu(false)
    setShowFunctionMenu(false)
    setFormula("")
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

  const handleInsertValuesClose = () => {
    setShowValuesMenu(false)
    insertValueButtonRef.current?.focus()
  }

  const handleInsertFunctionsOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowFunctionMenu(true)
    setShowValuesMenu(false)
  }

  const handleInsertFunctionsClose = () => {
    setShowFunctionMenu(false)
    insertFunctionButtonRef.current?.focus()
  }

  // Apply must remain last: cmMoveFocus() in formula-editor.tsx targets
  // `.formula-modal-footer button:last-of-type` when shift-tabbing out of the editor.
  const footerButtons = [{
    className: "cancel-button",
    testId: "Cancel-button",
    label: t("DG.AttrFormView.cancelBtnTitle"),
    tooltip: t("DG.AttrFormView.cancelBtnTooltip"),
    onClick: closeModal
  }, {
    className: "clear-button",
    testId: "Clear-button",
    label: t("V3.AttrFormView.clearBtnTitle"),
    tooltip: t("V3.AttrFormView.clearBtnTooltip"),
    onClick: clearFormula
  }, {
    className: "apply-button",
    testId: "Apply-button",
    label: t("DG.AttrFormView.applyBtnTitle"),
    onClick: applyAndClose
  }]

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" && isCommandKeyDown(event)) {
      applyAndClose()
    }
    if (event.key === "Escape") {
      if (showValuesMenu) {
        handleInsertValuesClose()
      } else if (showFunctionMenu) {
        handleInsertFunctionsClose()
      } else if (isAutoCompleteMenuOpen.current) {
        // Let CodeMirror handle closing autocomplete
      } else {
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

    // Before the first resize the modal is sized by its content, which can be shorter than the
    // nominal minimum; clamping to the measured size keeps the first drag from jumping.
    const widthFloor = Math.min(minWidth, startWidth)
    const heightFloor = Math.min(minHeight, startHeight)

    const onPointerMove = (pointerMoveEvent: { pageX: number; pageY: number }) => {
      const xDelta = pointerMoveEvent.pageX - startPosition.x
      const yDelta = pointerMoveEvent.pageY - startPosition.y
      resizingWidth = Math.max(startWidth + xDelta, widthFloor)
      resizingHeight = Math.max(startHeight + yDelta, heightFloor)
      setUserSize({width: Math.round(resizingWidth), height: Math.round(resizingHeight)})
    }
    const onPointerUp = () => {
      document.body.removeEventListener("pointermove", onPointerMove, { capture: true })
      document.body.removeEventListener("pointerup", onPointerUp, { capture: true })
    }
    document.body.addEventListener("pointermove", onPointerMove, { capture: true })
    document.body.addEventListener("pointerup", onPointerUp, { capture: true })
  }, [dimensions.height, dimensions.width, minHeight, minWidth])

  return (
    <FormulaEditorContext.Provider value={formulaEditorState}>
      <CodapModal
        ref={modalContentRef}
        finalFocusRef={finalFocusRef}
        initialRef={formulaEditorContainerRef}
        isOpen={isOpen}
        returnFocusOnClose={returnFocusOnClose}
        closeOnOverlayClick={false}
        onClose={closeModal}
        modalWidth={`${dimensions.width}px`}
        // Until the user resizes, the content decides the height: the formula field's two-row
        // minimum sets the default, rather than a hard-coded total that has to be kept in sync
        // with the heights of everything around it.
        modalHeight={userSize ? `${userSize.height}px` : "auto"}
        onClick={handleModalWhitespaceClick}
      >
        {/* ModalHeader wires the dialog's aria-labelledby to the title. */}
        <ModalHeader className="formula-modal-header" data-testid="formula-modal-header">
          <span className="formula-modal-title">{modalTitle}</span>
          <button type="button" className="formula-modal-close-button" onClick={closeModal}
                  aria-label={t("V3.AttrFormView.closeBtnLabel")} data-testid="formula-modal-close-button">
            ×
          </button>
        </ModalHeader>
        <ModalBody className="formula-modal-body" onKeyDown={handleKeyDown}>
          {/*
            TODO: rename the `attr-name-form-label` and `attr-name-input` className/data-testid
            to a generic `title-form-label` / `title-input`. The title is not always an
            attribute name (this modal is shared across multiple callers). Touches the SCSS,
            the focus selector in formula-editor.tsx (`input.attr-name-input:not(:disabled)`),
            and several Cypress selectors — keep `edit-attribute-properties-modal.tsx`'s
            independent `attr-name-input` testid as-is.
          */}
          <div className="formula-form-control">
            {/*
              Callers that edit only a formula (e.g. a filter formula) pass no titleInput and get
              no name row at all. `titleInput === ""` still gets one, since Attribute.setName()
              can trim a name to "" and the user needs a way to fix it.
            */}
            {titleInput != null &&
              <label className="attr-name-form-label">
                <span className="formula-field-label">{stripTrailingColon(titleLabel)}</span>
                <span className="attr-name-input-row">
                  <input
                    className="attr-name-input"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder={titlePlaceholder}
                    data-testid="attr-name-input"
                    aria-label={stripTrailingColon(titleLabel)}
                  />
                  <span className="attr-name-equals">=</span>
                </span>
              </label>
            }
            <label ref={formulaEditorContainerRef} className="formula-editor-container" tabIndex={-1}>
              <span className="formula-field-label">
                {stripTrailingColon(formulaPrompt ?? t("DG.AttrFormView.formulaPrompt"))}
              </span>
              <span className="formula-editor-frame">
                <FormulaEditor isAutoCompleteMenuOpen={isAutoCompleteMenuOpen}/>
                {/*
                  Sizing the formula field resizes the modal that sizes it. The
                  `component-resize-handle` class is what CodapModal's drag handler looks for to
                  leave the pointer alone; without it a drag runs alongside the resize and the
                  corner tracks the mouse at twice its speed.
                */}
                <span className="formula-editor-resize-corner component-resize-handle"
                      onPointerDown={handleResizeModal} data-testid="formula-editor-resize-corner">
                  <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
                    <path d="M11 4 4 11M11 8 8 11" stroke="currentColor" strokeWidth="1.25" fill="none"/>
                  </svg>
                </span>
              </span>
            </label>
          </div>
          <div className="formula-insert-buttons-container">
            <div className="formula-insert-button-wrapper">
              <button ref={insertValueButtonRef} type="button"
                className={clsx("formula-editor-button", "insert-value", {"menu-open": showValuesMenu})}
                onClick={handleInsertValuesOpen} data-testid="formula-insert-value-button"
                aria-expanded={showValuesMenu} aria-haspopup="menu"
              >
                <span className="formula-editor-button-label">
                  {stripLabelDecoration(t("DG.AttrFormView.operandMenuTitle"))}
                </span>
                <span className="formula-editor-button-caret" aria-hidden="true">▾</span>
              </button>
              {showValuesMenu &&
                <InsertValuesMenu buttonRef={insertValueButtonRef} onClose={handleInsertValuesClose} />
              }
            </div>
            <div className="formula-insert-button-wrapper">
              <button ref={insertFunctionButtonRef} type="button"
                className={clsx("formula-editor-button", "insert-function", {"menu-open": showFunctionMenu})}
                onClick={handleInsertFunctionsOpen} data-testid="formula-insert-function-button"
                aria-expanded={showFunctionMenu} aria-haspopup="menu"
              >
                <span className="formula-editor-button-label">
                  {stripLabelDecoration(t("DG.AttrFormView.functionMenuTitle"))}
                </span>
                <span className="formula-editor-button-caret" aria-hidden="true">▾</span>
              </button>
              {showFunctionMenu &&
                <InsertFunctionMenu buttonRef={insertFunctionButtonRef} onClose={handleInsertFunctionsClose} />
              }
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="formula-modal-footer">
          { footerButtons.map((b) => {
              return (
                <button key={b.testId} type="button" title={b.tooltip}
                      className={clsx("formula-modal-footer-button", b.className)}
                      onClick={b.onClick} data-testid={b.testId}>
                  {b.label}
                </button>
              )
            })
          }
        </ModalFooter>
      </CodapModal>
    </FormulaEditorContext.Provider>
  )
})
