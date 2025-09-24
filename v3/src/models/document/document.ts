import { addDisposer, applySnapshot, destroy, Instance, SnapshotIn, types } from "mobx-state-tree"
import { applyModelChange } from "../history/apply-model-change"
import { Tree } from "../history/tree"
import { TreeManager } from "../history/tree-manager"
import { TreeMonitor } from "../history/tree-monitor"
import { withoutUndo } from "../history/without-undo"
import { getSharedModelManager } from "../tiles/tile-environment"
import { ITileModel } from "../tiles/tile-model"
import { DocumentContentModel, IDocumentContentSnapshotIn } from "./document-content"
import { IDocumentProperties } from "./document-types"
import { ISharedModelDocumentManager } from "./shared-model-document-manager"
import { typedId } from "../../utilities/js-utils"
import { t } from "../../utilities/translation/translate"

export const DocumentModel = Tree.named("Document")
  .props({
    key: types.optional(types.identifier, () => typedId("DOC_")),
    type: types.string,
    version: types.maybe(types.string),
    build: types.maybe(types.string),
    createdAt: 0,       // remote documents fill this in when content is loaded
    properties: types.map(types.string),
    content: types.maybe(DocumentContentModel),
  })
  .volatile(self => ({
    treeMonitor: undefined as TreeMonitor | undefined,
    // This is in volatile because the CFM is the source of truth for the title.
    // Do not change this property directly, rename the file in the CFM instead.
    // The default value should match the MENUBAR.UNTITLED_DOCUMENT in the CFM. When a new
    // document is saved, the CFM will use its default title not this one. However we need a
    // default value to show in the browser window.
    title: t("DG.Document.defaultDocumentName")
  }))
  .views(self => ({
    // This is needed for the tree monitor and manager
    get treeId() {
      return self.key
    },
    get hasContent() {
      return !!self.content
    },
    getProperty(key: string) {
      return self.properties.get(key)
    },
    getNumericProperty(key: string) {
      const val = self.properties.get(key)
      return val != null ? Number(val) : 0
    },
    copyProperties(): IDocumentProperties {
      return self.properties.toJSON()
    },
    getDocumentTitle() {
      return self.properties.get("filename")?.split(".")[0]
    },
    get canUndo() {
      return !!self.treeManagerAPI?.undoManager.canUndo
    },
    get canRedo() {
      return !!self.treeManagerAPI?.undoManager.canRedo
    }
  }))
  // performs the specified action so that response actions are included and undo/redo strings assigned
  .actions(applyModelChange)
  .actions((self) => ({
    afterCreate() {
      // TODO: it would be nice to unify this with the code in createDocumentModel
      const manager = TreeManager.create({document: {}, undoStore: {}})
      self.treeManagerAPI = manager
      self.treeMonitor = new TreeMonitor(self, manager, false)
      manager.setMainDocument(self)
      // Clean up the manager when this document is destroyed this doesn't
      // happen automatically because the manager is stored in volatile state.
      // The manager needs to be destroyed so it can unsubscribe from firestore.
      // Destroying it will probably also free up memory
      addDisposer(self, () => destroy(manager))
    },
    prepareSnapshot() {
      return self.content?.prepareSnapshot()
    },
    completeSnapshot() {
      self.content?.completeSnapshot()
    },
    undoLastAction() {
      if (self.canUndo) {
        withoutUndo()
        self.treeManagerAPI?.undoManager.undo()
      }
    },
    redoLastAction() {
      if (self.canRedo) {
        withoutUndo()
        self.treeManagerAPI?.undoManager.redo()
      }
    },

    setCreatedAt(createdAt: number) {
      self.createdAt = createdAt
    },

    setTitleFromFilename(filename: string) {
      // This will be called when the file is loaded, saved, or renamed by the CFM
      self.title = filename.split(".")[0]
    },

    setProperty(key: string, value?: string) {
      if (value == null) {
        self.properties.delete(key)
      }
      else if (self.getProperty(key) !== value) {
        self.properties.set(key, value)
      }
    },
    setNumericProperty(key: string, value?: number) {
      this.setProperty(key, value == null ? value : `${value}`)
    },

    setContent(snapshot: IDocumentContentSnapshotIn) {
      if (self.content) {
        applySnapshot(self.content, snapshot)
        // TODO: should we run afterApplySnapshot here?
      }
      else {
        self.content = DocumentContentModel.create(snapshot)
        const sharedModelManager = getSharedModelManager(self)
        ;(sharedModelManager as ISharedModelDocumentManager)?.setDocument(self.content)
      }
    },

    addTile(tile: ITileModel) {
      return self.content?.insertTileInDefaultRow(tile)
    },

    deleteTile(tileId: string) {
      self.content?.deleteTile(tileId)
    },
  }))
export interface IDocumentModel extends Instance<typeof DocumentModel> {}
export interface IDocumentModelSnapshot extends SnapshotIn<typeof DocumentModel> {}
