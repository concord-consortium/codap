import { registerDIHandler } from "../data-interactive-handler"
import { basicAttributeInfo } from "../data-interactive-type-utils"
import { DIHandler, DIResources } from "../data-interactive-types"
import { collectionNotFoundResult } from "./di-results"

export const diAttributeListHandler: DIHandler = {
  get(resources: DIResources) {
    const { attributeList } = resources
    if (!attributeList) return collectionNotFoundResult

    return {
      success: true,
      values: attributeList.map(attribute => basicAttributeInfo(attribute))
    }
  }
}

registerDIHandler("attributeList", diAttributeListHandler)
