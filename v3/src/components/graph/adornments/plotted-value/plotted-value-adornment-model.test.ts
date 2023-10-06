import { PlottedValueAdornmentModel } from "./plotted-value-adornment-model"

describe("PlottedValueAdornmentModel", () => {
  it("is created with its type property set to 'Plotted Value' and with its value property not defined", () => {
    const plottedValue = PlottedValueAdornmentModel.create()
    expect(plottedValue.type).toEqual("Plotted Value")
    expect(plottedValue.value).toBeUndefined()
  })
  it("can have its value property set", () => {
    const plottedValue = PlottedValueAdornmentModel.create()
    plottedValue.setValue(1)
    expect(plottedValue.value).toEqual(1)
  })
})
