import { getTileTypeLabel } from "./tile-content-info"

describe("getTileTypeLabel", () => {
  it("returns the translated label for known tile types", () => {
    expect(getTileTypeLabel("Graph")).toBe("graph")
    expect(getTileTypeLabel("CaseTable")).toBe("table")
    expect(getTileTypeLabel("CodapSlider")).toBe("slider")
    expect(getTileTypeLabel("Calculator")).toBe("calculator")
    expect(getTileTypeLabel("CodapText")).toBe("text")
    expect(getTileTypeLabel("Map")).toBe("map")
    expect(getTileTypeLabel("CodapWebView")).toBe("web page")
    expect(getTileTypeLabel("CaseCard")).toBe("case card")
  })

  it("returns 'tile' for unknown tile types", () => {
    expect(getTileTypeLabel("SomeUnknownType")).toBe("tile")
  })

  it("returns 'tile' when type is undefined", () => {
    expect(getTileTypeLabel(undefined)).toBe("tile")
    expect(getTileTypeLabel()).toBe("tile")
  })
})
