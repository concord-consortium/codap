import { addDisposer, applySnapshot, destroy, Instance, SnapshotIn, types } from "mobx-state-tree"
import { applyUndoableAction } from "../history/apply-undoable-action"
import { Tree } from "../history/tree"
import { TreeManager } from "../history/tree-manager"
import { TreeMonitor } from "../history/tree-monitor"
import { withoutUndo } from "../history/without-undo"
import { getSharedModelManager } from "../tiles/tile-environment"
import { ITileModel } from "../tiles/tile-model"
import { DocumentContentModel, IDocumentContentSnapshotIn } from "./document-content"
import { IDocumentMetadata } from "./document-metadata"
import { IDocumentProperties } from "./document-types"
import { ISharedModelDocumentManager } from "./shared-model-document-manager"
import { typedId } from "../../utilities/js-utils"

export const DocumentModel = Tree.named("Document")
  .props({
    key: types.optional(types.identifier, () => typedId("DOC_")),
    type: types.string,
    version: types.maybe(types.string),
    build: types.maybe(types.string),
    createdAt: 0,       // remote documents fill this in when content is loaded
    title: types.maybe(types.string),
    properties: types.map(types.string),
    content: types.maybe(DocumentContentModel),
    changeCount: 0
  })
  .volatile(self => ({
    treeMonitor: undefined as TreeMonitor | undefined
  }))
  .views(self => ({
    // This is needed for the tree monitor and manager
    get treeId() {
      return self.key
    },
    get hasContent() {
      return !!self.content
    },
    get metadata(): IDocumentMetadata {
      const { key, type, createdAt, title, properties } = self
      return { key, type, createdAt, title, properties: properties.toJSON() }
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
    get canUndo() {
      return !!self.treeManagerAPI?.undoManager.canUndo
    },
    get canRedo() {
      return !!self.treeManagerAPI?.undoManager.canRedo
    }
  }))
  // performs the specified action so that response actions are included and undo/redo strings assigned
  .actions(applyUndoableAction)
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
    async prepareSnapshot() {
      await self.content?.prepareSnapshot()
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

    setTitle(title: string) {
      self.title = title
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

    incChangeCount() {
      return ++self.changeCount
    }
  }))
export interface IDocumentModel extends Instance<typeof DocumentModel> {}
export interface IDocumentModelSnapshot extends SnapshotIn<typeof DocumentModel> {}
