import { toggleCardTableNotification } from "./case-tile-notifications"

const v2Id = 99001
// V2 component-resource notifications carry the SC class name (`DG.CaseTable` / `DG.CaseCard`)
// in `values.type`; V3 adds the DI-convention name as `values.diType`.

jest.mock("../../models/tiles/tile-notifications", () => ({
  updateTileNotification: jest.fn((updateType: string, values: any, tileModel: any) => {
    if (!tileModel) return undefined
    const isCaseTable = tileModel.content.type === "CaseTable"
    return {
      message: {
        action: "notify",
        resource: "component",
        values: {
          operation: updateType, ...values, id: v2Id,
          type: isCaseTable ? "DG.CaseTable" : "DG.CaseCard",
          diType: isCaseTable ? "caseTable" : "caseCard"
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
    expect(notification?.message.values.diType).toBe("caseTable")
  })

  it("emits 'toggle card to table' when toggling from a case card", () => {
    const tile = { id: "C1", content: { type: "CaseCard" } } as any
    const notification = toggleCardTableNotification(tile)
    expect(notification?.message.values.operation).toBe("toggle card to table")
    expect(notification?.message.values.type).toBe("DG.CaseCard")
    expect(notification?.message.values.diType).toBe("caseCard")
  })

  it("returns undefined when the tile is missing", () => {
    expect(toggleCardTableNotification(undefined)).toBeUndefined()
  })
})
