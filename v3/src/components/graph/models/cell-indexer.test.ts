import { kOther } from "../../data-display/data-display-types"
import { kImpossible } from "../utilities/cell-key-utils"
import { CellIndexer, ICellIndexerOptions } from "./cell-indexer"

const makeOptions = (overrides: Partial<ICellIndexerOptions> = {}): ICellIndexerOptions => ({
  xAttrId: "", xCats: [""],
  yAttrId: "", yCats: [""],
  topAttrId: "", topCats: [""],
  rightAttrId: "", rightCats: [""],
  ...overrides
})

describe("CellIndexer", () => {
  it("reports a single cell when no roles are assigned", () => {
    const indexer = new CellIndexer(makeOptions())
    expect(indexer.cellCount).toBe(1)
    expect(indexer.indexForSlots({ top: 0, right: 0, y: 0, x: 0 })).toBe(0)
  })

  it("multiplies cell count across assigned roles", () => {
    const indexer = new CellIndexer(makeOptions({
      xAttrId: "xId", xCats: ["a", "b"],
      yAttrId: "yId", yCats: ["p", "q", "r"]
    }))
    expect(indexer.cellCount).toBe(6)
  })

  it("maps a value to its slot and an unknown value to the kOther slot", () => {
    const indexer = new CellIndexer(makeOptions({
      xAttrId: "xId", xCats: ["a", "b", kOther]
    }))
    expect(indexer.slotFor("x", "a")).toBe(0)
    expect(indexer.slotFor("x", "b")).toBe(1)
    expect(indexer.slotFor("x", "zzz")).toBe(2)
    expect(indexer.slotFor("x", "")).toBe(2)
    expect(indexer.slotFor("x", undefined)).toBe(2)
  })

  it("returns -1 when a value belongs to no cell and there is no kOther slot", () => {
    const indexer = new CellIndexer(makeOptions({ xAttrId: "xId", xCats: ["a", "b"] }))
    expect(indexer.slotFor("x", "zzz")).toBe(-1)
    expect(indexer.indexForSlots({ top: 0, right: 0, y: 0, x: -1 })).toBe(-1)
  })

  it("treats an unassigned role as a single slot", () => {
    const indexer = new CellIndexer(makeOptions())
    expect(indexer.slotFor("topSplit", "anything")).toBe(0)
  })

  it("round-trips every index through its cell key", () => {
    const indexer = new CellIndexer(makeOptions({
      xAttrId: "xId", xCats: ["a", "b"],
      yAttrId: "yId", yCats: ["p", "q"],
      topAttrId: "tId", topCats: ["s", "t"]
    }))
    expect(indexer.cellCount).toBe(8)
    for (let i = 0; i < indexer.cellCount; i++) {
      expect(indexer.indexForCellKey(indexer.cellKeyForIndex(i))).toBe(i)
    }
  })

  it("round-trips across randomly generated configurations", () => {
    const cats = (n: number, prefix: string) =>
      Array.from({ length: n }, (_, i) => `${prefix}${i}`)
    for (let trial = 0; trial < 50; trial++) {
      const nx = 1 + Math.floor(Math.random() * 4)
      const ny = 1 + Math.floor(Math.random() * 4)
      const nt = 1 + Math.floor(Math.random() * 3)
      const indexer = new CellIndexer(makeOptions({
        xAttrId: "xId", xCats: cats(nx, "x"),
        yAttrId: "yId", yCats: cats(ny, "y"),
        topAttrId: "tId", topCats: cats(nt, "t")
      }))
      for (let i = 0; i < indexer.cellCount; i++) {
        expect(indexer.indexForCellKey(indexer.cellKeyForIndex(i))).toBe(i)
      }
    }
  })

  it("returns -1 for a cell key it does not know", () => {
    const indexer = new CellIndexer(makeOptions({ xAttrId: "xId", xCats: ["a", "b"] }))
    expect(indexer.indexForCellKey({ xId: "nope" })).toBe(-1)
  })

  it("encodes cell keys with the documented decomposition (hand-verified against legacy method)", () => {
    // Configuration with distinct category counts to catch swapped radices:
    // xCount=2, yCount=3, rightCount=1, topCount=2; cellCount=12
    // Decomposition: topIndex=floor(i/6), rightIndex=floor(i/6)%1=0,
    //               yIndex=floor(i/2)%3, xIndex=i%2
    const indexer = new CellIndexer(makeOptions({
      xAttrId: "xId", xCats: ["a", "b"],
      yAttrId: "yId", yCats: ["p", "q", "r"],
      topAttrId: "tId", topCats: ["s", "t"]
    }))
    expect(indexer.cellCount).toBe(12)
    // Index 0: x rolls at 1, y rolls at 2, top rolls at 6
    expect(indexer.cellKeyForIndex(0)).toEqual({ tId: "s", yId: "p", xId: "a" })
    // Index 1: x advances (x cycles every 1 step)
    expect(indexer.cellKeyForIndex(1)).toEqual({ tId: "s", yId: "p", xId: "b" })
    // Index 2: x wraps, y advances (y cycles every 2 steps)
    expect(indexer.cellKeyForIndex(2)).toEqual({ tId: "s", yId: "q", xId: "a" })
    // Index 4: y wraps (yIndex: floor(4/2)%3 = 2%3 = 2)
    expect(indexer.cellKeyForIndex(4)).toEqual({ tId: "s", yId: "r", xId: "a" })
    // Index 6: top advances (top cycles every 6 steps)
    expect(indexer.cellKeyForIndex(6)).toEqual({ tId: "t", yId: "p", xId: "a" })
    // Index 11: last cell
    expect(indexer.cellKeyForIndex(11)).toEqual({ tId: "t", yId: "r", xId: "b" })
  })

  it("cellKeyForIndex names the same slot tuple indexForSlots encoded, right role included", () => {
    // The two decompositions are written independently, and the index round-trip test cannot tell
    // them apart: any bijection survives it. Cross-checking them against hand-built cell keys over
    // every slot tuple pins each factor, including the rightIndex extraction, which every other
    // cellKeyForIndex test leaves at a single (degenerate) right slot.
    const xCats = ["x0", "x1"]           // xCount = 2
    const yCats = ["y0", "y1", "y2"]     // yCount = 3
    const rightCats = ["r0", "r1"]       // rightCount = 2
    const topCats = ["t0", "t1"]         // topCount = 2
    const indexer = new CellIndexer(makeOptions({
      xAttrId: "xId", xCats,
      yAttrId: "yId", yCats,
      rightAttrId: "rId", rightCats,
      topAttrId: "tId", topCats
    }))
    expect(indexer.cellCount).toBe(24)
    for (let top = 0; top < topCats.length; top++) {
      for (let right = 0; right < rightCats.length; right++) {
        for (let y = 0; y < yCats.length; y++) {
          for (let x = 0; x < xCats.length; x++) {
            const index = indexer.indexForSlots({ top, right, y, x })
            expect(indexer.cellKeyForIndex(index)).toEqual({
              tId: topCats[top], rId: rightCats[right], yId: yCats[y], xId: xCats[x]
            })
          }
        }
      }
    }
  })

  it("parks a duplicated attribute's conflicting value under __IMPOSSIBLE__, first index winning", () => {
    // topSplit, y and x all carry the same attribute. updateCellKey refuses to overwrite the value
    // already stored under that attribute id and writes the conflicting one to __IMPOSSIBLE__
    // instead, so distinct slot tuples can produce the same cell key. indexForCellKey resolves such
    // a key to the lowest index that produced it, collapsing them the way subPlotCases always has.
    const indexer = new CellIndexer(makeOptions({
      xAttrId: "dupId", xCats: ["a", "b"],
      yAttrId: "dupId", yCats: ["a", "b"],
      topAttrId: "dupId", topCats: ["a", "b"]
    }))
    expect(indexer.cellCount).toBe(8)
    // index 1 is (top a, y a, x b) and index 2 is (top a, y b, x a); both reduce to this key
    expect(indexer.cellKeyForIndex(1)).toEqual({ dupId: "a", [kImpossible]: "b" })
    expect(indexer.cellKeyForIndex(2)).toEqual({ dupId: "a", [kImpossible]: "b" })
    expect(indexer.indexForCellKey({ dupId: "a", [kImpossible]: "b" })).toBe(1)
  })

  it("strides the top slot by the full rightCount*yCount*xCount, not by yCount*xCount alone", () => {
    // cellKeyForIndex has its own (separate, unmutated-by-this-test) copy of this same
    // decomposition, so a rightCount>1 case there would not exercise indexForSlots's arithmetic.
    // This test calls indexForSlots directly. It needs rightCount > 1 AND top >= 1 in the same
    // case: when top is 0, or rightCount is 1, "rightCount*yCount*xCount" and "yCount*xCount"
    // agree, so neither alone would catch a top stride that drops the rightCount factor.
    const indexer = new CellIndexer(makeOptions({
      xAttrId: "xId", xCats: ["x0", "x1"],          // xCount = 2
      yAttrId: "yId", yCats: ["y0", "y1", "y2"],     // yCount = 3
      rightAttrId: "rId", rightCats: ["r0", "r1"],   // rightCount = 2
      topAttrId: "tId", topCats: ["t0", "t1"]        // topCount = 2
    }))
    expect(indexer.cellCount).toBe(24)
    // Hand-derived from the documented decomposition (not generated by calling the indexer):
    //   index = top*(rightCount*yCount*xCount) + right*(yCount*xCount) + y*xCount + x
    //         = top*12 + right*6 + y*2 + x
    expect(indexer.indexForSlots({ top: 0, right: 0, y: 0, x: 0 })).toBe(0)
    expect(indexer.indexForSlots({ top: 0, right: 1, y: 0, x: 0 })).toBe(6)
    expect(indexer.indexForSlots({ top: 1, right: 0, y: 0, x: 0 })).toBe(12)
    expect(indexer.indexForSlots({ top: 1, right: 1, y: 0, x: 0 })).toBe(18)
    expect(indexer.indexForSlots({ top: 1, right: 1, y: 2, x: 1 })).toBe(23)
  })
})
