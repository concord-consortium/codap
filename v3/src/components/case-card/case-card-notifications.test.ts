import { changeColumnWidthNotification } from "./case-card-notifications"

const v2Id = 88001
// V2 component-resource notifications carry the SC class name (`DG.CaseCard`) in
// `values.type`; V3 adds the DI-convention name as `values.diType`.
const v2SCType = "DG.CaseCard"
const diType = "caseCard"

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

describe("changeColumnWidthNotification", () => {
  it("emits a 'change column width' notification on the component resource", () => {
    const tile = { id: "CARD1", content: { type: "CaseCard" } } as any
    const notification = changeColumnWidthNotification(tile)
    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe("change column width")
    expect(notification?.message.values.id).toBe(v2Id)
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("returns undefined for non-case-card tiles (e.g. case table)", () => {
    const tableTile = { id: "TABLE1", content: { type: "CaseTable" } } as any
    expect(changeColumnWidthNotification(tableTile)).toBeUndefined()
  })

  it("returns undefined when the case-card tile is missing", () => {
    expect(changeColumnWidthNotification(undefined)).toBeUndefined()
  })
})
