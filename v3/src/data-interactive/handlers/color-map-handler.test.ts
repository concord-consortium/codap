import { getSnapshot, Instance, types } from "mobx-state-tree"
import { diCategoryColorMapHandler } from "./color-map-handler"
import { DataSet } from "../../models/data/data-set"
import { SharedCaseMetadata } from "../../models/shared/shared-case-metadata"
import { createProvisionalCategorySet } from "../../models/data/category-set"

// eslint-disable-next-line no-var
var mockNodeIdCount = 0
jest.mock("../../utilities/js-utils", () => ({
  ...jest.requireActual("../../utilities/js-utils"),
  typedId: () => `test-${++mockNodeIdCount}`,
  uniqueOrderedId: () => `order-${++mockNodeIdCount}`
}))

describe("DataInteractive ColorMapHandler", () => {
  const handler = diCategoryColorMapHandler
  const TreeModel = types.model("Tree", {
    data: DataSet,
    metadata: SharedCaseMetadata
  })

  let contextTree: Instance<typeof TreeModel>

  function addDefaultCases(bFn: (b: number) => number = b => b) {
    for (let a = 1; a <= 3; ++a) {
      for (let b = 1; b<= 3; ++b) {
        const _b = bFn(b)
        for (let c = 1; c <= 3; ++c) {
          contextTree.data.addCases([{ __id__: `${a}-${_b}-${c}`, aId: `${a}`, bId: `${_b}`, cId: `${c}` }])
        }
      }
    }
  }

  beforeEach(() => {
    mockNodeIdCount = 0

    contextTree = TreeModel.create({
      data: getSnapshot(DataSet.create()),
      metadata: getSnapshot(SharedCaseMetadata.create())
    })
    contextTree.data.addAttribute({ id: "aId", name: "a" })
    contextTree.data.addAttribute({ id: "bId", name: "b" })
    contextTree.data.addAttribute({ id: "cId", name: "c" })
    contextTree.metadata.setData(contextTree.data)
    addDefaultCases()
    const categorySet = createProvisionalCategorySet(contextTree.data, "aId")
    contextTree.metadata.promoteProvisionalCategorySet(categorySet)
  })

  it("get works as expected", () => {
    expect(handler.get?.({}).success).toBe(false)

    const resources = {
      dataContext: contextTree.data,
      collection: contextTree.data.collections[0],
      attribute: contextTree.data.attributes[0]
    }
    expect(resources.dataContext).toBeDefined()
    expect(resources.collection).toBeDefined()
    const result = handler.get?.(resources, { metadata: contextTree.metadata })
    expect(result?.success).toBe(true)
    expect((result?.values as Record<string, string | undefined>))
            .toStrictEqual({"1": "#FF6800", "2": "#803E75", "3": "#A6BDD7"})
  })

  it("create works as expected", () => {
    const resources = {
      dataContext: contextTree.data,
      collection: contextTree.data.collections[0],
      attribute: contextTree.data.attributes[0]
    }
    const colorMap = {"1": "#FF68AA", "2": "#803EAA", "3": "#A6BDAA"}
    expect(resources.dataContext).toBeDefined()
    expect(resources.collection).toBeDefined()
    const result = handler.create?.(resources, { colorMap, metadata: contextTree.metadata})
    expect(result?.success).toBe(true)
    expect(result?.values).toStrictEqual(colorMap)
  })

  it("update works as expected", () => {
    expect(handler.get?.({}).success).toBe(false)
    const newColorMap = {"1": "#FF68FF", "2": "#803EFF", "3": "#A6BDFF"}
    const resources = {
      dataContext: contextTree.data,
      collection: contextTree.data.collections[0],
      attribute: contextTree.data.attributes[0]
    }
    expect(resources.dataContext).toBeDefined()
    expect(resources.collection).toBeDefined()
    const result = handler.update?.(resources, { colorMap: newColorMap, metadata: contextTree.metadata })
    expect(result?.success).toBe(true)
    expect(result?.values).toStrictEqual(newColorMap)
  })
})
