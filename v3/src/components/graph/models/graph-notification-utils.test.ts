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
})
