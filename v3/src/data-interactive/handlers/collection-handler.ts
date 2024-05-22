import { isCollectionModel } from "../../models/data/collection"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, diNotImplementedYet } from "../data-interactive-types"
import { convertCollectionToV2, convertUngroupedCollectionToV2 } from "../data-interactive-type-utils"
import { collectionNotFoundResult, dataContextNotFoundResult } from "./di-results"

export const diCollectionHandler: DIHandler = {
  create: diNotImplementedYet,
  delete: diNotImplementedYet,
  get(resources: DIResources) {
    const { collection, dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult
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
