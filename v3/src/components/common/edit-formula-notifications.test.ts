import { editFormulaNotification } from "./edit-formula-notifications"

const v2Id = 54321
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

describe("editFormulaNotification", () => {
  it("emits an 'edit formula' notification on the component resource", () => {
    const tile = { id: "TABLE1", content: { type: "CaseTable" } } as any
    const notification = editFormulaNotification(tile)
    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe("edit formula")
    expect(notification?.message.values.id).toBe(v2Id)
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("returns undefined when the case-table tile is missing", () => {
    expect(editFormulaNotification(undefined)).toBeUndefined()
  })
})
