import { latLngBounds } from "leaflet"
import { GeoExtent } from "./geo-extent"

describe("constructor", () => {
  it("handles a leaflet bounds", () => {
    const extent = new GeoExtent(latLngBounds([-85, -180], [85, 180]))
    expect(extent.bbox).toEqual([-180, -85, 180, 85])
  })
})

describe("reproj", () => {
  it("handles basic reprojection", () => {
    const extent = new GeoExtent([-180, -85, 180, 85], { srs: 4326 })
    const result = extent.reproj(3857).bbox
    expect(result).toEqual([-20037508.342789244, -19971868.880408574, 20037508.342789244, 19971868.880408574])
  })

  it("handles basic reprojection with string", () => {
    const extent = new GeoExtent([-180, -85, 180, 85], { srs: 4326 })
    const result = extent.reproj("EPSG:3857").bbox
    expect(result).toEqual([-20037508.342789244, -19971868.880408574, 20037508.342789244, 19971868.880408574])
  })

  it("handles reverse reprojection with string", () => {
    const extent = new GeoExtent(
      [-20037508.342789244, -19971868.880408574, 20037508.342789244, 19971868.880408574], { srs: 3857 })
    const result = extent.reproj("EPSG:4326").bbox
    expect(result).toEqual([-180, -85, 180, 85])
  })

  it("throws error with unknown number code", () => {
    const extent = new GeoExtent([-180, -85, 180, 85], { srs: 4326 })
    expect(() => {
      extent.reproj(1234)
    }).toThrow("Unsupported projection code: 1234")
  })

  it("throws error with unknown string code", () => {
    const extent = new GeoExtent([-180, -85, 180, 85], { srs: 4326 })
    expect(() => {
      extent.reproj("EPSG:1234")
    }).toThrow("Invalid projection code: EPSG:1234")
  })

  it("handles north pole", () => {
    const northPole = new GeoExtent([-180, 85, 180, 90], { srs: 4326 })
    const result = northPole.reproj(3857).bbox
    // The ymin here is different from the original test from the geo-extent library
    // Which expected it to be 49411788.9015311. This is probably due to how Leaflet handles
    // re-projecting the north pole.
    expect(result).toEqual([-20037508.342789244, 19971868.880408574, 20037508.342789244, 20037508.34278071])
  })

  it("handles extent that crosses 180th meridian", () => {
    // technically layer is supposed to be self-overlapping
    const lyr = new GeoExtent([-180.00092731781535, 15.563268747733936, 179.99907268220255, 74.71076874773686], {
      srs: 4326
    })
    const result = lyr.reproj(3857).bbox
    // The geo-extent library would wrap this so the xmin and max values were the same value with different signs:
    // -20037508.342789244 and 20037508.342789244
    // This updated library doesn't handle that wrapping, so the xmin is beyond the expected xmin value for
    // a 3857 projection.
    expect(result).toEqual([-20037611.57133625, 1754201.5427894332, 20037405.114244226, 12808999.953599941])
  })
})

describe("contains", () => {
  it("handles a mix of projections", () => {
    const area = new GeoExtent([-1252344.2714243277, -7.081154551613622e-10, 0, 1252344.2714243277], { srs: 3857 })
    const globe = new GeoExtent([-180, -89.99928, 179.99856, 90], { srs: 4326 })
    expect(globe.contains(area)).toBe(true)
  })

  it("handles Continental USA in northern hemisphere", () => {
    const usa = new GeoExtent([-125.248182, 25.241145, -65.308966, 49.092881], { srs: 4326 })
    const northernHemisphere = new GeoExtent([-180, 0, 180, 90], { srs: 4326 })
    expect(northernHemisphere.contains(usa)).toBe(true)
    expect(usa.contains(northernHemisphere)).toBe(false)
  })
})

describe("unwrap", () => {
  it("handles unnecessary call", () => {
    const extent = new GeoExtent([-180, -90, 180, 90], { srs: 4326 })
    const unwrapped = extent.unwrap()
    expect(unwrapped.length).toBe(1)
    expect(unwrapped[0]).toStrictEqual(extent)
  })

  it("handles left overflow", () => {
    const extent = new GeoExtent([-185, -85, 175, 90], { srs: 4326 })
    const unwrapped = extent.unwrap().map(ext => ext.bbox)
    expect(unwrapped).toEqual([[-180, -85, 180, 90]])
  })

  it("handles right overflow", () => {
    const extent = new GeoExtent([175, -85, 185, 90], { srs: 4326 })
    const unwrapped = extent.unwrap().map(ext => ext.bbox)
    expect(unwrapped).toEqual([
      [-180, -85, -175, 90],
      [175, -85, 180, 90]
    ])
  })

  it("handles overflow on both sides", () => {
    const extent = new GeoExtent([-190, -85, 190, 90], { srs: 4326 })
    const unwrapped = extent.unwrap().map(ext => ext.bbox)
    expect(unwrapped.length).toBe(1)
    expect(unwrapped[0]).toEqual([-180, -85, 180, 90])
  })

  it("handles basic example", () => {
    const extent = new GeoExtent([-230, 19, -155, 45], { srs: 4326 })
    const unwrapped = extent.unwrap().map(ext => ext.bbox)
    expect(unwrapped).toEqual([
      [-180, 19, -155, 45],
      [130, 19, 180, 45]
    ])
  })

  it("handles globe coverage", () => {
    const extent = new GeoExtent([-185, -45, 175, 45], { srs: 4326 })
    const result = extent.unwrap()
    expect(result.length).toBe(1)
    expect(result[0].bbox).toEqual([-180, -45, 180, 45])
    expect(result[0].srs).toBe(4326)
  })

  it("handles globe coverage, overflowing right", () => {
    const extent = new GeoExtent([-175, -45, 200, 45], { srs: 4326 })
    const result = extent.unwrap()
    expect(result.length).toBe(1)
    expect(result[0].bbox).toEqual([-180, -45, 180, 45])
    expect(result[0].srs).toBe(4326)
  })
})

describe("combine", () => {
  it("combines southern and northern hemispheres", () => {
    const ne = new GeoExtent([0, 0, 180, 90], { srs: 4326 })
    const sw = new GeoExtent([-180, -90, 0, 0], { srs: 4326 })
    const combinedBbox = [-180, -90, 180, 90]
    expect(ne.combine(sw).bbox).toEqual(combinedBbox)
    expect(sw.combine(ne).bbox).toEqual(combinedBbox)
  })
})

describe("crop", () => {
  it("crops kenya by NE tile", () => {
    const kenya = new GeoExtent([34.4282, -4.2367, 41.3861, 4.4296], { srs: 4326 })
    const tile = new GeoExtent([0, 0, 180, 90], { srs: 4326 })
    const result = kenya.crop(tile)
    expect(result!.bbox).toEqual([34.4282, 0, 41.3861, 4.4296])
  })

  it("crops with no overlap", () => {
    const kenya = new GeoExtent([34.4282, -4.2367, 41.3861, 4.4296], { srs: 4326 })
    const nw = new GeoExtent([-180, 0, 0, 90], { srs: 4326 })
    const result = nw.crop(kenya)
    expect(result).toBeNull()
  })

  it("crops with full containment", () => {
    const usa = new GeoExtent([-125.248182, 25.241145, -65.308966, 49.092881], { srs: 4326 })
    const northernHemisphere = new GeoExtent([-180, 0, 180, 90], { srs: 4326 })
    const result = usa.crop(northernHemisphere)
    expect(result!.bbox).toEqual([-125.248182, 25.241145, -65.308966, 49.092881])
  })

  it("crops by left-overflow extent", () => {
    const tile = new GeoExtent([-20037508.342789244, -20037508.342789255, 20037508.342789244, 20037508.342789244], {
      srs: 3857
    })

    const lyr = new GeoExtent([-180.00092731781535, 15.563268747733936, 0, 74.71076874773686], {
      srs: 4326
    })

    // Because lyr overflows the left side of the globe, it essentially crops a portion of the right side of the tile
    // along with the left side of the tile up to the xmax of the layer. Then these two portions are combined to find
    // their extent. The extent ends up having the full width of the globe, because of the combination of the two
    // portions.
    const result = tile.crop(lyr)!
    expect(result.srs).toBe(3857)
    expect(result.bbox).toEqual([-20037508.342789244, 1754201.5427894332, 20037508.342789244, 12808999.953599948])
    expect(result.width).toBe(40075016.68557849)
  })

  it("handles overflowing extent with no overlap", () => {
    const tile = new GeoExtent([-10, -10, 10, 10], { srs: 4326 })
    const lyr = new GeoExtent([-190, -10, -170, 10], { srs: 4326 })
    const result = tile.crop(lyr)
    expect(result).toBeNull()
  })
})

describe("overlaps", () => {
  it("returns true for overlapping extents", () => {
    const extent1 = new GeoExtent([-10, -10, 10, 10], { srs: 4326 })
    const extent2 = new GeoExtent([5, 5, 15, 15], { srs: 4326 })
    expect(extent1.overlaps(extent2)).toBe(true)
  })

  it("returns false for non-overlapping extents", () => {
    const extent1 = new GeoExtent([-10, -10, -5, -5], { srs: 4326 })
    const extent2 = new GeoExtent([5, 5, 15, 15], { srs: 4326 })
    expect(extent1.overlaps(extent2)).toBe(false)
  })

  it("returns true for identical extents", () => {
    const extent1 = new GeoExtent([-10, -10, 10, 10], { srs: 4326 })
    const extent2 = new GeoExtent([-10, -10, 10, 10], { srs: 4326 })
    expect(extent1.overlaps(extent2)).toBe(true)
  })

  it("returns true for partially overlapping extents", () => {
    const extent1 = new GeoExtent([-10, -10, 0, 0], { srs: 4326 })
    const extent2 = new GeoExtent([-5, -5, 5, 5], { srs: 4326 })
    expect(extent1.overlaps(extent2)).toBe(true)
  })

  it("handles extents in different projections", () => {
    const extent1 = new GeoExtent([-10, -10, 10, 10], { srs: 4326 })
    const extent2 = new GeoExtent([-50, -50, 50, 50], { srs: 3857 })
    const extent3 = new GeoExtent([5_000_000, 5_000_000, 5_000_010, 5_000_010], { srs: 3857 })
    expect(extent1.overlaps(extent2)).toBe(true)
    expect(extent1.overlaps(extent3)).toBe(false)
  })
})

describe("width and height", () => {
  it("calculates width and height in EPSG:4326", () => {
    const extent = new GeoExtent([-10, -10, 10, 10], { srs: 4326 })
    expect(extent.width).toBe(20)
    expect(extent.height).toBe(20)
  })
})

describe("leaflet bounds", () => {
  it("converts to leaflet bounds", () => {
    const extent = new GeoExtent([-10, -10, 10, 10], { srs: 4326 })
    const bounds = extent.leafletBounds
    expect(bounds.getSouthWest().lat).toBe(-10)
    expect(bounds.getSouthWest().lng).toBe(-10)
    expect(bounds.getNorthEast().lat).toBe(10)
    expect(bounds.getNorthEast().lng).toBe(10)
  })
})
