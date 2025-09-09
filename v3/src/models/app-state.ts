/*
  AppState

  AppState is for application state that is not intended for serialization.
  It is currently used to support an `appMode` property which can be used to alter behavior
  in performance-critical contexts, e.g. during a drag. The properties of this class will
  generally be MobX-observable.
 */
import { CloudFileManager } from "@concord-consortium/cloud-file-manager"
import { action, autorun, computed, makeObservable, observable, reaction, flow } from "mobx"
import { destroy, getSnapshot } from "mobx-state-tree"
import { DEBUG_DOCUMENT } from "../lib/debug"
import { Logger } from "../lib/logger"
import { t } from "../utilities/translation/translate"
import { CodapV2Document } from "../v2/codap-v2-document"
import { isCodapV2Document } from "../v2/codap-v2-types"
import { importV2Document } from "../v2/import-v2-document"
import { createCodapDocument } from "./codap/create-codap-document"
import { gDataBroker } from "./data/data-broker"
import { IDocumentModel } from "./document/document"
import {
  ISerializedDocument, ISerializedV3Document, serializeCodapDocument, serializeDocument
} from "./document/serialize-document"
import { TreeManagerType } from "./history/tree-manager"
import { ISharedDataSet, kSharedDataSetType, SharedDataSet } from "./shared/shared-data-set"
import { getSharedModelManager } from "./tiles/tile-environment"

const kAppName = "CODAP"

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
  private titleMonitorDisposer: (() => void) | undefined

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

  alert(message: string, title: string | undefined, callback?: () => void) {
    this.cfm?.client.alert(message, title, callback)
  }

  /**
   * Check if this revisionId is the same as the current document's revisionId
   *
   * @param revisionId required but can be undefined
   * @returns
   */
  isCurrentRevision(revisionId: string | undefined) {
    return revisionId === this.treeManager?.revisionId
  }

  async getDocumentSnapshot(): Promise<ISerializedDocument> {
    const snapshot = await serializeCodapDocument(this.currentDocument)
    const revisionId = this.treeManager?.revisionId
    if (revisionId) {
      snapshot.revisionId = revisionId
    }

    return snapshot
  }

  setCFM(cfm: CloudFileManager) {
    this.cfm = cfm
  }

  @flow
  *setDocument(snap: ISerializedDocument, metadata?: Record<string, any>) {
    // stop monitoring changes for undo/redo on the existing document
    this.disableDocumentMonitoring()

    let content: ISerializedV3Document
    if (isCodapV2Document(snap)) {
      const v2Document = new CodapV2Document(snap, metadata)
      const v3Document = importV2Document(v2Document)

      // We serialize the v3 document to enforce the idea that the conversion process
      // needs to result in a basic javascript object. This prevents the import process
      // from accidentally setting up something in the v3 document that doesn't serialize.
      content = yield serializeDocument(v3Document, doc => getSnapshot(doc))
      // destroy the document once we've retrieved the snapshot
      destroy(v3Document)
    } else {
      content = snap
    }

    const document = createCodapDocument(content)
    if (document) {
      this.currentDocument = document
      if (DEBUG_DOCUMENT) {
        (window as any).currentDocument = document
      }
      if (metadata) {
        const metadataEntries = Object.entries(metadata)
        metadataEntries.forEach(([key, value]) => {
          if (value == null) return

          if (key === "filename") {
            // We don't save the filename because it is redundant with the filename in the actual
            // filesystem.
            // However we need the extension-less name for the window title.
            // The CFM also expects the document to have a name field when the document
            // is loaded from a filesystem that doesn't use filenames.
            this.currentDocument.setTitleFromFilename(value)
          } else {
            this.currentDocument.setProperty(key, value)
          }
        })
      }
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

  @action
  enableDocumentMonitoring() {
    if (!this.currentDocument) return

    this.currentDocument.treeMonitor?.enableMonitoring()
    if (!this.dirtyMonitorDisposer) {
      this.dirtyMonitorDisposer = reaction(
        () => this.treeManager?.revisionId,
        () => {
          this.cfm?.client.dirty(true)
        }
      )
    }

    // TODO: look for tests of opening documents so we can update them to check
    // the title
    if (!this.titleMonitorDisposer) {
      this.titleMonitorDisposer = autorun(() => {
        const { title } = this.currentDocument

        // TODO: handle componentMode and embeddedMode
        // if ((DG.get('componentMode') === 'yes') || (DG.get('embeddedMode') === 'yes')) {
        //   return;
        // }

        const titleString = t("DG.main.page.title", {vars: [title, kAppName]})
        window.document.title = titleString
      })
    }
  }

  @action
  disableDocumentMonitoring() {
    this.currentDocument?.treeMonitor?.disableMonitoring()
    this.dirtyMonitorDisposer?.()
    this.dirtyMonitorDisposer = undefined
    this.titleMonitorDisposer?.()
    this.titleMonitorDisposer = undefined
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
