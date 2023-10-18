import { getSnapshot, onPatch } from "mobx-state-tree"
import { FreeTileLayout, FreeTileRow, isFreeTileInRowOptions, isFreeTileRow } from "./free-tile-row"

describe("FreeTileLayout", () => {
  it("works as expected", () => {
    const layout = FreeTileLayout.create({ tileId: "aTileId", x: 0, y: 0 })
    expect(layout.position).toEqual({ x: 0, y: 0 })
    expect(layout.size).toEqual({})
    expect(layout.isMinimized).toBeUndefined()
    layout.setPosition(10, 10)
    expect(layout.position).toEqual({ x: 10, y: 10 })
    layout.setSize(50, 50)
    expect(layout.size).toEqual({ width: 50, height: 50 })
    layout.setMinimized(true)
    expect(layout.isMinimized).toBe(true)
    layout.setMinimized(false)
    expect(layout.isMinimized).toBeUndefined()
  })
})

describe("FreeTileRow", () => {
  it("is created in default state", () => {
    const row = FreeTileRow.create()
    expect(row.tiles.size).toBe(0)
    expect(row.acceptDefaultInsert).toBe(true)
    expect(row.removeWhenEmpty).toBe(false)
    expect(row.last).toBe("")
    expect(row.tileCount).toBe(0)
    expect(row.hasTile("foo")).toBe(false)

    expect(isFreeTileRow(undefined)).toBe(false)
    expect(isFreeTileRow(row)).toBe(true)

    // adds tiles with default properties
    row.insertTile("tile-1")
    expect(row.getNode("tile-1")!.position).toEqual({ x: 50, y: 50 })
    expect(row.getNode("tile-1")!.size).toEqual({})
  })

  it("adds/removes rows", () => {
    const row = FreeTileRow.create()

    row.insertTile("tile-1", { x: 0, y: 0, width: 100, height: 100 })
    expect(row.tiles.size).toBe(1)
    expect(row.tileCount).toBe(1)
    expect(row.hasTile("tile-1")).toBe(true)
    expect(row.getNode("tile-1")).toBeDefined()
    expect(row.tiles.get("tile-1")?.tileId).toBe("tile-1")
    expect(row.last).toBe("tile-1")
    expect(row.tileIds).toEqual(["tile-1"])

    row.insertTile("tile-2", { x: 50, y: 50, width: 100, height: 100 })
    row.insertTile("tile-3", { x: 100, y: 100, width: 100, height: 100 })
    row.insertTile("tile-4", { x: 150, y: 150, width: 100, height: 100 })
    expect(row.tiles.size).toBe(4)
    expect(row.tiles.get("tile-4")?.tileId).toBe("tile-4")
    expect(row.last).toBe("tile-4")
    expect(row.tileIds).toEqual(["tile-1", "tile-2", "tile-3", "tile-4"])

    // can remove from middle
    row.removeTile("tile-3")
    expect(row.tiles.size).toBe(3)
    expect(row.tiles.get("tile-3")?.tileId).toBeUndefined()
    expect(row.last).toBe("tile-4")
    expect(row.tileIds).toEqual(["tile-1", "tile-2", "tile-4"])

    // can remove from end
    row.removeTile("tile-4")
    expect(row.tiles.size).toBe(2)
    expect(row.tiles.get("tile-4")?.tileId).toBeUndefined()
    expect(row.last).toBe("tile-2")
    expect(row.tileIds).toEqual(["tile-1", "tile-2"])

    // can remove from beginning
    row.removeTile("tile-1")
    expect(row.tiles.size).toBe(1)
    expect(row.tiles.get("tile-1")?.tileId).toBeUndefined()
    expect(row.last).toBe("tile-2")
    expect(row.tileIds).toEqual(["tile-2"])

    // can remove last
    row.removeTile("tile-2")
    expect(row.tiles.size).toBe(0)
    expect(row.tiles.get("tile-2")?.tileId).toBeUndefined()
    expect(row.last).toBe("")
    expect(row.tileIds).toEqual([])
  })

  it("moves tiles to top", () => {
    const row = FreeTileRow.create()
    row.insertTile("tile-1", { x: 0, y: 0, width: 100, height: 100 })
    row.insertTile("tile-2", { x: 50, y: 50, width: 100, height: 100 })
    row.insertTile("tile-3", { x: 100, y: 100, width: 100, height: 100 })

    // move from middle to last (top)
    row.moveTileToTop("tile-2")
    expect(row.tiles.size).toBe(3)
    expect(row.last).toBe("tile-2")
    expect(row.tileIds).toEqual(["tile-1", "tile-3", "tile-2"])

    // move from beginning to last (top)
    row.moveTileToTop("tile-1")
    expect(row.tiles.size).toBe(3)
    expect(row.last).toBe("tile-1")
    expect(row.tileIds).toEqual(["tile-3", "tile-2", "tile-1"])

    // move from end to last (nop)
    row.moveTileToTop("tile-1")
    expect(row.tiles.size).toBe(3)
    expect(row.last).toBe("tile-1")
    expect(row.tileIds).toEqual(["tile-3", "tile-2", "tile-1"])
  })

  it("generates efficient patches", () => {
    const row = FreeTileRow.create()
    row.insertTile("tile-1", { x: 0, y: 0, width: 100, height: 100 })
    row.insertTile("tile-2", { x: 50, y: 50, width: 100, height: 100 })

    let patches: string[] = []
    let reverses: string[] = []
    const disposer = onPatch(row, (patch, reverse) => {
      patches.push(JSON.stringify(patch))
      reverses.push(JSON.stringify(reverse))
    })

    patches = []
    reverses = []
    row.insertTile("tile-3", { x: 100, y: 100, width: 100, height: 100 })
    expect(patches).toEqual([
      `{"op":"add","path":"/tiles/tile-3","value":{"tileId":"tile-3","x":100,"y":100,"width":100,"height":100}}`
    ])
    expect(reverses).toEqual([
      `{"op":"remove","path":"/tiles/tile-3"}`
    ])

    // move from middle to last (top)
    patches = []
    reverses = []
    row.moveTileToTop("tile-2")
    expect(patches).toEqual([])
    expect(reverses).toEqual([])

    // move from beginning to last (top)
    patches = []
    reverses = []
    row.moveTileToTop("tile-1")
    expect(patches).toEqual([])
    expect(reverses).toEqual([])

    // remove first tile
    patches = []
    reverses = []
    row.removeTile("tile-3")
    expect(patches).toEqual([
      `{"op":"remove","path":"/tiles/tile-3"}`
    ])
    expect(reverses).toEqual([
      `{"op":"add","path":"/tiles/tile-3","value":{"tileId":"tile-3","x":100,"y":100,"width":100,"height":100}}`
    ])

    disposer()
  })

  it("preprocessSnapshot supports legacy and current formats", () => {
    const legacyRow = FreeTileRow.create({
      tiles: {
        "tile-1": { tileId: "tile-1", x: 0, y: 0, width: 100, height: 100 }
      },
      order: ["tile-1"]
    })
    expect(legacyRow.order).toEqual(["tile-1"])

    const modernRow = FreeTileRow.create({
      tiles: {
        "tile-1": { tileId: "tile-1", x: 0, y: 0, width: 100, height: 100 }
      },
      savedOrder: ["tile-1"]
    })
    expect(modernRow.order).toEqual(["tile-1"])
  })

  it("serializes correctly when prepareSnapshot() is called", () => {
    const row = FreeTileRow.create()
    row.insertTile("tile-1", { x: 0, y: 0, width: 100, height: 100 })
    row.insertTile("tile-2", { x: 50, y: 50, width: 100, height: 100 })

    // without prepareSnapshot(), savedOrder is empty
    expect(getSnapshot(row)).toEqual({
      id: row.id,
      type: "free",
      tiles: {
        "tile-1": { tileId: "tile-1", x: 0, y: 0, width: 100, height: 100 },
        "tile-2": { tileId: "tile-2", x: 50, y: 50, width: 100, height: 100 }
      },
      savedOrder: []
    })

    // after prepareSnapshot(), savedOrder is correct
    row.prepareSnapshot()
    expect(getSnapshot(row)).toEqual({
      id: row.id,
      type: "free",
      tiles: {
        "tile-1": { tileId: "tile-1", x: 0, y: 0, width: 100, height: 100 },
        "tile-2": { tileId: "tile-2", x: 50, y: 50, width: 100, height: 100 }
      },
      savedOrder: ["tile-1", "tile-2"]
    })
  })

  it("isFreeTileInRowOptions works as expected", () => {
    expect(isFreeTileInRowOptions(undefined)).toBe(false)
    expect(isFreeTileInRowOptions({ x: 10 })).toBe(false)
    expect(isFreeTileInRowOptions({ y: 10 })).toBe(false)
    expect(isFreeTileInRowOptions({ x: 10, y: 10 })).toBe(true)

  })
})
