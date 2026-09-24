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
      expect(indexer.indicesForCellKey(indexer.cellKeyForIndex(i))).toEqual([i])
    }
  })

  it("builds the key lookup only when a cell key is first resolved", () => {
    const keySpy = jest.spyOn(CellIndexer.prototype, "cellKeyForIndex")
    const indexer = new CellIndexer(makeOptions({
      xAttrId: "xId", xCats: ["a", "b"],
      yAttrId: "yId", yCats: ["p", "q"]
    }))
    expect(keySpy).not.toHaveBeenCalled()
    expect(indexer.indicesForCellKey({ xId: "b", yId: "q" })).toEqual([3])
    expect(keySpy).toHaveBeenCalledTimes(indexer.cellCount)
    // later lookups reuse it
    expect(indexer.indicesForCellKey({ xId: "a", yId: "p" })).toEqual([0])
    expect(keySpy).toHaveBeenCalledTimes(indexer.cellCount)
    keySpy.mockRestore()
  })

  it("round-trips every index across every configuration up to 4 x 4 x 3 x 3", () => {
    const cats = (n: number, prefix: string) =>
      Array.from({ length: n }, (_, i) => `${prefix}${i}`)
    for (let nx = 1; nx <= 4; nx++) {
      for (let ny = 1; ny <= 4; ny++) {
        for (let nt = 1; nt <= 3; nt++) {
          for (let nr = 1; nr <= 3; nr++) {
            const indexer = new CellIndexer(makeOptions({
              xAttrId: "xId", xCats: cats(nx, "x"),
              yAttrId: "yId", yCats: cats(ny, "y"),
              topAttrId: "tId", topCats: cats(nt, "t"),
              rightAttrId: "rId", rightCats: cats(nr, "r")
            }))
            for (let i = 0; i < indexer.cellCount; i++) {
              expect(indexer.indicesForCellKey(indexer.cellKeyForIndex(i))).toEqual([i])
            }
          }
        }
      }
    }
  })

  it("returns no indices for a cell key it does not know", () => {
    const indexer = new CellIndexer(makeOptions({ xAttrId: "xId", xCats: ["a", "b"] }))
    expect(indexer.indicesForCellKey({ xId: "nope" })).toEqual([])
  })

  it("encodes cell keys as top, right, y, x from most to least significant", () => {
    // xCount=2 and yCount=3 differ, so swapped x/y radices would change the keys.
    // topIndex=floor(i/6), yIndex=floor(i/2)%3, xIndex=i%2; cellCount=12
    const indexer = new CellIndexer(makeOptions({
      xAttrId: "xId", xCats: ["a", "b"],
      yAttrId: "yId", yCats: ["p", "q", "r"],
      topAttrId: "tId", topCats: ["s", "t"]
    }))
    expect(indexer.cellCount).toBe(12)
    // x advances every step, y every 2 steps, top every 6
    expect(indexer.cellKeyForIndex(0)).toEqual({ tId: "s", yId: "p", xId: "a" })
    expect(indexer.cellKeyForIndex(1)).toEqual({ tId: "s", yId: "p", xId: "b" })
    expect(indexer.cellKeyForIndex(2)).toEqual({ tId: "s", yId: "q", xId: "a" })
    expect(indexer.cellKeyForIndex(4)).toEqual({ tId: "s", yId: "r", xId: "a" })
    expect(indexer.cellKeyForIndex(6)).toEqual({ tId: "t", yId: "p", xId: "a" })
    expect(indexer.cellKeyForIndex(11)).toEqual({ tId: "t", yId: "r", xId: "b" })
  })

  it("cellKeyForIndex names the same slot tuple indexForSlots encoded, right role included", () => {
    // The two decompositions are written independently, and a round-trip test can't tell them
    // apart: any bijection survives it. Cross-checking against hand-built cell keys pins each factor.
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

  it("maps a key shared by several slot tuples to every index that produced it", () => {
    // topSplit, y and x all carry the same attribute. updateCellKey keeps the first value stored
    // under that attribute id and writes a conflicting one to __IMPOSSIBLE__, so distinct slot
    // tuples can produce the same cell key.
    const indexer = new CellIndexer(makeOptions({
      xAttrId: "dupId", xCats: ["a", "b"],
      yAttrId: "dupId", yCats: ["a", "b"],
      topAttrId: "dupId", topCats: ["a", "b"]
    }))
    expect(indexer.cellCount).toBe(8)
    // (top a, y a, x b), (top a, y b, x a) and (top a, y b, x b) all reduce to this key
    expect(indexer.cellKeyForIndex(1)).toEqual({ dupId: "a", [kImpossible]: "b" })
    expect(indexer.cellKeyForIndex(2)).toEqual({ dupId: "a", [kImpossible]: "b" })
    expect(indexer.indicesForCellKey({ dupId: "a", [kImpossible]: "b" })).toEqual([1, 2, 3])
    // each slot tuple keeps its own index
    expect(indexer.indexForSlots({ top: 0, right: 0, y: 1, x: 0 })).toBe(2)
  })

  it("places a value in the cell matching each role's own slot, even when its key is shared", () => {
    // Three roles on one attribute with differing limits: the clamped arrays differ per role, so
    // a real value lands on a slot tuple whose key an impossible tuple shares.
    const indexer = new CellIndexer(makeOptions({
      topAttrId: "dupId", topCats: [kOther],                // limit 1
      rightAttrId: "dupId", rightCats: ["a", kOther],       // limit 2
      xAttrId: "dupId", xCats: ["a", "b", kOther]           // limit 3
    }))
    // "b" is right's overflow and x's second category: index = right 1 * 3 + x 1 = 4
    const slots = {
      top: indexer.slotFor("topSplit", "b"), right: indexer.slotFor("rightSplit", "b"),
      y: 0, x: indexer.slotFor("x", "b")
    }
    expect(slots).toEqual({ top: 0, right: 1, y: 0, x: 1 })
    const bIndex = indexer.indexForSlots(slots)
    expect(bIndex).toBe(4)
    // (right a, x b) can hold no value, but serializes to the same key
    expect(indexer.cellKeyForIndex(1)).toEqual(indexer.cellKeyForIndex(4))
    expect(indexer.indicesForCellKey(indexer.cellKeyForIndex(bIndex))).toEqual([1, 4])
    // and every index is found by its own key
    for (let i = 0; i < indexer.cellCount; i++) {
      expect(indexer.indicesForCellKey(indexer.cellKeyForIndex(i))).toContain(i)
    }
  })

  it("gives the overflow the last kOther slot when a real category is spelled like kOther", () => {
    // the clamp appends the overflow slot last
    const indexer = new CellIndexer(makeOptions({ xAttrId: "xId", xCats: [kOther, "b", kOther] }))
    expect(indexer.slotFor("x", kOther)).toBe(0)
    expect(indexer.slotFor("x", "zzz")).toBe(2)
  })

  it("strides the top slot by the full rightCount*yCount*xCount, not by yCount*xCount alone", () => {
    // Needs rightCount > 1 and top >= 1 together: otherwise "rightCount*yCount*xCount" and
    // "yCount*xCount" agree, and a top stride missing the rightCount factor would go unnoticed.
    const indexer = new CellIndexer(makeOptions({
      xAttrId: "xId", xCats: ["x0", "x1"],          // xCount = 2
      yAttrId: "yId", yCats: ["y0", "y1", "y2"],     // yCount = 3
      rightAttrId: "rId", rightCats: ["r0", "r1"],   // rightCount = 2
      topAttrId: "tId", topCats: ["t0", "t1"]        // topCount = 2
    }))
    expect(indexer.cellCount).toBe(24)
    // hand-derived: index = top*12 + right*6 + y*2 + x
    expect(indexer.indexForSlots({ top: 0, right: 0, y: 0, x: 0 })).toBe(0)
    expect(indexer.indexForSlots({ top: 0, right: 1, y: 0, x: 0 })).toBe(6)
    expect(indexer.indexForSlots({ top: 1, right: 0, y: 0, x: 0 })).toBe(12)
    expect(indexer.indexForSlots({ top: 1, right: 1, y: 0, x: 0 })).toBe(18)
    expect(indexer.indexForSlots({ top: 1, right: 1, y: 2, x: 1 })).toBe(23)
  })
})
