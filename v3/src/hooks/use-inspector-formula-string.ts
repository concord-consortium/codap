import { t } from "../utilities/translation/translate"

export function useInspectorFormulaString(display: string | undefined): string {
  const addOrEditFormulaString = display ? t("V3.hideShowMenu.editFilterFormula")
                                          : t("V3.hideShowMenu.addFilterFormula")
  return addOrEditFormulaString
}
