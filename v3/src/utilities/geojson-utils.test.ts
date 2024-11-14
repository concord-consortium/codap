import { boundaryObjectFromBoundaryValue, isBoundaryValue } from "./geojson-utils"

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
