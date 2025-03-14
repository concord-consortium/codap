import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources } from "../data-interactive-types"
import { adornmentListNotFoundResult } from "./di-results"


export const diAdornmentListHandler: DIHandler = {
  get(resources: DIResources) {
    const { adornmentList } = resources
    if (!adornmentList) return adornmentListNotFoundResult

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
