import { useDisclosure } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import { isAlive } from "mobx-state-tree"
import { useMemo } from "react"
import { useDataSetMetadata } from "../../hooks/use-data-set-metadata"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { hideAttributeNotification } from "../../models/data/data-set-notifications"
import { addSetAsideCases, restoreSetAsideCases } from "../../models/data/data-set-utils"
import { t } from "../../utilities/translation/translate"
import { EditFormulaModal } from "../common/edit-formula-modal"
import { IMenuItem, StdMenuList } from "./std-menu-list"

export const HideShowMenuList = observer(function HideShowMenuList() {
  const data = useDataSetContext()
  const metadata = useDataSetMetadata()
  const { isOpen, onClose, onOpen } = useDisclosure()

  const itemCount = data?.items.length ?? 0
  const selectionCount = data?.selection.size ?? 0
  const setAsideCount = data?.setAsideItemIds.length ?? 0

  const hiddenAttributes = data?.attributes.filter(attr => attr && metadata?.isHidden(attr.id))
  const hiddenAttributeCount = hiddenAttributes?.length ?? 0

  const menuItems: IMenuItem[] = useMemo(() => [
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
      dataTestId: "hide-show-menu-add-filter-formula",
      isEnabled: () => !!data,
      handleClick: onOpen
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
          metadata?.applyModelChange(
            () => metadata?.showAllAttributes(),
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
  ], [data, hiddenAttributeCount, hiddenAttributes, itemCount, metadata, onOpen, selectionCount, setAsideCount])

  if (data && !isAlive(data)) return null

  return (
    <>
      <StdMenuList data-testid="hide-show-menu-list" menuItems={menuItems} />
      {
        data &&
        <EditFormulaModal
          applyFormula={data.setFilterFormula}
          isOpen={isOpen}
          onClose={onClose}
          titleLabel={t("V3.hideShowMenu.filterFormulaPrompt")}
          value={data.filterFormula?.display}
        />
      }
    </>
  )
})
