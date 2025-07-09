import React, { useState } from "react"
import { observer } from "mobx-react-lite"
import { Button, useDisclosure } from "@chakra-ui/react"
import { logMessageWithReplacement } from "../../../../../lib/log-message"
import { t } from "../../../../../utilities/translation/translate"
import { EditFormulaModal } from "../../../../common/edit-formula-modal"
import { useGraphContentModelContext } from "../../../hooks/use-graph-content-model-context"
import { IAdornmentBannerComponentProps } from "../../adornment-component-info"
import { IPlottedValueAdornmentModel } from "./plotted-value-adornment-model"

import "./plotted-value-adornment-banner.scss"

export const PlottedValueAdornmentBanner = observer(function PlottedValueAdornmentBanner(
  props: IAdornmentBannerComponentProps
) {
  const model = props.model as IPlottedValueAdornmentModel
  const graphModel = useGraphContentModelContext()
  const { expression, error } = model
  const { isOpen, onClose, onOpen } = useDisclosure()
  const [modalIsOpen, setModalIsOpen] = useState(false)

  const handleModalOpen = (open: boolean) => {
    setModalIsOpen(open)
  }

  const handleEditExpressionOpen = () => {
    onOpen()
    handleModalOpen(true)
  }

  const handleCloseModal = () => {
    onClose()
    setModalIsOpen(false)
  }

  const handleEditExpressionClose = (newExpression: string) => {
    handleCloseModal()
    graphModel.applyModelChange(
      () => model.setExpression(newExpression),
      {
        undoStringKey: "DG.Undo.graph.changePlotValue",
        redoStringKey: "DG.Redo.graph.changePlotValue",
        log: logMessageWithReplacement("Change plotted value from %@ to %@",
                {expression, newExpression})
      }
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
        <div className="plotted-value-control-row">
          <div className="plotted-value-control-label" data-testid="plotted-value-control-label">
            { t("DG.PlottedValue.formulaPrompt") }
          </div>
          <div className="plotted-value-control-value" data-testid="plotted-value-control-value">
            {expression}
          </div>
        </div>
        { error && <div className="plotted-value-error" data-testid="plotted-value-error">{error}</div> }
      </Button>
      { modalIsOpen &&
        <EditFormulaModal
          applyFormula={handleEditExpressionClose}
          formulaPrompt={t("DG.PlottedValue.formulaPrompt")}
          isOpen={isOpen}
          onClose={handleCloseModal}
          titleLabel={t("DG.PlottedValue.namePrompt")}
          value={expression}
        />
      }
    </>
  )
})
