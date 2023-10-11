import React, { useState } from "react"
import { observer } from "mobx-react-lite"
import { Button, useDisclosure } from "@chakra-ui/react"
import t from "../../../../../utilities/translation/translate"
import { EditFormulaModal } from "./edit-formula-modal"
import { IPlottedValueAdornmentModel } from "./plotted-value-adornment-model"
import { useGraphContentModelContext } from "../../../hooks/use-graph-content-model-context"

import "./plotted-value-adornment-banner.scss"

interface IProps {
  model: IPlottedValueAdornmentModel
}

export const PlottedValueAdornmentBanner = observer(function PlottedValueAdornmentBanner({ model }: IProps) {
  const graphModel = useGraphContentModelContext()
  const expression = model.expression
  const formulaModal = useDisclosure()
  const [modalIsOpen, setModalIsOpen] = useState(false)

  const handleModalOpen = (open: boolean) => {
    setModalIsOpen(open)
  }

  const handleEditExpressionOpen = () => {
    formulaModal.onOpen()
    handleModalOpen(true)
  }

  const handleEditExpressionClose = (newExpression: string) => {
    formulaModal.onClose()
    handleModalOpen(false)
    graphModel.applyUndoableAction(
      () => model.setExpression(newExpression),
      "DG.Undo.graph.changePlotValue", "DG.Redo.graph.changePlotValue"
    )
  }

  return (
    <>
      <Button
        variant="unstyled"
        className="plotted-value-control"
        data-testid="plotted-value-control"
        onClick={handleEditExpressionOpen}
      >
        <div className="plotted-value-control-label" data-testid="plotted-value-control-label">
          { t("DG.PlottedValue.formulaPrompt") }
        </div>
        <div className="plotted-value-control-value" data-testid="plotted-value-control-value">
          {expression}
        </div>
      </Button>
      { modalIsOpen &&
        <EditFormulaModal isOpen={formulaModal.isOpen} currentValue={expression} onClose={handleEditExpressionClose} />
      }
    </>
  )
})