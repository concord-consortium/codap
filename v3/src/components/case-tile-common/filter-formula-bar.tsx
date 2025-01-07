import React, { useState } from "react"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { EditFormulaModal } from "../common/edit-formula-modal"
import { useDisclosure } from "@chakra-ui/react"
import { t } from "../../utilities/translation/translate"

import "./filter-formula-bar.scss"

export const FilterFormulaBar = () => {
  const data = useDataSetContext()
  const formulaModal = useDisclosure()
  const [modalOpen, setModalOpen] = useState(false)

  const handleOpenEditFormulaModal = () => {
    setModalOpen(true)
    formulaModal.onOpen()
  }

  const handleSubmitEditFormula = (formula: string) => {
    data?.applyModelChange(() => data.setFilterFormula(formula),
      { undoStringKey: "DG.Undo.caseTable.changeFilterFormula",
        redoStringKey: "DG.Redo.caseTable.changeFilterFormula",
      }
    )
    handleCloseModal()
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    formulaModal.onClose()
  }

  if (!data) return null
  const filterFormula = data.filterFormula?.display

  return (
    <>
      <div className="filter-formula-container">
        <span className="filter-formula-label">{t("DG.CaseTable.formulaFilterBar.label")}:</span>
        <span className="filter-formula-value" onClick={handleOpenEditFormulaModal}>
          {filterFormula}
        </span>
      </div>
      {modalOpen &&
        <EditFormulaModal
          applyFormula={handleSubmitEditFormula}
          isOpen={formulaModal.isOpen}
          onClose={handleCloseModal}
          titleLabel={t("DG.PlottedFunction.namePrompt")}
          value={filterFormula}
        />
      }
    </>
  )
}
