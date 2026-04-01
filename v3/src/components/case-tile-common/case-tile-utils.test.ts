import { getSnapshot } from "mobx-state-tree"
import { appState } from "../../models/app-state"
import { IFreeTileLayout, isFreeTileLayout } from "../../models/document/free-tile-row"
import { getMetadataFromDataSet, getSharedDataSets } from "../../models/shared/shared-data-utils"
import { uiState } from "../../models/ui-state"
import { setupTestDataset } from "../../test/dataset-test-utils"
import { kCaseTableTileType } from "../case-table/case-table-defs"
import "../case-table/case-table-registration"
import { createOrShowTableOrCardForDataset } from "./case-tile-utils"

describe("createOrShowTableOrCardForDataset", () => {
  const documentContent = appState.document.content!

  beforeEach(() => {
    const { dataset } = setupTestDataset()
    documentContent.createDataSet(getSnapshot(dataset))
  })

  it("does not hide an already-visible table when called again", () => {
    const sharedDataSet = getSharedDataSets(documentContent)[0]
    const tile = createOrShowTableOrCardForDataset(sharedDataSet, kCaseTableTileType)!
    expect(tile).toBeDefined()
    expect(documentContent.isTileHidden(tile.id)).toBe(false)

    // Call again — should keep the table visible, not toggle it hidden
    const tile2 = createOrShowTableOrCardForDataset(sharedDataSet, kCaseTableTileType)!
    expect(tile2.id).toBe(tile.id)
    expect(documentContent.isTileHidden(tile.id)).toBe(false)
    expect(uiState.focusedTile).toBe(tile.id)
  })

  it("finds existing table via caseTableTileId when lastShownTableOrCardTileId is not set", () => {
    const sharedDataSet = getSharedDataSets(documentContent)[0]
    const tile = createOrShowTableOrCardForDataset(sharedDataSet, kCaseTableTileType)!
    expect(tile).toBeDefined()

    // Clear lastShownTableOrCardTileId to simulate import scenario
    const metadata = getMetadataFromDataSet(sharedDataSet.dataSet)!
    metadata.setLastShownTableOrCardTileId("")

    // Should still find and focus the existing table via caseTableTileId
    const tile2 = createOrShowTableOrCardForDataset(sharedDataSet, kCaseTableTileType)!
    expect(tile2.id).toBe(tile.id)
    expect(documentContent.isTileHidden(tile.id)).toBe(false)
    expect(uiState.focusedTile).toBe(tile.id)
  })

  it("unminimizes a minimized table when selected from the menu", () => {
    const sharedDataSet = getSharedDataSets(documentContent)[0]
    const tile = createOrShowTableOrCardForDataset(sharedDataSet, kCaseTableTileType)!
    expect(tile).toBeDefined()

    // Minimize the tile
    const tileLayout = documentContent.getTileLayoutById(tile.id)!
    expect(isFreeTileLayout(tileLayout)).toBe(true)
    ;(tileLayout as IFreeTileLayout).setMinimized(true)
    expect((tileLayout as IFreeTileLayout).isMinimized).toBe(true)

    // Call again — should restore the tile
    createOrShowTableOrCardForDataset(sharedDataSet, kCaseTableTileType)
    expect((tileLayout as IFreeTileLayout).isMinimized).toBeFalsy()
    expect(uiState.focusedTile).toBe(tile.id)
  })
})
