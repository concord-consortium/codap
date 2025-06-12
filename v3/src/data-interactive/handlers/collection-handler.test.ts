import { getSnapshot } from "mobx-state-tree"
import { appState } from "../../models/app-state"
import * as SharedDataUtils from "../../models/shared/shared-data-utils"
import { toV2Id, toV3CollectionId } from "../../utilities/codap-utils"
import { ICodapV2CollectionV3 } from "../../v2/codap-v2-data-context-types"
import { DICollection, DIDeleteCollectionResult } from "../data-interactive-data-set-types"
import { DIValues } from "../data-interactive-types"
import { diCollectionHandler } from "./collection-handler"
import { setupTestDataset } from "../../test/dataset-test-utils"

describe("DataInteractive CollectionHandler", () => {
  const handler = diCollectionHandler

  it("create works", () => {
    const { dataset, metadata, c1, c2 } = setupTestDataset()
    const spy = jest.spyOn(SharedDataUtils, "getMetadataFromDataSet").mockReturnValue(metadata)
    const dataContext = dataset

    expect(handler.create?.({}, {}).success).toBe(false)
    expect(handler.create?.({ dataContext }).success).toBe(false)

    // Collections require names
    expect(dataset.collections.length).toBe(3)
    const noNameResult = handler.create?.({ dataContext }, {})
    expect(noNameResult?.success).toBe(true)
    expect(noNameResult?.values).toEqual([])
    expect(dataset.collections.length).toBe(3)

    // Return information for existing collection when there's a name collision
    const sameNameResult = handler.create?.({ dataContext }, { name: c1.name })
    expect(sameNameResult?.success).toBe(true)
    const sameNameValues = sameNameResult?.values as DICollection[]
    expect(toV3CollectionId(sameNameValues[0].id!)).toBe(c1.id)
    expect(dataset.collections.length).toBe(3)

    // Add a right-most collection
    // Add attributes with attributes field
    const rightResult = handler.create?.({ dataContext }, { name: "right", attributes: [{ name: "a4b" }] })
    expect(rightResult?.success).toBe(true)
    expect(dataset.collections.length).toBe(4)
    expect(dataset.collections[3].name).toBe("right")
    expect(dataset.collections[3].attributes.length).toBe(1)
    expect(dataset.collections[3].attributes[0]?.name).toBe("a4b")

    // Add a left-most collection
    // Add attributes with attrs field
    const leftResult = handler.create?.({ dataContext }, { name: "left", parent: "root", attrs: [{ name: "a5"}] })
    expect(leftResult?.success).toBe(true)
    expect(dataset.collections.length).toBe(5)
    expect(dataset.collections[0].name).toBe("left")
    expect(dataset.collections[0].attributes.length).toBe(1)
    expect(dataset.collections[0].attributes[0]?.name).toBe("a5")

    // Add two collections in the middle
    // Won't create an attribute with a duplicate name
    // Add attributes with both attrs and attributes
    const twoResult = handler.create?.({ dataContext}, [
      { name: "c3", parent: c2.id, attrs: [{ name: "a5" }], labels: { singleCase: "single", pluralCase: "plural" } },
      { name: "c4", parent: "c3", attrs: [{ name: "a7" }], attributes: [{ name: "a6" }] }
    ])
    expect(twoResult?.success).toBe(true)
    expect(dataset.collections.length).toBe(7)
    expect(dataset.collections[3].name).toBe("c3")
    expect(dataset.collections[3].attributes.length).toBe(0)
    expect(metadata?.collections.get(dataset.collections[3].id)?.labels?.singleCase).toBe("single")
    expect(metadata?.collections.get(dataset.collections[3].id)?.labels?.pluralCase).toBe("plural")
    expect(dataset.collections[4].name).toBe("c4")
    expect(dataset.collections[4].attributes.length).toBe(2)
    expect(dataset.collections[4].attributes[0]?.name).toBe("a6")
    expect(dataset.collections[4].attributes[1]?.name).toBe("a7")

    spy.mockRestore()
  })

  it("delete works", () => {
    const { dataset: dataContext, metadata, c1: collection } = setupTestDataset()
    const spy = jest.spyOn(SharedDataUtils, "getMetadataFromDataSet").mockReturnValue(metadata)

    expect(handler.delete?.({ dataContext }).success).toBe(false)
    expect(handler.delete?.({ collection }).success).toBe(false)

    const collectionId = collection.id
    const result = handler.delete?.({ dataContext, collection })
    expect(result?.success).toBe(true)
    expect((result?.values as DIDeleteCollectionResult).collections?.[0]).toBe(toV2Id(collectionId))
    expect(dataContext.attributes.length).toBe(3)
    expect(dataContext.collections.length).toBe(2)
    expect(dataContext.getCollection(collectionId)).toBeUndefined()

    spy.mockRestore()
  })

  it("get works", () => {
    const documentContent = appState.document.content!
    const { dataset, a3 } = setupTestDataset()
    documentContent.createDataSet(getSnapshot(dataset))
    const dataContext = SharedDataUtils.getSharedDataSets(documentContent)[0].dataSet
    const metadata = SharedDataUtils.getMetadataFromDataSet(dataContext)
    const c1 = dataContext.collections[0]
    dataContext.moveAttribute(a3.id, { collection: c1.id })
    expect(handler.get?.({ dataContext }).success).toBe(false)

    // Grouped collection
    metadata?.setIsHidden(c1.attributes[0]!.id, true)
    metadata?.setCollectionLabels(c1.id, { singleCase: "singleCase" })
    const groupedResult = handler.get?.({ dataContext, collection: c1 })
    expect(groupedResult?.success).toBe(true)
    const groupedValues = groupedResult?.values as ICodapV2CollectionV3
    expect(groupedValues.name).toEqual(c1.name)
    expect(groupedValues.id).toEqual(toV2Id(c1.id))
    expect(groupedValues.attrs.length).toEqual(c1.attributes.length)
    expect(groupedValues.attrs[0].hidden).toBe(true)
    expect(groupedValues.labels?.singleCase).toBe("singleCase")

    // child collection
    const childCollection = dataContext.childCollection
    const childCollectionResult = handler.get?.({ dataContext, collection: childCollection })
    expect(childCollectionResult?.success).toBe(true)
    const childCollectionValues = childCollectionResult?.values as ICodapV2CollectionV3
    expect(childCollectionValues.name).toEqual(childCollection.name)
    expect(childCollectionValues.id).toEqual(toV2Id(childCollection.id))
    expect(childCollectionValues.attrs.length).toEqual(dataContext.childCollection.attributes.length)
  })

  it("update works", () => {
    const { dataset: dataContext, metadata, c1: collection } = setupTestDataset()
    const spy = jest.spyOn(SharedDataUtils, "getMetadataFromDataSet").mockReturnValue(metadata)

    expect(handler.update?.({ dataContext }).success).toBe(false)
    expect(handler.update?.({ collection }).success).toBe(false)
    expect(handler.update?.({ dataContext, collection }).success).toBe(true)

    expect(handler.update?.(
      { dataContext, collection }, { title: "newTitle", labels: { singleCase: "singleCase" } } as DIValues
    ).success).toBe(true)
    expect(collection._title).toBe("newTitle")
    expect(metadata?.collections.get(collection.id)?.labels?.singleCase).toBe("singleCase")

    spy.mockRestore()
  })
})
