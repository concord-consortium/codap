import { MeanAdornmentModel } from "./mean-adornment-model"
import { kMeanType } from "./mean-adornment-types"

describe("MeanModel", () => {
  it("can be created", () => {
    const mean = MeanAdornmentModel.create()
    expect(mean).toBeDefined()
    expect(mean.type).toEqual(kMeanType)
  })
  it("can have its showLabels property set", () => {
    const mean = MeanAdornmentModel.create()
    expect(mean.showMeasureLabels).toBe(false)
    mean.setShowMeasureLabels(true)
    expect(mean.showMeasureLabels).toBe(true)
  })
  it("can have a new mean value added to its measures map", () => {
    const adornment = MeanAdornmentModel.create()
    expect(adornment.measures.size).toBe(0)
    adornment.addMeasure(10)
    expect(adornment.measures.size).toBe(1)
  })
  it("can have an existing mean value removed from its measures map", () => {
    const adornment = MeanAdornmentModel.create()
    expect(adornment.measures.size).toBe(0)
    adornment.addMeasure(10)
    expect(adornment.measures.size).toBe(1)
    adornment.removeMeasure("{}")
    expect(adornment.measures.size).toBe(0)
  })
})
