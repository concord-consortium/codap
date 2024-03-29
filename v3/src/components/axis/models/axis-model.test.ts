import {
  AxisModel, AxisModelUnion, CategoricalAxisModel, EmptyAxisModel, IAxisModelUnion,
  isCategoricalAxisModel, isEmptyAxisModel, isNumericAxisModel, NumericAxisModel
} from "./axis-model"
import {getSnapshot, types} from "mobx-state-tree"

describe("AxisModel", () => {
  it("should error if AxisModel is instantiated directly", () => {
    expect(() => AxisModel.create({ place: "left" })).toThrow()
  })

  it("should identify numeric and categorical axes", () => {
    const empty = EmptyAxisModel.create({ place: "bottom" })
    expect(empty.isNumeric).toBe(false)
    expect(empty.isCategorical).toBe(false)
    expect(empty.isUpdatingDynamically).toBe(false)
    expect(isEmptyAxisModel(empty)).toBe(true)
    expect(isNumericAxisModel(empty)).toBe(false)
    expect(isCategoricalAxisModel(empty)).toBe(false)

    const numeric = NumericAxisModel.create({ place: "bottom", min: 0, max: 1 })
    expect(numeric.isNumeric).toBe(true)
    expect(numeric.isCategorical).toBe(false)
    expect(numeric.isUpdatingDynamically).toBe(false)
    expect(isEmptyAxisModel(numeric)).toBe(false)
    expect(isNumericAxisModel(numeric)).toBe(true)
    expect(isCategoricalAxisModel(numeric)).toBe(false)

    const categorical = CategoricalAxisModel.create({ place: "bottom" })
    expect(categorical.isNumeric).toBe(false)
    expect(categorical.isCategorical).toBe(true)
    expect(categorical.isUpdatingDynamically).toBe(false)
    expect(isEmptyAxisModel(categorical)).toBe(false)
    expect(isNumericAxisModel(categorical)).toBe(false)
    expect(isCategoricalAxisModel(categorical)).toBe(true)
  })

  it("should set scale and transitionDuration", () => {
    const numeric = NumericAxisModel.create({ place: "bottom", min: 0, max: 1 })
    expect(numeric.scale).toBe("linear")
    numeric.setScale("log")
    expect(numeric.scale).toBe("log")

    expect(numeric.transitionDuration).toBe(0)
    numeric.setTransitionDuration(100)
    expect(numeric.transitionDuration).toBe(100)
  })
})

describe("NumericAxisModel", () => {
  it("should compute the correct orientation", () => {
    expect(NumericAxisModel.create({ place: "bottom", min: 0, max: 10 }).orientation).toBe("horizontal")
    expect(NumericAxisModel.create({ place: "left", min: 0, max: 10 }).orientation).toBe("vertical")
  })
  it("should set domain without undo and with undo", () => {
    const aModel = NumericAxisModel.create({ place: "bottom", min: 0, max: 10 })
    aModel.setDynamicDomain(10, 20)
    expect(aModel.isUpdatingDynamically).toBe(true)
    expect(aModel.domain).toEqual([10, 20])
    expect(aModel.min).toBe(0)
    expect(aModel.max).toBe(10)
    aModel.applyUndoableAction(
      () => aModel.setDomain(10, 20),
      { undoStringKey: "Undo the thing", redoStringKey: "Redo the thing" }
    )
    expect(aModel.isUpdatingDynamically).toBe(false)
    expect(aModel.min).toBe(10)
    expect(aModel.max).toBe(20)
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

describe("AxisModelUnion", () => {
  it("deserializes axes of the appropriate type", () => {
    const M = types.model("Test", {
      axis: AxisModelUnion
    })
    .actions(self => ({
      setAxis(axis: IAxisModelUnion) {
        self.axis = axis
      }
    }))

    const emptyAxis = EmptyAxisModel.create({ place: "bottom" })
    const empty = M.create({ axis : emptyAxis })
    expect(isEmptyAxisModel(empty.axis)).toBe(true)
    const emptySnap = getSnapshot(empty)
    const empty2 = M.create(emptySnap)
    expect(isEmptyAxisModel(empty2.axis)).toBe(true)

    const numAxis = NumericAxisModel.create({ place: "bottom", min: 0, max: 10 })
    const num = M.create({ axis : numAxis })
    expect(isNumericAxisModel(num.axis) && num.axis.domain).toBeDefined()
    const snap = getSnapshot(num)
    const num2 = M.create(snap)
    expect(isNumericAxisModel(num2.axis) && num2.axis.domain).toBeDefined()

    const catAxis = CategoricalAxisModel.create({ place: "bottom" })
    const cat = M.create({ axis : catAxis })
    expect(isCategoricalAxisModel(cat.axis)).toBe(true)
    const catSnap = getSnapshot(cat)
    const cat2 = M.create(catSnap)
    expect(isCategoricalAxisModel(cat2.axis)).toBe(true)
  })
})
