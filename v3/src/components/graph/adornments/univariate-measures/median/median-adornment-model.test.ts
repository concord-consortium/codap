import { MedianAdornmentModel } from "./median-adornment-model"
import { kMedianType } from "./median-adornment-types"

describe("MedianAdornmentModel", () => {
  it("can be created", () => {
    const median = MedianAdornmentModel.create()
    expect(median).toBeDefined()
    expect(median.type).toEqual(kMedianType)
  })
  it("can have a new median value added to its measures map", () => {
    const adornment = MedianAdornmentModel.create()
    expect(adornment.measures.size).toBe(0)
    adornment.addMeasure(10)
    expect(adornment.measures.size).toBe(1)
  })
  it("can have an existing median value in its measures map updated", () => {
    const adornment = MedianAdornmentModel.create()
    expect(adornment.measures.size).toBe(0)
    adornment.addMeasure(10)
    expect(adornment.measures.size).toBe(1)
    expect(adornment.measures.get("{}")?.value).toBe(10)
    adornment.updateMeasureValue(20, "{}")
    expect(adornment.measures.get("{}")?.value).toBe(20)
    expect(adornment.measures.size).toBe(1)
  })
  it("can have an existing median value removed from its measures map", () => {
    const adornment = MedianAdornmentModel.create()
    expect(adornment.measures.size).toBe(0)
    adornment.addMeasure(10)
    expect(adornment.measures.size).toBe(1)
    adornment.removeMeasure("{}")
    expect(adornment.measures.size).toBe(0)
  })
})
