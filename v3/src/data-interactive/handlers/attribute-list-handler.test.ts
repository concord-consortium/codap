import { getSnapshot } from "mobx-state-tree"
import { appState } from "../../models/app-state"
import { ITileModel } from "../../models/tiles/tile-model"
import { ICodapV2Attribute } from "../../v2/codap-v2-types"
import { parseResourceSelector, resolveResources } from "../resource-parser"
import { diAttributeListHandler } from "./attribute-list-handler"
import { setupTestDataset } from "./handler-test-utils"


describe("DataInteractive AttributeListHandler", () => {
  const handler = diAttributeListHandler

  it("resourceParser finds attributeList properly", () => {
    const { dataset } = setupTestDataset()
    appState.document.content?.createDataSet(getSnapshot(dataset))

    const resourceString = "dataContext[data].collection[collection1].attributeList"
    const resources = resolveResources(parseResourceSelector(resourceString), "get", {} as ITileModel)
    expect(resources.attributeList?.length).toBe(1)
    expect(resources.attributeList?.[0].name).toBe("a1")
  })

  it("get works as expected", () => {
    const { a1, a2 } = setupTestDataset()

    expect(handler.get?.({})?.success).toBe(false)

    const result = handler.get?.({ attributeList: [a1, a2] })
    expect(result?.success).toBe(true)
    const attributeList = result?.values as Partial<ICodapV2Attribute>[]
    expect(attributeList.length).toBe(2)
    const attr1 = attributeList[0]
    expect(attr1?.name).toBe(a1?.name)
    expect(attr1?.title).toBe(a1?.title)
    expect(attr1?.id).toBe(a1?.id)
    const attr2 = attributeList[1]
    expect(attr2?.name).toBe(a2?.name)
    expect(attr2?.title).toBe(a2?.title)
    expect(attr2?.id).toBe(a2?.id)
  })
})
