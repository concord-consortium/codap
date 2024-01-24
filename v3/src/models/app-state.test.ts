import { reaction } from "mobx"
import { getSnapshot } from "mobx-state-tree"
import { appState } from "./app-state"
import { DocumentModel } from "./document/document"
import { serializeDocument } from "./document/serialize-document"

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

  it("returns de-serializable document snapshots", () => {
    const snap = appState.getDocumentSnapshot()
    const docModel = DocumentModel.create(snap)
    const docSnap = serializeDocument(docModel, doc => getSnapshot(doc))
    expect(docSnap).toEqual(snap)
  })
})
