import { reaction } from "mobx"
import { toCanonical } from "../../../models/data/data-set"
import { ILatLong } from "../map-types"
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

describe("MapPointLayerModel point-data versions", () => {
  it("bumps pointCasesVersion when the set of plotted cases changes", () => {
    const tree = createPointLayerTree()
    const before = tree.layer.pointCasesVersion
    // hidden cases are identified by case ID, not item ID
    const { caseID } = tree.layer.dataConfiguration.getCaseDataArray(0)[0]
    tree.layer.dataConfiguration.addNewHiddenCases([caseID])
    expect(tree.layer.pointCasesVersion).toBeGreaterThan(before)
  })

  it("bumps pointValuesVersion when a value changes", () => {
    const tree = createPointLayerTree()
    const before = tree.layer.pointValuesVersion
    tree.data.setCaseValues([{ __id__: "c1", latId: 10 }])
    expect(tree.layer.pointValuesVersion).toBeGreaterThan(before)
    expect(tree.layer.pointValuesChangedWhileCaching).toBe(false)
  })

  it("records a value change made while the dataset is caching", () => {
    const tree = createPointLayerTree()
    tree.data.beginCaching()
    tree.data.setCaseValues([{ __id__: "c1", latId: 10 }])
    expect(tree.layer.pointValuesChangedWhileCaching).toBe(true)
    tree.data.endCaching()
  })

  it("bumps both pointCasesVersion and pointValuesVersion when cases are added", () => {
    const tree = createPointLayerTree()
    const cases = tree.layer.pointCasesVersion, values = tree.layer.pointValuesVersion
    tree.data.addCases(toCanonical(tree.data, [{ __id__: "c4", lat: 10, long: 10 }]))
    expect(tree.layer.pointCasesVersion).toBeGreaterThan(cases)
    expect(tree.layer.pointValuesVersion).toBeGreaterThan(values)
  })

  it("bumps pointValuesVersion and re-filters cases when a lat/long attribute's type changes", () => {
    const tree = createPointLayerTree()
    const before = tree.layer.pointValuesVersion
    const invalidate = jest.spyOn(tree.layer.dataConfiguration, "invalidateCases")
    tree.data.attrFromID("latId")?.setUserType("categorical")
    expect(tree.layer.pointValuesVersion).toBeGreaterThan(before)
    expect(invalidate).toHaveBeenCalled()
  })

  it("does not bump either version on selection changes", () => {
    const tree = createPointLayerTree()
    const version = tree.layer.pointDataVersion
    tree.data.selectCases(["c1"])
    tree.data.selectAll()
    tree.data.setSelectedCases([])
    expect(tree.layer.pointDataVersion).toBe(version)
  })

  it("follows the data configuration to a new dataset", () => {
    const tree = createPointLayerTree()
    const other = tree.otherData
    // attribute IDs must be unique across the tree
    other.addAttribute({ id: "otherLatId", name: "lat" })
    other.addAttribute({ id: "otherLongId", name: "long" })
    other.addCases(toCanonical(other, [{ __id__: "d1", lat: 1, long: 1 }]))
    tree.layer.dataConfiguration.setDataset(other, undefined)

    const before = tree.layer.pointValuesVersion
    other.setCaseValues([{ __id__: "d1", otherLatId: 2 }])
    expect(tree.layer.pointValuesVersion).toBeGreaterThan(before)

    // the previous dataset's listener was disposed
    const afterSwitch = tree.layer.pointValuesVersion
    tree.data.setCaseValues([{ __id__: "c1", latId: 10 }])
    expect(tree.layer.pointValuesVersion).toBe(afterSwitch)
  })
})

describe("MapPointLayerModel.plottedLatLongs", () => {
  it("is empty without plotted points", () => {
    expect(MapPointLayerModel.create().plottedLatLongs).toEqual([])
  })

  it("lists the plotted cases with valid coordinates", () => {
    const tree = createPointLayerTree()
    // c3 has no latitude
    expect(tree.layer.plottedLatLongs).toEqual([{ lat: 42, long: -71 }, { lat: 42, long: -71 }])
  })

  it("excludes hidden cases", () => {
    const tree = createPointLayerTree()
    const { caseID } = tree.layer.dataConfiguration.getCaseDataArray(0)[0]
    tree.layer.dataConfiguration.addNewHiddenCases([caseID])
    expect(tree.layer.plottedLatLongs).toHaveLength(1)
  })

  it("updates when a coordinate changes", () => {
    const tree = createPointLayerTree()
    const updates: ILatLong[][] = []
    const dispose = reaction(() => tree.layer.plottedLatLongs, latLongs => updates.push(latLongs))
    tree.data.setCaseValues([{ __id__: "c2", latId: -30, longId: 120 }])
    expect(updates).toEqual([[{ lat: 42, long: -71 }, { lat: -30, long: 120 }]])
    dispose()
  })

  it("updates when the lat attribute is reassigned", () => {
    const tree = createPointLayerTree()
    tree.data.addAttribute({ id: "lat2Id", name: "lat2" })
    tree.data.setCaseValues(
      [{ __id__: "c1", lat2Id: 10 }, { __id__: "c2", lat2Id: 11 }, { __id__: "c3", lat2Id: 12 }])
    const updates: ILatLong[][] = []
    const dispose = reaction(() => tree.layer.plottedLatLongs, latLongs => updates.push(latLongs))
    tree.layer.dataConfiguration.setAttribute("lat", { attributeID: "lat2Id" })
    // c3 has a value for the new attribute
    expect(updates).toEqual([[{ lat: 10, long: -71 }, { lat: 11, long: -71 }, { lat: 12, long: -71 }]])
    dispose()
  })

  it("is the point source for the layer's hot spot model", () => {
    const tree = createPointLayerTree()
    const surface = tree.layer.hotSpotModel.hotSpotSurface!
    expect(surface.points.map(p => p.latLong)).toEqual(tree.layer.plottedLatLongs)
  })
})
