import {MenuItem, MenuList, useToast} from "@chakra-ui/react"
import {observer} from "mobx-react-lite"
import {isAlive} from "mobx-state-tree"
import React from "react"
import {ITileModel} from "../../../../models/tiles/tile-model"
import {isGraphContentModel} from "../../models/graph-content-model"
import { t } from "../../../../utilities/translation/translate"

interface IProps {
  tile?: ITileModel
}

export const HideShowMenuList = observer(function HideShowMenuList({tile}: IProps) {
  const toast = useToast()
  const graphModel = tile && isAlive(tile) && isGraphContentModel(tile?.content) ? tile?.content : undefined
  const dataConfiguration = graphModel?.dataConfiguration
  const handleMenuItemClick = (menuItem: string) => {
    toast({
      title: 'Menu item clicked',
      description: `You clicked on ${menuItem}`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    })
  }
  const hideSelectedCases = () => {
    dataConfiguration?.applyModelChange(
      () => dataConfiguration?.addNewHiddenCases(
        dataConfiguration?.selection ?? []
      ),
      {
        undoStringKey: "DG.Undo.hideSelectedCases",
        redoStringKey: "DG.Redo.hideSelectedCases"
      }
    )
  }

  const hideUnselectedCases = () => {
    dataConfiguration?.applyModelChange(
      () => dataConfiguration?.addNewHiddenCases(
        dataConfiguration?.unselectedCases ?? []
      ),
      {
        undoStringKey: "DG.Undo.hideUnselectedCases",
        redoStringKey: "DG.Redo.hideUnselectedCases"
      }
    )
  }

  const showAllCases = () => {
    dataConfiguration?.applyModelChange(
      () => dataConfiguration?.clearHiddenCases(),
      {
        undoStringKey: "DG.Undo.showAllCases",
        redoStringKey: "DG.Redo.showAllCases"
      }
    )
  }

  const numSelected = dataConfiguration?.selection.length ?? 0,
    hideSelectedIsDisabled = numSelected === 0,
    hideSelectedString = (numSelected === 1) ? t("DG.DataDisplayMenu.hideSelectedSing")
      : t("DG.DataDisplayMenu.hideSelectedPlural"),
    numUnselected = dataConfiguration?.unselectedCases.length ?? 0,
    hideUnselectedIsDisabled = numUnselected === 0,
    hideUnselectedString = numUnselected === 1 ? t("DG.DataDisplayMenu.hideUnselectedSing")
      : t("DG.DataDisplayMenu.hideUnselectedPlural"),
    showAllIsDisabled = dataConfiguration?.hiddenCases.length === 0,
    parentToggleString = graphModel?.showParentToggles
      ? t("DG.DataDisplayMenu.disableNumberToggle")
      : t("DG.DataDisplayMenu.enableNumberToggle"),
    measuresForSelectionString = graphModel?.showMeasuresForSelection
      ? t("DG.DataDisplayMenu.disableMeasuresForSelection")
      : t("DG.DataDisplayMenu.enableMeasuresForSelection")

  return (
    <MenuList data-testid="trash-menu-list">
      <MenuItem onClick={hideSelectedCases} isDisabled={hideSelectedIsDisabled} data-testid="hide-selected-cases">
        {hideSelectedString}
      </MenuItem>
      <MenuItem onClick={hideUnselectedCases} isDisabled={hideUnselectedIsDisabled} data-testid="hide-unselected-cases">
        {hideUnselectedString}
      </MenuItem>
      <MenuItem onClick={showAllCases} isDisabled={showAllIsDisabled} data-testid="show-all-cases">
        {t("DG.DataDisplayMenu.showAll")}
      </MenuItem>
      <MenuItem onClick={() => handleMenuItemClick("Display only selected cases")} data-testid="display-selected-cases">
        {t("DG.DataDisplayMenu.displayOnlySelected")}
      </MenuItem>
      <MenuItem onClick={() => graphModel?.setShowParentToggles(!graphModel?.showParentToggles)}
       data-testid="show-parent-toggles">
        {parentToggleString}
      </MenuItem>
      <MenuItem onClick={() => graphModel?.setShowMeasuresForSelection(!graphModel?.showMeasuresForSelection)}
       data-testid="show-selection-measures">
        {measuresForSelectionString}
      </MenuItem>
    </MenuList>
  )
})
