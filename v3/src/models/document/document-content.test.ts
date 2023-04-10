import { getType } from "mobx-state-tree"
import { registerTileTypes } from "../../register-tile-types"
import { TestTileContent } from "../../test/test-tile-content"
import { TileModel } from "../tiles/tile-model"
import { DocumentContentModel, IDocumentContentModel } from "./document-content"
import { FreeTileRow } from "./free-tile-row"
import { LegacyTileRowModel } from "./legacy-tile-row"

registerTileTypes(["Test"])

describe("DocumentContent", () => {
  let content: IDocumentContentModel

  beforeEach(() => {
    content = DocumentContentModel.create({})
  })

  it("has a valid empty state", () => {
    expect(content.isEmpty).toBe(true)
    expect(content.rowCount).toBe(0)
    expect(content.getTile("foo")).toBeUndefined()
    expect(content.getRow("foo")).toBeUndefined()
    expect(content.getRowByIndex(0)).toBeUndefined()
    expect(content.getRowIndex("foo")).toBe(-1)
    expect(content.findRowIdContainingTile("foo")).toBeUndefined()
    expect(content.indexOfLastVisibleRow).toBe(-1)
    expect(content.numTilesInRow("foo")).toBe(0)
  })

  it("can insert/delete legacy rows/tiles (e.g. CLUE)", () => {
    const row = LegacyTileRowModel.create({ id: "row-1" })
    expect(row).toBeDefined()
    content.insertRow(row)
    content.setVisibleRows([row.id])

    expect(content.isEmpty).toBe(true)
    expect(content.rowCount).toBe(1)
    expect(content.getRow(row.id)).toBe(row)
    expect(content.getRowByIndex(0)).toBe(row)
    expect(content.getRowIndex(row.id)).toBe(0)
    expect(content.indexOfLastVisibleRow).toBe(0)
    expect(content.defaultInsertRow).toBe(1)

    const tile = TileModel.create({ id: "tile-1", content: TestTileContent.create() })
    content.insertTileInRow(tile, row)

    expect(content.isEmpty).toBe(false)
    expect(content.getTile(tile.id)).toBe(tile)
    expect(content.findRowIdContainingTile(tile.id)).toBe(row.id)
    expect(content.numTilesInRow(row.id)).toBe(1)
    expect(content.isPlaceholderRow(row)).toBe(false)

    const row2 = LegacyTileRowModel.create({ id: "row-2" })
    expect(row2).toBeDefined()
    content.insertRow(row2, 0)
    content.setVisibleRows([row2.id, row.id])

    const tile2 = TileModel.create({ id: "tile-2", content: TestTileContent.create() })
    content.insertTileInRow(tile2, row2)

    expect(content.isEmpty).toBe(false)
    expect(content.rowCount).toBe(2)
    expect(content.getRow(row2.id)).toBe(row2)
    expect(content.getRowByIndex(0)).toBe(row2)
    expect(content.getRowByIndex(1)).toBe(row)
    expect(content.getRowIndex(row2.id)).toBe(0)
    expect(content.getRowIndex(row.id)).toBe(1)
    expect(content.indexOfLastVisibleRow).toBe(1)
    expect(content.defaultInsertRow).toBe(2)

    content.deleteTilesFromRow(row2)

    expect(content.isEmpty).toBe(false)
    expect(content.getTile(tile.id)).toBe(tile)
    expect(content.findRowIdContainingTile(tile.id)).toBe(row.id)
    expect(content.numTilesInRow(row.id)).toBe(1)
    expect(content.isPlaceholderRow(row)).toBe(false)

    content.deleteTile(tile.id)

    expect(content.isEmpty).toBe(true)
    expect(content.rowCount).toBe(0)
    expect(content.indexOfLastVisibleRow).toBe(-1)
    expect(content.defaultInsertRow).toBe(0)
  })

  it("can insert/delete free rows/tiles (e.g. CODAP)", () => {
    const row = FreeTileRow.create({ id: "row-1" })
    expect(row).toBeDefined()
    content.insertRow(row)
    content.setVisibleRows([row.id])

    expect(content.isEmpty).toBe(true)
    expect(content.rowCount).toBe(1)
    expect(content.getRow(row.id)).toBe(row)
    expect(content.getRowByIndex(0)).toBe(row)
    expect(content.getRowIndex(row.id)).toBe(0)
    expect(content.indexOfLastVisibleRow).toBe(0)
    expect(getType(content.defaultInsertRow).name).toBe("FreeTileRow")

    const tile = TileModel.create({ id: "tile-1", content: TestTileContent.create() })
    content.insertTileInRow(tile, row, { x: 50, y: 50, width: 400, height: 300 })

    expect(content.isEmpty).toBe(false)
    expect(content.getTile(tile.id)).toBe(tile)
    expect(content.findRowIdContainingTile(tile.id)).toBe(row.id)
    expect(content.numTilesInRow(row.id)).toBe(1)
    expect(content.isPlaceholderRow(row)).toBe(false)

    const tile2 = TileModel.create({ id: "tile-2", content: TestTileContent.create() })
    content.insertTileInRow(tile2, row, { x: 100, y: 100, width: 400, height: 300 })

    expect(content.getTile(tile2.id)).toBe(tile2)
    expect(content.findRowIdContainingTile(tile2.id)).toBe(row.id)
    expect(content.numTilesInRow(row.id)).toBe(2)
    expect(content.isPlaceholderRow(row)).toBe(false)

    content.deleteTile(tile.id)

    expect(content.getTile("tile-1")).toBeUndefined()
    expect(content.getTile(tile2.id)).toBe(tile2)
    expect(content.findRowIdContainingTile("tile-1")).toBeUndefined()
    expect(content.findRowIdContainingTile(tile2.id)).toBe(row.id)
    expect(content.numTilesInRow(row.id)).toBe(1)
    expect(content.isPlaceholderRow(row)).toBe(false)
  })

})
