import { toV2Id } from "../../utilities/codap-utils"
import { DICollection } from "../data-interactive-data-set-types"
import { diCollectionListHandler } from "./collection-list-handler"
import { setupTestDataset } from "../../test/dataset-test-utils"

describe("DataInteractive AttributeListHandler", () => {
  const handler = diCollectionListHandler

  it("get works", () => {
    const { dataset, c1, c2 } = setupTestDataset()
    const { childCollection } = dataset
    const collectionList = [c1, c2, childCollection]

    expect(handler.get?.({})?.success).toBe(false)
    expect(handler.get?.({ dataContext: dataset }).success).toBe(false)

    const result = handler.get?.({ collectionList })
    expect(result?.success).toBe(true)
    const resultCollectionList = result?.values as DICollection[]
    expect(resultCollectionList.length).toBe(3)
    const collection1 = resultCollectionList[0]
    expect(collection1.name).toBe(c1.name)
    expect(collection1.title).toBe(c1.title)
    expect(collection1.id).toBe(toV2Id(c1.id))
    const collection3 = resultCollectionList[2]
    expect(collection3.name).toBe(childCollection.name)
    expect(collection3.title).toBe(childCollection.title)
    expect(collection3.id).toBe(toV2Id(childCollection.id))
  })
})
