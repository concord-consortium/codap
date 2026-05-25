import {
  expandCollapseAllNotification, openCaseTableNotification, resizeColumnNotification, resizeColumnsNotification
} from "./case-table-notifications"

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

describe("resizeColumnNotification", () => {
  it("emits a 'resize column' notification for case-table tiles", () => {
    const tile = { id: "TABLE1", content: { type: "CaseTable" } } as any
    const notification = resizeColumnNotification(tile)
    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe("resize column")
    expect(notification?.message.values.id).toBe(v2Id)
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("returns undefined for non-case-table tiles (e.g. case card)", () => {
    const cardTile = { id: "CARD1", content: { type: "CaseCard" } } as any
    expect(resizeColumnNotification(cardTile)).toBeUndefined()
  })

  it("returns undefined when no tile is provided", () => {
    expect(resizeColumnNotification(undefined)).toBeUndefined()
  })
})

describe("resizeColumnsNotification", () => {
  it("emits a 'resize columns' (plural) notification for case-table tiles", () => {
    const tile = { id: "TABLE1", content: { type: "CaseTable" } } as any
    const notification = resizeColumnsNotification(tile)
    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe("resize columns")
    expect(notification?.message.values.id).toBe(v2Id)
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("returns undefined for non-case-table tiles (e.g. case card)", () => {
    const cardTile = { id: "CARD1", content: { type: "CaseCard" } } as any
    expect(resizeColumnsNotification(cardTile)).toBeUndefined()
  })

  it("returns undefined when no tile is provided", () => {
    expect(resizeColumnsNotification(undefined)).toBeUndefined()
  })
})

describe("expandCollapseAllNotification", () => {
  it("emits an 'expand/collapse all' notification with `to: expanded` for case-table tiles", () => {
    const tile = { id: "TABLE1", content: { type: "CaseTable" } } as any
    const notification = expandCollapseAllNotification(tile, "expanded")
    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe("expand/collapse all")
    expect(notification?.message.values.to).toBe("expanded")
    expect(notification?.message.values.id).toBe(v2Id)
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("emits `to: collapsed` for the collapse direction", () => {
    const tile = { id: "TABLE1", content: { type: "CaseTable" } } as any
    const notification = expandCollapseAllNotification(tile, "collapsed")
    expect(notification?.message.values.to).toBe("collapsed")
  })

  it("omits `to` when no direction is provided", () => {
    const tile = { id: "TABLE1", content: { type: "CaseTable" } } as any
    const notification = expandCollapseAllNotification(tile)
    expect(notification?.message.values.operation).toBe("expand/collapse all")
    expect(notification?.message.values.to).toBeUndefined()
  })

  it("returns undefined for non-case-table tiles (e.g. case card)", () => {
    const cardTile = { id: "CARD1", content: { type: "CaseCard" } } as any
    expect(expandCollapseAllNotification(cardTile, "expanded")).toBeUndefined()
  })

  it("returns undefined when no tile is provided", () => {
    expect(expandCollapseAllNotification(undefined, "expanded")).toBeUndefined()
  })
})
