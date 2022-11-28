import { MenuItem, MenuList } from "@chakra-ui/react"
import React from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { uniqueName } from "../../../utilities/js-utils"
import t from "../../../utilities/translation/translate"

export const RulerMenuList = () => {
  const data = useDataSetContext()

  const handleAddNewAttribute = () => {
    const newAttrName = uniqueName("newAttr",
      (aName: string) => !data?.attributes.find(attr => aName === attr.name)
     )
    data?.addAttribute({name: newAttrName})
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
      <MenuItem onClick={handleAddNewAttribute}>{t("DG.Inspector.newAttribute")}</MenuItem>
      <MenuItem onClick={handleDeleteSelectedCases}>{t("DG.Inspector.randomizeAllAttributes")}</MenuItem>
      <MenuItem onClick={handleDeleteUnselectedCases}>{t("DG.Inspector.exportCaseData")}</MenuItem>
      <MenuItem onClick={handleDeleteAllCases}>{t("DG.Inspector.copyCaseDataToClipboard")}</MenuItem>
      <MenuItem onClick={handleDeleteAllCases}>{t("DG.Inspector.getCaseDataFromClipboard")}</MenuItem>
    </MenuList>
  )
}
