import { toV2Id } from "../../utilities/codap-utils"
import { ICodapV2Attribute } from "../../v2/codap-v2-data-context-types"
import { diAttributeListHandler } from "./attribute-list-handler"
import { setupTestDataset } from "../../test/dataset-test-utils"

describe("DataInteractive AttributeListHandler", () => {
  const handler = diAttributeListHandler

  it("get works as expected", () => {
    const { a1, a2 } = setupTestDataset()

    expect(handler.get?.({})?.success).toBe(false)

    const result = handler.get?.({ attributeList: [a1, a2] })
    expect(result?.success).toBe(true)
    const attributeList = result?.values as Partial<ICodapV2Attribute>[]
    expect(attributeList.length).toBe(2)
    const attr1 = attributeList[0]
    expect(attr1.name).toBe(a1.name)
    expect(attr1.title).toBe(a1.title)
    expect(attr1.id).toBe(toV2Id(a1.id))
    const attr2 = attributeList[1]
    expect(attr2.name).toBe(a2.name)
    expect(attr2.title).toBe(a2.title)
    expect(attr2.id).toBe(toV2Id(a2.id))
  })
})
