import { isAttributeType } from "../../models/data/attribute"
import { CollectionModel, ICollectionModel, isCollectionModel } from "../../models/data/collection"
import { createCollectionNotification } from "../../models/data/data-set-notifications"
import { toV2Id } from "../../utilities/codap-utils"
import { registerDIHandler } from "../data-interactive-handler"
import {
  DIHandler, DIResources, diNotImplementedYet, DIValues, DICreateCollection, DICollection
} from "../data-interactive-types"
import { convertCollectionToV2, convertUngroupedCollectionToV2 } from "../data-interactive-type-utils"
import { getCollection } from "../data-interactive-utils"
import { collectionNotFoundResult, dataContextNotFoundResult, valuesRequiredResult } from "./di-results"

export const diCollectionHandler: DIHandler = {
  create(resources: DIResources, values?: DIValues) {
    const { dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult
    if (!values) return valuesRequiredResult

    const collections = Array.isArray(values) ? values : [values]
    const returnValues: DICollection[] = []

    const newCollections: ICollectionModel[] = []
    dataContext.applyModelChange(() => {
      collections.forEach(collection => {
        const { name, title, parent, attributes, attrs } = collection as DICreateCollection
        // Collections require a name, so bail if one isn't included
        if (!name) return

        // If there's already a collection with the name, we return the existing collection's info
        const existingCollection = dataContext.getCollectionByName(name)
        if (existingCollection) {
          returnValues.push({ id: toV2Id(existingCollection.id), name: existingCollection.name })
          return
        }

        // The default is to add the collection as the right-most
        let beforeCollectionId: string | undefined
        if (parent && dataContext.collections.length > 0) {
          const parentCollection = getCollection(dataContext, parent)
          if (parentCollection) {
            // If a parent collection is specified, place the new collection next to the parent collection
            const parentIndex = dataContext.getCollectionIndex(parentCollection.id)
            if (parentIndex < dataContext.collections.length - 1) {
              beforeCollectionId = dataContext.collections[parentIndex + 1].id
            }
          } else {
            // If a parent is specified but it doesn't exist, add the collection as the left-most.
            // The documentation says "root" should be used for this, but any non-collection will work in v2,
            // and "root" will NOT work if there's a collection named "root".
            beforeCollectionId = dataContext.collections[0].id
          }
        }

        const newCollection = CollectionModel.create({ name, _title: title })
        newCollections.push(newCollection)
        dataContext.addCollection(newCollection, beforeCollectionId)

        const trueAttributes = Array.isArray(attributes) ? attributes : []
        const trueAttrs = Array.isArray(attrs) ? attrs : []
        const newAttributes = [...trueAttributes, ...trueAttrs]
        newAttributes.forEach(newAttribute => {
          // Each attribute must have a unique name
          if (newAttribute.name && !dataContext.getAttributeByName(newAttribute.name)) {
            const attributeSnapshot = {
              description: newAttribute.description ?? undefined,
              formula: newAttribute.formula,
              name: newAttribute.name,
              precision: newAttribute.precision != null ? Number(newAttribute.precision) : undefined,
              title: newAttribute.title,
              units: newAttribute.unit ?? undefined, // Note units for v3 vs unit for v2
              userType: isAttributeType(newAttribute.type) ? newAttribute.type : undefined,
            }
            dataContext.addAttribute(attributeSnapshot, { collection: newCollection.id })
          }
        })

        returnValues.push({ id: toV2Id(newCollection.id), name: newCollection.name })
      })
    }, {
      notifications: () => newCollections.map(newCollection => createCollectionNotification(newCollection, dataContext))
    })

    return { success: true, values: returnValues }
  },

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
