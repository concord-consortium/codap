import { DndContext } from "@dnd-kit/core"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { when } from "mobx"
import { getSnapshot } from "mobx-state-tree"
import { DocumentContentContext } from "../../hooks/use-document-content"
import { appState } from "../../models/app-state"
import { createCodapDocument } from "../../models/codap/create-codap-document"
import { IDocumentContentModel } from "../../models/document/document-content"
import { TreeManagerType } from "../../models/history/tree-manager"
import { getSharedDataSets } from "../../models/shared/shared-data-utils"
import { ITileModel } from "../../models/tiles/tile-model"
import { setupTestDataset } from "../../test/dataset-test-utils"
import { toV2Id } from "../../utilities/codap-utils"
import { t } from "../../utilities/translation/translate"
import { kCaseTableTileType } from "../case-table/case-table-defs"
import "../case-table/case-table-registration"
import { CaseTileTitleBar } from "./case-tile-title-bar"
import { createOrShowTableOrCardForDataset } from "./case-tile-utils"

describe("CaseTileTitleBar", () => {
  function renderTitleBar(content: IDocumentContentModel, tile: ITileModel) {
    render(
      <DocumentContentContext.Provider value={content}>
        <DndContext>
          <CaseTileTitleBar tile={tile} />
        </DndContext>
      </DocumentContentContext.Provider>
    )
  }

  const closeButton = () => screen.getByLabelText(t("DG.Component.closeComponent.toolTip"))

  // the component notices broadcast, as their values
  const componentNotices = (spy: jest.SpyInstance) => spy.mock.calls
    .map(([message]) => message)
    .filter(({ resource }) => resource === "component")
    .map(({ values }) => values)

  it("hides a case table when closed and sends V2's `DG.TableView` delete with the dataset's title", async () => {
    const user = userEvent.setup()
    const content = appState.document.content!
    content.createDataSet(getSnapshot(setupTestDataset().dataset))
    const sharedDataSet = getSharedDataSets(content)[0]
    sharedDataSet.dataSet.setTitle("Mammal Data")
    const tile = createOrShowTableOrCardForDataset(sharedDataSet, kCaseTableTileType)!
    const broadcastSpy = jest.spyOn(content, "broadcastMessage")
    renderTitleBar(content, tile)

    await user.click(closeButton())
    expect(content.isTileHidden(tile.id)).toBe(true)
    expect(componentNotices(broadcastSpy)).toEqual([{
      operation: "delete", type: "DG.TableView", diType: "caseTable", id: toV2Id(tile.id),
      name: tile.name, title: "Mammal Data"
    }])
    broadcastSpy.mockRestore()
  })

  it("sends V2's `create` when undo brings a closed case table back and `delete` again on redo", async () => {
    const user = userEvent.setup()
    const { document } = appState
    const content = document.content!
    content.createDataSet(getSnapshot(setupTestDataset({ datasetName: "undoClose" }).dataset))
    const sharedDataSet = getSharedDataSets(content).find(({ dataSet }) => dataSet.name === "undoClose")!
    sharedDataSet.dataSet.setTitle("Undo Close")
    const tile = createOrShowTableOrCardForDataset(sharedDataSet, kCaseTableTileType)!
    renderTitleBar(content, tile)
    document.treeMonitor!.enableMonitoring()
    const settled = () => when(() => (document.treeManagerAPI as TreeManagerType).activeHistoryEntries.length === 0)

    await user.click(closeButton())
    await settled()
    const broadcastSpy = jest.spyOn(content, "broadcastMessage")
    document.undoLastAction()
    await settled()
    expect(content.isTileHidden(tile.id)).toBe(false)
    expect(componentNotices(broadcastSpy)).toEqual([expect.objectContaining({
      operation: "create", type: "DG.TableView", id: toV2Id(tile.id), title: "Undo Close"
    })])
    broadcastSpy.mockClear()
    document.redoLastAction()
    await settled()
    expect(componentNotices(broadcastSpy)).toEqual([expect.objectContaining({
      operation: "delete", type: "DG.TableView", id: toV2Id(tile.id), title: "Undo Close"
    })])
    broadcastSpy.mockRestore()
    document.treeMonitor!.disableMonitoring()
  })

  it("sends nothing when closing leaves the case table on screen, as in the mosaic layout", async () => {
    const user = userEvent.setup()
    const document = createCodapDocument(undefined, { layout: "mosaic" })
    const content = document.content!
    const tile = content.insertTileSnapshotInDefaultRow({ content: { type: kCaseTableTileType } })!
    const broadcastSpy = jest.spyOn(content, "broadcastMessage")
    renderTitleBar(content, tile)

    await user.click(closeButton())
    expect(content.isTileHidden(tile.id)).toBe(false)
    expect(componentNotices(broadcastSpy)).toEqual([])
    broadcastSpy.mockRestore()
  })
})
