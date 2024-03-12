/*
  AppState

  AppState is for application state that is not intended for serialization.
  It is currently used to support an `appMode` property which can be used to alter behavior
  in performance-critical contexts, e.g. during a drag. The properties of this class will
  generally be MobX-observable.
 */
import { action, computed, makeObservable, observable } from "mobx"
import { getSnapshot } from "mobx-state-tree"
import { createCodapDocument } from "./codap/create-codap-document"
import { gDataBroker } from "./data/data-broker"
import { IDocumentModel, IDocumentModelSnapshot } from "./document/document"
import { serializeDocument } from "./document/serialize-document"
import { ISharedDataSet, kSharedDataSetType, SharedDataSet } from "./shared/shared-data-set"
import { getSharedModelManager } from "./tiles/tile-environment"

type AppMode = "normal" | "performance"

class AppState {
  @observable
  private currentDocument: IDocumentModel

  @observable
  private appModeCount = 0

  // enables/disables performance mode globally, e.g. for a/b testing
  @observable
  private isPerformanceEnabled = true

  constructor() {
    this.currentDocument = createCodapDocument()

    makeObservable(this)
  }

  @computed
  get document() {
    return this.currentDocument
  }

  async getDocumentSnapshot() {
    return await serializeDocument(this.currentDocument, doc => getSnapshot(doc))
  }

  @action
  setDocument(snap: IDocumentModelSnapshot) {
    // stop monitoring changes for undo/redo on the existing document
    this.disableUndoRedoMonitoring()

    try {
      const document = createCodapDocument(snap)
      if (document) {
        this.currentDocument = document
        // monitor document changes for undo/redo
        this.enableUndoRedoMonitoring()

        // update data broker with the new data sets
        const manager = getSharedModelManager(document)
        manager && gDataBroker.setSharedModelManager(manager)
        manager?.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType).forEach((model: ISharedDataSet) => {
          gDataBroker.addSharedDataSet(model)
        })
      }
    }
    catch (e) {
      console.error("Error loading document!")
    }
  }

  @action
  enableUndoRedoMonitoring() {
    this.currentDocument?.treeMonitor?.enableMonitoring()
  }

  @action
  disableUndoRedoMonitoring() {
    this.currentDocument?.treeMonitor?.disableMonitoring()
  }

  @action
  enablePerformance() {
    this.isPerformanceEnabled = true
  }

  @action
  disablePerformance() {
    this.isPerformanceEnabled = false
  }

  @computed
  get appMode(): AppMode {
    return this.isPerformanceEnabled && (this.appModeCount > 0) ? "performance" : "normal"
  }

  @computed
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
