import { MovableValueModel } from "./movable-value-model"

describe("MovableValueModel", () => {
  it("can be created with a value", () => {
    const movableValue = MovableValueModel.create({value: 1})
    expect(movableValue.value).toEqual(1)
  })
  it("can have its value changed", () => {
    const movableValue = MovableValueModel.create({value: 1})
    movableValue.setValue(2)
    expect(movableValue.value).toEqual(2)
  })
})
