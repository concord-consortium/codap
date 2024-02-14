import React, { useState } from "react"
import { observer } from "mobx-react-lite"
import { Button, useDisclosure } from "@chakra-ui/react"
import { t } from "../../../../utilities/translation/translate"
import { EditFormulaModal } from "./edit-formula-modal"
import { IAdornmentBannerComponentProps } from "../adornment-component-info"
import { IPlottedFunctionAdornmentModel } from "./plotted-function-adornment-model"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"

import "./plotted-function-adornment-banner.scss"

export const PlottedFunctionAdornmentBanner = observer(function PlottedFunctionAdornmentBanner(
  props: IAdornmentBannerComponentProps
) {
  const model = props.model as IPlottedFunctionAdornmentModel
  const graphModel = useGraphContentModelContext()
  const { expression, error } = model
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
      "DG.Undo.graph.changePlotFunction", "DG.Redo.graph.changePlotFunction"
    )
  }

  return (
    <>
      <Button
        variant="unstyled"
        className="plotted-function-control"
        data-testid="plotted-function-control"
        onClick={handleEditExpressionOpen}
      >
        <div className="plotted-function-control-row">
          <div className="plotted-function-control-label" data-testid="plotted-function-control-label">
            { t("DG.PlottedFunction.formulaPrompt") }
          </div>
          <div className="plotted-function-control-value" data-testid="plotted-function-control-value">
            {expression}
          </div>
        </div>
        { error && <div className="plotted-function-error" data-testid="plotted-function-error">{error}</div> }
      </Button>
      { modalIsOpen &&
        <EditFormulaModal
          isOpen={formulaModal.isOpen}
          currentValue={expression}
          onClose={handleEditExpressionClose} />
      }
    </>
  )
})
