import { calculateNotification } from "./calculator-notifications"

const v2Id = 77001
// V2 component-resource notifications carry the SC class name (`DG.Calculator`) in
// `values.type`; V3 adds the DI-convention name as `values.diType`.
const v2SCType = "DG.Calculator"
const diType = "calculator"

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

describe("calculateNotification", () => {
  it("emits a 'calculate' notification on the component resource", () => {
    const tile = { id: "CALC1", content: { type: "Calculator" } } as any
    const notification = calculateNotification(tile)
    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe("calculate")
    expect(notification?.message.values.id).toBe(v2Id)
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("returns undefined when the calculator tile is missing", () => {
    expect(calculateNotification(undefined)).toBeUndefined()
  })
})
