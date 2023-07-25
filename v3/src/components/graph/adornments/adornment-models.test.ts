import { getSnapshot, types } from "mobx-state-tree"
import { AdornmentModel, PointModel, UnknownAdornmentModel } from "./adornment-models"
import { AdornmentModelUnion, IAdornmentModelUnion } from "./adornment-types"
import { MovableLineModel, isMovableLine } from "./movable-line/movable-line-model"
import { MovablePointModel, isMovablePoint } from "./movable-point/movable-point-model"
import { MovableValueModel, isMovableValue } from "./movable-value/movable-value-model"

describe("PointModel", () => {
  it("is valid if x and y are finite", () => {
    const point = PointModel.create({x: 1, y: 1})
    expect(point.isValid()).toBe(true)
  })
  it("is invalid if x is not finite", () => {
    const point = PointModel.create({x: NaN, y: 1})
    expect(point.isValid()).toBe(false)
  })
  it("is invalid if y is not finite", () => {
    const point = PointModel.create({x: 1, y: NaN})
    expect(point.isValid()).toBe(false)
  })
  it("can have its x and y values changed", () => {
    const point = PointModel.create({x: 1, y: 1})
    point.set({x: 2, y: 2})
    expect(point.x).toBe(2)
    expect(point.y).toBe(2)
  })
})

describe("AdornmentModel", () => {
  it("throws an error when type is not specified on creation", () => {
    expect(() => AdornmentModel.create()).toThrow("type must be overridden")
  })
  it("has an ID that begins with 'ADRN'", () => {
    const adornment = AdornmentModel.create({type: "Movable Line"})
    expect(adornment.id).toMatch(/^ADRN/)
  })
  it("is visible by default and can have its visibility property changed", () => {
    const adornment = AdornmentModel.create({type: "Movable Line"})
    expect(adornment.isVisible).toBe(true)
    adornment.setVisibility(false)
    expect(adornment.isVisible).toBe(false)
  })
  it("will create an instance key value from given category values", () => {
    const adornment = AdornmentModel.create({type: "Movable Line"})
    const xCategories = ["pizza", "pasta", "salad"]
    const yCategories = ["red", "green", "blue"]
    const index = 0
    expect(adornment.instanceKey([], [], index)).toEqual("")
    expect(adornment.instanceKey(xCategories, yCategories, index)).toEqual("{x: pizza, y: red}")
  })
  it("will create a class name from a given instance key", () => {
    const adornment = AdornmentModel.create({type: "Movable Line"})
    const key = "{x: pizza, y: red}"
    expect(adornment.classNameFromKey(key)).toEqual("x-pizza-y-red")
  })
})

describe("UnknownAdornmentModel", () => {
  it("is created with its type property set to 'Unknown'", () => {
    const unknownAdornment = UnknownAdornmentModel.create()
    expect(unknownAdornment.type).toEqual("Unknown")
  })
})

describe("Deserialization", () => {
  it("provides the information required for deserialization of adornments to the appropriate type", () => {
    const M = types.model("Test", {
      adornment: AdornmentModelUnion
    })
    .actions(self => ({
      setAdornment(adornment: IAdornmentModelUnion) {
        self.adornment = adornment
      }
    }))

    const movableLine = MovableLineModel.create({ type: "Movable Line", lines: {} })
    const testModel = M.create({ adornment: movableLine })
    expect(isMovableLine(testModel.adornment) && testModel.adornment.lines).toBeDefined()
    const snap1 = getSnapshot(testModel)
    const testModel2 = M.create(snap1)
    expect(isMovableLine(testModel2.adornment) && testModel2.adornment.lines).toBeDefined()

    const movablePoint = MovablePointModel.create({ type: "Movable Point", points: {} })
    testModel.setAdornment(movablePoint)
    expect(isMovablePoint(testModel.adornment) && testModel.adornment.points).toBeDefined()
    const snap2 = getSnapshot(testModel)
    const testModel3 = M.create(snap2)
    expect(isMovablePoint(testModel3.adornment) && testModel3.adornment.points).toBeDefined()

    const movableValue = MovableValueModel.create({ type: "Movable Value", value: 1 })
    testModel.setAdornment(movableValue)
    expect(isMovablePoint(testModel.adornment) && testModel.adornment.points).toBeDefined()
    const snap3 = getSnapshot(testModel)
    const testModel4 = M.create(snap3)
    expect(isMovableValue(testModel4.adornment) && testModel4.adornment.value).toBeDefined()

    const unknownAdornment = UnknownAdornmentModel.create()
    testModel.setAdornment(unknownAdornment)
    expect(testModel.adornment.type).toEqual("Unknown")
    const snap4 = getSnapshot(testModel)
    const testModel5 = M.create(snap4)
    expect(testModel5.adornment.type).toEqual("Unknown")
  })
})
