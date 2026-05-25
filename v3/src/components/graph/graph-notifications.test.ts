import { changeBackgroundColorNotification } from "./graph-notifications"

const v2Id = 77001
// V2 component-resource notifications carry the SC class name (`DG.GraphView`) in
// `values.type`; V3 adds the DI-convention name as `values.diType`.
const v2SCType = "DG.GraphView"
const diType = "graph"

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

describe("changeBackgroundColorNotification", () => {
  it("emits 'change background color' with the resulting color", () => {
    const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
    const notification = changeBackgroundColorNotification(tile, "#ff8800")
    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe("change background color")
    expect(notification?.message.values.to).toBe("#ff8800")
    expect(notification?.message.values.id).toBe(v2Id)
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("returns undefined for non-graph tiles (e.g. calculator)", () => {
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as any
    expect(changeBackgroundColorNotification(calcTile, "#ff8800")).toBeUndefined()
  })

  it("returns undefined when the graph tile is missing", () => {
    expect(changeBackgroundColorNotification(undefined, "#ff8800")).toBeUndefined()
  })
})
