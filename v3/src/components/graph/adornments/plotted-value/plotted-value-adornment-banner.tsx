import React, { useState } from "react"
import { observer } from "mobx-react-lite"
import { Button, useDisclosure } from "@chakra-ui/react"
import t from "../../../../utilities/translation/translate"
import { EditFormulaModal } from "./edit-formula-modal"
import { IPlottedValueAdornmentModel } from "./plotted-value-adornment-model"

import "./plotted-value-adornment-banner.scss"

interface IProps {
  model: IPlottedValueAdornmentModel
}

export const PlottedValueAdornmentBanner = observer(function PlottedValueAdornmentBanner({ model }: IProps) {
  const value = model.value
  const formulaModal = useDisclosure()
  const [modalIsOpen, setModalIsOpen] = useState(false)

  const handleModalOpen = (open: boolean) => {
    setModalIsOpen(open)
  }

  const handleEditValueOpen = () => {
    formulaModal.onOpen()
    handleModalOpen(true)
  }

  const handleEditValueClose = (newValue: number | string) => {
    formulaModal.onClose()
    handleModalOpen(false)
    model.setValue(newValue)
  }

  return (
    <>
      <Button
        variant="unstyled"
        className="plotted-value-control"
        data-testid="plotted-value-control"
        onClick={handleEditValueOpen}
      >
        <div className="plotted-value-control-label" data-testid="plotted-value-control-label">
          { t("DG.PlottedValue.formulaPrompt") }
        </div>
        <div className="plotted-value-control-value" data-testid="plotted-value-control-value">
          {value}
        </div>
      </Button>
      { modalIsOpen &&
        <EditFormulaModal isOpen={formulaModal.isOpen} currentValue={value} onClose={handleEditValueClose} />
      }
    </>
  )
})
