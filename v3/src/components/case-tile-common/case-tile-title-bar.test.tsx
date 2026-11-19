import { DndContext } from "@dnd-kit/core"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { getSnapshot } from "mobx-state-tree"
import { DocumentContentContext } from "../../hooks/use-document-content"
import { appState } from "../../models/app-state"
import { createCodapDocument } from "../../models/codap/create-codap-document"
import { IDocumentContentModel } from "../../models/document/document-content"
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
