import { NormalCurveAdornmentModel } from "./normal-curve-adornment-model"
import { kNormalCurveType } from "./normal-curve-adornment-types"

describe("NormalCurveModel", () => {
  it("can be created", () => {
    const mean = NormalCurveAdornmentModel.create()
    expect(mean).toBeDefined()
    expect(mean.type).toEqual(kNormalCurveType)
  })
  it("can have a new normal curve added to its measures map", () => {
    const adornment = NormalCurveAdornmentModel.create()
    expect(adornment.measures.size).toBe(0)
    adornment.addMeasure(10)
    expect(adornment.measures.size).toBe(1)
  })
  it("can have an existing normal curve removed from its measures map", () => {
    const adornment = NormalCurveAdornmentModel.create()
    expect(adornment.measures.size).toBe(0)
    adornment.addMeasure(10)
    expect(adornment.measures.size).toBe(1)
    adornment.removeMeasure("{}")
    expect(adornment.measures.size).toBe(0)
  })
})
