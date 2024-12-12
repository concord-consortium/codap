import { ICollectionModel } from "../../models/data/collection"
import { createCollectionNotification } from "../../models/data/data-set-notifications"
import { getSharedCaseMetadataFromDataset } from "../../models/shared/shared-data-utils"
import { toV2Id } from "../../utilities/codap-utils"
import { registerDIHandler } from "../data-interactive-handler"
import {
  DIHandler, DIResources, DIValues, DICreateCollection, DICollection, DIUpdateCollection
} from "../data-interactive-types"
import { convertCollectionToV2 } from "../data-interactive-type-utils"
import { getCollection } from "../data-interactive-utils"
import { createAttribute } from "./di-handler-utils"
import { collectionNotFoundResult, dataContextNotFoundResult, valuesRequiredResult } from "./di-results"

export const diCollectionHandler: DIHandler = {
  create(resources: DIResources, values?: DIValues) {
    const { dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult
    if (!values) return valuesRequiredResult

    const metadata = getSharedCaseMetadataFromDataset(dataContext)
    const collections = Array.isArray(values) ? values : [values]
    const returnValues: DICollection[] = []

    const newCollections: ICollectionModel[] = []
    dataContext.applyModelChange(() => {
      // Find the empty default collection if it exists. It will be removed if any collections are added.
      const oldCollection = dataContext.collections.length === 1 && dataContext.collections[0]
      const emptyCollection = oldCollection && oldCollection.attributes.length === 0 ? oldCollection : undefined

      collections.forEach(collection => {
        const { labels, name, title, parent, attributes, attrs } = collection as DICreateCollection
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
            // If a parent collection is specified,
            // place the new collection before the parent collection's immediate child
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

        // If no before collection is specified, we have to explicitly put the new collection after the
        // child-most collection
        const options = beforeCollectionId ? { before: beforeCollectionId }
          : { after: dataContext.collectionIds[dataContext.collectionIds.length - 1] }
        const newCollection = dataContext.addCollection({ labels, name, _title: title }, options)
        newCollections.push(newCollection)

        // Attributes can be specified in both attributes and attrs
        const _attributes = Array.isArray(attributes) ? attributes : []
        const _attrs = Array.isArray(attrs) ? attrs : []
        const newAttributes = [..._attributes, ..._attrs]
        newAttributes.forEach(newAttribute => {
          // Each attribute must have a unique name
          if (newAttribute.name && !dataContext.getAttributeByName(newAttribute.name)) {
            createAttribute(newAttribute, dataContext, newCollection, metadata)
          }
        })

        returnValues.push({ id: toV2Id(newCollection.id), name: newCollection.name })
      })

      // Remove the empty default collection if any collections were added
      if (emptyCollection && dataContext.collections.length > 1) dataContext.removeCollection(emptyCollection)
    }, {
      notify: () => newCollections.map(newCollection => createCollectionNotification(newCollection, dataContext))
    })

    return { success: true, values: returnValues }
  },

  delete(resources: DIResources) {
    const { collection: _collection, dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult
    if (!_collection) return collectionNotFoundResult
    const collectionId = _collection.id
    // For now, it's only possible to delete a grouped collection.
    const collection = dataContext.getCollection(collectionId)
    if (!collection) return collectionNotFoundResult

    dataContext.applyModelChange(() => {
      dataContext.removeCollectionWithAttributes(collection)
    })

    return { success: true, values: { collections: [toV2Id(collectionId)] } }
  },

  get(resources: DIResources) {
    const { collection, dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult
    if (!collection) return collectionNotFoundResult

    const v2Collection = convertCollectionToV2(collection, { dataSet: dataContext })
    return {
      success: true,
      values: v2Collection
    }
  },

  update(resources: DIResources, values?: DIValues) {
    const { collection, dataContext } = resources
    if (!dataContext) return dataContextNotFoundResult
    if (!collection) return collectionNotFoundResult

    if (values) {
      const { title, labels } = values as DIUpdateCollection

      dataContext.applyModelChange(() => {
        if (title) collection.setTitle(title)
        if (labels) collection.setLabels(labels)
      })
    }

    return { success: true }
  }
}

registerDIHandler("collection", diCollectionHandler)
