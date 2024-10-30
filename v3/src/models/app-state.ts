/*
  AppState

  AppState is for application state that is not intended for serialization.
  It is currently used to support an `appMode` property which can be used to alter behavior
  in performance-critical contexts, e.g. during a drag. The properties of this class will
  generally be MobX-observable.
 */
import { cloneDeep } from "lodash"
import { action, computed, makeObservable, observable, reaction } from "mobx"
import { getSnapshot } from "mobx-state-tree"
import { CloudFileManager } from "@concord-consortium/cloud-file-manager"
import { createCodapDocument } from "./codap/create-codap-document"
import { gDataBroker } from "./data/data-broker"
import { IDocumentModel, IDocumentModelSnapshot } from "./document/document"
import { serializeDocument } from "./document/serialize-document"
import { ISharedDataSet, kSharedDataSetType, SharedDataSet } from "./shared/shared-data-set"
import { getSharedModelManager } from "./tiles/tile-environment"
import { Logger } from "../lib/logger"
import { t } from "../utilities/translation/translate"
import { DEBUG_DOCUMENT } from "../lib/debug"
import { TreeManagerType } from "./history/tree-manager"

type AppMode = "normal" | "performance"

class AppState {
  @observable
  private currentDocument: IDocumentModel

  @observable
  private appModeCount = 0

  // enables/disables performance mode globally, e.g. for a/b testing
  @observable
  private isPerformanceEnabled = true

  private version = ""
  private cfm: CloudFileManager | undefined
  private dirtyMonitorDisposer: (() => void) | undefined

  constructor() {
    this.currentDocument = createCodapDocument()
    if (DEBUG_DOCUMENT) {
      (window as any).currentDocument = this.currentDocument
    }

    makeObservable(this)
  }

  @computed
  get document() {
    return this.currentDocument
  }

  @computed
  private get treeManager() {
    // Internally we know our treeManagerAPI is really an instance of TreeManager.
    // And we don't have need to expose the revisionId to tiles.
    return this.document.treeManagerAPI as TreeManagerType | undefined
  }

  async getDocumentSnapshot() {
    // use cloneDeep because MST snapshots are immutable
    const snapshot = await serializeDocument(this.currentDocument, doc => cloneDeep(getSnapshot(doc)))
    const revisionId = this.treeManager?.revisionId
    if (revisionId) {
      return {
        revisionId: this.treeManager?.revisionId,
        ...snapshot
      }
    }

    return snapshot
  }

  setCFM(cfm: CloudFileManager) {
    this.cfm = cfm
  }

  @action
  setDocument(snap: IDocumentModelSnapshot & {revisionId?: string}, metadata?: Record<string, any>) {
    // stop monitoring changes for undo/redo on the existing document
    this.disableDocumentMonitoring()

    try {
      const document = createCodapDocument(snap)
      if (document) {
        this.currentDocument = document
        if (DEBUG_DOCUMENT) {
          (window as any).currentDocument = document
        }
        if (metadata) {
          const metadataEntries = Object.entries(metadata)
          metadataEntries.forEach(([key, value]) => {
            if (value != null) {
              this.currentDocument.setProperty(key, value)
            }
          })
        }
        const docTitle = this.currentDocument.getDocumentTitle()
        this.currentDocument.setTitle(docTitle || t("DG.Document.defaultDocumentName"))
        console.log("restoring revisionId", snap.revisionId)
        if (snap.revisionId && this.treeManager) {
          // Restore the revisionId from the stored document
          // This will allow us to consistently compare the local document
          // to the stored document.
          this.treeManager.setRevisionId(snap.revisionId)
        }

        // monitor document changes for undo/redo
        this.enableDocumentMonitoring()

        // update data broker with the new data sets
        const manager = getSharedModelManager(document)
        manager && gDataBroker.setSharedModelManager(manager)
        manager?.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType).forEach((model: ISharedDataSet) => {
          gDataBroker.addSharedDataSet(model)
        })
        Logger.updateDocument(document)
      }
    }
    catch (e) {
      console.error("Error loading document!", e)
    }
  }

  @action
  enableDocumentMonitoring() {
    this.currentDocument?.treeMonitor?.enableMonitoring()
    if (this.currentDocument && !this.dirtyMonitorDisposer) {
      this.dirtyMonitorDisposer = reaction(
        () => this.treeManager?.revisionId,
        () => {
          this.cfm?.client.dirty(true)
        }
      )
    }
  }

  @action
  disableDocumentMonitoring() {
    this.currentDocument?.treeMonitor?.disableMonitoring()
    this.dirtyMonitorDisposer?.()
    this.dirtyMonitorDisposer = undefined
  }

  @action
  enablePerformance() {
    this.isPerformanceEnabled = true
  }

  @action
  disablePerformance() {
    this.isPerformanceEnabled = false
  }

  setVersion(version: string) {
    this.version = version
  }

  getVersion() {
    return this.version
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
