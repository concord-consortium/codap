import { getSnapshot } from "mobx-state-tree"
import { ICaseTableModel, isCaseTableModel } from "../../components/case-table/case-table-model"
import { kCaseTableIdPrefix } from "../../components/case-table/case-table-registration"
import { appState } from "../../models/app-state"
import { toV3Id } from "../../utilities/codap-utils"
import { DIComponentInfo } from "../data-interactive-types"
import { diComponentHandler } from "./component-handler"
import { setupTestDataset } from "./handler-test-utils"


describe("DataInteractive ComponentHandler", () => {
  const handler = diComponentHandler

  it("create works as expected", () => {
    const { dataset } = setupTestDataset()
    const documentContent = appState.document.content!
    documentContent.createDataSet(getSnapshot(dataset))

    expect(handler.create?.({}).success).toBe(false)
    expect(handler.create?.({}, {}).success).toBe(false)
    expect(handler.create?.({}, { type: "unknown" }).success).toBe(false)
    expect(handler.create?.({}, { type: "caseTable" }).success).toBe(false)
    expect(handler.create?.({}, { type: "caseTable", dataContext: "unknown" }).success).toBe(false)

    // Create a table tile
    expect(documentContent.tileMap.size).toBe(0)
    const result = handler.create?.({}, { type: "caseTable", dataContext: "data" })
    expect(result?.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const resultValues = result?.values as DIComponentInfo
    const tile = documentContent.tileMap.get(toV3Id(kCaseTableIdPrefix, resultValues?.id ?? 0))
    expect(tile).toBeDefined()
    expect(isCaseTableModel(tile?.content)).toBe(true)
    expect((tile?.content as ICaseTableModel).data?.id).toBe(dataset.id)

    // Show a hidden table tile
    documentContent.toggleNonDestroyableTileVisibility(tile?.id)
    expect(documentContent.isTileHidden(tile?.id)).toBe(true)
    const result2 = handler.create?.({}, { type: "caseTable", dataContext: "data" })
    expect(result2?.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    expect(documentContent.isTileHidden(tile?.id)).toBe(false)
  })
})
