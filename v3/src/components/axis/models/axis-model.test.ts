import {AxisModel, AxisModelUnion, IAxisModelUnion, isNumericAxisModel, NumericAxisModel} from "./axis-model"
import {getSnapshot, types} from "mobx-state-tree"

describe("AxisModel", () => {
  it("should error if AxisModel is instantiated directly", () => {
    expect(() => AxisModel.create({ place: "left" })).toThrow()
  })

})

describe("NumericAxisModel", () => {
  it("should compute the correct orientation", () => {
    expect(NumericAxisModel.create({ place: "bottom", min: 0, max: 10 }).orientation).toBe("horizontal")
    expect(NumericAxisModel.create({ place: "left", min: 0, max: 10 }).orientation).toBe("vertical")
  })
  it("should snap to zero for minimum", () => {
    const aModel = NumericAxisModel.create({ place: "bottom", min: 10, max: 100 })
    aModel.setDomain(0.5, 100)
    expect(aModel.min).toBe(0)
  })
  it("should snap to zero for maximum", () => {
    const aModel = NumericAxisModel.create({ place: "bottom", min: -100, max: -10 })
    aModel.setDomain(-100, -0.5)
    expect(aModel.max).toBe(0)
  })
})

describe("deserializes axes of the appropriate type", () => {
  it("foo", () => {
    const M = types.model("Test", {
      axis: AxisModelUnion
    })
      .actions(self => ({
        setAxis(axis: IAxisModelUnion) {
          self.axis = axis
        }
      }))

    const numAxis = NumericAxisModel.create({ place: "bottom", min: 0, max: 10 })
    const num = M.create({ axis : numAxis })
    expect(isNumericAxisModel(num.axis) && num.axis.domain).toBeDefined()
    const snap = getSnapshot(num)
    const num2 = M.create(snap)
    expect(isNumericAxisModel(num2.axis) && num2.axis.domain).toBeDefined()
  })
})

