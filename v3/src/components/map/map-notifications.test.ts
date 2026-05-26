import {
  changeBaseMapNotification, changeGridSizeNotification, changeMapCoordinatesNotification,
  hideSelectedCasesNotification, hideUnselectedCasesNotification, showAllCasesNotification
} from "./map-notifications"

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

describe("changeGridSizeNotification", () => {
  it("emits 'change grid size' with from/to values", () => {
    const tile = { id: "MAP1", content: { type: "Map" } } as any
    const notification = changeGridSizeNotification(tile, 0.5, 1.2)
    expect(notification?.message.values.operation).toBe("change grid size")
    expect(notification?.message.values.from).toBe(0.5)
    expect(notification?.message.values.to).toBe(1.2)
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("returns undefined for non-map tiles", () => {
    const graphTile = { id: "GRAPH1", content: { type: "Graph" } } as any
    expect(changeGridSizeNotification(graphTile, 0.5, 1.2)).toBeUndefined()
  })

  it("returns undefined when the tile is missing", () => {
    expect(changeGridSizeNotification(undefined, 0.5, 1.2)).toBeUndefined()
  })
})

describe("hideSelectedCasesNotification", () => {
  it("emits map-specific 'hide selected cases' with numberHidden (graph-parity)", () => {
    const tile = { id: "MAP1", content: { type: "Map" } } as any
    const notification = hideSelectedCasesNotification(tile, 3)
    expect(notification?.message.values.operation).toBe("hide selected cases")
    expect(notification?.message.values.numberHidden).toBe(3)
    expect(notification?.message.values.type).toBe(v2SCType)
  })

  it("returns undefined for non-map tiles", () => {
    const graphTile = { id: "GRAPH1", content: { type: "Graph" } } as any
    expect(hideSelectedCasesNotification(graphTile, 3)).toBeUndefined()
  })
})

describe("hideUnselectedCasesNotification", () => {
  it("emits map-specific 'hide unselected cases' with numberHidden (graph-parity)", () => {
    const tile = { id: "MAP1", content: { type: "Map" } } as any
    const notification = hideUnselectedCasesNotification(tile, 7)
    expect(notification?.message.values.operation).toBe("hide unselected cases")
    expect(notification?.message.values.numberHidden).toBe(7)
    expect(notification?.message.values.type).toBe(v2SCType)
  })

  it("returns undefined for non-map tiles", () => {
    const graphTile = { id: "GRAPH1", content: { type: "Graph" } } as any
    expect(hideUnselectedCasesNotification(graphTile, 7)).toBeUndefined()
  })
})

describe("showAllCasesNotification (map)", () => {
  it("emits map-specific 'show all cases' (space-separated, distinct from graph's camelCase op)", () => {
    const tile = { id: "MAP1", content: { type: "Map" } } as any
    const notification = showAllCasesNotification(tile)
    expect(notification?.message.values.operation).toBe("show all cases")
    expect(notification?.message.values.type).toBe(v2SCType)
  })

  it("returns undefined for non-map tiles", () => {
    const graphTile = { id: "GRAPH1", content: { type: "Graph" } } as any
    expect(showAllCasesNotification(graphTile)).toBeUndefined()
  })
})

describe("changeMapCoordinatesNotification", () => {
  it("emits 'change map coordinates' with center and zoom", () => {
    const tile = { id: "MAP1", content: { type: "Map" } } as any
    const notification = changeMapCoordinatesNotification(tile, { lat: 42.5, lng: -71.3 }, 12)
    expect(notification?.message.values.operation).toBe("change map coordinates")
    expect(notification?.message.values.center).toEqual({ lat: 42.5, lng: -71.3 })
    expect(notification?.message.values.zoom).toBe(12)
    expect(notification?.message.values.type).toBe(v2SCType)
  })

  it("returns undefined for non-map tiles", () => {
    const graphTile = { id: "GRAPH1", content: { type: "Graph" } } as any
    expect(changeMapCoordinatesNotification(graphTile, { lat: 0, lng: 0 }, 1)).toBeUndefined()
  })

  it("returns undefined when the tile is missing", () => {
    expect(changeMapCoordinatesNotification(undefined, { lat: 0, lng: 0 }, 1)).toBeUndefined()
  })
})
