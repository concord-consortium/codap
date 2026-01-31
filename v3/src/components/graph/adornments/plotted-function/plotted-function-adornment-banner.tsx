import { useState } from "react"
import { observer } from "mobx-react-lite"
import { Button, useDisclosure } from "@chakra-ui/react"
import { t } from "../../../../utilities/translation/translate"
import { logStringifiedObjectMessage } from "../../../../lib/log-message"
import { EditFormulaModal } from "../../../common/edit-formula-modal"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { IAdornmentBannerComponentProps } from "../adornment-component-info"
import { IPlottedFunctionAdornmentModel } from "./plotted-function-adornment-model"

import "./plotted-function-adornment-banner.scss"

export const PlottedFunctionAdornmentBanner = observer(function PlottedFunctionAdornmentBanner(
  props: IAdornmentBannerComponentProps
) {
  const model = props.model as IPlottedFunctionAdornmentModel
  const graphModel = useGraphContentModelContext()
  const dataset = graphModel.dataset
  const yAttrID = graphModel.dataConfiguration.attributeID('y')
  const yAttrName = dataset?.getAttribute(yAttrID)?.name ?? t("DG.PlottedFunction.formulaPrompt")
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
    handleModalOpen(false)
  }

  const handleEditExpressionClose = (newExpression: string) => {
    handleCloseModal()
    graphModel.applyModelChange(
      () => model.setExpression(newExpression),
      {
        undoStringKey: "DG.Undo.graph.changePlotFunction",
        redoStringKey: "DG.Redo.graph.changePlotFunction",
        log: logStringifiedObjectMessage("Change plotted function: %@", {from: expression, to: newExpression})
      }
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
            {yAttrName}
          </div>
          <div className="equals-sign">
            =
          </div>
          <div className="plotted-function-control-value" data-testid="plotted-function-control-value">
            {expression}
          </div>
        </div>
        {error && <div className="plotted-function-error" data-testid="plotted-function-error">{error}</div>}
      </Button>
      {modalIsOpen &&
        <EditFormulaModal
          applyFormula={handleEditExpressionClose}
          formulaPrompt={`${yAttrName} =`}
          isOpen={isOpen}
          onClose={handleCloseModal}
          titleLabel={t("DG.PlottedFunction.namePrompt")}
          value={expression}
        />
      }
    </>
  )
})
