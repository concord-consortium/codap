import { getSnapshot } from "mobx-state-tree"
import { IMovableLineInstanceSnapshot, MovableLineAdornmentModel,
  MovableLineInstance
} from "./movable-line-adornment-model"

function roundTripLine(initialSnapshot: IMovableLineInstanceSnapshot) {
  const line = MovableLineInstance.create(initialSnapshot)
  const savedSnapshot = getSnapshot(line)
  const savedJson = JSON.stringify(savedSnapshot)
  const loadedSnapshot = JSON.parse(savedJson)
  return MovableLineInstance.create(loadedSnapshot)
}

describe("MovableLineInstance", () => {
  it("is created with intercept and slope properties", () => {
    const lineParams = MovableLineInstance.create({intercept: 1, slope: 1})
    expect(lineParams.intercept).toEqual(1)
    expect(lineParams.slope).toEqual(1)
  })
  it("can have pivot1 and pivot2 properties set", () => {
    const lineParams = MovableLineInstance.create({intercept: 1, slope: 1})
    lineParams.setPivot1({x: 1, y: 1})
    lineParams.setPivot2({x: 2, y: 2})
    expect(lineParams.pivot1.x).toEqual(1)
    expect(lineParams.pivot1.y).toEqual(1)
    expect(lineParams.pivot2.x).toEqual(2)
    expect(lineParams.pivot2.y).toEqual(2)
  })
  it("can have equationCoords property set", () => {
    const lineParams = MovableLineInstance.create({intercept: 1, slope: 1})
    expect(lineParams.equationCoords).toBeUndefined()
    lineParams.setEquationCoords({x: 50, y: 50})
    expect(lineParams.equationCoords?.x).toEqual(50)
    expect(lineParams.equationCoords?.y).toEqual(50)
  })
  it("can have dynamicIntercept and dynamicSlope properties set", () => {
    const lineParams = MovableLineInstance.create({intercept: 1, slope: 1})
    expect(lineParams.dynamicIntercept).toBeUndefined()
    expect(lineParams.dynamicSlope).toBeUndefined()
    lineParams.setVolatile(2, 2)
    expect(lineParams.dynamicIntercept).toEqual(2)
    expect(lineParams.dynamicSlope).toEqual(2)
    expect(lineParams.intercept).toEqual(1)
    expect(lineParams.slope).toEqual(1)
  })
  it("can serialize when vertical", () => {
    const line1 = roundTripLine({intercept: 1, slope: Infinity})
    expect(line1.slope).toBe(Infinity)

    const line2 = roundTripLine({intercept: 1, slope: "Infinity"})
    expect(line2.slope).toBe(Infinity)

    const line3 = roundTripLine({intercept: 1, slope: -Infinity})
    expect(line3.slope).toBe(-Infinity)

    const line4 = roundTripLine({intercept: 1, slope: "-Infinity"})
    expect(line4.slope).toBe(-Infinity)
  })
  it("saves finite slopes as numbers", () => {
    const line = MovableLineInstance.create({intercept: 1, slope: 5})
    const snapshot = getSnapshot(line)
    expect(snapshot.slope).not.toBe("5")
    expect(snapshot.slope).toBe(5)
  })
  it("can handle string slopes", () => {
    // This isn't required but is nice incase a string number ends up in
    // the JSON
    const line = roundTripLine({intercept: 1, slope: "5" as unknown as number})
    expect(line.slope).toBe(5)
  })
  it("can handle null slopes", () => {
    // This isn't ideal but it is nice that old documents will not completely crash if loaded
    // with a null slope
    const line = roundTripLine({intercept: 1, slope: null as unknown as number})
    expect(line.slope).toBe(NaN)
  })
})

describe("MovableLineAdornmentModel", () => {
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
  it("is created with its type property set to 'Movable Line' and with its lines property set to an empty map", () => {
    const movableLine = MovableLineAdornmentModel.create()
    expect(movableLine.type).toEqual("Movable Line")
    expect(movableLine.lines.size).toEqual(0)
  })
  it("can have a line added to its lines property", () => {
    const movableLine = MovableLineAdornmentModel.create()
    movableLine.setLine(line1)
    expect(movableLine.lines.size).toEqual(1)
    expect(movableLine.lines.get('')).toEqual(line1)
  })
  it("can update dynamic intercept and slope values and get both values via the line's slopeAndIntercept view", () => {
    const movableLine = MovableLineAdornmentModel.create()
    movableLine.setLine(line1)
    movableLine.setVolatileLine({intercept: 2, slope: 2})
    expect(movableLine.lines.get("")?.slopeAndIntercept).toEqual({intercept: 2, slope: 2})
  })
  it("can have multiple lines added to its lines property", () => {
    const movableLine = MovableLineAdornmentModel.create()
    movableLine.setLine(line1, "line1key")
    movableLine.setLine(line2, "line2key")
    expect(movableLine.lines.size).toEqual(2)
    expect(movableLine.lines.get('line1key')).toEqual(line1)
    expect(movableLine.lines.get('line2key')).toEqual(line2)
  })
})
