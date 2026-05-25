import { openCaseTableNotification } from "./case-table-notifications"

const v2Id = 77501
// V2 component-resource notifications carry the SC class name (`DG.CaseTable`) in
// `values.type`; V3 adds the DI-convention name as `values.diType`.
const v2SCType = "DG.CaseTable"
const diType = "caseTable"

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

describe("openCaseTableNotification", () => {
  it("emits an 'open case table' notification for case-table tiles", () => {
    const tile = { id: "TABLE1", content: { type: "CaseTable" } } as any
    const notification = openCaseTableNotification(tile)
    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe("open case table")
    expect(notification?.message.values.id).toBe(v2Id)
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("returns undefined for non-case-table tiles (e.g. case card)", () => {
    const cardTile = { id: "CARD1", content: { type: "CaseCard" } } as any
    expect(openCaseTableNotification(cardTile)).toBeUndefined()
  })

  it("returns undefined when no tile is provided", () => {
    expect(openCaseTableNotification(undefined)).toBeUndefined()
  })
})
