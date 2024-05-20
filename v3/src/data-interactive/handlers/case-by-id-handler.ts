import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, diNotImplementedYet } from "../data-interactive-types"

export const diCaseByIDHandler: DIHandler = {
  delete: diNotImplementedYet,
  get: diNotImplementedYet,
  update: diNotImplementedYet
}

registerDIHandler("caseByID", diCaseByIDHandler)
