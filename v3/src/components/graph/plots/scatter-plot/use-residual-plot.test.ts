import { select } from "d3"
import { PointShape } from "../../../../utilities/point-shape-utils"
import { transitionDuration } from "../../../data-display/data-display-types"
import { pointShapePathData } from "../../../data-display/renderer/point-shapes"
import { drawShape, growPointIn } from "./use-residual-plot"

const style = (shape: PointShape, radius: number) => ({ shape, radius })

function makePath() {
  const svg = select(document.body).append("svg")
  return svg.append<SVGPathElement>("path").attr("data-r", 0)
}

describe("drawShape", () => {
  afterEach(() => { document.body.innerHTML = "" })

  it("draws the outline it is given", () => {
    const path = makePath()
    drawShape(path, style("star", 8))

    expect(path.attr("d")).toBe(pointShapePathData("star", 8))
    expect(path.attr("data-r")).toBe("8")
    expect(path.attr("data-shape")).toBe("star")
  })

  /*
   * Every selection change restyles every residual point, including on each frame of a marquee drag,
   * so the outline has to stay untouched when nothing about it changed. Asserting on a sentinel
   * rather than on the path string, which would be identical either way.
   */
  it("leaves the outline alone when the shape and radius are unchanged", () => {
    const path = makePath()
    drawShape(path, style("star", 8))
    path.attr("d", "SENTINEL")

    drawShape(path, style("star", 8))

    expect(path.attr("d")).toBe("SENTINEL")
  })

  it("redraws when the shape changes", () => {
    const path = makePath()
    drawShape(path, style("star", 8))
    path.attr("d", "SENTINEL")

    drawShape(path, style("plus", 8))

    expect(path.attr("d")).toBe(pointShapePathData("plus", 8))
  })

  it("redraws when the radius changes", () => {
    const path = makePath()
    drawShape(path, style("star", 8))
    path.attr("d", "SENTINEL")

    drawShape(path, style("star", 5))

    expect(path.attr("d")).toBe(pointShapePathData("star", 5))
  })
})

/*
 * These run against real d3 transitions on a real clock. Jest's fake timers cannot drive them:
 * d3-timer binds window.requestAnimationFrame when it is imported, so it keeps using the real one
 * and its cached clock never advances.
 */
describe("growPointIn", () => {
  afterEach(() => { document.body.innerHTML = "" })

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  it("grows the point to its radius", async () => {
    const path = makePath()
    growPointIn(path, 0, style("star", 8), () => style("star", 8))

    await wait(transitionDuration + 100)

    expect(path.attr("d")).toBe(pointShapePathData("star", 8))
    expect(path.attr("data-r")).toBe("8")
  })

  it("draws the shape it was given while it runs", async () => {
    const path = makePath()
    growPointIn(path, 0, style("star", 8), () => style("star", 8))

    await wait(transitionDuration / 2)

    // partway, so an outline rather than an arc, and not yet grown to the full radius
    expect(path.attr("d")).toContain("L")
    expect(path.attr("d")).not.toBe(pointShapePathData("star", 8))
  })

  /*
   * The tween closes over the shape it was scheduled with, and a restyle while it runs deliberately
   * leaves the outline alone, so without the final consult a shape chosen mid-fade would be
   * discarded and the point would stay wrong until something unrelated repainted it.
   */
  it("takes a shape chosen while it was running", async () => {
    const path = makePath()
    let current = style("circle", 8)
    growPointIn(path, 0, current, () => current)

    await wait(transitionDuration / 2)
    current = style("star", 8)
    await wait(transitionDuration)

    expect(path.attr("d")).toBe(pointShapePathData("star", 8))
    expect(path.attr("data-shape")).toBe("star")
  })

  it("takes a radius chosen while it was running", async () => {
    const path = makePath()
    let current = style("star", 8)
    growPointIn(path, 0, current, () => current)

    await wait(transitionDuration / 2)
    current = style("star", 3)
    await wait(transitionDuration)

    expect(path.attr("d")).toBe(pointShapePathData("star", 3))
    expect(path.attr("data-r")).toBe("3")
  })
})
