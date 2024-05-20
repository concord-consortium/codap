import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, diNotImplementedYet } from "../data-interactive-types"

export const diCaseByIndexHandler: DIHandler = {
  delete: diNotImplementedYet,
  get: diNotImplementedYet,
  update: diNotImplementedYet
}

registerDIHandler("caseByIndex", diCaseByIndexHandler)
