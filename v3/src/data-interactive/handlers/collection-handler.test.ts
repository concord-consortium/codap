import { ICodapV2CollectionV3 } from "../../v2/codap-v2-types"
import { toV2Id } from "../../utilities/codap-utils"
import { diCollectionHandler } from "./collection-handler"
import { setupTestDataset } from "./handler-test-utils"

describe("DataInteractive CollectionHandler", () => {
  const handler = diCollectionHandler
  it("get works as expected", () => {
    const { dataset, c1 } = setupTestDataset()
    expect(handler.get?.({}).success).toBe(false)
    expect(handler.get?.({ dataContext: dataset }).success).toBe(false)

    // Grouped collection
    const groupedResult = handler.get?.({ dataContext: dataset, collection: c1 })
    expect(groupedResult?.success).toBe(true)
    const groupedValues = groupedResult?.values as ICodapV2CollectionV3
    expect(groupedValues.name).toEqual(c1.name)
    expect(groupedValues.id).toEqual(toV2Id(c1.id))
    expect(groupedValues.attrs.length).toEqual(c1.attributes.length)

    // Ungrouped collection
    const ungrouped = dataset.ungrouped
    const ungroupedResult = handler.get?.({ dataContext: dataset, collection: ungrouped })
    expect(ungroupedResult?.success).toBe(true)
    const ungroupedValues = ungroupedResult?.values as ICodapV2CollectionV3
    expect(ungroupedValues.name).toEqual(ungrouped.name)
    expect(ungroupedValues.id).toEqual(toV2Id(ungrouped.id))
    expect(ungroupedValues.attrs.length).toEqual(dataset.ungroupedAttributes.length)
  })
})
