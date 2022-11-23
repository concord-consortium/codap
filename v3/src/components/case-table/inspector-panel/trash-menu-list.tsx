import { MenuItem, MenuList } from "@chakra-ui/react"
import React from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { IAttribute } from "../../../models/data/attribute"
import t from "../../../utilities/translation/translate"

export const TrashMenuList = () => {
  const data = useDataSetContext()

  const createGhostCase = (attrs:IAttribute[]) => {
    const gCase:Record<string, any> = {}
    attrs?.forEach(attr => {
      gCase[attr.name]=""
    })
    return gCase
  }

  const handleSelectAllCases = () => {
    const caseIDArr:string[] = []
    if (data) {
      data.cases.forEach(c => {
        caseIDArr.push(c.__id__)
      })
      data.selectCases(caseIDArr)
    }
  }

  const handleDeleteSelectedCases = () => {
    if (data) {
      data.removeCases(Array.from(data.selection))
      if (data.cases.length === 0) {
        const ghostCase = createGhostCase(data.attributes)
        data.addCases([ghostCase])
      }
    }
  }

   const handleDeleteUnselectedCases = () => {
    const unselectedCaseIDArr:string[] = []

    if (data) {
      const casesToRemove = data.cases.filter(c=>
        !((Array.from(data.selection)).includes(c.__id__)))
      casesToRemove.forEach(c => {
        unselectedCaseIDArr.push(c.__id__)
      })
      data.removeCases(unselectedCaseIDArr)
      //check to see if all cases were removed and add ghost case
      if (data.cases.length === 0) {
        const ghostCase = createGhostCase(data.attributes)
        data.addCases([ghostCase])
      }
    }
  }

  const handleDeleteAllCases = () => {
    handleSelectAllCases()

    if (data) {
      data.removeCases(Array.from(data.selection))
      const ghostCase = createGhostCase(data.attributes)
      data.addCases([ghostCase])
    }

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
