import { when } from "mobx"
import { Instance } from "mobx-state-tree"
import { createCodapDocument } from "../codap/create-codap-document"
import { createDataSet } from "../data/data-set-conversion"
import { AttributeFormulaAdapter } from "../formula/attribute-formula-adapter"
import { FormulaManager } from "../formula/formula-manager"
import { TreeManager } from "../history/tree-manager"
import { kSharedDataSetType, SharedDataSet } from "../shared/shared-data-set"
import { getFormulaManager, getSharedModelManager } from "../tiles/tile-environment"

// register the attribute formula adapter so createFormulaAdapters() installs it
// (in the app this happens via app.tsx)
beforeAll(() => {
  AttributeFormulaAdapter.register()
})

// safety net: restore any console spy even if a test fails before restoring it itself
afterEach(() => {
  jest.restoreAllMocks()
})

// CODAP-1348: The FormulaManager only computes formulas for datasets in its `dataSets`
// registry. Datasets can be added to a document after it is created by paths that bypass
// the explicit addDataSet() calls -- notably applySnapshot() when a Story Builder "moment"
// is restored, and undo of a dataset deletion. createDocumentModel installs a reaction that
// keeps the registry in sync with the document's shared datasets, so formula attributes in
// such datasets are recomputed (Story Builder restore) and stay live (undo).

describe("createDocumentModel formula manager dataset sync (CODAP-1348)", () => {

  // The formula adapters are installed asynchronously (via setTimeout) by createDocumentModel.
  async function flushFormulaAdapters(formulaManager: FormulaManager) {
    await when(() => formulaManager.areAdaptersInitialized, { timeout: 1000 })
  }

  // wait for any pending action/undo/redo to be processed by the tree manager
  async function whenTreeManagerIsReady(treeManager: Instance<typeof TreeManager>) {
    await when(() => treeManager.activeHistoryEntries.length === 0, { timeout: 1000 })
  }

  // a shared dataset with a `double` attribute computed by the formula `x * 2`
  function makeSharedDataSetWithFormula() {
    const data = createDataSet({
      attributes: [
        { id: "xId", name: "x" },
        { id: "doubleId", name: "double", formula: { display: "x * 2" } }
      ]
    })
    data.addCases([{ __id__: "c1", xId: 5 }])
    data.validateCases()
    const sharedDataSet = SharedDataSet.create()
    sharedDataSet.setDataSet(data)
    return { sharedDataSet, data }
  }

  it("computes formula attributes for a dataset added to the document after creation", async () => {
    const document = createCodapDocument()
    const formulaManager = getFormulaManager(document) as FormulaManager
    await flushFormulaAdapters(formulaManager)
    const sharedModelManager = getSharedModelManager(document)!

    // add a shared dataset directly, without an explicit formulaManager.addDataSet() call
    // (this is how applySnapshot adds a dataset when restoring a Story Builder moment)
    const { sharedDataSet, data } = makeSharedDataSetWithFormula()
    sharedModelManager.addSharedModel(sharedDataSet)

    expect(formulaManager.dataSets.has(data.id)).toBe(true)
    expect(data.getNumeric("c1", "doubleId")).toBe(10)
  })

  it("keeps formula attributes live after a dataset deletion is undone", async () => {
    const document = createCodapDocument()
    const formulaManager = getFormulaManager(document) as FormulaManager
    await flushFormulaAdapters(formulaManager)
    const sharedModelManager = getSharedModelManager(document)!
    const treeManager = document.treeManagerAPI as Instance<typeof TreeManager>
    const undoManager = document.treeManagerAPI?.undoManager

    const { sharedDataSet, data } = makeSharedDataSetWithFormula()
    const dataSetId = data.id
    sharedModelManager.addSharedModel(sharedDataSet)
    expect(data.getNumeric("c1", "doubleId")).toBe(10)

    document.treeMonitor?.enableMonitoring()

    // Delete the dataset. Removing a shared model emits one expected warning -- the
    // shared-model change handler runs for the entry that was just removed and can't
    // resolve it. Capture and assert it so the passing test stays silent while any other
    // (unexpected) warning would still surface.
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined)
    document.applyModelChange(
      () => sharedModelManager.removeSharedModel(dataSetId),
      { undoStringKey: "Undo delete dataset", redoStringKey: "Redo delete dataset" }
    )
    await whenTreeManagerIsReady(treeManager)
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledWith(
      "Tree.handleSharedModelChanges failed to find model at:",
      expect.stringContaining("/content/sharedModelMap/")
    )
    warnSpy.mockRestore()
    expect(sharedModelManager.getSharedModelsByType(kSharedDataSetType).length).toBe(0)

    // undo the deletion
    undoManager?.undo()
    await whenTreeManagerIsReady(treeManager)
    const restored = sharedModelManager.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType)[0]
    expect(restored).toBeDefined()

    // the re-created dataset must be re-registered with the formula manager so its formula
    // attribute stays live and recomputes when a dependency changes
    expect(formulaManager.dataSets.has(restored.dataSet.id)).toBe(true)
    document.applyModelChange(
      () => restored.dataSet.setCaseValues([{ __id__: "c1", xId: 7 }]),
      { undoStringKey: "Undo edit value", redoStringKey: "Redo edit value" }
    )
    expect(restored.dataSet.getNumeric("c1", "doubleId")).toBe(14)
  })
})
