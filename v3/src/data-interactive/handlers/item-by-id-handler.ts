// import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, /*DIItem, DIResources, DIValues,*/ diNotImplementedYet } from "../data-interactive-types"

// const dataContextNotFoundResult =
//   { success: false, values: { error: t("V3.DI.Error.dataContextNotFound") } } as const

export const diItemByIDHandler: DIHandler = {
  delete: diNotImplementedYet,
  get: diNotImplementedYet,
  update: diNotImplementedYet
}

registerDIHandler("itemByID", diItemByIDHandler)
