import {equationString, getScreenCoord, lineToAxisIntercepts, ptInRect, valueLabelString} from "./graph_utils"
import {DataSet, toCanonical} from "../../../data-model/data-set"
import {scaleLinear} from "d3"

describe("equationString", () => {
  it("should give correct html", () => {
    expect(equationString(1, 0)).toBe('<p style="color:#4782B4"><i>y</i> = 1 <i>x</i> + 0</p>')
  })
})

describe("valueLabelString", () => {
  it("should give correct html", () => {
    expect(valueLabelString(1 / 3)).toBe('<div style="color:blue">0.3333</div>')
  })
})

describe("ptInRect", () => {
  it("{x: 0, y: 0} should be in {x:-1, y: -1, width: 2, height: 2}", () => {
    expect(ptInRect({x: 0, y: 0}, {x: -1, y: -1, width: 2, height: 2})).toBe(true)
  })

  it("{x: 0, y: 0} should be in {x:0, y: 0, width: 0, height: 0}", () => {
    expect(ptInRect({x: 0, y: 0}, {x: 0, y: 0, width: 0, height: 0})).toBe(true)
  })

  it("{x: 1, y: 1} should not be in {x:0, y: 0, width: 1, height: 0.999}", () => {
    expect(ptInRect({x: 1, y: 1}, {x: 0, y: 0, width: 1, height: 0.999})).toBe(false)
  })
})

describe("lineToAxisIntercepts", () => {
  it("Line with slope 1 and intercept 0 should intercept (0,0),(1,1)", () => {
    expect(lineToAxisIntercepts(1, 0, [0, 1], [0, 1]))
      .toEqual({pt1: {x: 0, y: 0}, pt2: {x: 1, y: 1}})
  })

  it("Line with slope ∞ and intercept 0.5 should be parallel to y-axis going through x=0.5", () => {
    expect(lineToAxisIntercepts(1 / 0, 0.5, [0, 1], [0, 1]))
      .toEqual({pt1: {x: 0.5, y: 0}, pt2: {x: 0.5, y: 1}})
  })

  it("Line with slope -1 and intercept 1 should intercept (0,1),(1,0)", () => {
    expect(lineToAxisIntercepts(-1, 1, [0, 1], [0, 1]))
      .toEqual({pt1: {x: 0, y: 1}, pt2: {x: 1, y: 0}})
  })

  it("Line with slope -1 and intercept 0 should hit the lower-left corner of (0,1),(1,0)", () => {
    expect(lineToAxisIntercepts(-1, 0, [0, 1], [0, 1]))
      .toEqual({pt1: {x: 0, y: 0}, pt2: {x: -0, y: 0}})
  })

  it("Line with slope 1 and intercept -1 should hit the lower-right corner of (0,1),(1,0)", () => {
    expect(lineToAxisIntercepts(1, -1, [0, 1], [0, 1]))
      .toEqual({pt1: {x: 1, y: 0}, pt2: {x: 1, y: 0}})
  })

  it("Line with slope 1 and intercept -2 should not intersect (0,1),(1,0)", () => {
    const xDomain = [0, 1],
      yDomain = [0, 1],
      rect = {x: 0, y: 1, width: 1, height: 1},
      result = lineToAxisIntercepts(1, -2, xDomain, yDomain)
    expect(ptInRect(result.pt1, rect) || ptInRect(result.pt2, rect))
      .toBe(false)
  })

})

describe("getScreenCoord", () => {
  it("The screen coord with domain [0, 100] and range [20,200] should be ???", () => {
    const dataset = DataSet.create({name: "data"})
    dataset.addAttribute({name: "a"})
    dataset.addCases(toCanonical(dataset, [{a: 3}]))
    const attrID = dataset.attributes[0].id,
      caseID = dataset.cases[0].__id__,
      scale = scaleLinear([0, 100], [20, 200]),
      coord1 = getScreenCoord(dataset, caseID, attrID, scale)
    scale.domain([100, 0])
    const coord2 = getScreenCoord(dataset, caseID, attrID, scale)
    expect(coord1).toBeCloseTo(20 + 0.03 * 180, 5)
    expect(coord2).toBeCloseTo(20 + 0.97 * 180, 5)
  })

})
