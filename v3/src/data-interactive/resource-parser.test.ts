import { getSnapshot } from "mobx-state-tree"
import { appState } from "../models/app-state"
import { ITileModel } from "../models/tiles/tile-model"
import { setupTestDataset } from "./handlers/handler-test-utils"
import { parseResourceSelector, resolveResources } from "./resource-parser"

describe("DataInteractive ResourceParser", () => {
  // TODO This should be expanded to cover many more cases
  it("resourceParser finds attributeList properly", () => {
    const { dataset } = setupTestDataset()
    appState.document.content?.createDataSet(getSnapshot(dataset))

    const resourceString = "dataContext[data].collection[collection1].attributeList"
    const resources = resolveResources(parseResourceSelector(resourceString), "get", {} as ITileModel)
    expect(resources.attributeList?.length).toBe(1)
    expect(resources.attributeList?.[0].name).toBe("a1")
  })
})
