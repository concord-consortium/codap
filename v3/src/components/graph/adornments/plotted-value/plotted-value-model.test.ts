import { PlottedValueModel } from "./plotted-value-model"

describe("PlottedValueModel", () => {
  it("is created with its type property set to 'Plotted Value' and with its value property not defined", () => {
    const plottedValue = PlottedValueModel.create()
    expect(plottedValue.type).toEqual("Plotted Value")
    expect(plottedValue.value).toBeUndefined()
  })
  it("can have its value property set", () => {
    const plottedValue = PlottedValueModel.create()
    plottedValue.setValue(1)
    expect(plottedValue.value).toEqual(1)
  })
})
