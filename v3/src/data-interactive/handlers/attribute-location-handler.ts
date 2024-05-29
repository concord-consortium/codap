import { moveAttribute } from "../../models/data/data-set-utils"
import { registerDIHandler } from "../data-interactive-handler"
import { DIAttributeLocationValues, DIHandler, DIResources, DIValues } from "../data-interactive-types"
import { getCollection } from "../data-interactive-utils"
import { attributeNotFoundResult, collectionNotFoundResult, dataContextNotFoundResult } from "./di-results"

export const diAttributeLocationHandler: DIHandler = {
  update(resources: DIResources, values?: DIValues) {
    const { attributeLocation, dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult
    if (!attributeLocation) return attributeNotFoundResult
    const sourceCollection = dataContext.getCollectionForAttribute(attributeLocation.id)

    const { collection, position } = (values ?? {}) as DIAttributeLocationValues
    const targetCollection = collection === "parent"
      ? dataContext.getParentCollectionGroup(sourceCollection?.id)?.collection
      : getCollection(dataContext, collection ? `${collection}` : undefined) ?? sourceCollection
    if (!targetCollection) return collectionNotFoundResult

    const targetAttrs = dataContext.getCollection(targetCollection.id)?.attributes ?? []
    const numPos = Number(position)

    // If the position isn't specified or isn't a number, make the attribute the right-most
    // Otherwise, round the position to an integer
    const pos = isNaN(numPos) ? targetAttrs.length : Math.round(numPos)

    // Snap the position to the left or right if it is negative or very large
    const _position = pos < 0 ? 0 : pos > targetAttrs.length ? targetAttrs.length : pos
    const afterAttrId = targetAttrs[_position - 1]?.id

    moveAttribute({
      afterAttrId,
      attrId: attributeLocation.id,
      dataset: dataContext,
      includeNotifications: true,
      sourceCollection,
      targetCollection
    })

    return { success: true }
  }
}

registerDIHandler("attributeLocation", diAttributeLocationHandler)
