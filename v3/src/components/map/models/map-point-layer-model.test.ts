import { MapPointLayerModel } from "./map-point-layer-model"
import { createPointLayerTree } from "./map-point-layer-model-test-utils"

describe("MapPointLayerModel.getCaseLatLong", () => {
  it("returns the case's lat/long using the layer's attributes", () => {
    const tree = createPointLayerTree()
    expect(tree.layer.getCaseLatLong("c1")).toEqual({ lat: 42, long: -71 })
  })

  it("returns undefined for a case without valid coordinates", () => {
    const tree = createPointLayerTree()
    expect(tree.layer.getCaseLatLong("c3")).toBeUndefined()
  })

  it("returns undefined when the layer has no lat/long attributes", () => {
    const layer = MapPointLayerModel.create()
    expect(layer.getCaseLatLong("c1")).toBeUndefined()
  })
})
