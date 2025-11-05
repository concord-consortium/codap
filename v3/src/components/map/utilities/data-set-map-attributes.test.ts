import { DataSet } from "../../../models/data/data-set"
import { MapPolygonLayer } from "../components/map-polygon-layer"
import { MapBaseLayerModel } from "../models/map-base-layer-model"
import { MapPinLayerModel } from "../models/map-pin-layer-model"
import { MapPointLayerModel } from "../models/map-point-layer-model"
import { MapPolygonLayerModel } from "../models/map-polygon-layer-model"
import { DataSetMapAttributes } from "./data-set-map-attributes"

describe("DataSetMapAttributes", () => {
  it("should find no map attributes in an empty data set", () => {
    const dataSet = DataSet.create()
    const dsMapAttrs = new DataSetMapAttributes(dataSet)
    expect(dsMapAttrs.collections.length).toBe(0)
    expect(dsMapAttrs.hasMapAttributes).toBe(false)
    expect(dsMapAttrs.hasUnassignedMapAttributes).toBe(false)
  })

  it("should find map attributes in a flat data set with appropriate attributes", () => {
    const data = DataSet.create()
    data.addAttribute({ id: "a1", name: "Latitude", userType: "numeric" })
    data.addAttribute({ id: "a2", name: "Longitude", userType: "numeric" })
    data.addAttribute({ id: "a3", name: "Boundary", userType: "boundary" })
    data.addAttribute({ id: "a4", name: "PinLatitude", userType: "numeric" })
    data.addAttribute({ id: "a5", name: "PinLongitude", userType: "numeric" })

    const dsMapAttrs = new DataSetMapAttributes(data)
    expect(dsMapAttrs.collections.length).toBe(1)
    expect(dsMapAttrs.hasMapAttributes).toBe(true)
    expect(dsMapAttrs.hasUnassignedMapAttributes).toBe(true)

    expect(dsMapAttrs.hasUnassignedBoundaryAttributes).toBe(true)
    const boundaryAttrId = dsMapAttrs.assignFirstUnassignedBoundaryAttribute()
    expect(boundaryAttrId).toBe("a3")
    expect(dsMapAttrs.hasUnassignedBoundaryAttributes).toBe(false)

    expect(dsMapAttrs.hasUnassignedPointAttributes).toBe(true)
    const pointAttrs = dsMapAttrs.assignFirstUnassignedPointAttributes()
    expect(pointAttrs).toEqual({ latId: "a1", longId: "a2" })
    expect(dsMapAttrs.hasUnassignedPointAttributes).toBe(false)

    expect(dsMapAttrs.hasUnassignedPinAttributes).toBe(true)
    const pinAttrs = dsMapAttrs.assignFirstUnassignedPinAttributes()
    expect(pinAttrs).toEqual({ latId: "a4", longId: "a5" })
    expect(dsMapAttrs.hasUnassignedPinAttributes).toBe(false)
  })

  it("should find map attributes in a hierarchical data set with appropriate attributes", () => {
    const data = DataSet.create()
    data.addCollection({ id: "c1", name: "Parents" })
    data.addAttribute({ id: "a0", name: "Latitude", userType: "numeric" }, { collection: "c1" })
    data.addAttribute({ id: "a1", name: "Longitude", userType: "numeric" }, { collection: "c1" })
    data.addAttribute({ id: "a2", name: "Boundary", userType: "boundary" }, { collection: "c1" })
    data.addAttribute({ id: "a3", name: "PinLatitude", userType: "numeric" }, { collection: "c1" })
    data.addAttribute({ id: "a4", name: "PinLongitude", userType: "numeric" }, { collection: "c1" })
    data.addAttribute({ id: "a5", name: "Latitude", userType: "numeric" })
    data.addAttribute({ id: "a6", name: "Longitude", userType: "numeric" })
    data.addAttribute({ id: "a7", name: "Boundary", userType: "boundary" })
    data.addAttribute({ id: "a8", name: "PinLatitude", userType: "numeric" })
    data.addAttribute({ id: "a9", name: "PinLongitude", userType: "numeric" })

    const dsMapAttrs = new DataSetMapAttributes(data)
    expect(dsMapAttrs.collections.length).toBe(2)
    expect(dsMapAttrs.hasMapAttributes).toBe(true)
    expect(dsMapAttrs.hasUnassignedMapAttributes).toBe(true)

    expect(dsMapAttrs.hasUnassignedBoundaryAttributes).toBe(true)
    const boundaryAttrId = dsMapAttrs.assignFirstUnassignedBoundaryAttribute()
    expect(boundaryAttrId).toBe("a2")
    expect(dsMapAttrs.hasUnassignedBoundaryAttributes).toBe(true)
    const boundaryAttrId2 = dsMapAttrs.assignFirstUnassignedBoundaryAttribute()
    expect(boundaryAttrId2).toBe("a7")

    expect(dsMapAttrs.hasUnassignedPointAttributes).toBe(true)
    const pointAttrs = dsMapAttrs.assignFirstUnassignedPointAttributes()
    expect(pointAttrs).toEqual({ latId: "a0", longId: "a1" })
    expect(dsMapAttrs.hasUnassignedPointAttributes).toBe(true)
    const pointAttrs2 = dsMapAttrs.assignFirstUnassignedPointAttributes()
    expect(pointAttrs2).toEqual({ latId: "a5", longId: "a6" })

    expect(dsMapAttrs.hasUnassignedPinAttributes).toBe(true)
    const pinAttrs = dsMapAttrs.assignFirstUnassignedPinAttributes()
    expect(pinAttrs).toEqual({ latId: "a3", longId: "a4" })
    expect(dsMapAttrs.hasUnassignedPinAttributes).toBe(true)
    const pinAttrs2 = dsMapAttrs.assignFirstUnassignedPinAttributes()
    expect(pinAttrs2).toEqual({ latId: "a8", longId: "a9" })
  })

  it("should match empty map models in a flat data set with appropriate attributes", () => {
    const data = DataSet.create()
    data.addAttribute({ id: "a1", name: "Latitude", userType: "numeric" })
    data.addAttribute({ id: "a2", name: "Longitude", userType: "numeric" })
    data.addAttribute({ id: "a3", name: "Boundary", userType: "boundary" })
    data.addAttribute({ id: "a4", name: "PinLatitude", userType: "numeric" })
    data.addAttribute({ id: "a5", name: "PinLongitude", userType: "numeric" })

    const dsMapAttrs = new DataSetMapAttributes(data)
    expect(dsMapAttrs.collections.length).toBe(1)
    expect(dsMapAttrs.hasMapAttributes).toBe(true)
    expect(dsMapAttrs.hasUnassignedMapAttributes).toBe(true)

    const baseLayer = MapBaseLayerModel.create()
    expect(dsMapAttrs.matchMapLayer(baseLayer)).toBe(false)

    const polyLayer = MapPolygonLayerModel.create()
    expect(dsMapAttrs.hasUnassignedBoundaryAttributes).toBe(true)
    expect(dsMapAttrs.matchMapLayer(polyLayer)).toBe(true)
    expect(polyLayer.boundaryAttributeId).toBe("a3")
    expect(dsMapAttrs.hasUnassignedBoundaryAttributes).toBe(false)

    const pointLayer = MapPointLayerModel.create()
    expect(dsMapAttrs.hasUnassignedPointAttributes).toBe(true)
    expect(dsMapAttrs.matchMapLayer(pointLayer)).toBe(true)
    expect(pointLayer.pointAttributes).toEqual({ latId: "a1", longId: "a2" })
    expect(dsMapAttrs.hasUnassignedPointAttributes).toBe(false)

    const pinLayer = MapPinLayerModel.create()
    expect(dsMapAttrs.hasUnassignedPinAttributes).toBe(true)
    expect(dsMapAttrs.matchMapLayer(pinLayer)).toBe(true)
    expect(pinLayer.pinAttributes).toEqual({ latId: "a4", longId: "a5" })
    expect(dsMapAttrs.hasUnassignedPinAttributes).toBe(false)
  })

  it("should match configured map models in a flat data set with appropriate attributes", () => {
    const data = DataSet.create()
    data.addAttribute({ id: "a1", name: "Latitude", userType: "numeric" })
    data.addAttribute({ id: "a2", name: "Longitude", userType: "numeric" })
    data.addAttribute({ id: "a3", name: "Boundary", userType: "boundary" })
    data.addAttribute({ id: "a4", name: "PinLatitude", userType: "numeric" })
    data.addAttribute({ id: "a5", name: "PinLongitude", userType: "numeric" })

    const dsMapAttrs = new DataSetMapAttributes(data)
    expect(dsMapAttrs.collections.length).toBe(1)
    expect(dsMapAttrs.hasMapAttributes).toBe(true)
    expect(dsMapAttrs.hasUnassignedMapAttributes).toBe(true)

    const baseLayer = MapBaseLayerModel.create()
    expect(dsMapAttrs.matchMapLayer(baseLayer)).toBe(false)

    const polyLayer = MapPolygonLayerModel.create()
    polyLayer.setBoundaryAttribute(data, "a3")
    expect(dsMapAttrs.hasUnassignedBoundaryAttributes).toBe(true)
    expect(dsMapAttrs.matchMapLayer(polyLayer)).toBe(true)
    expect(polyLayer.boundaryAttributeId).toBe("a3")
    expect(dsMapAttrs.hasUnassignedBoundaryAttributes).toBe(false)

    const pointLayer = MapPointLayerModel.create()
    pointLayer.setPointAttributes(data, "a1", "a2")
    expect(dsMapAttrs.hasUnassignedPointAttributes).toBe(true)
    expect(dsMapAttrs.matchMapLayer(pointLayer)).toBe(true)
    expect(pointLayer.pointAttributes).toEqual({ latId: "a1", longId: "a2" })
    expect(dsMapAttrs.hasUnassignedPointAttributes).toBe(false)

    const pinLayer = MapPinLayerModel.create()
    pinLayer.setPinAttributes(data, "a4", "a5")
    expect(dsMapAttrs.hasUnassignedPinAttributes).toBe(true)
    expect(dsMapAttrs.matchMapLayer(pinLayer)).toBe(true)
    expect(pinLayer.pinAttributes).toEqual({ latId: "a4", longId: "a5" })
    expect(dsMapAttrs.hasUnassignedPinAttributes).toBe(false)
  })
})
