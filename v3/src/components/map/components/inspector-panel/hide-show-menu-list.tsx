import {MenuItem, MenuList} from "@chakra-ui/react"
import {observer} from "mobx-react-lite"
import {isAlive} from "mobx-state-tree"
import React from "react"
import {ITileContentModel} from "../../../../models/tiles/tile-content"
import {ITileModel} from "../../../../models/tiles/tile-model"
import t from "../../../../utilities/translation/translate"
import {IMapContentModel, isMapContentModel} from "../../models/map-content-model"

interface IProps {
  tile?: ITileModel
}

function isAliveMapContentModel(model?: ITileContentModel): model is IMapContentModel {
  return !!model && isAlive(model) && isMapContentModel(model)
}

export const HideShowMenuList = observer(function HideShowMenuList({tile}: IProps) {
  const mapModel = isAliveMapContentModel(tile?.content) ? tile?.content : undefined
  const numSelected = mapModel?.numSelected() ?? 0
  const numUnselected = mapModel?.numUnselected() ?? 0
  const numHidden = mapModel?.numHidden() ?? 0

  const hideSelectedString = numSelected === 1
                              ? t("DG.DataDisplayMenu.hideSelectedSing")
                              : t("DG.DataDisplayMenu.hideSelectedPlural")
  const hideUnselectedString = numUnselected === 1
                              ? t("DG.DataDisplayMenu.hideUnselectedSing")
                              : t("DG.DataDisplayMenu.hideUnselectedPlural")

  const hideSelectedCases = () => {
    mapModel?.applyUndoableAction(
      () => mapModel?.hideSelectedCases(),
      "DG.Undo.hideSelectedCases",
      "DG.Redo.hideSelectedCases")
  }

  const hideUnselectedCases = () => {
    mapModel?.applyUndoableAction(
      () => mapModel?.hideUnselectedCases(),
      "DG.Undo.hideUnselectedCases",
      "DG.Redo.hideUnselectedCases")
  }

  const showAllCases = () => {
    mapModel?.applyUndoableAction(
      () => mapModel?.clearHiddenCases(),
      "DG.Undo.showAllCases",
      "DG.Redo.showAllCases")
  }

  return (
    <MenuList data-testid="trash-menu-list">
      <MenuItem onClick={hideSelectedCases} isDisabled={numSelected === 0} data-testid="hide-selected-cases">
        {hideSelectedString}
      </MenuItem>
      <MenuItem onClick={hideUnselectedCases} isDisabled={numUnselected === 0} data-testid="hide-unselected-cases">
        {hideUnselectedString}
      </MenuItem>
      <MenuItem onClick={showAllCases} isDisabled={numHidden === 0} data-testid="show-all-cases">
        {t("DG.DataDisplayMenu.showAll")}
      </MenuItem>
    </MenuList>
  )
})
