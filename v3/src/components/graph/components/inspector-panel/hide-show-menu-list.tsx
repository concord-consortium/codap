import { MenuItem, MenuList, useDisclosure } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import { isAlive } from "mobx-state-tree"
import React from "react"
import { ITileModel } from "../../../../models/tiles/tile-model"
import { isGraphContentModel } from "../../models/graph-content-model"
import { t } from "../../../../utilities/translation/translate"
import { logMessageWithReplacement } from "../../../../lib/log-message"
import { EditFormulaModal } from "../../../common/edit-formula-modal"
import { DataSetContext } from "../../../../hooks/use-data-set-context"
import { useInspectorFormulaString } from "../../../../hooks/use-inspector-formula-string"

interface IProps {
  tile?: ITileModel
}

export const HideShowMenuList = observer(function HideShowMenuList({tile}: IProps) {
  const graphModel = tile && isAlive(tile) && isGraphContentModel(tile?.content) ? tile?.content : undefined
  const dataConfig = graphModel?.dataConfiguration
  const { isOpen, onClose, onOpen } = useDisclosure()

  const hideSelectedCases = () => {
    dataConfig?.applyModelChange(
      () => dataConfig?.addNewHiddenCases(
        dataConfig?.selection ?? []
      ),
      {
        undoStringKey: "DG.Undo.hideSelectedCases",
        redoStringKey: "DG.Redo.hideSelectedCases",
        log: logMessageWithReplacement("Hide %@ selected cases", {length: dataConfig?.selection.length})
      }
    )
  }

  const hideUnselectedCases = () => {
    dataConfig?.applyModelChange(
      () => dataConfig?.addNewHiddenCases(
        dataConfig?.unselectedCases ?? []
      ),
      {
        undoStringKey: "DG.Undo.hideUnselectedCases",
        redoStringKey: "DG.Redo.hideUnselectedCases",
        log: "Hide unselected cases"
      }
    )
  }

  const displayOnlySelectedCases = () => {
    dataConfig?.applyModelChange(
      () => graphModel?.displayOnlySelectedCases(),
      {
        undoStringKey: "DG.Undo.displayOnlySelected",
        redoStringKey: "DG.Redo.displayOnlySelected",
        log: "Display only selected cases"
      }
    )
  }

  const showAllCases = () => {
    dataConfig?.applyModelChange(
      () => graphModel?.showAllCases(),
      {
        undoStringKey: "DG.Undo.showAllCases",
        redoStringKey: "DG.Redo.showAllCases",
        log: {message: "Show all cases", args: {category: "data"}}
      }
    )
  }

  const applyFilterFormula = (formula: string) => {
    dataConfig?.applyModelChange(
      () => dataConfig?.setFilterFormula(formula),
      {
        undoStringKey: "DG.Undo.hideShowMenu.changeFilterFormula",
        redoStringKey: "DG.Redo.hideShowMenu.changeFilterFormula",
        log: logMessageWithReplacement("Change filter formula to %@", {formula})
      }
    )
    onClose()
  }

  const handleEditFormulaOpen = () => {
    onOpen()
  }

  const handleEditFormulaClose = () => {
    onClose()
  }

  const handleParentTogglesChange = () => {
    const [undoStringKey, redoStringKey] = graphModel?.showParentToggles
      ? ["DG.Undo.disableNumberToggle", "DG.Redo.disableNumberToggle"]
      : ["DG.Undo.enableNumberToggle", "DG.Redo.enableNumberToggle"]

    dataConfig?.applyModelChange(
      () => graphModel?.setShowParentToggles(!graphModel?.showParentToggles),
      { undoStringKey, redoStringKey,
        log: graphModel?.showParentToggles ? "Disable Number Toggle" : "Enable Number Toggle"
      }
    )
  }

  const handleMeasuresForSelectionChange = () => {
    const [undoStringKey, redoStringKey] = dataConfig?.showMeasuresForSelection
      ? ["DG.Undo.disableMeasuresForSelection", "DG.Redo.disableMeasuresForSelection"]
      : ["DG.Undo.enableMeasuresForSelection", "DG.Redo.enableMeasuresForSelection"]
    dataConfig?.applyModelChange(
      () => dataConfig?.setShowMeasuresForSelection(!dataConfig?.showMeasuresForSelection),
      { undoStringKey, redoStringKey,
        log: dataConfig?.showMeasuresForSelection ? "Disable Measures For Selection" : "Enable Measures For Selection"
      }
    )
  }

  const numSelected = dataConfig?.selection.length ?? 0,
    hideSelectedIsDisabled = numSelected === 0,
    hideSelectedString = (numSelected === 1) ? t("DG.DataDisplayMenu.hideSelectedSing")
      : t("DG.DataDisplayMenu.hideSelectedPlural"),
    numUnselected = dataConfig?.unselectedCases.length ?? 0,
    hideUnselectedIsDisabled = numUnselected === 0,
    hideUnselectedString = numUnselected === 1 ? t("DG.DataDisplayMenu.hideUnselectedSing")
      : t("DG.DataDisplayMenu.hideUnselectedPlural"),
    showAllIsDisabled = dataConfig?.hiddenCases.length === 0 && !dataConfig?.displayOnlySelectedCases,
    parentToggleString = graphModel?.showParentToggles
      ? t("DG.DataDisplayMenu.disableNumberToggle")
      : t("DG.DataDisplayMenu.enableNumberToggle"),
    measuresForSelectionString = dataConfig?.showMeasuresForSelection
      ? t("DG.DataDisplayMenu.disableMeasuresForSelection")
      : t("DG.DataDisplayMenu.enableMeasuresForSelection"),
    displayOnlySelectedIsDisabled = dataConfig?.displayOnlySelectedCases
    const addOrEditFormulaString = useInspectorFormulaString(dataConfig?.filterFormula?.display)

  return (
    <>
      <MenuList data-testid="hide-show-menu-list">
        <MenuItem onClick={hideSelectedCases} isDisabled={hideSelectedIsDisabled} data-testid="hide-selected-cases">
          {hideSelectedString}
        </MenuItem>
        <MenuItem onClick={hideUnselectedCases} isDisabled={hideUnselectedIsDisabled}
          data-testid="hide-unselected-cases">
          {hideUnselectedString}
        </MenuItem>
        <MenuItem onClick={showAllCases} isDisabled={showAllIsDisabled} data-testid="show-all-cases">
          {t("DG.DataDisplayMenu.showAll")}
        </MenuItem>
        <MenuItem onClick={handleEditFormulaOpen} data-testid="graph-edit-filter-formula">
          {addOrEditFormulaString}
        </MenuItem>
        <MenuItem onClick={displayOnlySelectedCases} isDisabled={displayOnlySelectedIsDisabled}
        data-testid="display-selected-cases">
          {t("DG.DataDisplayMenu.displayOnlySelected")}
        </MenuItem>
        <MenuItem onClick={handleParentTogglesChange} data-testid="show-parent-toggles">
          {parentToggleString}
        </MenuItem>
        <MenuItem onClick={handleMeasuresForSelectionChange} data-testid="show-selection-measures">
          {measuresForSelectionString}
        </MenuItem>
      </MenuList>
      {
        dataConfig &&
        <DataSetContext.Provider value={dataConfig.dataset}>
          <EditFormulaModal
            applyFormula={applyFilterFormula}
            isOpen={isOpen}
            onClose={handleEditFormulaClose}
            titleLabel={t("V3.hideShowMenu.filterFormulaPrompt")}
            value={dataConfig.filterFormula?.display} />
        </DataSetContext.Provider>
      }
    </>
  )
})
