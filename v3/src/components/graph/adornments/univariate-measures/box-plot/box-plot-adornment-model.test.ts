import { BoxPlotAdornmentModel } from "./box-plot-adornment-model"
import { kBoxPlotType } from "./box-plot-adornment-types"

describe("BoxPlotModel", () => {
  it("can be created", () => {
    const mean = BoxPlotAdornmentModel.create()
    expect(mean).toBeDefined()
    expect(mean.type).toEqual(kBoxPlotType)
  })
  it("can have a new box plot value added to its measures map", () => {
    const adornment = BoxPlotAdornmentModel.create()
    expect(adornment.measures.size).toBe(0)
    adornment.addMeasure(10)
    expect(adornment.measures.size).toBe(1)
  })
  it("can have an existing box plot value in its measures map updated", () => {
    const adornment = BoxPlotAdornmentModel.create()
    expect(adornment.measures.size).toBe(0)
    adornment.addMeasure(10)
    expect(adornment.measures.size).toBe(1)
    expect(adornment.measures.get("{}")?.value).toBe(10)
    adornment.updateMeasureValue(20, "{}")
    expect(adornment.measures.get("{}")?.value).toBe(20)
    expect(adornment.measures.size).toBe(1)
  })
  it("can have an existing box plot value removed from its measures map", () => {
    const adornment = BoxPlotAdornmentModel.create()
    expect(adornment.measures.size).toBe(0)
    adornment.addMeasure(10)
    expect(adornment.measures.size).toBe(1)
    adornment.removeMeasure("{}")
    expect(adornment.measures.size).toBe(0)
  })
})
