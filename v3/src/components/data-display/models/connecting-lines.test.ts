import { ConnectingLines, IConnectingLinesRenderInput } from "./connecting-lines"

const SVG_NS = "http://www.w3.org/2000/svg"

function makeSvg() {
  return document.createElementNS(SVG_NS, "g")
}

// Builds a render input. `coords` maps caseID -> [x, y]. By default one group
// (no parent attribute, single y-attr), all cases unselected.
function makeInput(
  svg: SVGGElement,
  caseIds: string[],
  coords: Record<string, [number, number]>,
  overrides: Partial<IConnectingLinesRenderInput> = {}
): IConnectingLinesRenderInput {
  return {
    svg,
    clientType: "graph",
    showConnectingLines: true,
    animateChange: false,
    caseList: caseIds.map(id => ({ caseID: id })),
    scaleSignature: "sig-1",
    getLineForCase: (caseID: string) =>
      coords[caseID] ? { caseData: { __id__: caseID }, lineCoords: coords[caseID] } : undefined,
    classify: { yAttrCount: 1 },
    style: {
      getGroupColor: () => "#ff0000",
      isCaseSelected: () => false
    },
    handlers: { onClick: jest.fn(), onMouseOver: jest.fn(), onMouseOut: jest.fn() },
    ...overrides
  }
}

describe("ConnectingLines", () => {
  it("renders one path per group with a correct d", () => {
    const svg = makeSvg()
    const cl = new ConnectingLines()
    cl.render(makeInput(svg, ["c1", "c2"], { c1: [0, 0], c2: [10, 20] }))
    const paths = svg.querySelectorAll("path.connecting-line")
    expect(paths.length).toBe(1)
    expect(paths[0].getAttribute("d")).toBe("M0,0L10,20")
    expect(paths[0].getAttribute("stroke")).toBe("#ff0000")
  })

  it("renders a separate path per parent-attribute group", () => {
    const svg = makeSvg()
    const cl = new ConnectingLines()
    const input = makeInput(svg, ["a1", "b1", "a2"], { a1: [0, 0], b1: [1, 1], a2: [2, 2] }, {
      getLineForCase: (caseID: string) => {
        const group = caseID.startsWith("a") ? "A" : "B"
        const xy: Record<string, [number, number]> = { a1: [0, 0], b1: [1, 1], a2: [2, 2] }
        return { caseData: { __id__: caseID, P: group }, lineCoords: xy[caseID] }
      },
      classify: { yAttrCount: 1, parentAttrID: "P" }
    })
    cl.render(input)
    expect(svg.querySelectorAll("path.connecting-line").length).toBe(2)
  })

  it("marks a path selected when all its cases are selected", () => {
    const svg = makeSvg()
    const cl = new ConnectingLines()
    cl.render(makeInput(svg, ["c1", "c2"], { c1: [0, 0], c2: [10, 20] }, {
      style: { getGroupColor: () => "#0f0", isCaseSelected: () => true }
    }))
    const path = svg.querySelector("path.connecting-line")!
    expect(path.classList.contains("selected")).toBe(true)
    expect(path.getAttribute("stroke-width")).toBe("4")
  })

  it("removes all paths immediately when hidden without animation", () => {
    const svg = makeSvg()
    const cl = new ConnectingLines()
    cl.render(makeInput(svg, ["c1", "c2"], { c1: [0, 0], c2: [10, 20] }))
    expect(svg.querySelectorAll("path.connecting-line").length).toBe(1)
    cl.render(makeInput(svg, ["c1", "c2"], { c1: [0, 0], c2: [10, 20] }, {
      showConnectingLines: false, animateChange: false
    }))
    expect(svg.querySelectorAll("path.connecting-line").length).toBe(0)
  })

  it("destroy() clears the rendered paths", () => {
    const svg = makeSvg()
    const cl = new ConnectingLines()
    cl.render(makeInput(svg, ["c1", "c2"], { c1: [0, 0], c2: [10, 20] }))
    cl.destroy()
    expect(svg.querySelectorAll("path.connecting-line").length).toBe(0)
  })

  it("only computes coords for newly appended cases when the signature is unchanged", () => {
    const svg = makeSvg()
    const cl = new ConnectingLines()
    const coords: Record<string, [number, number]> = { c1: [0, 0], c2: [10, 10], c3: [20, 20] }
    const getLineForCase = jest.fn((caseID: string) =>
      coords[caseID] ? { caseData: { __id__: caseID }, lineCoords: coords[caseID] } : undefined)

    cl.render(makeInput(svg, ["c1", "c2"], coords, { getLineForCase }))
    getLineForCase.mockClear()

    // Same signature, one appended case -> incremental: getLineForCase called for c3 only.
    cl.render(makeInput(svg, ["c1", "c2", "c3"], coords, { getLineForCase }))
    expect(getLineForCase).toHaveBeenCalledTimes(1)
    expect(getLineForCase).toHaveBeenCalledWith("c3", 0)
    expect(svg.querySelector("path.connecting-line")!.getAttribute("d")).toBe("M0,0L10,10L20,20")
  })

  it("full-recomputes when the signature changes", () => {
    const svg = makeSvg()
    const cl = new ConnectingLines()
    const coords: Record<string, [number, number]> = { c1: [0, 0], c2: [10, 10], c3: [20, 20] }
    const getLineForCase = jest.fn((caseID: string) =>
      coords[caseID] ? { caseData: { __id__: caseID }, lineCoords: coords[caseID] } : undefined)

    cl.render(makeInput(svg, ["c1", "c2"], coords, { getLineForCase }))
    getLineForCase.mockClear()

    cl.render(makeInput(svg, ["c1", "c2", "c3"], coords, { getLineForCase, scaleSignature: "sig-2" }))
    expect(getLineForCase).toHaveBeenCalledTimes(3) // all cases recomputed
  })

  it("falls back to full recompute when the appended-tail heuristic fails (reorder)", () => {
    const svg = makeSvg()
    const cl = new ConnectingLines()
    const coords: Record<string, [number, number]> = { c1: [0, 0], c2: [10, 10], c3: [20, 20] }
    const getLineForCase = jest.fn((caseID: string) =>
      coords[caseID] ? { caseData: { __id__: caseID }, lineCoords: coords[caseID] } : undefined)

    cl.render(makeInput(svg, ["c1", "c2"], coords, { getLineForCase }))
    getLineForCase.mockClear()

    // length grew but the previous tail (c2) is no longer at index 1 -> not a pure append.
    cl.render(makeInput(svg, ["c2", "c1", "c3"], coords, { getLineForCase }))
    expect(getLineForCase).toHaveBeenCalledTimes(3)
  })

  it("restyleSelection updates selected styling without recomputing coords", () => {
    const svg = makeSvg()
    const cl = new ConnectingLines()
    const coords: Record<string, [number, number]> = { c1: [0, 0], c2: [10, 10] }
    const getLineForCase = jest.fn((caseID: string) =>
      coords[caseID] ? { caseData: { __id__: caseID }, lineCoords: coords[caseID] } : undefined)
    cl.render(makeInput(svg, ["c1", "c2"], coords, { getLineForCase }))
    getLineForCase.mockClear()

    cl.restyleSelection({
      svg, showConnectingLines: true,
      style: { getGroupColor: () => "#f00", isCaseSelected: () => true }
    })

    const path = svg.querySelector("path.connecting-line")!
    expect(path.classList.contains("selected")).toBe(true)
    expect(path.getAttribute("stroke-width")).toBe("4")
    expect(getLineForCase).not.toHaveBeenCalled()
  })
})
