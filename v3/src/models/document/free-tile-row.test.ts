import { onPatch } from "mobx-state-tree"
import { FreeTileRow } from "./free-tile-row"

describe("FreeTileLayout", () => {
  it("adds/removes rows", () => {
    const row = FreeTileRow.create()
    expect(row.tiles.size).toBe(0)
    expect(row.last).toBe("")

    row.addTile({ tileId: "tile-1", x: 0, y: 0, width: 100, height: 100 })
    expect(row.tiles.size).toBe(1)
    expect(row.tiles.get("tile-1")?.tileId).toBe("tile-1")
    expect(row.last).toBe("tile-1")
    expect(row.tileIds).toEqual(["tile-1"])

    row.addTile({ tileId: "tile-2", x: 50, y: 50, width: 100, height: 100 })
    row.addTile({ tileId: "tile-3", x: 100, y: 100, width: 100, height: 100 })
    row.addTile({ tileId: "tile-4", x: 150, y: 150, width: 100, height: 100 })
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
    row.addTile({ tileId: "tile-1", x: 0, y: 0, width: 100, height: 100 })
    row.addTile({ tileId: "tile-2", x: 50, y: 50, width: 100, height: 100 })
    row.addTile({ tileId: "tile-3", x: 100, y: 100, width: 100, height: 100 })

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
    row.addTile({ tileId: "tile-1", x: 0, y: 0, width: 100, height: 100 })
    row.addTile({ tileId: "tile-2", x: 50, y: 50, width: 100, height: 100 })

    let patches: string[] = []
    let reverses: string[] = []
    const disposer = onPatch(row, (patch, reverse) => {
      patches.push(JSON.stringify(patch))
      reverses.push(JSON.stringify(reverse))
    })

    patches = []
    reverses = []
    row.addTile({ tileId: "tile-3", x: 100, y: 100, width: 100, height: 100 })
    expect(patches).toEqual([
      `{"op":"add","path":"/tiles/tile-3","value":{"tileId":"tile-3","x":100,"y":100,"width":100,"height":100}}`,
      `{"op":"add","path":"/order/2","value":"tile-3"}`
    ])
    expect(reverses).toEqual([
      `{"op":"remove","path":"/tiles/tile-3"}`,
      `{"op":"remove","path":"/order/2"}`
    ])

    // move from middle to last (top)
    patches = []
    reverses = []
    row.moveTileToTop("tile-2")
    expect(patches).toEqual([
      `{"op":"remove","path":"/order/1"}`,
      `{"op":"add","path":"/order/2","value":"tile-2"}`
    ])
    expect(reverses).toEqual([
      `{"op":"add","path":"/order/1","value":"tile-2"}`,
      `{"op":"remove","path":"/order/2"}`
    ])

    // move from beginning to last (top)
    patches = []
    reverses = []
    row.moveTileToTop("tile-1")
    expect(patches).toEqual([
      `{"op":"remove","path":"/order/0"}`,
      `{"op":"add","path":"/order/2","value":"tile-1"}`
    ])
    expect(reverses).toEqual([
      `{"op":"add","path":"/order/0","value":"tile-1"}`,
      `{"op":"remove","path":"/order/2"}`
    ])

    // remove first tile
    patches = []
    reverses = []
    row.removeTile("tile-3")
    expect(patches).toEqual([
      `{"op":"remove","path":"/order/0"}`,
      `{"op":"remove","path":"/tiles/tile-3"}`
    ])
    expect(reverses).toEqual([
      `{"op":"add","path":"/order/0","value":"tile-3"}`,
      // eslint-disable-next-line max-len
      `{"op":"add","path":"/tiles/tile-3","value":{"tileId":"tile-3","x":100,"y":100,"width":100,"height":100}}`
    ])

    disposer()
  })
})
