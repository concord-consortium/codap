import { moveAttribute } from "../../models/data/data-set-utils"
import { t } from "../../utilities/translation/translate"
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

    const { collection, position } = values as DIAttributeLocationValues
    const targetCollection = collection === "parent"
      ? dataContext.getParentCollectionGroup(sourceCollection?.id)?.collection
      : getCollection(dataContext, collection ? `${collection}` : undefined) ?? sourceCollection
    if (!targetCollection) return collectionNotFoundResult
    
    const numPos = Number(position)
    if (isNaN(numPos)) {
      return {
        success: false,
        values: { error: t("V3.DI.Error.fieldRequired", { vars: ["Update", "attributeLocation", "numeric position"] })}
      }
    }

    // The position is rounded to an integer and then snapped to the range of the number of attributes.
    const targetAttrs =
      dataContext.getGroupedCollection(targetCollection.id)?.attributes ?? dataContext.ungroupedAttributes
    const pos = Math.round(numPos)
    const _position = pos < 0 ? 0 : pos > targetAttrs.length ? targetAttrs.length : pos
    const afterAttrId = targetAttrs[_position - 1]?.id

    moveAttribute({
      afterAttrId,
      attrId: attributeLocation.id,
      dataset: dataContext,
      sourceCollection,
      targetCollection
    })

    return { success: true }
  }
}

registerDIHandler("attributeLocation", diAttributeLocationHandler)
