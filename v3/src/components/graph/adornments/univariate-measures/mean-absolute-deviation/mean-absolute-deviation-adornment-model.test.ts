import { MeanAbsoluteDeviationAdornmentModel } from "./mean-absolute-deviation-adornment-model"
import { kMeanAbsoluteDeviationType } from "./mean-absolute-deviation-adornment-types"

describe("MeanAbsoluteDeviationModel", () => {
  it("can be created", () => {
    const mean = MeanAbsoluteDeviationAdornmentModel.create()
    expect(mean).toBeDefined()
    expect(mean.type).toEqual(kMeanAbsoluteDeviationType)
  })
  it("can have a new mean absolute deviation value added to its measures map", () => {
    const adornment = MeanAbsoluteDeviationAdornmentModel.create()
    expect(adornment.measures.size).toBe(0)
    adornment.addMeasure(10)
    expect(adornment.measures.size).toBe(1)
  })
  it("can have an existing mean absolute deviation value removed from its measures map", () => {
    const adornment = MeanAbsoluteDeviationAdornmentModel.create()
    expect(adornment.measures.size).toBe(0)
    adornment.addMeasure(10)
    expect(adornment.measures.size).toBe(1)
    adornment.removeMeasure("{}")
    expect(adornment.measures.size).toBe(0)
  })
})
