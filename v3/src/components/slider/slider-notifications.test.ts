import { changeSliderValueNotification } from "./slider-notifications"

const v2Id = 66001
// V2 component-resource notifications carry the SC class name (`DG.SliderView`) in
// `values.type`; V3 adds the DI-convention name as `values.diType`.
const v2SCType = "DG.SliderView"
const diType = "slider"

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

describe("changeSliderValueNotification", () => {
  it("emits a 'change slider value' notification with `to: value` for slider tiles", () => {
    const tile = { id: "SLIDER1", content: { type: "CodapSlider" } } as any
    const notification = changeSliderValueNotification(tile, 3.14)
    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe("change slider value")
    expect(notification?.message.values.to).toBe(3.14)
    expect(notification?.message.values.id).toBe(v2Id)
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("includes `to: 0` (not omitted) when value is zero", () => {
    const tile = { id: "SLIDER1", content: { type: "CodapSlider" } } as any
    const notification = changeSliderValueNotification(tile, 0)
    expect(notification?.message.values.to).toBe(0)
  })

  it("omits `to` when no value is provided", () => {
    const tile = { id: "SLIDER1", content: { type: "CodapSlider" } } as any
    const notification = changeSliderValueNotification(tile)
    expect(notification?.message.values.operation).toBe("change slider value")
    expect(notification?.message.values.to).toBeUndefined()
  })

  it("returns undefined for non-slider tiles (e.g. graph)", () => {
    const graphTile = { id: "GRAPH1", content: { type: "Graph" } } as any
    expect(changeSliderValueNotification(graphTile, 3.14)).toBeUndefined()
  })

  it("returns undefined when no tile is provided", () => {
    expect(changeSliderValueNotification(undefined, 3.14)).toBeUndefined()
  })
})
