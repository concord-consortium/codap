import { useDisclosure } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import React from "react"
import { useCaseMetadata } from "../../hooks/use-case-metadata"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { hideAttributeNotification } from "../../models/data/data-set-notifications"
import { t } from "../../utilities/translation/translate"
import { EditFilterFormulaModal } from "./edit-filter-formula-modal"
import { IMenuItem, StdMenuList } from "./std-menu-list"

export const HideShowMenuList = observer(function HideShowMenuList() {
  const data = useDataSetContext()
  const caseMetadata = useCaseMetadata()
  const formulaModal = useDisclosure()

  const handleSetAsideCases = (itemIds: string[], deselect: boolean) => {
    if (data && itemIds.length) {
      data.applyModelChange(() => {
        data.hideCasesOrItems(itemIds)
        if (deselect) data.selectAll(false)
      }, {
        undoStringKey: "V3.Undo.hideShowMenu.setAsideCases",
        redoStringKey: "V3.Redo.hideShowMenu.setAsideCases"
      })
    }
  }

  const handleEditFormulaOpen = () => {
    formulaModal.onOpen()
  }

  const handleEditFormulaClose = () => {
    formulaModal.onClose()
  }

  const itemCount = data?.items.length ?? 0
  const selectionCount = data?.selection.size ?? 0
  const setAsideCount = data?.hiddenItemIds.length ?? 0

  const hiddenAttributes = data?.attributes.filter(attr => attr && caseMetadata?.isHidden(attr.id))
  const hiddenAttributeCount = hiddenAttributes?.length ?? 0

  const menuItems: IMenuItem[] = [
    {
      itemKey: "DG.Inspector.setaside.setAsideSelectedCases",
      isEnabled: () => selectionCount > 0,
      handleClick: () => {
        if (data?.selection.size) {
          handleSetAsideCases(Array.from(data.selection), true)
        }
      }
    },
    {
      itemKey: "DG.Inspector.setaside.setAsideUnselectedCases",
      isEnabled: () => selectionCount < itemCount,
      handleClick: () => {
        const unselectedItemIds = data?.itemIds.filter(itemId => !data.isCaseSelected(itemId)) ?? []
        if (unselectedItemIds.length) {
          handleSetAsideCases(unselectedItemIds, false)
        }
      }
    },
    {
      itemKey: "DG.Inspector.setaside.restoreSetAsideCases",
      itemLabel: () => t("DG.Inspector.setaside.restoreSetAsideCases", { vars: [setAsideCount] }),
      isEnabled: () => setAsideCount > 0,
      handleClick: () => {
        if (data?.hiddenItemIds.length) {
          data.applyModelChange(() => {
            const hiddenItems = [...data.hiddenItemIds]
            data.showHiddenCasesAndItems()
            data.setSelectedCases(hiddenItems)
          }, {
            undoStringKey: "V3.Undo.hideShowMenu.restoreSetAsideCases",
            redoStringKey: "V3.Redo.hideShowMenu.restoreSetAsideCases",
            log: "Restore set aside cases"
          })
        }
      }
    },
    {
      itemKey: !data?.filterFormula?.empty
                ? "V3.hideShowMenu.editFilterFormula"
                : "V3.hideShowMenu.addFilterFormula",
      isEnabled: () => !!data,
      handleClick: handleEditFormulaOpen
    },
    {
      itemKey: "DG.Inspector.attributes.showAllHiddenAttributesPlural",
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
      <EditFilterFormulaModal isOpen={formulaModal.isOpen} onClose={handleEditFormulaClose} />
    </>
  )
})
