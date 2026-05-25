import {
  add2ndAxisAttributeNotification, addAxisAttributeNotification,
  changeBackgroundColorNotification, swapCategoriesNotification,
  toggleBackgroundTransparencyNotification, toggleMeasuresForSelectionNotification,
  toggleNumberToggleNotification
} from "./graph-notifications"

const v2Id = 77001
// V2 component-resource notifications carry the SC class name (`DG.GraphView`) in
// `values.type`; V3 adds the DI-convention name as `values.diType`.
const v2SCType = "DG.GraphView"
const diType = "graph"

jest.mock("../../models/tiles/tile-notifications", () => ({
  updateTileNotification: jest.fn((updateType: string, values: any, tileModel: any) => {
    if (!tileModel) return undefined
    return {
      message: {
        action: "notify",
        resource: "component",
        values: { operation: updateType, ...values, id: v2Id, type: v2SCType, diType }
      }
    }
  })
}))

describe("changeBackgroundColorNotification", () => {
  it("emits 'change background color' with the resulting color", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = changeBackgroundColorNotification(tile, "#ff8800")
    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe("change background color")
    expect(notification?.message.values.to).toBe("#ff8800")
    expect(notification?.message.values.id).toBe(v2Id)
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("returns undefined for non-graph tiles (e.g. calculator)", () => {
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as any
    expect(changeBackgroundColorNotification(calcTile, "#ff8800")).toBeUndefined()
  })

  it("returns undefined when the graph tile is missing", () => {
    expect(changeBackgroundColorNotification(undefined, "#ff8800")).toBeUndefined()
  })
})

describe("addAxisAttributeNotification", () => {
  const sampleValues: any = {
    attributeId: 4242, attributeName: "MPG", plotType: "scatterPlot",
    primaryAxis: "x", axisOrientation: "vertical"
  }

  it("emits 'add axis attribute' with the given attribute-change values", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = addAxisAttributeNotification(tile, sampleValues)
    expect(notification?.message.values.operation).toBe("add axis attribute")
    expect(notification?.message.values.attributeId).toBe(4242)
    expect(notification?.message.values.attributeName).toBe("MPG")
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("falls back to an empty payload when values are undefined", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = addAxisAttributeNotification(tile, undefined)
    expect(notification?.message.values.operation).toBe("add axis attribute")
    expect(notification?.message.values.attributeId).toBeUndefined()
  })

  it("returns undefined for non-graph tiles", () => {
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as any
    expect(addAxisAttributeNotification(calcTile, sampleValues)).toBeUndefined()
  })

  it("returns undefined when the graph tile is missing", () => {
    expect(addAxisAttributeNotification(undefined, sampleValues)).toBeUndefined()
  })
})

describe("add2ndAxisAttributeNotification", () => {
  const sampleValues: any = {
    attributeId: 5151, attributeName: "Horsepower", plotType: "scatterPlot",
    primaryAxis: "x", axisOrientation: "vertical"
  }

  it("emits 'add 2nd axis attribute' with the given attribute-change values", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = add2ndAxisAttributeNotification(tile, sampleValues)
    expect(notification?.message.values.operation).toBe("add 2nd axis attribute")
    expect(notification?.message.values.attributeId).toBe(5151)
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("returns undefined for non-graph tiles", () => {
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as any
    expect(add2ndAxisAttributeNotification(calcTile, sampleValues)).toBeUndefined()
  })

  it("returns undefined when the graph tile is missing", () => {
    expect(add2ndAxisAttributeNotification(undefined, sampleValues)).toBeUndefined()
  })
})

describe("toggleNumberToggleNotification", () => {
  it("emits 'toggle NumberToggle' with the resulting enabled state", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = toggleNumberToggleNotification(tile, true)
    expect(notification?.message.values.operation).toBe("toggle NumberToggle")
    expect(notification?.message.values.to).toBe(true)
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("returns undefined for non-graph tiles", () => {
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as any
    expect(toggleNumberToggleNotification(calcTile, true)).toBeUndefined()
  })

  it("returns undefined when the tile is missing", () => {
    expect(toggleNumberToggleNotification(undefined, false)).toBeUndefined()
  })
})

describe("toggleMeasuresForSelectionNotification", () => {
  it("emits 'toggle MeasuresForSelection' with the resulting enabled state", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = toggleMeasuresForSelectionNotification(tile, false)
    expect(notification?.message.values.operation).toBe("toggle MeasuresForSelection")
    expect(notification?.message.values.to).toBe(false)
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("returns undefined for non-graph tiles", () => {
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as any
    expect(toggleMeasuresForSelectionNotification(calcTile, true)).toBeUndefined()
  })

  it("returns undefined when the tile is missing", () => {
    expect(toggleMeasuresForSelectionNotification(undefined, true)).toBeUndefined()
  })
})

describe("swapCategoriesNotification", () => {
  it("emits 'swap categories' with the originating place (axis variant)", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = swapCategoriesNotification(tile, "bottom")
    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe("swap categories")
    expect(notification?.message.values.place).toBe("bottom")
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("emits 'swap categories' with place='legend' for the legend variant", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = swapCategoriesNotification(tile, "legend")
    expect(notification?.message.values.operation).toBe("swap categories")
    expect(notification?.message.values.place).toBe("legend")
  })

  it("returns undefined for non-graph tiles (so the shared sub-axis hook and legend are safe for maps)", () => {
    const mapTile = { id: "MAP1", content: { type: "Map" } } as any
    expect(swapCategoriesNotification(mapTile, "legend")).toBeUndefined()
  })

  it("returns undefined when the tile is missing", () => {
    expect(swapCategoriesNotification(undefined, "left")).toBeUndefined()
  })
})

describe("toggleBackgroundTransparencyNotification", () => {
  it("emits 'toggle background transparency' with the resulting state", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = toggleBackgroundTransparencyNotification(tile, true)
    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe("toggle background transparency")
    expect(notification?.message.values.to).toBe(true)
    expect(notification?.message.values.id).toBe(v2Id)
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("returns undefined for non-graph tiles", () => {
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as any
    expect(toggleBackgroundTransparencyNotification(calcTile, true)).toBeUndefined()
  })

  it("returns undefined when the graph tile is missing", () => {
    expect(toggleBackgroundTransparencyNotification(undefined, false)).toBeUndefined()
  })
})
