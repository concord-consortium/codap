import {MenuItem, MenuList, useDisclosure} from "@chakra-ui/react"
import {observer} from "mobx-react-lite"
import {isAlive} from "mobx-state-tree"
import React from "react"
import { DataSetContext } from "../../../../hooks/use-data-set-context"
import { useInspectorFormulaString } from "../../../../hooks/use-inspector-formula-string"
import { logMessageWithReplacement } from "../../../../lib/log-message"
import {ITileContentModel} from "../../../../models/tiles/tile-content"
import {ITileModel} from "../../../../models/tiles/tile-model"
import {t} from "../../../../utilities/translation/translate"
import { EditFormulaModal } from "../../../common/edit-formula-modal"
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
  const { isOpen, onClose, onOpen } = useDisclosure()
  const dataConfig = mapModel?.layers.find(layer => layer.dataConfiguration)?.dataConfiguration

  const hideSelectedString = numSelected === 1
                              ? t("DG.DataDisplayMenu.hideSelectedSing")
                              : t("DG.DataDisplayMenu.hideSelectedPlural")
  const hideUnselectedString = numUnselected === 1
                              ? t("DG.DataDisplayMenu.hideUnselectedSing")
                              : t("DG.DataDisplayMenu.hideUnselectedPlural")
  const addOrEditFormulaString = useInspectorFormulaString(dataConfig?.filterFormula?.display)

  const hideSelectedCases = () => {
    mapModel?.applyModelChange(
      () => mapModel?.hideSelectedCases(),
      {
        undoStringKey: "DG.Undo.hideSelectedCases",
        redoStringKey: "DG.Redo.hideSelectedCases",
        log: logMessageWithReplacement("Hide %@ selected cases", {numSelected})
      }
    )
  }

  const hideUnselectedCases = () => {
    mapModel?.applyModelChange(
      () => mapModel?.hideUnselectedCases(),
      {
        undoStringKey: "DG.Undo.hideUnselectedCases",
        redoStringKey: "DG.Redo.hideUnselectedCases",
        log: logMessageWithReplacement(`Hide %@ unselected cases`, {numUnselected})
      }
    )
  }

  const showAllCases = () => {
    mapModel?.applyModelChange(
      () => mapModel?.clearHiddenCases(),
      {
        undoStringKey: "DG.Undo.showAllCases",
        redoStringKey: "DG.Redo.showAllCases",
        log: {message: "Show all cases", args: {}, category: "data"}
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

  return (
    <>
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
        <MenuItem onClick={onOpen} data-testid="map-edit-filter-formula">
          {addOrEditFormulaString}
        </MenuItem>
      </MenuList>
      {dataConfig &&
        <DataSetContext.Provider value={dataConfig.dataset}>
          <EditFormulaModal
            applyFormula={applyFilterFormula}
            isOpen={isOpen}
            onClose={onClose}
            titleLabel={t("V3.hideShowMenu.filterFormulaPrompt")}
            value={dataConfig.filterFormula?.display} />
        </DataSetContext.Provider>
      }
    </>
  )
})
