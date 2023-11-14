import { PlottedFunctionInstance, PlottedFunctionAdornmentModel } from "./plotted-function-adornment-model"

describe("PlottedFunctionInstance", () => {
  it("can be created", () => {
    const measure = PlottedFunctionInstance.create()
    expect(measure).toBeDefined()
  })
  it("can have its formulaFunction set", () => {
    const plottedFunction = PlottedFunctionInstance.create()
    expect(plottedFunction.formulaFunction(10)).toBe(NaN) // the default returns NaN no matter what
    plottedFunction.setValue(x => x)
    expect(plottedFunction.formulaFunction(10)).toBe(10)
  })
})

describe("PlottedFunctionAdornmentModel", () => {
  it("is created with its type property set to 'Plotted Function' and with its value property not defined", () => {
    const plottedFunction = PlottedFunctionAdornmentModel.create()
    expect(plottedFunction.type).toEqual("Plotted Function")
    expect(plottedFunction.expression).toEqual("")
  })
  it("can have its expression property set", () => {
    const plottedFunction = PlottedFunctionAdornmentModel.create()
    plottedFunction.setExpression("1")
    expect(plottedFunction.expression).toEqual("1")
  })
})
