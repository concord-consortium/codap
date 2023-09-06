import { Instance } from "mobx-state-tree"
import { getRedoStringKey, getUndoStringKey } from "../history/undo-redo-string-registry"
import { createCodapDocument } from "../codap/create-codap-document"
import { getSharedModelManager } from "../tiles/tile-environment"
import { SharedDataSet } from "../shared/shared-data-set"
import "./data-set-undo"
import { TreeManager } from "../history/tree-manager"
import { when } from "mobx"

describe("DataSet undo/redo", () => {

  function setupDocument() {
    const document = createCodapDocument()
    const treeManager = document.treeManagerAPI as Instance<typeof TreeManager>
    const sharedModelManager = getSharedModelManager(document)
    const undoManager = document.treeManagerAPI?.undoManager
    const sharedDataSet = SharedDataSet.create()
    const data = sharedDataSet.dataSet
    data.addAttribute({ id: "aId", name: "a" })
    data.addAttribute({ id: "bId", name: "b" })
    data.addCases([{ __id__: "caseId", "aId": 1, "bId": 2 }])
    sharedModelManager?.addSharedModel(sharedDataSet)
    document.treeMonitor?.enableMonitoring()

    return { document, treeManager, sharedModelManager, undoManager, sharedDataSet, data }
  }

  it("registers undo strings", () => {
    expect(getUndoStringKey("foo")).toBe("DG.mainPage.mainPane.undoButton.toolTip")
    expect(getRedoStringKey("foo")).toBe("DG.mainPage.mainPane.redoButton.toolTip")

    expect(getUndoStringKey("DataSet.moveAttribute")).toBe("DG.Undo.dataContext.moveAttribute")
    expect(getRedoStringKey("DataSet.moveAttribute")).toBe("DG.Redo.dataContext.moveAttribute")
  })

  it("can undo/redo moving an attribute", async () => {
    const { data, treeManager, undoManager } = setupDocument()

    data.moveAttribute("bId", { before: "aId" })
    expect(data.attributes.map(attr => attr.name)).toEqual(["b", "a"])

    let timedOut = false
    try {
      await when(
        () => treeManager.activeHistoryEntries.length === 0,
        {timeout: 100})
    } catch (e) {
      timedOut = true
    }
    expect(timedOut).toBe(false)

    undoManager?.undo()
    expect(data.attributes.map(attr => attr.name)).toEqual(["a", "b"])

    undoManager?.redo()
    expect(data.attributes.map(attr => attr.name)).toEqual(["b", "a"])
  })

  it("can undo/redo setting case values", async () => {
    const { data, treeManager, undoManager } = setupDocument()

    data.setCaseValues([{ __id__: "caseId", "aId": 2, "bId": 3 }])
    expect(data.getCase("caseId")).toEqual({ __id__: "caseId", "aId": 2, "bId": 3 })

    let timedOut = false
    try {
      await when(
        () => treeManager.activeHistoryEntries.length === 0,
        {timeout: 100})
    } catch (e) {
      timedOut = true
    }
    expect(timedOut).toBe(false)

    undoManager?.undo()
    expect(data.getCase("caseId")).toEqual({ __id__: "caseId", "aId": 1, "bId": 2 })

    undoManager?.redo()
    expect(data.getCase("caseId")).toEqual({ __id__: "caseId", "aId": 2, "bId": 3 })
  })
})
