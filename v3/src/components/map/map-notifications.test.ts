import { changeBaseMapNotification } from "./map-notifications"

const v2Id = 77001
// V2 component-resource notifications for the map carry `DG.MapView` in `values.type`;
// V3 adds the DI-convention name as `values.diType`.
const v2SCType = "DG.MapView"
const diType = "map"

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

describe("changeBaseMapNotification", () => {
  it("emits 'change base map' with the chosen layer name", () => {
    const tile = { id: "MAP1", content: { type: "Map" } } as any
    const notification = changeBaseMapNotification(tile, "topo")
    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe("change base map")
    expect(notification?.message.values.to).toBe("topo")
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("returns undefined for non-map tiles", () => {
    const graphTile = { id: "GRAPH1", content: { type: "Graph" } } as any
    expect(changeBaseMapNotification(graphTile, "oceans")).toBeUndefined()
  })

  it("returns undefined when the tile is missing", () => {
    expect(changeBaseMapNotification(undefined, "streets")).toBeUndefined()
  })
})
