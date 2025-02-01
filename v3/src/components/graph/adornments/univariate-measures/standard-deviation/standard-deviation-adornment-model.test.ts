import { StandardDeviationAdornmentModel } from "./standard-deviation-adornment-model"
import { kStandardDeviationType } from "./standard-deviation-adornment-types"

describe("StandardDeviationModel", () => {
  it("can be created", () => {
    const mean = StandardDeviationAdornmentModel.create()
    expect(mean).toBeDefined()
    expect(mean.type).toEqual(kStandardDeviationType)
  })
  it("can have a new standard deviation value added to its measures map", () => {
    const adornment = StandardDeviationAdornmentModel.create()
    expect(adornment.measures.size).toBe(0)
    adornment.addMeasure(10)
    expect(adornment.measures.size).toBe(1)
  })
  it("can have an existing standard deviation value removed from its measures map", () => {
    const adornment = StandardDeviationAdornmentModel.create()
    expect(adornment.measures.size).toBe(0)
    adornment.addMeasure(10)
    expect(adornment.measures.size).toBe(1)
    adornment.removeMeasure("{}")
    expect(adornment.measures.size).toBe(0)
  })
})
