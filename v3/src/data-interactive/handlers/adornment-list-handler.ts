import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources } from "../data-interactive-types"
import { collectionNotFoundResult } from "./di-results"

export const diAdornmentListHandler: DIHandler = {
  get(resources: DIResources) {
    const { adornmentList } = resources
    if (!adornmentList) return collectionNotFoundResult // replace with new adornmentNotFoundResult?

    return {
      success: true,
      values: adornmentList.map(adornment => {
        const { id, type, isVisible } = adornment
        return { id, type, isVisible }
      })
    }
  }
}

registerDIHandler("adornmentList", diAdornmentListHandler)
