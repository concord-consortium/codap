import { useState } from "react"
import { useDisclosure } from "@chakra-ui/react"
import { t } from "../../utilities/translation/translate"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useInspectorFormulaTitle } from "../../hooks/use-inspector-formula-string"
import { EditFormulaModal } from "../common/edit-formula-modal"

import "./filter-formula-bar.scss"

export const FilterFormulaBar = () => {
  const data = useDataSetContext()
  const { isOpen, onClose, onOpen } = useDisclosure()
  const [modalOpen, setModalOpen] = useState(false)

  const handleOpenEditFormulaModal = () => {
    setModalOpen(true)
    onOpen()
  }

  const handleSubmitEditFormula = (formula: string) => {
    data?.applyModelChange(() => data.setFilterFormula(formula),
      { undoStringKey: "V3.Undo.hideShowMenu.changeFilterFormula",
        redoStringKey: "V3.Redo.hideShowMenu.changeFilterFormula",
      }
    )
    handleCloseModal()
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    onClose()
  }

  // computed before the early return so the hook is called unconditionally
  const modalTitle = useInspectorFormulaTitle(data?.filterFormula?.display)

  if (!data) return null
  const filterFormula = data.filterFormula?.display

  return (
    <>
      <button type="button" className="filter-formula-button" data-testid="filter-formula-bar"
        onClick={handleOpenEditFormulaModal}
        aria-label={t("V3.CaseTable.filterFormulaBarAriaLabel", { vars: [filterFormula || ""] })}>
        <span className="filter-formula-label">{t("V3.CaseTable.formulaFilterBar.label")}:</span>
        <span className="filter-formula-value">
          {filterFormula}
        </span>
      </button>
      {modalOpen &&
        <EditFormulaModal
          applyFormula={handleSubmitEditFormula}
          isOpen={isOpen}
          modalTitle={modalTitle}
          onClose={handleCloseModal}
          titleLabel={t("V3.hideShowMenu.filterFormulaPrompt")}
          value={filterFormula}
        />
      }
    </>
  )
}
