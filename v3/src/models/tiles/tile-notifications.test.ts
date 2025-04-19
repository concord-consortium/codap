import { ITileModel } from "./tile-model"
import { createTileNotification, deleteTileNotification, updateTileNotification } from "./tile-notifications"

const v3Type = "Graph"
const v2Type = "graph"
const v3Id = "TILE12345"
const v2Id = 12345
const tileTitle = "Test Graph"

describe("createTileNotification", () => {
  it("should create a notification with the correct operation and result", () => {
    const tileMock = { id: v3Id, content: { type: v3Type } } as ITileModel

    const notification = createTileNotification(tileMock)

    expect(notification).toBeDefined()
    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe("create")
    expect(notification?.message.values.id).toBe(v2Id)
    expect(notification?.message.values.type).toBe(v2Type)
  })

  it("should return undefined if no tile is provided", () => {
    const notification = createTileNotification()

    expect(notification).toBeUndefined()
  })
})

describe("deleteTileNotification", () => {
  it("should create a notification with the correct operation and result", () => {
    const tileMock = {
      id: v3Id,
      content: { type: v3Type },
      name: tileTitle,
      title: tileTitle
    } as ITileModel

    const notification = deleteTileNotification(tileMock)

    expect(notification).toBeDefined()
    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe("delete")
    expect(notification?.message.values.id).toBe(v2Id)
    expect(notification?.message.values.name).toBe(tileTitle)
    expect(notification?.message.values.title).toBe(tileTitle)
    expect(notification?.message.values.type).toBe(v2Type)
  })
})

describe("updateTileNotification", () => {
  it("should create a notification with the correct operation and result", () => {
    const updateType = "attributeChange"
    const tileMock = { id: v3Id, content: { type: v3Type } } as ITileModel
    const values = {
      attributeId: "ATTR123",
      attributeName: "Test Attribute",
      axisOrientation: "horizontal"
    }

    const notification = updateTileNotification(updateType, values, tileMock)

    expect(notification).toBeDefined()
    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe(updateType)
    expect(notification?.message.values.id).toBe(v2Id)
    expect(notification?.message.values.type).toBe(v2Type)
  })
})
