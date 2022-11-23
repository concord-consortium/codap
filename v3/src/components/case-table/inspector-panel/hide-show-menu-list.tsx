import { MenuItem, MenuList, useToast } from "@chakra-ui/react"
import React from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { IAttribute } from "../../../models/data/attribute"
import t from "../../../utilities/translation/translate"

export const HideShowMenuList = () => {
  const data = useDataSetContext()
  const toast = useToast()

  const createGhostCase = (attrs:IAttribute[]) => {
    const gCase:Record<string, any> = {}
    attrs?.forEach(attr => {
      gCase[attr.name]=""
    })
    return gCase
  }

  const handleSetAsideSelectedCases = () => {
    if (data) {
      toast({
        title: 'Set aside selected cases',
        status: 'success',
        duration: 9000,
        isClosable: true,
      })
      if (data.cases.length === 0) {
        const ghostCase = createGhostCase(data.attributes)
        data.addCases([ghostCase])
      }
    }
  }

   const handleSetAsideUnelectedCases = () => {
    const unselectedCaseIDArr:string[] = []

    if (data) {
      const casesToHide = data.cases.filter(c=>
        !((Array.from(data.selection)).includes(c.__id__)))
      casesToHide.forEach(c => {
        unselectedCaseIDArr.push(c.__id__)
      })
      toast({
        title: 'Set aside unselected cases',
        status: 'success',
        duration: 9000,
        isClosable: true,
      })
    }
  }

  const handleRestoreSetAsideCases = () => {
    toast({
      title: 'Restore set aside cases',
      status: 'success',
      duration: 9000,
      isClosable: true,
    })
  }

  const handleShowAllAttributes = () => {
    data?.showAllAttributes()
  }

  const hiddenAttributes = data?.attributes.filter(attr => attr.hidden === true)
  const noHiddenAttributes = !hiddenAttributes?.length || hiddenAttributes?.length <= 0
  console.log(hiddenAttributes)

  const showAllHiddenAttributesString =
    noHiddenAttributes  ? t("DG.Inspector.attributes.showAllHiddenAttributesDisabled")
                        : hiddenAttributes?.length > 1
                          ? t("DG.Inspector.attributes.showAllHiddenAttributesPlural")
                          : t("DG.Inspector.attributes.showAllHiddenAttributesSing")

  return (
    <MenuList data-testid="hide-show-menu-list">
      <MenuItem onClick={handleSetAsideSelectedCases}>{t("DG.Inspector.setaside.setAsideSelectedCases")}</MenuItem>
      <MenuItem onClick={handleSetAsideUnelectedCases}>{t("DG.Inspector.setaside.setAsideUnselectedCases")}</MenuItem>
      <MenuItem onClick={handleRestoreSetAsideCases}>{t("DG.Inspector.setaside.restoreSetAsideCases")}</MenuItem>
      <MenuItem isDisabled={noHiddenAttributes} onClick={handleShowAllAttributes}>
        {showAllHiddenAttributesString}
      </MenuItem>
    </MenuList>
  )
}
