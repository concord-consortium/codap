import { stripTrailingEllipsis } from "../utilities/translation/label-utils"
import { t } from "../utilities/translation/translate"

export function useInspectorFormulaString(display: string | undefined): string {
  const addOrEditFormulaString = display ? t("V3.hideShowMenu.editFilterFormula")
                                          : t("V3.hideShowMenu.addFilterFormula")
  return addOrEditFormulaString
}

// The formula editor's header shows the same Add/Edit wording as the menu item that opened it,
// minus the ellipsis that marks the menu item as opening a dialog.
export function useInspectorFormulaTitle(display: string | undefined): string {
  return stripTrailingEllipsis(useInspectorFormulaString(display))
}
