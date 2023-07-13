import {
  AdornmentModel, MovableLineModel, MovableLineParams, MovablePointModel, MovableValueModel, PointModel
} from "./adornment-models"

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

describe("MovableLineModel", () => {
  it("is created with its lines property set to an empty map", () => {
    const movableLine = MovableLineModel.create()
    expect(movableLine.lines.size).toEqual(0)
  })
  it("can have a line added to its lines property", () => {
    const line1 = {
      intercept: 1,
      slope: 1,
      pivot1: {x: 2, y: 2},
      pivot2: {x: 3, y: 3}
    }
    const movableLine = MovableLineModel.create()
    movableLine.setLine(line1)
    expect(movableLine.lines.size).toEqual(1)
    expect(movableLine.lines.get('')).toEqual(line1)
  })
  it("can have multiple lines added to its lines property", () => {
    const line1 = {
      intercept: 1,
      slope: 1,
      pivot1: {x: 2, y: 2},
      pivot2: {x: 3, y: 3}
    }
    const line2 = {
      intercept: 2,
      slope: 2,
      pivot1: {x: 3, y: 3},
      pivot2: {x: 4, y: 4}
    }
    const movableLine = MovableLineModel.create()
    movableLine.setLine(line1, "line1key")
    movableLine.setLine(line2, "line2key")
    expect(movableLine.lines.size).toEqual(2)
    expect(movableLine.lines.get('line1key')).toEqual(line1)
    expect(movableLine.lines.get('line2key')).toEqual(line2)
  })
})

describe("MovableLineParams", () => {
  it("is created with intercept and slope properties", () => {
    const lineParams = MovableLineParams.create({intercept: 1, slope: 1})
    expect(lineParams.intercept).toEqual(1)
    expect(lineParams.slope).toEqual(1)
  })
  it("can have pivot1 and pivot2 properties set", () => {
    const lineParams = MovableLineParams.create({intercept: 1, slope: 1})
    lineParams.setPivot1({x: 1, y: 1})
    lineParams.setPivot2({x: 2, y: 2})
    expect(lineParams.pivot1.x).toEqual(1)
    expect(lineParams.pivot1.y).toEqual(1)
    expect(lineParams.pivot2.x).toEqual(2)
    expect(lineParams.pivot2.y).toEqual(2)
  })
  it("can have equationCoords property set", () => {
    const lineParams = MovableLineParams.create({intercept: 1, slope: 1})
    expect(lineParams.equationCoords).toBeUndefined()
    lineParams.setEquationCoords({x: 50, y: 50})
    expect(lineParams.equationCoords?.x).toEqual(50)
    expect(lineParams.equationCoords?.y).toEqual(50)
  })
})

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

describe("MovablePointModel", () => {
  it("is created with its points property set to an empty map", () => {
    const movablePoint = MovablePointModel.create()
    expect(movablePoint.points.size).toEqual(0)
  })
  it("can have a point added to its points property", () => {
    const point1 = { x: 1, y: 1 }
    const movablePoint = MovablePointModel.create()
    movablePoint.setPoint(point1)
    expect(movablePoint.points.size).toEqual(1)
    expect(movablePoint.points.get('')).toEqual(point1)
  })
  it("can have multiple points added to its points property", () => {
    const point1 = { x: 1, y: 1 }
    const point2 = { x: 2, y: 2 }
    const movablePoint = MovablePointModel.create()
    movablePoint.setPoint(point1, "point1key")
    movablePoint.setPoint(point2, "point2key")
    expect(movablePoint.points.size).toEqual(2)
    expect(movablePoint.points.get('point1key')).toEqual(point1)
    expect(movablePoint.points.get('point2key')).toEqual(point2)
  })
})
