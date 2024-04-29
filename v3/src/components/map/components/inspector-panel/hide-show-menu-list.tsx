import {MenuItem, MenuList} from "@chakra-ui/react"
import {observer} from "mobx-react-lite"
import {isAlive} from "mobx-state-tree"
import React from "react"
import {ITileContentModel} from "../../../../models/tiles/tile-content"
import {ITileModel} from "../../../../models/tiles/tile-model"
import {t} from "../../../../utilities/translation/translate"
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
    mapModel?.applyModelChange(
      () => mapModel?.hideSelectedCases(),
      {
        undoStringKey: "DG.Undo.hideSelectedCases",
        redoStringKey: "DG.Redo.hideSelectedCases"
      }
    )
  }

  const hideUnselectedCases = () => {
    mapModel?.applyModelChange(
      () => mapModel?.hideUnselectedCases(),
      {
        undoStringKey: "DG.Undo.hideUnselectedCases",
        redoStringKey: "DG.Redo.hideUnselectedCases"
      }
    )
  }

  const showAllCases = () => {
    mapModel?.applyModelChange(
      () => mapModel?.clearHiddenCases(),
      {
        undoStringKey: "DG.Undo.showAllCases",
        redoStringKey: "DG.Redo.showAllCases"
      }
    )
  }

  return (
    <MenuList data-testid="hide-show-menu-list">
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
