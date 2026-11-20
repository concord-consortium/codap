import { select } from "d3"
import { IBarCover } from "../../graphing-types"
import { createBinBoundaryDrag, getNearBinBoundaryIndex, INearBinBoundaryOptions } from "./histogram-utils"

// Bins of width 10 starting at 0, drawn at 10px per unit, so boundaries fall at x = 100, 200 and 300.
const options: INearBinBoundaryOptions = {
  binDetails: { binWidth: 10, minBinEdge: 0, totalNumberOfBins: 4 },
  primaryIsBottom: true,
  numRepetitions: 1,
  primaryLength: 400,
  primaryAxisScale: (value: number) => value * 10
}

/**
 * jsdom has no SVGPoint, so d3's `pointer()` would fall back to `getBoundingClientRect()`.
 * Browsers take the SVGPoint path, and their SVGPoint throws when assigned a non-finite
 * coordinate. Stub it the way browsers behave so the tests exercise the same path.
 */
function createContainer() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g")
  svg.appendChild(g)
  document.body.appendChild(svg)

  const createSVGPoint = () => {
    let x = 0, y = 0
    const assertFinite = (value: number, prop: string) => {
      if (!Number.isFinite(value)) {
        throw new TypeError(`Failed to set the '${prop}' property on 'SVGPoint': ` +
          "The provided float value is non-finite.")
      }
    }
    return {
      get x() { return x },
      set x(value: number) { assertFinite(value, "x"); x = value },
      get y() { return y },
      set y(value: number) { assertFinite(value, "y"); y = value },
      matrixTransform() { return { x, y } }
    }
  }
  Object.assign(svg, { createSVGPoint })
  Object.assign(g, { getScreenCTM: () => ({ inverse: () => ({}) }) })
  return g
}

function mouseEvent(clientX: number, clientY = 50) {
  return new MouseEvent("mousedown", { clientX, clientY })
}

function touchEvent(clientX: number, clientY = 50) {
  const touch = { clientX, clientY }
  return { type: "touchstart", touches: [touch], changedTouches: [touch] } as unknown as TouchEvent
}

describe("getNearBinBoundaryIndex", () => {
  let container: SVGGElement

  beforeEach(() => {
    container = createContainer()
  })

  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("returns the index of the bin left of a boundary near a mouse event", () => {
    expect(getNearBinBoundaryIndex(mouseEvent(203), container, options)).toBe(1)
  })

  it("returns -1 for a mouse event away from any boundary", () => {
    expect(getNearBinBoundaryIndex(mouseEvent(150), container, options)).toBe(-1)
  })

  it("returns the index of the bin left of a boundary near a touch event", () => {
    expect(getNearBinBoundaryIndex(touchEvent(203), container, options)).toBe(1)
  })

  it("returns -1 for a touch event away from any boundary", () => {
    expect(getNearBinBoundaryIndex(touchEvent(150), container, options)).toBe(-1)
  })

  it("returns -1 for a touch event with no changed touches", () => {
    const event = { type: "touchstart", touches: [], changedTouches: [] } as unknown as TouchEvent
    expect(getNearBinBoundaryIndex(event, container, options)).toBe(-1)
  })
})

describe("createBinBoundaryDrag", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("reports the pointer position rather than the bar's origin plus the pointer's movement", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g")
    svg.appendChild(g)
    document.body.appendChild(svg)
    // The bar starts at x = 100, so a drag subject taken from its datum would offset the drag's x by -97
    const barCover = { x: "100", y: "0", width: "100", height: "50" } as IBarCover
    const rect = select(g).append("rect").datum(barCover).node()!

    const dragXs: number[] = []
    select<SVGRectElement, IBarCover>(rect).call(createBinBoundaryDrag({
      filter: () => true,
      start: () => undefined,
      drag: (event) => dragXs.push(event.x),
      end: () => undefined
    }))

    rect.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 197, clientY: 25, view: window }))
    window.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 199, clientY: 25, view: window }))
    window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: 199, clientY: 25, view: window }))

    expect(dragXs).toEqual([199])
  })
})
