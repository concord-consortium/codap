import { reaction } from "mobx"
import { appState } from "./app-state"

describe("AppState", () => {
  it("works when enabled", () => {
    const performanceReaction = jest.fn()
    reaction(() => appState.isPerformanceMode, () => performanceReaction())
    expect(performanceReaction).not.toHaveBeenCalled()
    appState.beginPerformance()
    expect(performanceReaction).toHaveBeenCalledTimes(1)
    appState.endPerformance()
    expect(performanceReaction).toHaveBeenCalledTimes(2)
  })

  it("works when disabled", () => {
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
})
