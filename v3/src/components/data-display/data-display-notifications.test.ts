import { changePointSizeNotification, swapCategoriesNotification } from "./data-display-notifications"

// V2 component-resource notifications carry the SC class name (`DG.GraphView` / `DG.MapView`)
// in `values.type`; V3 adds the DI-convention name as `values.diType`. The mock resolves both
// from the tile's content.type so the shared helpers can be exercised on either tile.
jest.mock("../../models/tiles/tile-notifications", () => ({
  updateTileNotification: jest.fn((updateType: string, values: any, tileModel: any) => {
    if (!tileModel) return undefined
    const tileType = tileModel.content?.type
    const v2Type = tileType === "Graph" ? "DG.GraphView" : tileType === "Map" ? "DG.MapView" : ""
    const diType = tileType === "Graph" ? "graph" : tileType === "Map" ? "map" : ""
    return {
      message: {
        action: "notify",
        resource: "component",
        values: { operation: updateType, ...values, id: tileModel.id, type: v2Type, diType }
      }
    }
  })
}))

describe("swapCategoriesNotification", () => {
  it("emits 'swap categories' with the originating place (axis variant) for graph", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = swapCategoriesNotification(tile, "bottom")
    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe("swap categories")
    expect(notification?.message.values.place).toBe("bottom")
    expect(notification?.message.values.type).toBe("DG.GraphView")
    expect(notification?.message.values.diType).toBe("graph")
  })

  it("emits 'swap categories' with place='legend' for the legend variant on graph", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = swapCategoriesNotification(tile, "legend")
    expect(notification?.message.values.operation).toBe("swap categories")
    expect(notification?.message.values.place).toBe("legend")
  })

  it("emits 'swap categories' for the legend variant on map (closes V2 map gap)", () => {
    const tile = { id: "MAP1", content: { type: "Map" } } as any
    const notification = swapCategoriesNotification(tile, "legend")
    expect(notification?.message.values.operation).toBe("swap categories")
    expect(notification?.message.values.place).toBe("legend")
    expect(notification?.message.values.type).toBe("DG.MapView")
    expect(notification?.message.values.diType).toBe("map")
  })

  it("returns undefined when the tile is missing", () => {
    expect(swapCategoriesNotification(undefined, "left")).toBeUndefined()
  })
})

describe("changePointSizeNotification", () => {
  it("emits 'change point size' with the new multiplier on map", () => {
    const tile = { id: "MAP1", content: { type: "Map" } } as any
    const notification = changePointSizeNotification(tile, 1.4)
    expect(notification?.message.values.operation).toBe("change point size")
    expect(notification?.message.values.to).toBe(1.4)
    expect(notification?.message.values.type).toBe("DG.MapView")
    expect(notification?.message.values.diType).toBe("map")
  })

  it("emits 'change point size' on graph too (V3-additive — V2 graph does not, but the slider is shared)", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = changePointSizeNotification(tile, 0.8)
    expect(notification?.message.values.operation).toBe("change point size")
    expect(notification?.message.values.to).toBe(0.8)
    expect(notification?.message.values.type).toBe("DG.GraphView")
  })

  it("returns undefined when the tile is missing", () => {
    expect(changePointSizeNotification(undefined, 1.0)).toBeUndefined()
  })
})
