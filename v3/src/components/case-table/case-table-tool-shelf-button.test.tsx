import { getSnapshot } from "mobx-state-tree"
import { appState } from "../../models/app-state"
import { setupTestDataset } from "../../test/dataset-test-utils"
import "../case-card/case-card-registration"
import "./case-table-registration"
import { openTableOrCardForDatasetWithNotifications } from "./case-table-tool-shelf-button"

// CODAP-1418: opening a case table for an existing dataset from the Tables menu must emit a
// component `create` notification (type 'table') when it creates a new tile, mirroring V2's
// `caseTable.open` command (apps/dg/controllers/app_controller.js:122). Plugins such as
// onboarding detect table creation via this notification; previously the open-existing path
// emitted only `open case table`, so the onboarding "make a table" task never completed.
describe("openTableOrCardForDatasetWithNotifications", () => {
  // appState.document is a singleton that persists across tests, so use distinct dataset names.
  const content = appState.document.content!

  const addDataset = (name: string) => {
    const { dataset } = setupTestDataset({ datasetName: name })
    return content.createDataSet(getSnapshot(dataset)).sharedDataSet
  }

  it("broadcasts a component 'create' notification when it creates a new table", () => {
    const sharedDataSet = addDataset("mammals1418")
    const broadcastSpy = jest.spyOn(content, "broadcastMessage")

    const tile = openTableOrCardForDatasetWithNotifications(sharedDataSet)
    expect(tile).toBeDefined()

    const createCall = broadcastSpy.mock.calls.find(([msg]: any[]) =>
      msg?.values?.operation === "create" && msg?.values?.type === "table"
    )
    expect(createCall).toBeDefined()
    // The V2-compat 'open case table' notification is also emitted.
    const openCall = broadcastSpy.mock.calls.find(([msg]: any[]) =>
      msg?.values?.operation === "open case table"
    )
    expect(openCall).toBeDefined()

    broadcastSpy.mockRestore()
  })

  it("does not broadcast a second 'create' when re-showing an existing table", () => {
    const sharedDataSet = addDataset("birds1418")
    // First open creates the table.
    openTableOrCardForDatasetWithNotifications(sharedDataSet)

    const broadcastSpy = jest.spyOn(content, "broadcastMessage")
    // Second open should re-show the existing tile, not create a new one.
    openTableOrCardForDatasetWithNotifications(sharedDataSet)

    const createCall = broadcastSpy.mock.calls.find(([msg]: any[]) =>
      msg?.values?.operation === "create"
    )
    expect(createCall).toBeUndefined()

    broadcastSpy.mockRestore()
  })
})
