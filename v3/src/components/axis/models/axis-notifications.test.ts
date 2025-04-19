import { updateAxisNotification } from "./axis-notifications"

const v3Id = "TILE12345"
const v2Id = 12345
const v3Type = "Graph"
const v2Type = "graph"

jest.mock("../../../models/tiles/tile-model", () => ({
  getTileModel: jest.fn(() => ({
    id: v3Id,
    type: v3Type
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
        type: v2Type
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
        type: v3Type
      }
    } as any

    const notification = updateAxisNotification(updateType, domain, tileModel)

    expect(notification).toBeDefined()
    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe(updateType)
    expect(notification?.message.values.newBounds.lower).toBe(domain[0])
    expect(notification?.message.values.newBounds.upper).toBe(domain[1])
    expect(notification?.message.values.type).toBe(v2Type)
    expect(notification?.message.values.id).toBe(v2Id)
  })
})
