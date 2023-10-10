import { MeasureInstance, UnivariateMeasureAdornmentModel } from "./univariate-measure-adornment-model"

describe("MeasureInstance", () => {
  it("can be created", () => {
    const measure = MeasureInstance.create()
    expect(measure).toBeDefined()
  })
  it("can have its value set", () => {
    const measure = MeasureInstance.create()
    expect(measure.value).toBe(NaN)
    measure.setValue(10)
    expect(measure.value).toBe(10)
  })
  it("can have its label coordinates set", () => {
    const measure = MeasureInstance.create()
    expect(measure.labelCoords).toBe(undefined)
    measure.setLabelCoords({x: 10, y: 20})
    expect(measure.labelCoords?.x).toBe(10)
    expect(measure.labelCoords?.y).toBe(20)
  })
})

describe("UnivariateMeasureAdornmentModel", () => {
  it("should be defined", () => {
    expect(UnivariateMeasureAdornmentModel).toBeDefined()
  })
  it("throws an error when type is not specified on creation", () => {
    expect(() => UnivariateMeasureAdornmentModel.create()).toThrow("type must be overridden")
  })
  it("throws an error when labelTitle is not specified on creation", () => {
    expect(() => UnivariateMeasureAdornmentModel.create({ type: "Fake Type" })).toThrow("labelTitle must be overridden")
  })
})
