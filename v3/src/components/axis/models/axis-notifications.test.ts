import { updateAxisNotification } from "./axis-notifications"

const v3Id = "TILE12345"
const v2Id = 12345
const v3TileType = "Graph"
// V2 component-resource notifications carry the SC class name (`DG.GraphView`) in
// `values.type`; V3 adds the DI-convention name as `values.diType`.
const v2SCType = "DG.GraphView"
const diType = "graph"

jest.mock("../../../models/tiles/tile-model", () => ({
  getTileModel: jest.fn(() => ({
    id: v3Id,
    type: v3TileType
  }))
}))

jest.mock("../../../models/tiles/tile-notifications", () => ({
  updateTileNotification: jest.fn((updateType: string, values: any, tileModel: any) => ({
    message: {
      action: "notify",
      resource: "component",
      values: {
        operation: updateType,
        ...values,
        id: v2Id,
        type: v2SCType,
        diType
      }
    }
  }))
}))

describe("updateAxisNotification", () => {
  it("should create a notification with the correct operation and result", () => {
    const updateType = "change axis bounds"
    const domain = [0, 10]
    const tileModel = {
      content: {
        type: v3TileType
      }
    } as any

    const notification = updateAxisNotification(updateType, domain, tileModel)

    expect(notification).toBeDefined()
    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe(updateType)
    expect(notification?.message.values.newBounds.lower).toBe(domain[0])
    expect(notification?.message.values.newBounds.upper).toBe(domain[1])
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
    expect(notification?.message.values.id).toBe(v2Id)
  })
})
