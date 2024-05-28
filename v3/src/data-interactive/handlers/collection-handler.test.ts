import { ICodapV2CollectionV3 } from "../../v2/codap-v2-types"
import { toV2Id, toV3CollectionId } from "../../utilities/codap-utils"
import { DICollection, DIDeleteCollectionResult, DIValues } from "../data-interactive-types"
import { diCollectionHandler } from "./collection-handler"
import { setupTestDataset } from "./handler-test-utils"

describe("DataInteractive CollectionHandler", () => {
  const handler = diCollectionHandler

  it("create works", () => {
    const { dataset, c1, c2 } = setupTestDataset()
    const dataContext = dataset
    expect(handler.create?.({}, {}).success).toBe(false)
    expect(handler.create?.({ dataContext }).success).toBe(false)

    // Collections require names
    expect(dataset.collections.length).toBe(2)
    const noNameResult = handler.create?.({ dataContext }, {})
    expect(noNameResult?.success).toBe(true)
    expect(noNameResult?.values).toEqual([])
    expect(dataset.collections.length).toBe(2)

    // Return information for existing collection when there's a name collision
    const sameNameResult = handler.create?.({ dataContext }, { name: c1.name })
    expect(sameNameResult?.success).toBe(true)
    const sameNameValues = sameNameResult?.values as DICollection[]
    expect(toV3CollectionId(sameNameValues[0].id!)).toBe(c1.id)
    expect(dataset.collections.length).toBe(2)

    // Add a right-most collection
    // Add attributes with attributes field
    const rightResult = handler.create?.({ dataContext }, { name: "right", attributes: [{ name: "a4" }] })
    expect(rightResult?.success).toBe(true)
    expect(dataset.collections.length).toBe(3)
    expect(dataset.collections[2].name).toBe("right")
    expect(dataset.collections[2].attributes.length).toBe(1)
    expect(dataset.collections[2].attributes[0]?.name).toBe("a4")

    // Add a left-most collection
    // Add attributes with attrs field
    const leftResult = handler.create?.({ dataContext }, { name: "left", parent: "root", attrs: [{ name: "a5"}] })
    expect(leftResult?.success).toBe(true)
    expect(dataset.collections.length).toBe(4)
    expect(dataset.collections[0].name).toBe("left")
    expect(dataset.collections[0].attributes.length).toBe(1)
    expect(dataset.collections[0].attributes[0]?.name).toBe("a5")

    // Add two collections in the middle
    // Won't create an attribute with a duplicate name
    // Add attributes with both attrs and attributes
    const twoResult = handler.create?.({ dataContext}, [
      { name: "c3", parent: c2.id, attrs: [{ name: "a5" }] },
      { name: "c4", parent: "c3", attrs: [{ name: "a7" }], attributes: [{ name: "a6" }] }
    ])
    expect(twoResult?.success).toBe(true)
    expect(dataset.collections.length).toBe(6)
    expect(dataset.collections[3].name).toBe("c3")
    expect(dataset.collections[3].attributes.length).toBe(0)
    expect(dataset.collections[4].name).toBe("c4")
    expect(dataset.collections[4].attributes.length).toBe(2)
    expect(dataset.collections[4].attributes[0]?.name).toBe("a6")
    expect(dataset.collections[4].attributes[1]?.name).toBe("a7")
  })

  it("delete works", () => {
    const { dataset: dataContext, c1: collection } = setupTestDataset()
    expect(handler.delete?.({ dataContext }).success).toBe(false)
    expect(handler.delete?.({ collection }).success).toBe(false)

    const collectionId = collection.id
    const result = handler.delete?.({ dataContext, collection })
    expect(result?.success).toBe(true)
    expect((result?.values as DIDeleteCollectionResult).collections?.[0]).toBe(toV2Id(collectionId))
    expect(dataContext.attributes.length).toBe(2)
    expect(dataContext.collections.length).toBe(1)
    expect(dataContext.getCollection(collectionId)).toBeUndefined()
  })

  it("get works", () => {
    const { dataset, c1 } = setupTestDataset()
    expect(handler.get?.({}).success).toBe(false)
    expect(handler.get?.({ dataContext: dataset }).success).toBe(false)

    // Grouped collection
    c1.setLabels({ singleCase: "singleCase" })
    const groupedResult = handler.get?.({ dataContext: dataset, collection: c1 })
    expect(groupedResult?.success).toBe(true)
    const groupedValues = groupedResult?.values as ICodapV2CollectionV3
    expect(groupedValues.name).toEqual(c1.name)
    expect(groupedValues.id).toEqual(toV2Id(c1.id))
    expect(groupedValues.attrs.length).toEqual(c1.attributes.length)
    expect(groupedValues.labels?.singleCase).toBe("singleCase")

    // Ungrouped collection
    const ungrouped = dataset.ungrouped
    const ungroupedResult = handler.get?.({ dataContext: dataset, collection: ungrouped })
    expect(ungroupedResult?.success).toBe(true)
    const ungroupedValues = ungroupedResult?.values as ICodapV2CollectionV3
    expect(ungroupedValues.name).toEqual(ungrouped.name)
    expect(ungroupedValues.id).toEqual(toV2Id(ungrouped.id))
    expect(ungroupedValues.attrs.length).toEqual(dataset.ungroupedAttributes.length)
  })

  it("update works", () => {
    const { dataset: dataContext, c1: collection } = setupTestDataset()
    expect(handler.update?.({ dataContext }).success).toBe(false)
    expect(handler.update?.({ collection }).success).toBe(false)
    expect(handler.update?.({ dataContext, collection }).success).toBe(true)

    expect(handler.update?.(
      { dataContext, collection }, { title: "newTitle", labels: { singleCase: "singleCase" } } as DIValues
    ).success).toBe(true)
    expect(collection._title).toBe("newTitle")
    expect(collection.labels?.singleCase).toBe("singleCase")
  })
})
