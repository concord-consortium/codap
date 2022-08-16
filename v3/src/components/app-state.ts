/*
  AppState

  AppState is for application state that is not intended for serialization.
  It is currently used to support an `appMode` property which can be used to alter behavior
  in performance-critical contexts, e.g. during a drag. The properties of this class will
  generally be MobX-observable.
 */
import { action, computed, makeObservable, observable } from "mobx"

type AppMode = "normal" | "performance"

class AppState {
  @observable
  private appModeCount = 0

  // enables/disables performance mode globally, e.g. for a/b testing
  private isPerformanceEnabled = true

  constructor() {
    makeObservable(this)
  }

  enablePerformance() {
    this.isPerformanceEnabled = true
  }

  disablePerformance() {
    this.isPerformanceEnabled = false
  }

  @computed
  get appMode(): AppMode {
    return this.isPerformanceEnabled && (this.appModeCount > 0) ? "performance" : "normal"
  }

  get isPerformanceMode() {
    return this.appMode === "performance"
  }

  @action
  beginPerformance() {
    ++this.appModeCount
  }

  @action
  endPerformance() {
    --this.appModeCount
  }
}

export const appState = new AppState()
