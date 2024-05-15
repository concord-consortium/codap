import { getSnapshot } from "mobx-state-tree"
import { diComponentHandler } from "./component-handler"
import { setupTestDataset } from "./handler-test-utils"
import { kCaseTableTileType } from "../../components/case-table/case-table-defs"
import { ICaseTableModel } from "../../components/case-table/case-table-model"
import { appState } from "../../models/app-state"
import "../../components/case-table/case-table-registration"


describe("DataInteractive ComponentHandler", () => {
  const handler = diComponentHandler

  it("create works as expected", () => {
    const { dataset } = setupTestDataset()
    const documentContent = appState.document.content!
    documentContent.createDataSet(getSnapshot(dataset!))

    expect(handler.create?.({}).success).toBe(false)
    expect(handler.create?.({}, {}).success).toBe(false)
    expect(handler.create?.({}, { type: "unknown" }).success).toBe(false)
    expect(handler.create?.({}, { type: "caseTable" }).success).toBe(false)
    expect(handler.create?.({}, { type: "caseTable", dataContext: "unknown" }).success).toBe(false)

    expect(documentContent.tileMap.size).toBe(0)
    const result = handler.create?.({}, { type: "caseTable", dataContext: "data" })
    expect(result?.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const tile = Array.from(documentContent.tileMap.values())[0]
    expect(tile.content.type).toBe(kCaseTableTileType)
    expect((tile.content as ICaseTableModel).data?.id).toBe(dataset.id)
  })
})
