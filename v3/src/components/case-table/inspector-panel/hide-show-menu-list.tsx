import { MenuItem, MenuList, useToast } from "@chakra-ui/react"
import React from "react"
import { useCaseMetadata } from "../../../hooks/use-case-metadata"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { hideAttributeNotification } from "../../../models/data/data-set-notifications"
import { t } from "../../../utilities/translation/translate"

export const HideShowMenuList = () => {
  const data = useDataSetContext()
  const caseMetadata = useCaseMetadata()
  const toast = useToast()

  const handleSetAsideSelectedCases = () => {
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const casesToHide = Array.from(data.selection)
      toast({
        title: 'Set aside selected cases',
        status: 'success',
        duration: 9000,
        isClosable: true,
      })
    }
  }

   const handleSetAsideUnselectedCases = () => {
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const casesToHide = data.cases.filter(c => !data.selection.has(c.__id__)).map(c => c.__id__)
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

  const hiddenAttributes = data?.attributes.filter(attr => attr && caseMetadata?.isHidden(attr.id))
  const hiddenAttrIds = hiddenAttributes?.map(attr => attr.id) ?? []
  const handleShowAllAttributes = () => {
    caseMetadata?.applyModelChange(
      () => caseMetadata?.showAllAttributes(),
      {
        notifications: [
          hideAttributeNotification(hiddenAttrIds, data, "unhideAttributes"),
          hideAttributeNotification(hiddenAttrIds, data, "showAttributes")
        ],
        undoStringKey: "DG.Undo.caseTable.showAllHiddenAttributes",
        redoStringKey: "DG.Redo.caseTable.showAllHiddenAttributes"
      }
    )
  }

  const caseCount = data?.cases.length ?? 0
  const selectionCount = data?.selection.size ?? 0
  const setAsideCount = 0 // eventually will come from DataSet
  const restoreSetAsideCasesLabel = t("DG.Inspector.setaside.restoreSetAsideCases", { vars: [setAsideCount] })

  const hiddenAttributeCount = hiddenAttributes?.length ?? 0
  const showAllHiddenAttributesKey = {
    0: "DG.Inspector.attributes.showAllHiddenAttributesDisabled",
    1: "DG.Inspector.attributes.showAllHiddenAttributesSing"
  }[hiddenAttributeCount] ?? "DG.Inspector.attributes.showAllHiddenAttributesPlural"
  const showAllHiddenAttributesLabel = t(showAllHiddenAttributesKey, { vars: [hiddenAttributeCount] })

  return (
    <MenuList data-testid="hide-show-menu-list">
      <MenuItem isDisabled={selectionCount === 0} onClick={handleSetAsideSelectedCases}>
        {t("DG.Inspector.setaside.setAsideSelectedCases")}
      </MenuItem>
      <MenuItem isDisabled={selectionCount === caseCount} onClick={handleSetAsideUnselectedCases}>
        {t("DG.Inspector.setaside.setAsideUnselectedCases")}
      </MenuItem>
      <MenuItem isDisabled={setAsideCount === 0} onClick={handleRestoreSetAsideCases}>
        {restoreSetAsideCasesLabel}
      </MenuItem>
      <MenuItem isDisabled={!hiddenAttributeCount} onClick={handleShowAllAttributes}>
        {showAllHiddenAttributesLabel}
      </MenuItem>
    </MenuList>
  )
}
