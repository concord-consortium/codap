import { coalesceBarRuns, coalesceBars, IBarPiece } from "./bar-coalescing"

const anchor = { x: 0, y: 0 } // top-left anchored → top = y, bottom = y + height*scale
function piece(y: number, fill: string, overrides: Partial<IBarPiece> = {}): IBarPiece {
  return {
    x: 10, y, scale: 1, width: 4, height: 1,
    fill, stroke: "#ffffff", strokeWidth: 1, strokeOpacity: 0.4,
    ...overrides
  }
}

describe("coalesceBarRuns", () => {
  it("merges a uniform-fill bar into a single run carrying its stroke style", () => {
    const runs = coalesceBarRuns([piece(0, "#e6805b"), piece(1, "#e6805b"), piece(2, "#e6805b")], anchor)
    expect(runs).toEqual([
      { left: 10, top: 0, width: 4, height: 3, fill: "#e6805b", stroke: "#ffffff", strokeWidth: 1, strokeOpacity: 0.4 }
    ])
  })

  it("splits into runs at fill boundaries, each with its own stroke style", () => {
    // two selected (#4682b4, red stroke) on top of three unselected (#e6805b, white stroke)
    const runs = coalesceBarRuns([
      piece(0, "#4682b4", { stroke: "#ff0000", strokeWidth: 2, strokeOpacity: 1 }),
      piece(1, "#4682b4", { stroke: "#ff0000", strokeWidth: 2, strokeOpacity: 1 }),
      piece(2, "#e6805b"), piece(3, "#e6805b"), piece(4, "#e6805b")
    ], anchor)
    expect(runs).toEqual([
      { left: 10, top: 0, width: 4, height: 2, fill: "#4682b4", stroke: "#ff0000", strokeWidth: 2, strokeOpacity: 1 },
      { left: 10, top: 2, width: 4, height: 3, fill: "#e6805b", stroke: "#ffffff", strokeWidth: 1, strokeOpacity: 0.4 }
    ])
  })

  it("produces one run per interleaved single-case run", () => {
    const runs = coalesceBarRuns([piece(0, "#4682b4"), piece(1, "#e6805b"), piece(2, "#4682b4")], anchor)
    expect(runs.map(r => r.fill)).toEqual(["#4682b4", "#e6805b", "#4682b4"])
    expect(runs.map(r => r.height)).toEqual([1, 1, 1])
  })

  it("applies anchor and scale to geometry", () => {
    // anchor bottom-center, scale 2: left = x - 0.5*width*scale; top = y - 1*height*scale
    const runs = coalesceBarRuns(
      [{ x: 10, y: 20, scale: 2, width: 4, height: 0.5, fill: "#4682b4",
         stroke: "#ffffff", strokeWidth: 1, strokeOpacity: 0.4 }],
      { x: 0.5, y: 1 }
    )
    expect(runs).toEqual([
      { left: 10 - 0.5 * 4 * 2, top: 20 - 1 * 0.5 * 2, width: 8, height: 1, fill: "#4682b4",
        stroke: "#ffffff", strokeWidth: 1, strokeOpacity: 0.4 }
    ])
  })

  it("sorts pieces by y before merging (input order independent)", () => {
    const runs = coalesceBarRuns([piece(2, "#e6805b"), piece(0, "#4682b4"), piece(1, "#4682b4")], anchor)
    expect(runs.map(r => [r.fill, r.top, r.height])).toEqual([
      ["#4682b4", 0, 2],
      ["#e6805b", 2, 1]
    ])
  })
})

describe("coalesceBars", () => {
  it("groups pieces into bars by x, coalescing each bar independently", () => {
    // bar at x=10 (two #e6805b) and bar at x=50 (two #4682b4), interleaved in input order
    const pieces: IBarPiece[] = [
      piece(0, "#e6805b", { x: 10 }),
      piece(0, "#4682b4", { x: 50 }),
      piece(1, "#e6805b", { x: 10 }),
      piece(1, "#4682b4", { x: 50 })
    ]
    const runs = coalesceBars(pieces, anchor)
    expect(runs).toHaveLength(2)
    expect(runs).toEqual(expect.arrayContaining([
      { left: 10, top: 0, width: 4, height: 2, fill: "#e6805b", stroke: "#ffffff", strokeWidth: 1, strokeOpacity: 0.4 },
      { left: 50, top: 0, width: 4, height: 2, fill: "#4682b4", stroke: "#ffffff", strokeWidth: 1, strokeOpacity: 0.4 }
    ]))
  })

  it("returns an empty array for no pieces", () => {
    expect(coalesceBars([], anchor)).toEqual([])
  })
})
