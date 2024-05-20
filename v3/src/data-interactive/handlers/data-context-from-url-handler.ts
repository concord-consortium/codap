import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, diNotImplementedYet } from "../data-interactive-types"

export const diDataContextFromURLHandler: DIHandler = {
  create: diNotImplementedYet
}
  
registerDIHandler("dataContextFromURL", diDataContextFromURLHandler)
