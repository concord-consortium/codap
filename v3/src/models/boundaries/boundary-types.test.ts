import {
  boundaryObjectFromBoundaryValue, checkBoundaryString, getBoundaryValueFromString, hasBoundaryThumbnail,
  isBoundaryInfo, isBoundaryString, isBoundaryValue
} from "./boundary-types"

describe("boundaryObjectFromBoundaryValue", () => {
  it("Returns the correct value", () => {
    expect(boundaryObjectFromBoundaryValue("not a boundary")).toBeNull()
    expect(boundaryObjectFromBoundaryValue(`{ "boundary": "Alaska" }`).boundary).toBe("Alaska")
    expect(boundaryObjectFromBoundaryValue({ boundary: "California" }).boundary).toBe("California")
  })
})

describe("isBoundaryValue", () => {
  it("Correctly identifies boundaries", () => {
    expect(isBoundaryValue("not a boundary")).toBe(false)
    expect(isBoundaryValue(`{ "boundary": "Alaska" }`)).toBe(false)
    expect(isBoundaryValue(`{ "type": "Feature" }`)).toBe(true)
    expect(isBoundaryValue({ boundary: "California" })).toBe(false)
    expect(isBoundaryValue({ geometry: "California" })).toBe(true)
  })
})

describe("checkBoundaryString", () => {
  it("Correctly identifies and returns boundaries", () => {
    expect(checkBoundaryString("not a boundary")).toEqual([false])
    expect(checkBoundaryString("{}")).toEqual([false])
    expect(checkBoundaryString(`{ "geometry": "Alaska" }`)).toEqual([true, { geometry: "Alaska" }])
    expect(checkBoundaryString(`{ "type": "Feature" }`)).toEqual([true, { type: "Feature" }])
  })
})

describe("isBoundaryString", () => {
  it("Correctly identifies boundaries", () => {
    expect(isBoundaryString("not a boundary")).toBe(false)
    expect(isBoundaryString(`{ "geometry": "Alaska" }`)).toBe(true)
    expect(isBoundaryString(`{ "type": "Feature" }`)).toBe(true)
  })
})

describe("getBoundaryValueFromString", () => {
  it("Correctly identifies and returns boundaries", () => {
    expect(getBoundaryValueFromString("not a boundary")).toBeUndefined()
    expect(getBoundaryValueFromString(`{ "geometry": "Alaska" }`)).toEqual({ geometry: "Alaska" })
    expect(getBoundaryValueFromString(`{ "type": "Feature" }`)).toEqual({ type: "Feature" })
  })
})

describe("hasBoundaryThumbnail", () => {
  it("Correctly identifies boundaries with thumbnails", () => {
    expect(hasBoundaryThumbnail(undefined)).toBe(false)
    expect(hasBoundaryThumbnail({})).toBe(false)
    expect(hasBoundaryThumbnail({ properties: {} })).toBe(false)
    expect(hasBoundaryThumbnail({ properties: { NAME: "Alaska" } })).toBe(false)
    expect(hasBoundaryThumbnail({ properties: { THUMB: "thumb.png" } })).toBe(true)
    expect(hasBoundaryThumbnail({ properties: { NAME: "Alaska", THUMB: "thumb.png" } })).toBe(true)
  })
})

describe("isBoundaryInfo", () => {
  it("Correctly identifies BoundaryInfo objects", () => {
    expect(isBoundaryInfo({})).toBe(false)
    expect(isBoundaryInfo({ name: "Boundary", format: "geojson", url: "http://example.com" })).toBe(true)
    expect(isBoundaryInfo({ name: "Boundary", format: "geojson" })).toBe(false)
  })
})
