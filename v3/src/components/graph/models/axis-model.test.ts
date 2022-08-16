import { AxisModel, NumericAxisModel } from "./axis-model"

describe("AxisModel", () => {
  it("should error if AxisModel is instantiated directly", () => {
    expect(() => AxisModel.create({ place: "left" })).toThrow()
  })

  it("should work as expected", () => {
    expect(NumericAxisModel.create({ place: "bottom", min: 0, max: 10 }).orientation).toBe("horizontal")
    expect(NumericAxisModel.create({ place: "left", min: 0, max: 10 }).orientation).toBe("vertical")
  })
})
