import React from "react"
import {observer} from "mobx-react-lite"
import {MenuItem, MenuList, useToast} from "@chakra-ui/react"
import {ITileModel} from "../../../../models/tiles/tile-model"
import {isGraphContentModel} from "../../models/graph-content-model"
import t from "../../../../utilities/translation/translate"

interface IProps {
  tile?: ITileModel
}

export const HideShowMenuList = observer(({tile}: IProps) => {
  const toast = useToast()
  const graphModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
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
    dataConfiguration?.applyUndoableAction(
      () => dataConfiguration?.addNewHiddenCases(
        dataConfiguration?.selection ?? []
      ),
      "DG.Undo.hideSelectedCases",
      "DG.Redo.hideSelectedCases")
  }

  const hideUnselectedCases = () => {
    dataConfiguration?.applyUndoableAction(
      () => dataConfiguration?.addNewHiddenCases(
        dataConfiguration?.unselectedCases ?? []
      ),
      "DG.Undo.hideUnselectedCases",
      "DG.Redo.hideUnselectedCases")
  }

  const showAllCases = () => {
    dataConfiguration?.applyUndoableAction(
      () => dataConfiguration?.clearHiddenCases(),
      "DG.Undo.showAllCases",
      "DG.Redo.showAllCases")
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
      <MenuItem onClick={hideSelectedCases} isDisabled={hideSelectedIsDisabled}>
        {hideSelectedString}
      </MenuItem>
      <MenuItem onClick={hideUnselectedCases} isDisabled={hideUnselectedIsDisabled}>
        {hideUnselectedString}
      </MenuItem>
      <MenuItem onClick={showAllCases} isDisabled={showAllIsDisabled}>
        {t("DG.DataDisplayMenu.showAll")}
      </MenuItem>
      <MenuItem onClick={() => handleMenuItemClick("Display only selected cases")}>
        {t("DG.DataDisplayMenu.displayOnlySelected")}
      </MenuItem>
      <MenuItem onClick={() => graphModel?.setShowParentToggles(!graphModel?.showParentToggles)}>
        {parentToggleString}
      </MenuItem>
      <MenuItem onClick={() => graphModel?.setShowMeasuresForSelection(!graphModel?.showMeasuresForSelection)}>
        {measuresForSelectionString}
      </MenuItem>
    </MenuList>
  )
})
