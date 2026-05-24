import { toggleCardTableNotification } from "./case-tile-notifications"

const v2Id = 99001

jest.mock("../../models/tiles/tile-notifications", () => ({
  updateTileNotification: jest.fn((updateType: string, values: any, tileModel: any) => {
    if (!tileModel) return undefined
    return {
      message: {
        action: "notify",
        resource: "component",
        values: {
          operation: updateType, ...values, id: v2Id,
          type: tileModel.content.type === "CaseTable" ? "DG.CaseTable" : "DG.CaseCard"
        }
      }
    }
  })
}))

describe("toggleCardTableNotification", () => {
  it("emits 'toggle table to card' when toggling from a case table", () => {
    const tile = { id: "T1", content: { type: "CaseTable" } } as any
    const notification = toggleCardTableNotification(tile)
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe("toggle table to card")
    expect(notification?.message.values.type).toBe("DG.CaseTable")
  })

  it("emits 'toggle card to table' when toggling from a case card", () => {
    const tile = { id: "C1", content: { type: "CaseCard" } } as any
    const notification = toggleCardTableNotification(tile)
    expect(notification?.message.values.operation).toBe("toggle card to table")
    expect(notification?.message.values.type).toBe("DG.CaseCard")
  })

  it("returns undefined when the tile is missing", () => {
    expect(toggleCardTableNotification(undefined)).toBeUndefined()
  })
})
