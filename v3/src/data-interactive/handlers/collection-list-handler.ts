import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, diNotImplementedYet } from "../data-interactive-types"

export const diCollectionListHandler: DIHandler = {
  get: diNotImplementedYet
}

registerDIHandler("collectionList", diCollectionListHandler)
