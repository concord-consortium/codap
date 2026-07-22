import { CloudFileManager } from "@concord-consortium/cloud-file-manager"
import { reaction } from "mobx"
import { getSnapshot } from "mobx-state-tree"
import { TreeManagerType } from "./history/tree-manager"
import { appState } from "./app-state"
import { isCodapDocument } from "./codap/create-codap-document"
import { DocumentModel } from "./document/document"
import { serializeDocument } from "./document/serialize-document"
import { featureFlagManager } from "./feature-flags/feature-flag-manager"

describe("AppState", () => {
  it("works when performance mode enabled", () => {
    const performanceReaction = jest.fn()
    reaction(() => appState.isPerformanceMode, () => performanceReaction())
    expect(performanceReaction).not.toHaveBeenCalled()
    appState.beginPerformance()
    expect(performanceReaction).toHaveBeenCalledTimes(1)
    appState.endPerformance()
    expect(performanceReaction).toHaveBeenCalledTimes(2)
  })

  it("works when performance mode disabled", () => {
    const performanceReaction = jest.fn()
    appState.disablePerformance()
    reaction(() => appState.isPerformanceMode, () => performanceReaction())
    expect(performanceReaction).not.toHaveBeenCalled()
    appState.beginPerformance()
    expect(performanceReaction).not.toHaveBeenCalled()
    appState.endPerformance()
    expect(performanceReaction).not.toHaveBeenCalled()
    appState.enablePerformance()
    appState.beginPerformance()
    expect(performanceReaction).toHaveBeenCalledTimes(1)
    appState.endPerformance()
    expect(performanceReaction).toHaveBeenCalledTimes(2)
  })

  it("returns de-serializable document snapshots", async () => {
    const snap = await appState.getDocumentSnapshot()
    const docModel = DocumentModel.create(isCodapDocument(snap) ? snap : { type: "CODAP" })
    const docSnap = await serializeDocument(docModel, doc => getSnapshot(doc))
    expect(docSnap).toEqual(snap)
  })

  describe("setDocument dirty-state cleanup", () => {
    afterEach(() => {
      jest.useRealTimers()
      appState.disableDocumentMonitoring()
    })

    it("clears the dirty state on the next tick after a load, even if post-load work mutates revisionId", async () => {
      jest.useFakeTimers()

      const dirty = jest.fn()
      const cfm = { client: { dirty } } as unknown as CloudFileManager
      appState.setCFM(cfm)

      await appState.setDocument({ type: "CODAP" })

      // Simulate post-load fixup work that changes revisionId — this is what
      // CODAP-1308 was reporting: the dirty reaction would interpret the
      // change as a user edit and mark the document "Unsaved".
      const treeManager = appState.document.treeManagerAPI as TreeManagerType
      treeManager.setRevisionId("post-load-id")
      expect(dirty).toHaveBeenCalledWith(true)

      // Run the deferred cleanup scheduled by setDocument's setTimeout(0).
      jest.runOnlyPendingTimers()

      // The baseline revisionId is restored and CFM is told the doc is clean.
      expect(treeManager.revisionId).toBe("")
      expect(dirty).toHaveBeenLastCalledWith(false)
    })
  })
})

describe("AppState feature flags", () => {
  it("grants the open document's feature flags", async () => {
    await appState.setDocument({
      type: "CODAP", key: "test-flags", content: { featureFlags: ["residualPlot"] }
    })
    expect(featureFlagManager.isFeatureEnabled("residualPlot")).toBe(true)
  })

  it("revokes grants when a document without them is opened", async () => {
    await appState.setDocument({
      type: "CODAP", key: "test-flags-2", content: { featureFlags: ["residualPlot"] }
    })
    await appState.setDocument({ type: "CODAP", key: "test-flags-3", content: {} })
    expect(featureFlagManager.isFeatureEnabled("residualPlot")).toBe(false)
  })
})
