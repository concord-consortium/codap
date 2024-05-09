import { isCollectionModel } from "../../models/data/collection"
import { t } from "../../utilities/translation/translate"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, diNotImplementedYet } from "../data-interactive-types"
import { convertCollectionToV2, convertUngroupedCollectionToV2 } from "../data-interactive-type-utils"

const collectionNotFoundResult = { success: false, values: { error: t("V3.DI.Error.collectionNotFound") } } as const

export const diCollectionHandler: DIHandler = {
  create: diNotImplementedYet,
  delete: diNotImplementedYet,
  get(resources: DIResources) {
    const { collection, dataContext } = resources
    if (!dataContext) return { success: false, values: { error: t("V3.DI.Error.dataContextNotFound") } }
    if (!collection) return collectionNotFoundResult

    const v2Collection = isCollectionModel(collection)
      ? convertCollectionToV2(collection)
      : convertUngroupedCollectionToV2(dataContext)
    return {
      success: true,
      values: v2Collection
    }
  },
  update: diNotImplementedYet
}

registerDIHandler("collection", diCollectionHandler)
