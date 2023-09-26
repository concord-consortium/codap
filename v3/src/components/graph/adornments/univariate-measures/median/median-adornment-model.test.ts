import { MedianAdornmentModel } from "./median-adornment-model"
import { kMedianType } from "./median-adornment-types"

describe("MedianAdornmentModel", () => {
  it("can be created", () => {
    const median = MedianAdornmentModel.create()
    expect(median).toBeDefined()
    expect(median.type).toEqual(kMedianType)
  })
  it("can have its showLabels property set", () => {
    const mean = MedianAdornmentModel.create()
    expect(mean.showMeasureLabels).toBe(false)
    mean.setShowMeasureLabels(true)
    expect(mean.showMeasureLabels).toBe(true)
  })
  it("can have a new median value added to its measures map", () => {
    const adornment = MedianAdornmentModel.create()
    expect(adornment.measures.size).toBe(0)
    adornment.setInitialMeasure(10)
    expect(adornment.measures.size).toBe(1)
  })
  it("can have an existing median value removed from its measures map", () => {
    const adornment = MedianAdornmentModel.create()
    expect(adornment.measures.size).toBe(0)
    adornment.setInitialMeasure(10)
    expect(adornment.measures.size).toBe(1)
    adornment.removeMeasure("{}")
    expect(adornment.measures.size).toBe(0)
  })
})
