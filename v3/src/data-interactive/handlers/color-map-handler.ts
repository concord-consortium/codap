import { createProvisionalCategorySet } from "../../models/data/category-set"
import { getSharedCaseMetadataFromDataset } from "../../models/shared/shared-data-utils"
import { DICategoryColorMap } from "../data-interactive-data-set-types"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DIValues } from "../data-interactive-types"
import {
  attributeNotFoundResult, collectionNotFoundResult, dataContextNotFoundResult, errorResult,
} from "./di-results"

export const diCategoryColorMapHandler: DIHandler = {
  create(resources: DIResources, _values?: DIValues) {
    const { dataContext, collection } = resources
    if (!dataContext) return dataContextNotFoundResult

    const metadata = getSharedCaseMetadataFromDataset(dataContext)
    if (!metadata) return errorResult("Metadata not found")

    if (!collection) return collectionNotFoundResult
    const attributeName = typeof _values === 'object' && 'name' in _values ? _values.name as string : undefined
    const attribute = attributeName && collection.getAttributeByName(attributeName)
    const attributeId = attribute && typeof attribute !== 'string' ? attribute.id : undefined
    if (!attributeId) return attributeNotFoundResult

    const categorySet = createProvisionalCategorySet(dataContext, attributeId)
    categorySet.storeAllCurrentColors()
    const categoryColorMap: Record<string, string | undefined> = categorySet?.colorMap || {}
    if (!categoryColorMap) return errorResult("Category color map not found")

    return {
      success: true,
      values: categoryColorMap
    }

  },

  get(resources: DIResources, _values?: DIValues & { metadata?: any }) {
    const { dataContext, collection } = resources
    if (!dataContext) return dataContextNotFoundResult

    const metadata = getSharedCaseMetadataFromDataset(dataContext) ?? _values?.metadata
    if (!metadata) return errorResult("Metadata not found")

    if (!collection) return collectionNotFoundResult
    const attributeName = typeof _values === 'object' && 'name' in _values ? _values.name as string : undefined
    const attribute = attributeName && collection.getAttributeByName(attributeName)
    const attributeId = attribute && typeof attribute !== 'string' ? attribute.id : undefined
    if (!attributeId) return attributeNotFoundResult

    const categorySet = metadata.getCategorySet(attributeId)
    const categoryColorMap: Record<string, string | undefined> = categorySet?.colorMap || {}
    if (!categoryColorMap) return errorResult("Category color map not found")

    return {
      success: true,
      values: categoryColorMap
    }
  },

  update(resources: DIResources, _values?: DIValues & { metadata?: any }) {
    const { dataContext, collection } = resources
    if (!dataContext) return dataContextNotFoundResult

    const metadata = getSharedCaseMetadataFromDataset(dataContext) ?? _values?.metadata
    if (!metadata) return errorResult("Metadata not found")

    if (!collection) return collectionNotFoundResult
    const attributeName = typeof _values === 'object' && 'name' in _values ? _values.name as string : undefined
    const attribute = attributeName && collection.getAttributeByName(attributeName)
    const attributeId = attribute && typeof attribute !== 'string' ? attribute.id : undefined
    if (!attributeId) return attributeNotFoundResult
    const newColorMap = (_values && 'colorMap' in _values) ? _values.colorMap as DICategoryColorMap : undefined
    if (!newColorMap) return errorResult("New color map not found")
    const categorySet = metadata.getCategorySet(attributeId)
    if (!categorySet) return errorResult("Category set not found")
      const categoryColorMap: Record<string, string | undefined> = categorySet?.colorMap || {}
    if (!categoryColorMap) return errorResult("Category color map not found")

    Object.entries(newColorMap || {}).forEach(([category, color]) => {
      categorySet.setColorForCategory(category, color ?? categoryColorMap[category] ?? "")
    })
    categorySet.storeAllCurrentColors()
    const updatedColorMap = categorySet.colorMap
    if (!updatedColorMap) return errorResult("Updated color map not found")
    return {
      success: true,
      values: updatedColorMap
    }
  }
}

registerDIHandler("colorMap", diCategoryColorMapHandler)
