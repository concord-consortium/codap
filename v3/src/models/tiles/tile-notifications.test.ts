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

describe("titleChange notification envelope", () => {
  it("adds type to the outer envelope for the titleChange operation", () => {
    const tileMock = { id: v3Id, content: { type: v3Type } } as ITileModel
    const values = { from: "Old Title", to: "New Title" }

    const notification = updateTileNotification("titleChange", values, tileMock)

    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe(`component[${v2Id}]`)
    // type is mirrored to the outer envelope AND kept in values
    expect((notification?.message as any).type).toBe(v2Type)
    expect(notification?.message.values.operation).toBe("titleChange")
    expect(notification?.message.values.id).toBe(v2Id)
    expect(notification?.message.values.from).toBe("Old Title")
    expect(notification?.message.values.to).toBe("New Title")
    expect(notification?.message.values.type).toBe(v2Type)
  })

  it("keeps type inside values for non-titleChange operations", () => {
    const tileMock = { id: v3Id, content: { type: v3Type } } as ITileModel

    const notification = updateTileNotification("attributeChange", {}, tileMock)

    expect((notification?.message as any).type).toBeUndefined()
    expect(notification?.message.values.type).toBe(v2Type)
  })
})
