import { ICollectionModel } from "../../models/data/collection"
import { diAttributeLocationHandler } from "./attribute-location-handler"
import { setupTestDataset } from "../../test/dataset-test-utils"

describe("DataInteractive AttributeLocationHandler", () => {
  const handler = diAttributeLocationHandler

  it("update works as expected", () => {
    const { dataset, c1, c2, a1, a2 } = setupTestDataset()
    const a4 = dataset.addAttribute({ name: "a4b" }, { collection: c1.id })
    const a5 = dataset.addAttribute({ name: "a5" }, { collection: c2.id })
    const a6 = dataset.addAttribute({ name: "a6" })
    const dataContext = dataset
    const resources = { attributeLocation: a1, dataContext }

    const collectionAttributes = (collection: ICollectionModel) => dataset.getCollection(collection.id)?.attributes

    expect(handler.update?.({})?.success).toBe(false)
    // Missing dataContext
    expect(handler.update?.(
      { attributeLocation: a2 }, { collection: c1.name, position: 0 }
    ).success).toBe(false)
    // Missing attributeLocation
    expect(handler.update?.({ dataContext }, { collection: c1.name, position: 0 }).success).toBe(false)
    // Parent of leftmost collection
    expect(handler.update?.(
      resources, { collection: "parent", position: 0 }
    ).success).toBe(false)

    // Move attribute within the ungrouped collection
    // Indexes snap to the end of the array
    expect(dataset.childCollection.attributes[2]!.id).toBe(a6.id)
    expect(handler.update?.({ attributeLocation: a6, dataContext }, { position: -1 }).success).toBe(true)
    expect(dataset.childCollection.attributes[0]!.id).toBe(a6.id)
    expect(handler.update?.({ attributeLocation: a6, dataContext }, { position: 10 }).success).toBe(true)
    expect(dataset.childCollection.attributes[2]!.id).toBe(a6.id)

    // Move attribute within a grouped collection
    // If not specified, move the attribute to the far right
    expect(collectionAttributes(c2)?.[1]?.id).toBe(a5.id)
    expect(handler.update?.({ attributeLocation: a5, dataContext }, { position: 0 }).success).toBe(true)
    expect(collectionAttributes(c2)?.[0]?.id).toBe(a5.id)
    expect(handler.update?.({ attributeLocation: a5, dataContext }).success).toBe(true)
    expect(collectionAttributes(c2)?.[1]?.id).toBe(a5.id)

    // Move attribute from ungrouped collection to middle of grouped collection
    expect(collectionAttributes(c1)?.[1]?.id).toBe(a4.id)
    expect(collectionAttributes(c1)?.length).toBe(2)
    expect(handler.update?.({ attributeLocation: a6, dataContext }, { collection: c1.name, position: 1 }).success)
      .toBe(true)
    expect(collectionAttributes(c1)?.length).toBe(3)
    expect(dataset.childCollection.attributes.length).toBe(2)
    expect(collectionAttributes(c1)?.[1]?.id).toBe(a6.id)
    expect(collectionAttributes(c1)?.[2]?.id).toBe(a4.id)

    // Move attribute from grouped collection to middle of its parent collection
    // Round the position
    expect(handler.update?.({ attributeLocation: a5, dataContext }, { collection: "parent", position: 1.2 }).success)
      .toBe(true)
    expect(collectionAttributes(c1)?.length).toBe(4)
    expect(collectionAttributes(c2)?.length).toBe(1)
    expect(collectionAttributes(c1)?.[1]?.id).toBe(a5.id)
  })
})
