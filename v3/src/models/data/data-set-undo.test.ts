import { when } from "mobx"
import { Instance } from "mobx-state-tree"
import { createCodapDocument } from "../codap/create-codap-document"
import { TreeManager } from "../history/tree-manager"
import { getSharedModelManager } from "../tiles/tile-environment"
import { SharedDataSet } from "../shared/shared-data-set"
import {
  removeCasesWithCustomUndoRedo, setAttributeFormulaWithCustomUndoRedo, setCaseValuesWithCustomUndoRedo
} from "./data-set-undo"

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
    data.addCases([{ __id__: "ITEM0", aId: 1, bId: 2 }])
    data.validateCases()
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
      () => setCaseValuesWithCustomUndoRedo(data, [{ __id__: "ITEM0", aId: 2, bId: 3 }]),
      { undoStringKey: "Undo edit value", redoStringKey: "Redo edit value" })
    expect(data.getItem("ITEM0")).toEqual({ __id__: "ITEM0", aId: 2, bId: 3 })

    await whenTreeManagerIsReady()

    expect(undoManager?.undoEntry?.clientData).toBeDefined()
    expect(undoManager?.redoEntry?.clientData).toBeUndefined()

    undoManager?.undo()
    expect(data.getItem("ITEM0")).toEqual({ __id__: "ITEM0", aId: 1, bId: 2 })
    expect(undoManager?.undoEntry?.clientData).toBeUndefined()
    expect(undoManager?.redoEntry?.clientData).toBeDefined()

    undoManager?.redo()
    expect(data.getItem("ITEM0")).toEqual({ __id__: "ITEM0", aId: 2, bId: 3 })
    expect(undoManager?.undoEntry?.clientData).toBeDefined()
    expect(undoManager?.redoEntry?.clientData).toBeUndefined()
  })

  it("can undo/redo inserting cases at the end", async () => {
    const { data, whenTreeManagerIsReady, undoManager } = setupDocument()

    expect(data.itemIds).toEqual(["ITEM0"])
    expect(data.itemInfoMap.size).toBe(1)

    data.applyModelChange(
      () => data.addCases([{ __id__: "ITEM1", aId: 3, bId: 4 }, { __id__: "ITEM2", aId: 5, bId: 6 }]),
      { undoStringKey: "Undo insert cases", redoStringKey: "Redo insert cases" })

    expect(data.itemIds).toEqual(["ITEM0", "ITEM1", "ITEM2"])
    expect(data.itemInfoMap.size).toBe(3)

    // wait for action to complete
    await whenTreeManagerIsReady()

    undoManager?.undo()

    // wait for undo to complete
    await whenTreeManagerIsReady()

    data.validateCases()
    expect(data.itemIds).toEqual(["ITEM0"])
    expect(data.itemInfoMap.size).toBe(1)

    undoManager?.redo()

    // wait for redo to complete
    await whenTreeManagerIsReady()

    data.validateCases()
    expect(data.itemIds).toEqual(["ITEM0", "ITEM1", "ITEM2"])
    expect(data.itemInfoMap.size).toBe(3)
    expect(data.getItem("ITEM0")).toEqual({ __id__: "ITEM0", aId: 1, bId: 2 })
    expect(data.getItem("ITEM1")).toEqual({ __id__: "ITEM1", aId: 3, bId: 4 })
    expect(data.getItem("ITEM2")).toEqual({ __id__: "ITEM2", aId: 5, bId: 6 })
  })

  it("can undo/redo inserting cases at the beginning", async () => {
    const { data, whenTreeManagerIsReady, undoManager } = setupDocument()

    expect(data.itemIds).toEqual(["ITEM0"])

    data.applyModelChange(
      () => data.addCases([{ __id__: "ITEM1", aId: 3, bId: 4 }, { __id__: "ITEM2", aId: 5, bId: 6 }],
                          { before: "ITEM0" }),
      { undoStringKey: "Undo insert cases", redoStringKey: "Redo insert cases" })

    expect(data.itemIds).toEqual(["ITEM1", "ITEM2", "ITEM0"])

    // wait for action to complete
    await whenTreeManagerIsReady()

    undoManager?.undo()

    // wait for undo to complete
    await whenTreeManagerIsReady()

    expect(data.itemIds).toEqual(["ITEM0"])

    undoManager?.redo()

    // wait for redo to complete
    await whenTreeManagerIsReady()

    expect(data.itemIds).toEqual(["ITEM1", "ITEM2", "ITEM0"])
    expect(data.getItem("ITEM0")).toEqual({ __id__: "ITEM0", aId: 1, bId: 2 })
    expect(data.getItem("ITEM1")).toEqual({ __id__: "ITEM1", aId: 3, bId: 4 })
    expect(data.getItem("ITEM2")).toEqual({ __id__: "ITEM2", aId: 5, bId: 6 })
  })

  it("can undo/redo deleting cases", async () => {
    const { data, whenTreeManagerIsReady, undoManager } = setupDocument()

    expect(data.itemIds).toEqual(["ITEM0"])

    data.applyModelChange(
      () => data.addCases([
        { __id__: "ITEM1", aId: 3, bId: 4 },
        { __id__: "ITEM2", aId: 5, bId: 6 },
        { __id__: "ITEM3", aId: 7, bId: 8 },
        { __id__: "ITEM4", aId: 9, bId: 10 },
        { __id__: "ITEM5", aId: 11, bId: 12 },
        { __id__: "ITEM6", aId: 13, bId: 14 },]),
      { undoStringKey: "Undo insert cases", redoStringKey: "Redo insert cases" })

    expect(data.itemIds).toEqual(["ITEM0", "ITEM1", "ITEM2", "ITEM3", "ITEM4", "ITEM5", "ITEM6"])

    removeCasesWithCustomUndoRedo(data, ["ITEM0", "ITEM2", "ITEM3", "ITEM4", "ITEM6"])

    // wait for action to complete
    await whenTreeManagerIsReady()

    expect(data.itemIds).toEqual(["ITEM1", "ITEM5"])

    undoManager?.undo()

    // wait for undo to complete
    await whenTreeManagerIsReady()

    expect(data.itemIds).toEqual(["ITEM0", "ITEM1", "ITEM2", "ITEM3", "ITEM4", "ITEM5", "ITEM6"])
    expect(data.getItem("ITEM0")).toEqual({ __id__: "ITEM0", aId: 1, bId: 2 })
    expect(data.getItem("ITEM2")).toEqual({ __id__: "ITEM2", aId: 5, bId: 6 })
    expect(data.getItem("ITEM4")).toEqual({ __id__: "ITEM4", aId: 9, bId: 10 })
    expect(data.getItem("ITEM6")).toEqual({ __id__: "ITEM6", aId: 13, bId: 14 })

    undoManager?.redo()

    // wait for redo to complete
    await whenTreeManagerIsReady()

    expect(data.itemIds).toEqual(["ITEM1", "ITEM5"])
  })

  it("can undo/redo setting a formula on an attribute without a formula", async () => {
    const { data, whenTreeManagerIsReady, undoManager } = setupDocument()

    const attr = data.attrFromID("aId")!
    expect(attr.hasFormula).toBe(false)
    expect(data.getItem("ITEM0")).toEqual({ __id__: "ITEM0", aId: 1, bId: 2 })

    data.applyModelChange(
      () => setAttributeFormulaWithCustomUndoRedo(data, attr, "b * 10"),
      { undoStringKey: "Undo edit formula", redoStringKey: "Redo edit formula" })

    expect(attr.hasFormula).toBe(true)
    expect(attr.formula!.display).toBe("b * 10")

    await whenTreeManagerIsReady()

    // custom undo/redo patch should be present
    expect(undoManager?.undoEntry?.customPatches?.length).toBe(1)

    undoManager?.undo()

    await whenTreeManagerIsReady()

    // formula should be removed and original values restored
    expect(attr.hasFormula).toBe(false)
    expect(data.getItem("ITEM0")).toEqual({ __id__: "ITEM0", aId: 1, bId: 2 })

    undoManager?.redo()

    await whenTreeManagerIsReady()

    // formula should be re-applied
    expect(attr.hasFormula).toBe(true)
    expect(attr.formula!.display).toBe("b * 10")
  })

  it("does not use custom undo/redo when changing an existing formula", async () => {
    const { data, whenTreeManagerIsReady, undoManager } = setupDocument()

    const attr = data.attrFromID("aId")!

    // first, set a formula
    data.applyModelChange(
      () => setAttributeFormulaWithCustomUndoRedo(data, attr, "b * 10"),
      { undoStringKey: "Undo edit formula", redoStringKey: "Redo edit formula" })

    await whenTreeManagerIsReady()

    expect(attr.formula!.display).toBe("b * 10")

    // now change the formula — should not generate a custom patch
    data.applyModelChange(
      () => setAttributeFormulaWithCustomUndoRedo(data, attr, "b * 20"),
      { undoStringKey: "Undo edit formula", redoStringKey: "Redo edit formula" })

    expect(attr.formula!.display).toBe("b * 20")

    await whenTreeManagerIsReady()

    // no custom undo/redo patch for formula-to-formula change
    expect(undoManager?.undoEntry?.customPatches).toBeUndefined()

    undoManager?.undo()

    await whenTreeManagerIsReady()

    // formula should revert to the previous formula
    expect(attr.hasFormula).toBe(true)
    expect(attr.formula!.display).toBe("b * 10")

    undoManager?.redo()

    await whenTreeManagerIsReady()

    expect(attr.formula!.display).toBe("b * 20")
  })

  it("does not use custom undo/redo when clearing a formula", async () => {
    const { data, whenTreeManagerIsReady, undoManager } = setupDocument()

    const attr = data.attrFromID("aId")!

    // first, set a formula
    data.applyModelChange(
      () => setAttributeFormulaWithCustomUndoRedo(data, attr, "b * 10"),
      { undoStringKey: "Undo edit formula", redoStringKey: "Redo edit formula" })

    await whenTreeManagerIsReady()

    expect(attr.hasFormula).toBe(true)

    // clear the formula — should not generate a custom patch
    data.applyModelChange(
      () => setAttributeFormulaWithCustomUndoRedo(data, attr, ""),
      { undoStringKey: "Undo edit formula", redoStringKey: "Redo edit formula" })

    expect(attr.hasFormula).toBe(false)

    await whenTreeManagerIsReady()

    // no custom undo/redo patch for clearing a formula
    expect(undoManager?.undoEntry?.customPatches).toBeUndefined()

    undoManager?.undo()

    await whenTreeManagerIsReady()

    // formula should be restored
    expect(attr.hasFormula).toBe(true)
    expect(attr.formula!.display).toBe("b * 10")
  })
})
