import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DIValues } from "../data-interactive-types"
import { collectionNotFoundResult } from "./di-results"

const isDIAttribute = (val: unknown): val is { type: string | null } => {
  return typeof val === "object" && val !== null && "type" in val
}

export const diAdornmentListHandler: DIHandler = {
  get(resources: DIResources, values?: DIValues) {
    const { adornmentList } = resources
    if (!adornmentList) return collectionNotFoundResult // replace with new adornmentNotFoundResult?

    const typeRequested = isDIAttribute(values) ? values.type : undefined
    const filterByType = () => adornmentList.filter(adornment => adornment.type === typeRequested)

    return {
      success: true,
      values: (typeRequested ? filterByType() : adornmentList)
                .map(({ id, type, isVisible }) => ({ id, type, isVisible }))
    }
    
  }
}

registerDIHandler("adornmentList", diAdornmentListHandler)
