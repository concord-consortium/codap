import { MovableValueAdornmentModel } from "./movable-value-adornment-model"

describe("MovableValueAdornmentModel", () => {
  it("can be created with a value and have that value changed", () => {
    const movableValue = MovableValueAdornmentModel.create()
    movableValue.setInitialValue(5, "{}")
    expect(movableValue.values.get("{}")).toEqual([5])
    movableValue.replaceValue(10, "{}")
    expect(movableValue.values.get("{}")).toEqual([10])
  })
  it("can be created with a value and have another value added", () => {
    const movableValue = MovableValueAdornmentModel.create()
    movableValue.setInitialValue(5, "{}")
    expect(movableValue.values.get("{}")).toEqual([5])
    movableValue.addValue(10)
    expect(movableValue.values.get("{}")).toEqual([5, 10])
  })
  it("can delete a value in a set given that value's index number in the array of values", () => {
    const movableValue = MovableValueAdornmentModel.create()
    movableValue.setInitialValue(5, "{}")
    movableValue.addValue(10)
    expect(movableValue.values.get("{}")).toEqual([5, 10])
    movableValue.deleteValue()
    expect(movableValue.values.get("{}")).toEqual([5])
  })
  it("can delete a value set", () => {
    const movableValue = MovableValueAdornmentModel.create()
    movableValue.setInitialValue(5, "{}")
    expect(movableValue.values.get("{}")).toEqual([5])
    movableValue.deleteAllValues()
    expect(movableValue.values.get("{}")).toEqual([])
  })
  it("can provide a sorted list of values", () => {
    const movableValue = MovableValueAdornmentModel.create()
    movableValue.setInitialValue(5, "{}")
    movableValue.addValue(10)
    movableValue.addValue(2)
    expect(movableValue.sortedValues("{}")).toEqual([2, 5, 10])
  })
  it("can provide a list of values that has been updated with a current drag value", () => {
    const movableValue = MovableValueAdornmentModel.create()
    movableValue.setInitialValue(5, "{}")
    movableValue.addValue(10)
    movableValue.addValue(2)
    movableValue.updateDrag(7, "{}", 0)
    expect(movableValue.valuesForKey("{}")).toEqual([7, 10, 2])
    movableValue.endDrag(7, "{}", 0)
    expect(movableValue.valuesForKey("{}")).toEqual([7, 10, 2])
  })
  it("can provide a sorted list of values that has been updated with a current drag value", () => {
    const movableValue = MovableValueAdornmentModel.create()
    movableValue.setInitialValue(5, "{}")
    movableValue.addValue(10)
    movableValue.addValue(2)
    movableValue.updateDrag(7, "{}", 0)
    expect(movableValue.sortedValues("{}")).toEqual([2, 7, 10])
    movableValue.endDrag(7, "{}", 0)
    expect(movableValue.sortedValues("{}")).toEqual([2, 7, 10])
  })
  it("can provide a new value that is 1/3 into the largest gap between values", () => {
    const movableValue = MovableValueAdornmentModel.create()
    movableValue.setAxisMin(0)
    movableValue.setAxisMax(20)
    movableValue.setInitialValue(10, "{}")
    movableValue.addValue(15)
    expect(movableValue.newValue("{}")).toEqual(3.3333333333333335)
  })
})
