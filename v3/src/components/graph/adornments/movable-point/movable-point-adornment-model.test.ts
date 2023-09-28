import { MovablePointAdornmentModel } from "./movable-point-adornment-model"

describe("MovablePointAdornmentModel", () => {
  it("is created with its type set to 'Movable Point' and with its points property set to an empty map", () => {
    const movablePoint = MovablePointAdornmentModel.create()
    expect(movablePoint.type).toEqual("Movable Point")
    expect(movablePoint.points.size).toEqual(0)
  })
  it("can have a point added to its points property", () => {
    const point1 = { x: 1, y: 1 }
    const movablePoint = MovablePointAdornmentModel.create()
    movablePoint.setPoint(point1)
    expect(movablePoint.points.size).toEqual(1)
    expect(movablePoint.points.get('')).toEqual(point1)
  })
  it("can have multiple points added to its points property", () => {
    const point1 = { x: 1, y: 1 }
    const point2 = { x: 2, y: 2 }
    const movablePoint = MovablePointAdornmentModel.create()
    movablePoint.setPoint(point1, "point1key")
    movablePoint.setPoint(point2, "point2key")
    expect(movablePoint.points.size).toEqual(2)
    expect(movablePoint.points.get('point1key')).toEqual(point1)
    expect(movablePoint.points.get('point2key')).toEqual(point2)
  })
})
