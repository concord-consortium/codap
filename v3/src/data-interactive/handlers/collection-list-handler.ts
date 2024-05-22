import { registerDIHandler } from "../data-interactive-handler"
import { basicCollectionInfo } from "../data-interactive-type-utils"
import { DIHandler, DIResources } from "../data-interactive-types"
import { dataContextNotFoundResult } from "./di-results"

export const diCollectionListHandler: DIHandler = {
  get(resources: DIResources) {
    const { dataContext, collectionList } = resources
    if (!dataContext || !collectionList) return dataContextNotFoundResult

    return {
      success: true,
      values: collectionList.map(collection => basicCollectionInfo(collection))
    }
  }
}

registerDIHandler("collectionList", diCollectionListHandler)
