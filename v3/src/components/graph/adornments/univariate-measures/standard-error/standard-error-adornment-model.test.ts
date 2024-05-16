import { StandardErrorAdornmentModel } from "./standard-error-adornment-model"
import { kStandardErrorType } from "./standard-error-adornment-types"

describe("StandardErrorModel", () => {
  it("can be created", () => {
    const mean = StandardErrorAdornmentModel.create()
    expect(mean).toBeDefined()
    expect(mean.type).toEqual(kStandardErrorType)
  })
  it("can have its showLabels property set", () => {
    const mean = StandardErrorAdornmentModel.create()
    expect(mean.showMeasureLabels).toBe(false)
    mean.setShowMeasureLabels(true)
    expect(mean.showMeasureLabels).toBe(true)
  })
  it("can have a new standard error value added to its measures map", () => {
    const adornment = StandardErrorAdornmentModel.create()
    expect(adornment.measures.size).toBe(0)
    adornment.addMeasure(10)
    expect(adornment.measures.size).toBe(1)
  })
  it("can have an existing standard error value removed from its measures map", () => {
    const adornment = StandardErrorAdornmentModel.create()
    expect(adornment.measures.size).toBe(0)
    adornment.addMeasure(10)
    expect(adornment.measures.size).toBe(1)
    adornment.removeMeasure("{}")
    expect(adornment.measures.size).toBe(0)
  })
})
