import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, diNotImplementedYet } from "../data-interactive-types"

export const diCaseFormulaSearchHandler: DIHandler = {
  get: diNotImplementedYet
}

registerDIHandler("caseFormulaSearch", diCaseFormulaSearchHandler)
