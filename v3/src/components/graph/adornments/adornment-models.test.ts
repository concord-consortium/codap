import { getSnapshot, types } from "mobx-state-tree"
import { AdornmentModel, UnknownAdornmentModel } from "./adornment-models"
import { AdornmentModelUnion, IAdornmentModelUnion } from "./adornment-types"
import { MovableLineAdornmentModel, isMovableLineAdornment } from "./movable-line/movable-line-adornment-model"
import { MovablePointAdornmentModel, isMovablePointAdornment } from "./movable-point/movable-point-adornment-model"
import { MovableValueAdornmentModel, isMovableValueAdornment } from "./movable-value/movable-value-adornment-model"
import { PointModel } from "./point-model"

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
    const cellKey = {abc123: xCategories[0], def456: yCategories[0]}
    expect(adornment.instanceKey({})).toEqual("")
    // New format: sorted keys, colon-separated key:value, pipe-separated entries
    expect(adornment.instanceKey(cellKey)).toEqual("abc123:pizza|def456:red")
  })
  it("will create a class name from a given cell key", () => {
    const adornment = AdornmentModel.create({type: "Movable Line"})
    const xCategories = ["pizza", "pasta", "salad"]
    const yCategories = ["red", "green", "blue"]
    const cellKey = {abc123: xCategories[0], def456: yCategories[0]}
    expect(adornment.classNameFromKey(cellKey)).toEqual("abc123-pizza-def456-red")
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

    const movableLine = MovableLineAdornmentModel.create({ type: "Movable Line", lines: {} })
    const testModel = M.create({ adornment: movableLine })
    expect(isMovableLineAdornment(testModel.adornment) && testModel.adornment.lines).toBeDefined()
    const snap1 = getSnapshot(testModel)
    const testModel2 = M.create(snap1)
    expect(isMovableLineAdornment(testModel2.adornment) && testModel2.adornment.lines).toBeDefined()

    const movablePoint = MovablePointAdornmentModel.create({ type: "Movable Point", points: {} })
    testModel.setAdornment(movablePoint)
    expect(isMovablePointAdornment(testModel.adornment) && testModel.adornment.points).toBeDefined()
    const snap2 = getSnapshot(testModel)
    const testModel3 = M.create(snap2)
    expect(isMovablePointAdornment(testModel3.adornment) && testModel3.adornment.points).toBeDefined()

    const movableValue = MovableValueAdornmentModel.create()
    movableValue.setInitialValue()
    testModel.setAdornment(movableValue)
    expect(isMovablePointAdornment(testModel.adornment) && testModel.adornment.points).toBeDefined()
    const snap3 = getSnapshot(testModel)
    const testModel4 = M.create(snap3)
    expect(isMovableValueAdornment(testModel4.adornment) && testModel4.adornment.values).toBeDefined()

    const consoleSpy = jest.spyOn(console, "warn").mockImplementation()
    const unknownAdornment = UnknownAdornmentModel.create()
    testModel.setAdornment(unknownAdornment)
    expect(testModel.adornment.type).toEqual("Unknown")
    const snap4 = getSnapshot(testModel)
    const testModel5 = M.create(snap4)
    expect(testModel5.adornment.type).toEqual("Unknown")
    expect(consoleSpy).toHaveBeenCalledWith(`Unknown adornment type: ${unknownAdornment.type}`)
  })
})
