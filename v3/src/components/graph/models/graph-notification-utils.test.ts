import { attrChangeNotificationValues } from "./graph-notification-utils"

describe("attrChangeNotificationValues", () => {
  const mockTile = {
    content: {
      dataConfiguration: {
        primaryRole: "x"
      },
      plotType: "scatterPlot",
      type: "Graph"
    }
  } as any

  const mockAttrV3Id = "ATTR123"
  const mockAttrV2Id = 123
  const mockAttrName = "Test Attribute"
  const mockAttrIdToRemove = "attr2"
  const mockGraphPlace = "bottom"

  it("should return the expected values when an attribute is added", () => {
    const result = attrChangeNotificationValues(mockGraphPlace, mockAttrV3Id, mockAttrName, "", mockTile)
    expect(result).toEqual({
      attributeId: mockAttrV2Id,
      attributeName: mockAttrName,
      axisOrientation: "horizontal",
      plotType: "scatterPlot",
      primaryAxis: "x"
    })
  })

  it("should return the expected values when an attribute is removed", () => {
    const result = attrChangeNotificationValues(
      mockGraphPlace, mockAttrV3Id, mockAttrName, mockAttrIdToRemove, mockTile
    )
    expect(result).toEqual({
      attributeId: mockAttrV2Id,
      attributeName: `Remove X: ${mockAttrName}`,
      axisOrientation: "horizontal",
      plotType: "scatterPlot",
      primaryAxis: "x"
    })
  })

  it("reports V2's orientation for the top and right axes, and none for the plot or legend", () => {
    const orientation = (place: any) =>
      attrChangeNotificationValues(place, mockAttrV3Id, mockAttrName, "", mockTile)?.axisOrientation
    expect(orientation("top")).toBe("top")
    expect(orientation("rightCat")).toBe("right")
    expect(orientation("left")).toBe("vertical")
    expect(orientation("rightNumeric")).toBe("vertical2")
    expect(orientation("legend")).toBeUndefined()
    expect(orientation("plot")).toBeUndefined()
  })

  it("names a removal as V2's menu item for that axis does", () => {
    const removalName = (place: any) =>
      attrChangeNotificationValues(place, mockAttrV3Id, mockAttrName, mockAttrIdToRemove, mockTile)?.attributeName
    expect(removalName("left")).toBe(`Remove Y: ${mockAttrName}`)
    expect(removalName("rightNumeric")).toBe(`Remove Y: ${mockAttrName}`)
    expect(removalName("top")).toBe(`Remove Side-by-side Layout by ${mockAttrName}`)
    expect(removalName("rightCat")).toBe(`Remove Vertical Layout by ${mockAttrName}`)
    expect(removalName("legend")).toBe(`Remove Legend: ${mockAttrName}`)
  })
})
