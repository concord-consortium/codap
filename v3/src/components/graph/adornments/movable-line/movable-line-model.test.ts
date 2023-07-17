import { MovableLineModel, MovableLineParams } from "./movable-line-model"

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

describe("MovableLineModel", () => {
  it("is created with its type property set to 'Movable Line' and with its lines property set to an empty map", () => {
    const movableLine = MovableLineModel.create()
    expect(movableLine.type).toEqual("Movable Line")
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
