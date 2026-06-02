import { getSnapshot } from "mobx-state-tree"
import { appState } from "../../models/app-state"
import { IFreeTileLayout, isFreeTileLayout } from "../../models/document/free-tile-row"
import { ISharedDataSet } from "../../models/shared/shared-data-set"
import { getMetadataFromDataSet } from "../../models/shared/shared-data-utils"
import { uiState } from "../../models/ui-state"
import { setupTestDataset } from "../../test/dataset-test-utils"
import { kCaseCardTileType } from "../case-card/case-card-defs"
import "../case-card/case-card-registration"
import { kCaseTableTileType } from "../case-table/case-table-defs"
import "../case-table/case-table-registration"
import { applyCaseValueChanges, createOrShowTableOrCardForDataset, toggleCardTable } from "./case-tile-utils"

describe("createOrShowTableOrCardForDataset", () => {
  const documentContent = appState.document.content!
  // appState.document is a singleton that persists across tests, so datasets created here accumulate.
  // Capture the dataset created for *this* test (a pristine one with no tiles yet) instead of reaching
  // for getSharedDataSets(...)[0], which would target the first dataset created in the whole file.
  let sharedDataSet: ISharedDataSet

  beforeEach(() => {
    const { dataset } = setupTestDataset()
    sharedDataSet = documentContent.createDataSet(getSnapshot(dataset)).sharedDataSet
  })

  it("does not hide an already-visible table when called again", () => {
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

  it("re-opens the last-shown card view when called with no tileType (CODAP-1370)", () => {
    const table = createOrShowTableOrCardForDataset(sharedDataSet, kCaseTableTileType)!
    // Toggle to case card view: hides the table, shows/creates the card, lastShown = card
    const card = toggleCardTable(documentContent, table.id)!
    expect(card.content.type).toBe(kCaseCardTileType)
    expect(documentContent.isTileHidden(table.id)).toBe(true)

    // Close (hide) the card, as the title-bar close button does (non-destructive)
    documentContent.toggleNonDestroyableTileVisibility(card.id)
    expect(documentContent.isTileHidden(card.id)).toBe(true)

    // Re-open from the tool-shelf menu (no explicit tileType): should restore the CARD, not the table
    const reopened = createOrShowTableOrCardForDataset(sharedDataSet)!
    expect(reopened.id).toBe(card.id)
    expect(reopened.content.type).toBe(kCaseCardTileType)
    expect(documentContent.isTileHidden(card.id)).toBe(false)
    expect(documentContent.isTileHidden(table.id)).toBe(true)
    expect(uiState.focusedTile).toBe(card.id)
  })

  it("shows the explicitly requested type, ignoring the last-shown view (plugin path)", () => {
    const table = createOrShowTableOrCardForDataset(sharedDataSet, kCaseTableTileType)!
    // Toggle to card view so lastShownTableOrCardTileId points at the card
    const card = toggleCardTable(documentContent, table.id)!
    expect(card.content.type).toBe(kCaseCardTileType)

    // A plugin that explicitly requests a case table should get the table, not the last-shown card
    const result = createOrShowTableOrCardForDataset(sharedDataSet, kCaseTableTileType)!
    expect(result.id).toBe(table.id)
    expect(result.content.type).toBe(kCaseTableTileType)
    expect(documentContent.isTileHidden(table.id)).toBe(false)
  })
})

describe("applyCaseValueChanges", () => {
  it("creates an undo entry and updates the value when a value changes", () => {
    const { dataset, a3 } = setupTestDataset()
    const itemId = dataset.getItemAtIndex(0)!.__id__
    const spy = jest.spyOn(dataset, "applyModelChange")

    applyCaseValueChanges(dataset, [{ __id__: itemId, [a3.id]: 99 }], undefined, [a3.id])

    expect(spy).toHaveBeenCalledTimes(1)
    expect(dataset.getStrValue(itemId, a3.id)).toBe("99")
  })

  it("skips no-op changes when values match current (the CODAP-1277 regression)", () => {
    const { dataset, a3 } = setupTestDataset()
    const itemId = dataset.getItemAtIndex(0)!.__id__
    const currentValue = dataset.getStrValue(itemId, a3.id)
    const spy = jest.spyOn(dataset, "applyModelChange")

    applyCaseValueChanges(dataset, [{ __id__: itemId, [a3.id]: currentValue }], undefined, [a3.id])

    expect(spy).not.toHaveBeenCalled()
  })

  it("only checks attributes listed in affectedAttributes", () => {
    const { dataset, a3, a4 } = setupTestDataset()
    const itemId = dataset.getItemAtIndex(0)!.__id__
    const a3Current = dataset.getStrValue(itemId, a3.id)
    const spy = jest.spyOn(dataset, "applyModelChange")

    // a4 carries a different value, but affectedAttributes restricts the check to a3 (matches),
    // so the call is treated as a no-op and skipped.
    applyCaseValueChanges(
      dataset,
      [{ __id__: itemId, [a3.id]: a3Current, [a4.id]: 999 }],
      undefined,
      [a3.id]
    )

    expect(spy).not.toHaveBeenCalled()
  })

  it("checks all attributes in the case when affectedAttributes is omitted", () => {
    const { dataset, a4 } = setupTestDataset()
    const itemId = dataset.getItemAtIndex(0)!.__id__
    const spy = jest.spyOn(dataset, "applyModelChange")

    applyCaseValueChanges(dataset, [{ __id__: itemId, [a4.id]: 999 }])

    expect(spy).toHaveBeenCalledTimes(1)
    expect(dataset.getStrValue(itemId, a4.id)).toBe("999")
  })
})
