import { MenuItem, MenuList } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { removeCasesWithCustomUndoRedo } from "../../../models/data/data-set-undo"
import { selectAllCases } from "../../../models/data/data-set-utils"
import { isItemEditable } from "../../../utilities/plugin-utils"
import { t } from "../../../utilities/translation/translate"

export const TrashMenuList = observer(function TrashMenuList() {
  const data = useDataSetContext()

  const selectedItemIds = Array.from(data?.selection ?? [])
  const disableDeleteSelectedItems = !data || !selectedItemIds.some(itemId => isItemEditable(data, itemId))
  const disableDeleteUnselectedItems = !data?.itemIds.some(itemId =>
                                      isItemEditable(data, itemId) && !data.selection.has(itemId))
  const disableDeleteAllItems = disableDeleteSelectedItems && disableDeleteUnselectedItems

  const handleSelectAllCases = () => {
    selectAllCases(data)
  }

  const handleDeleteSelectedCases = () => {
    const deletableSelectedItems = data?.itemIds.filter(itemId =>
                                      isItemEditable(data, itemId) && data.selection.has(itemId)) ?? []
    data && removeCasesWithCustomUndoRedo(data, deletableSelectedItems)
  }

  const handleDeleteUnselectedCases = () => {
    const deletableUnselectedItems = data?.itemIds.filter(itemId =>
                                      isItemEditable(data, itemId) && !data.selection.has(itemId)) ?? []
    data && removeCasesWithCustomUndoRedo(data, deletableUnselectedItems)
  }

  const handleDeleteAllCases = () => {
    const deletableItems = data?.itemIds.filter(itemId => isItemEditable(data, itemId)) ?? []
    data && removeCasesWithCustomUndoRedo(data, deletableItems)
  }

  return (
    <MenuList data-testid="trash-menu-list">
      <MenuItem
        onClick={handleSelectAllCases}
        data-testid="trash-menu-select-all-cases"
      >
        {t("DG.Inspector.selection.selectAll")}
      </MenuItem>
      <MenuItem
        isDisabled={disableDeleteSelectedItems}
        onClick={handleDeleteSelectedCases}
        data-testid="trash-menu-delete-selected-cases"
      >
        {t("DG.Inspector.selection.deleteSelectedCases")}
      </MenuItem>
      <MenuItem
        isDisabled={disableDeleteUnselectedItems}
        onClick={handleDeleteUnselectedCases}
        data-testid="trash-menu-delete-unselected-cases"
      >
        {t("DG.Inspector.selection.deleteUnselectedCases")}
      </MenuItem>
      <MenuItem
        isDisabled={disableDeleteAllItems}
        onClick={handleDeleteAllCases}
        data-testid="trash-menu-delete-all-cases"
      >
        {t("DG.Inspector.deleteAll")}
      </MenuItem>
    </MenuList>
  )
})
