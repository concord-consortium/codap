import { MenuItem, MenuList } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import { isAlive } from "mobx-state-tree"
import React from "react"
import { ITileModel } from "../../../../models/tiles/tile-model"
import { isGraphContentModel } from "../../models/graph-content-model"
import { t } from "../../../../utilities/translation/translate"
import { logMessageWithReplacement } from "../../../../lib/log-message"

interface IProps {
  tile?: ITileModel
}

export const HideShowMenuList = observer(function HideShowMenuList({tile}: IProps) {
  const graphModel = tile && isAlive(tile) && isGraphContentModel(tile?.content) ? tile?.content : undefined
  const dataConfig = graphModel?.dataConfiguration

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
      () => {
        dataConfig?.addNewHiddenCases(dataConfig?.unselectedCases ?? [])
        dataConfig?.setDisplayOnlySelectedCases(true)
        if (dataConfig?.selection.length > 0) {
          graphModel?.rescale()
        }
      },
      {
        undoStringKey: "DG.Undo.displayOnlySelected",
        redoStringKey: "DG.Redo.displayOnlySelected",
        log: "Display only selected cases"
      }
    )
  }

  const showAllCases = () => {
    dataConfig?.applyModelChange(
      () => {
        dataConfig?.clearHiddenCases()
        dataConfig?.setDisplayOnlySelectedCases(false)
        graphModel?.rescale()
      },
      {
        undoStringKey: "DG.Undo.showAllCases",
        redoStringKey: "DG.Redo.showAllCases",
        log: "Show all cases"
      }
    )
  }

  const handleParentTogglesChange = () => {
    const [undoStringKey, redoStringKey] = graphModel?.showParentToggles
      ? ["DG.Undo.disableNumberToggle", "DG.Redo.disableNumberToggle"]
      : ["DG.Undo.enableNumberToggle", "DG.Redo.enableNumberToggle"]

    dataConfig?.applyModelChange(
      () => graphModel?.setShowParentToggles(!graphModel?.showParentToggles),
      { undoStringKey, redoStringKey,
        log: graphModel?.showParentToggles ? "Disable NumberToggle" : "Enable NumberToggle"
      }
    )
  }

  const handleMeasuresForSelectionChange = () => {
    const [undoStringKey, redoStringKey] = graphModel?.showMeasuresForSelection
      ? ["DG.Undo.disableMeasuresForSelection", "DG.Redo.disableMeasuresForSelection"]
      : ["DG.Undo.enableMeasuresForSelection", "DG.Redo.enableMeasuresForSelection"]
    dataConfig?.applyModelChange(
      () => graphModel?.setShowMeasuresForSelection(!graphModel?.showMeasuresForSelection),
      { undoStringKey, redoStringKey,
        log: graphModel?.showMeasuresForSelection ? "Disable MeasuresForSelection" : "Enable MeasuresForSelection"
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
    showAllIsDisabled = dataConfig?.hiddenCases.length === 0,
    parentToggleString = graphModel?.showParentToggles
      ? t("DG.DataDisplayMenu.disableNumberToggle")
      : t("DG.DataDisplayMenu.enableNumberToggle"),
    measuresForSelectionString = graphModel?.showMeasuresForSelection
      ? t("DG.DataDisplayMenu.disableMeasuresForSelection")
      : t("DG.DataDisplayMenu.enableMeasuresForSelection"),
    displayOnlySelectedIsDisabled = dataConfig?.displayOnlySelectedCases

  return (
    <MenuList data-testid="hide-show-menu-list">
      <MenuItem onClick={hideSelectedCases} isDisabled={hideSelectedIsDisabled} data-testid="hide-selected-cases">
        {hideSelectedString}
      </MenuItem>
      <MenuItem onClick={hideUnselectedCases} isDisabled={hideUnselectedIsDisabled} data-testid="hide-unselected-cases">
        {hideUnselectedString}
      </MenuItem>
      <MenuItem onClick={showAllCases} isDisabled={showAllIsDisabled} data-testid="show-all-cases">
        {t("DG.DataDisplayMenu.showAll")}
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
  )
})
