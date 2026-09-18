import { kOther } from "../../data-display/data-display-types"
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
})
