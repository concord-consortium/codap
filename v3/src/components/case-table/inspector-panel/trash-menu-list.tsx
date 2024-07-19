import { MenuItem, MenuList } from "@chakra-ui/react"
import React from "react"
import { observer } from "mobx-react-lite"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { removeCasesWithCustomUndoRedo } from "../../../models/data/data-set-undo"
import { selectAllCases } from "../../../models/data/data-set-utils"
import { t } from "../../../utilities/translation/translate"
import { isItemEditable } from "../../web-view/collaborator-utils"

export const TrashMenuList = observer(function TrashMenuList() {
  const data = useDataSetContext()
  let deletableItems: string[] = []
  let deletableSelectedItems: string[] = []
  let deletableUnselectedItems: string[] = []
  if (data) {
    deletableItems = data.itemIds.filter(itemId => isItemEditable(data, itemId))
    deletableSelectedItems = Array.from(data.selection).filter(itemId => isItemEditable(data, itemId))
    const deletableSelectedItemsSet = new Set(deletableSelectedItems)
    deletableUnselectedItems = deletableItems.filter(itemId => !deletableSelectedItemsSet.has(itemId))
  }
  const disableDeleteAllItems = deletableItems.length < 1
  const disableDeleteSelectedItems = deletableSelectedItems.length < 1
  const disableDeleteUnselectedItems = deletableUnselectedItems.length < 1

  const handleSelectAllCases = () => {
    selectAllCases(data)
  }

  const handleDeleteSelectedCases = () => {
    data && removeCasesWithCustomUndoRedo(data, deletableSelectedItems)
  }

  const handleDeleteUnselectedCases = () => {
    data && removeCasesWithCustomUndoRedo(data, deletableUnselectedItems)
  }

  const handleDeleteAllCases = () => {
    data && removeCasesWithCustomUndoRedo(data, deletableItems)
  }

  return (
    <MenuList data-testid="trash-menu-list">
      <MenuItem onClick={handleSelectAllCases}>{t("DG.Inspector.selection.selectAll")}</MenuItem>
      <MenuItem
        isDisabled={disableDeleteSelectedItems}
        onClick={handleDeleteSelectedCases}
      >
        {t("DG.Inspector.selection.deleteSelectedCases")}
      </MenuItem>
      <MenuItem
        isDisabled={disableDeleteUnselectedItems}
        onClick={handleDeleteUnselectedCases}
      >
        {t("DG.Inspector.selection.deleteUnselectedCases")}
      </MenuItem>
      <MenuItem
        isDisabled={disableDeleteAllItems}
        onClick={handleDeleteAllCases}
      >
        {t("DG.Inspector.deleteAll")}
      </MenuItem>
    </MenuList>
  )
})
