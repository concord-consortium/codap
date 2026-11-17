import { createPointLayerTree } from "./map-point-layer-model-test-utils"

describe("MapGridModel", () => {
  it("updates its counts when a case's coordinates change", () => {
    const tree = createPointLayerTree()
    const { gridModel } = tree.layer
    gridModel.setIsVisible(true)
    gridModel.initializeGrid()
    // c1 and c2 share a location (c3 has no latitude), so one cell holds both
    expect(gridModel.maxCount).toBe(2)

    tree.data.setCaseValues([{ __id__: "c2", latId: -30, longId: 120 }])

    expect(gridModel.maxCount).toBe(1)
  })
})
