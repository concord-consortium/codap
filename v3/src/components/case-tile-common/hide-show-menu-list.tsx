import { useDisclosure } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import { isAlive } from "mobx-state-tree"
import React from "react"
import { useCaseMetadata } from "../../hooks/use-case-metadata"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { hideAttributeNotification } from "../../models/data/data-set-notifications"
import { addSetAsideCases, restoreSetAsideCases } from "../../models/data/data-set-utils"
import { t } from "../../utilities/translation/translate"
import { EditFilterFormulaModal } from "../common/edit-filter-formula-modal"
import { IMenuItem, StdMenuList } from "./std-menu-list"

export const HideShowMenuList = observer(function HideShowMenuList() {
  const data = useDataSetContext()
  const caseMetadata = useCaseMetadata()
  const formulaModal = useDisclosure()

  if (data && !isAlive(data)) return null

  const handleEditFormulaOpen = () => {
    formulaModal.onOpen()
  }

  const handleEditFormulaClose = () => {
    formulaModal.onClose()
  }

  const itemCount = data?.items.length ?? 0
  const selectionCount = data?.selection.size ?? 0
  const setAsideCount = data?.setAsideItemIds.length ?? 0

  const hiddenAttributes = data?.attributes.filter(attr => attr && caseMetadata?.isHidden(attr.id))
  const hiddenAttributeCount = hiddenAttributes?.length ?? 0

  const menuItems: IMenuItem[] = [
    {
      itemKey: "DG.Inspector.setaside.setAsideSelectedCases",
      dataTestId: "hide-show-menu-set-aside-selected-cases",
      isEnabled: () => selectionCount > 0,
      handleClick: () => {
        if (data?.selection.size) {
          addSetAsideCases(data, Array.from(data.selection))
        }
      }
    },
    {
      itemKey: "DG.Inspector.setaside.setAsideUnselectedCases",
      dataTestId: "hide-show-menu-set-aside-unselected-cases",
      isEnabled: () => selectionCount < itemCount,
      handleClick: () => {
        const unselectedItemIds = data?.itemIds.filter(itemId => !data.isCaseSelected(itemId)) ?? []
        if (data && unselectedItemIds.length) {
          addSetAsideCases(data, unselectedItemIds)
        }
      }
    },
    {
      itemKey: "DG.Inspector.setaside.restoreSetAsideCases",
      dataTestId: "hide-show-menu-restore-set-aside-cases",
      itemLabel: () => t("DG.Inspector.setaside.restoreSetAsideCases", { vars: [setAsideCount] }),
      isEnabled: () => setAsideCount > 0,
      handleClick: () => restoreSetAsideCases(data)
    },
    {
      itemKey: data?.filterFormula && !data.filterFormula.empty
                ? "V3.hideShowMenu.editFilterFormula"
                : "V3.hideShowMenu.addFilterFormula",
      isEnabled: () => !!data,
      handleClick: handleEditFormulaOpen
    },
    {
      itemKey: "DG.Inspector.attributes.showAllHiddenAttributesPlural",
      dataTestId: "hide-show-menu-show-all-hidden-attributes",
      isEnabled: () => hiddenAttributeCount > 0,
      itemLabel: () => {
        const showAllHiddenAttributesKey = {
          0: "DG.Inspector.attributes.showAllHiddenAttributesDisabled",
          1: "DG.Inspector.attributes.showAllHiddenAttributesSing"
        }[hiddenAttributeCount] ?? "DG.Inspector.attributes.showAllHiddenAttributesPlural"
        return t(showAllHiddenAttributesKey, { vars: [hiddenAttributeCount] })
      },
      handleClick: () => {
        if (hiddenAttributeCount > 0) {
          const hiddenAttrIds = hiddenAttributes?.map(attr => attr.id) ?? []
          caseMetadata?.applyModelChange(
            () => caseMetadata?.showAllAttributes(),
            {
              notify: [
                hideAttributeNotification(hiddenAttrIds, data, "unhideAttributes"),
                hideAttributeNotification(hiddenAttrIds, data, "showAttributes")
              ],
              undoStringKey: "DG.Undo.caseTable.showAllHiddenAttributes",
              redoStringKey: "DG.Redo.caseTable.showAllHiddenAttributes",
              log: "Show all hidden attributes"
            }
          )
        }
      }
    }
  ]

  return (
    <>
      <StdMenuList data-testid="hide-show-menu-list" menuItems={menuItems} />
      {
        data &&
        <EditFilterFormulaModal formulaSource={data} isOpen={formulaModal.isOpen} onClose={handleEditFormulaClose} />
      }
    </>
  )
})
