import { when } from "mobx"
import { Instance } from "mobx-state-tree"
import { createCodapDocument } from "../codap/create-codap-document"
import { TreeManager } from "../history/tree-manager"
import { getSharedModelManager } from "../tiles/tile-environment"
import { SharedDataSet } from "../shared/shared-data-set"
import { removeCasesWithCustomUndoRedo } from "./data-set-undo"

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
    data.addCases([{ __id__: "case0", aId: 1, bId: 2 }])
    sharedModelManager?.addSharedModel(sharedDataSet)
    document.treeMonitor?.enableMonitoring()

    async function whenTreeManagerIsReady() {
      // wait for action/undo/redo to complete
      let timedOut = false
      try {
        await when(() => treeManager.activeHistoryEntries.length === 0, {timeout: 100})
      } catch (e) {
        timedOut = true
      }
      expect(timedOut).toBe(false)
      return timedOut
    }

    return { document, treeManager, whenTreeManagerIsReady, sharedModelManager, undoManager, sharedDataSet, data }
  }

  it("can undo/redo moving an attribute", async () => {
    const { data, whenTreeManagerIsReady, undoManager } = setupDocument()

    data.applyModelChange(
      () => data.moveAttribute("bId", { before: "aId" }),
      { undoStringKey: "Undo move attribute", redoStringKey: "Redo move attribute" })

    expect(data.attributes.map(attr => attr.name)).toEqual(["b", "a"])

    // wait for action to complete
    await whenTreeManagerIsReady()

    undoManager?.undo()

    // wait for undo to complete
    await whenTreeManagerIsReady()

    expect(data.attributes.map(attr => attr.name)).toEqual(["a", "b"])

    undoManager?.redo()

    // wait for redo to complete
    await whenTreeManagerIsReady()

    expect(data.attributes.map(attr => attr.name)).toEqual(["b", "a"])
  })

  it("can undo/redo setting case values", async () => {
    const { data, whenTreeManagerIsReady, undoManager } = setupDocument()

    data.applyModelChange(
      () => data.setCaseValues([{ __id__: "case0", aId: 2, bId: 3 }]),
      { undoStringKey: "Undo edit value", redoStringKey: "Redo edit value" })
    expect(data.getItem("case0")).toEqual({ __id__: "case0", aId: 2, bId: 3 })

    await whenTreeManagerIsReady()

    expect(undoManager?.undoEntry?.clientData).toBeDefined()
    expect(undoManager?.redoEntry?.clientData).toBeUndefined()

    undoManager?.undo()
    expect(data.getItem("case0")).toEqual({ __id__: "case0", aId: 1, bId: 2 })
    expect(undoManager?.undoEntry?.clientData).toBeUndefined()
    expect(undoManager?.redoEntry?.clientData).toBeDefined()

    undoManager?.redo()
    expect(data.getItem("case0")).toEqual({ __id__: "case0", aId: 2, bId: 3 })
    expect(undoManager?.undoEntry?.clientData).toBeDefined()
    expect(undoManager?.redoEntry?.clientData).toBeUndefined()
  })

  it("can undo/redo inserting cases at the end", async () => {
    const { data, whenTreeManagerIsReady, undoManager } = setupDocument()

    expect(data.itemIds).toEqual(["case0"])

    data.applyModelChange(
      () => data.addCases([{ __id__: "case1", aId: 3, bId: 4 }, { __id__: "case2", aId: 5, bId: 6 }]),
      { undoStringKey: "Undo insert cases", redoStringKey: "Redo insert cases" })

    expect(data.itemIds).toEqual(["case0", "case1", "case2"])

    // wait for action to complete
    await whenTreeManagerIsReady()

    undoManager?.undo()

    // wait for undo to complete
    await whenTreeManagerIsReady()

    expect(data.itemIds).toEqual(["case0"])

    undoManager?.redo()

    // wait for redo to complete
    await whenTreeManagerIsReady()

    expect(data.itemIds).toEqual(["case0", "case1", "case2"])
    expect(data.getItem("case0")).toEqual({ __id__: "case0", aId: 1, bId: 2 })
    expect(data.getItem("case1")).toEqual({ __id__: "case1", aId: 3, bId: 4 })
    expect(data.getItem("case2")).toEqual({ __id__: "case2", aId: 5, bId: 6 })
  })

  it("can undo/redo inserting cases at the beginning", async () => {
    const { data, whenTreeManagerIsReady, undoManager } = setupDocument()

    expect(data.itemIds).toEqual(["case0"])

    data.applyModelChange(
      () => data.addCases([{ __id__: "case1", aId: 3, bId: 4 }, { __id__: "case2", aId: 5, bId: 6 }],
                          { before: "case0" }),
      { undoStringKey: "Undo insert cases", redoStringKey: "Redo insert cases" })

    expect(data.itemIds).toEqual(["case1", "case2", "case0"])

    // wait for action to complete
    await whenTreeManagerIsReady()

    undoManager?.undo()

    // wait for undo to complete
    await whenTreeManagerIsReady()

    expect(data.itemIds).toEqual(["case0"])

    undoManager?.redo()

    // wait for redo to complete
    await whenTreeManagerIsReady()

    expect(data.itemIds).toEqual(["case1", "case2", "case0"])
    expect(data.getItem("case0")).toEqual({ __id__: "case0", aId: 1, bId: 2 })
    expect(data.getItem("case1")).toEqual({ __id__: "case1", aId: 3, bId: 4 })
    expect(data.getItem("case2")).toEqual({ __id__: "case2", aId: 5, bId: 6 })
  })

  it("can undo/redo deleting cases", async () => {
    const { data, whenTreeManagerIsReady, undoManager } = setupDocument()

    expect(data.itemIds).toEqual(["case0"])

    data.applyModelChange(
      () => data.addCases([
        { __id__: "case1", aId: 3, bId: 4 },
        { __id__: "case2", aId: 5, bId: 6 },
        { __id__: "case3", aId: 7, bId: 8 },
        { __id__: "case4", aId: 9, bId: 10 },
        { __id__: "case5", aId: 11, bId: 12 },
        { __id__: "case6", aId: 13, bId: 14 },]),
      { undoStringKey: "Undo insert cases", redoStringKey: "Redo insert cases" })

    expect(data.itemIds).toEqual(["case0", "case1", "case2", "case3", "case4", "case5", "case6"])

    removeCasesWithCustomUndoRedo(data, ["case0", "case2", "case3", "case4", "case6"])

    // wait for action to complete
    await whenTreeManagerIsReady()

    expect(data.itemIds).toEqual(["case1", "case5"])

    undoManager?.undo()

    // wait for undo to complete
    await whenTreeManagerIsReady()

    expect(data.itemIds).toEqual(["case0", "case1", "case2", "case3", "case4", "case5", "case6"])
    expect(data.getItem("case0")).toEqual({ __id__: "case0", aId: 1, bId: 2 })
    expect(data.getItem("case2")).toEqual({ __id__: "case2", aId: 5, bId: 6 })
    expect(data.getItem("case4")).toEqual({ __id__: "case4", aId: 9, bId: 10 })
    expect(data.getItem("case6")).toEqual({ __id__: "case6", aId: 13, bId: 14 })

    undoManager?.redo()

    // wait for redo to complete
    await whenTreeManagerIsReady()

    expect(data.itemIds).toEqual(["case1", "case5"])
  })
})
