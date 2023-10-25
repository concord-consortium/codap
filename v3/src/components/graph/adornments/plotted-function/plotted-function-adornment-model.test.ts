import { PlottedFunctionAdornmentModel } from "./plotted-function-adornment-model"

describe("PlottedFunctionAdornmentModel", () => {
  it("is created with its type property set to 'Plotted Function' and with its value property not defined", () => {
    const plottedFunction = PlottedFunctionAdornmentModel.create()
    expect(plottedFunction.type).toEqual("Plotted Function")
    expect(plottedFunction.expression).toBeUndefined()
  })
  it("can have its expression property set", () => {
    const plottedFunction = PlottedFunctionAdornmentModel.create()
    plottedFunction.setExpression("1")
    expect(plottedFunction.expression).toEqual("1")
  })
})
