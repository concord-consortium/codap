import { MenuItem, MenuList } from "@chakra-ui/react"
import React from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { selectCasesNotification } from "../../../models/data/data-set-utils"
import { t } from "../../../utilities/translation/translate"

export const TrashMenuList = () => {
  const data = useDataSetContext()

  const handleSelectAllCases = () => {
    data?.applyModelChange(() => {
      data.setSelectedCases(data.cases.map(c => c.__id__))
    }, {
      notification: () => selectCasesNotification(data)
    })
  }

  const handleDeleteSelectedCases = () => {
    data?.removeCases(Array.from(data.selection))
  }

   const handleDeleteUnselectedCases = () => {
    data?.removeCases(data.cases.filter(c => !data.selection.has(c.__id__)).map(c => c.__id__))
  }

  const handleDeleteAllCases = () => {
    data?.removeCases(Array.from(data.cases.map(c => c.__id__)))
  }

  return (
    <MenuList data-testid="trash-menu-list">
      <MenuItem onClick={handleSelectAllCases}>{t("DG.Inspector.selection.selectAll")}</MenuItem>
      <MenuItem onClick={handleDeleteSelectedCases}>{t("DG.Inspector.selection.deleteSelectedCases")}</MenuItem>
      <MenuItem onClick={handleDeleteUnselectedCases}>{t("DG.Inspector.selection.deleteUnselectedCases")}</MenuItem>
      <MenuItem onClick={handleDeleteAllCases}>{t("DG.Inspector.deleteAll")}</MenuItem>
    </MenuList>
  )
}
