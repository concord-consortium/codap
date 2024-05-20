import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, diNotImplementedYet } from "../data-interactive-types"

export const diFormulaEngineHandler: DIHandler = {
  get: diNotImplementedYet,
  notify: diNotImplementedYet
}

registerDIHandler("formulaEngine", diFormulaEngineHandler)
