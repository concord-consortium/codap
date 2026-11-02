import { comparer, reaction } from "mobx"
import { addDisposer, onAction } from "mobx-state-tree"
import { Logger } from "../../lib/logger"
import { createFormulaAdapters } from "../formula/formula-adapter-registry"
import { FormulaManager } from "../formula/formula-manager"
import { ISharedDataSet, SharedDataSet, kSharedDataSetType } from "../shared/shared-data-set"
import { ITileEnvironment } from "../tiles/tile-environment"
import { DocumentModel, IDocumentModelSnapshot } from "./document"
import { IDocumentEnvironment } from "./document-environment"
import { SharedModelDocumentManager } from "./shared-model-document-manager"
import { AppHistoryService } from "../history/app-history-service"
import { IHistoryServiceEnv } from "../history/history-service"

/**
 * Create a DocumentModel and add a new sharedModelManager into its environment
 *
 * @param snapshot
 * @returns
 */
export const createDocumentModel = (snapshot?: IDocumentModelSnapshot) => {
  const sharedModelManager = new SharedModelDocumentManager()
  const formulaManager = new FormulaManager()
  const adapterApi = formulaManager.getAdapterApi()
  const historyService = new AppHistoryService()
  const fullEnvironment: ITileEnvironment & IHistoryServiceEnv & {documentEnv: IDocumentEnvironment} = {
    sharedModelManager,
    formulaManager,
    historyService,
    documentEnv: {}
  }

  const document = DocumentModel.create(snapshot, fullEnvironment)

  // initialize formula adapters after the document has been created
  setTimeout(() => formulaManager.addAdapters(createFormulaAdapters(adapterApi)))

  addDisposer(document, onAction(document, (call) => {
    if (!document.content || !call.path?.match(/\/content\/tileMap\//)) {
      return
    }
    const tileTypeId = call.path?.match(/\/content\/tileMap\/([^/]*)/)?.[1]
    if (tileTypeId) {
      const tile = document.content.tileMap.get(tileTypeId)
      tile?.onTileAction(call)
    }
  }))
  if (document.content) {
    sharedModelManager.setDocument(document.content)
  }

  // Keep the formula manager's set of datasets synchronized with the document's shared
  // datasets. A reaction (rather than a one-time registration) is required because
  // datasets can be added to the document after creation by paths that bypass the
  // explicit formulaManager.addDataSet() calls -- notably applySnapshot() when a Story
  // Builder "moment" is restored, and undo of a dataset deletion. An unregistered dataset
  // is invisible to the formula adapters, so its formula attributes are never recomputed:
  // after a moment restore they come back empty (the values are not serialized), and after
  // an undo the formula is left stale (CODAP-1348). Dataset removal is handled by a
  // disposer installed by addDataSet().
  addDisposer(document, reaction(
    () => sharedModelManager.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType)
            .map((model: ISharedDataSet) => model.dataSet),
    dataSets => dataSets.forEach(dataSet => formulaManager.addDataSet(dataSet)),
    { name: "createDocumentModel.syncFormulaManagerDataSets", equals: comparer.shallow, fireImmediately: true }
  ))

  // configure logging
  fullEnvironment.log = function({ message, args, category }) {
    Logger.log(message, args, category)
  }

  // configure notifications
  fullEnvironment.notify = function(message, callback, targetTileId, excludeTileId) {
    document.content?.broadcastMessage(message, callback, targetTileId, excludeTileId)
  }

  historyService.setDependencies(fullEnvironment)

  // Notify plugins of changes to the undo history, as V2 does (undo_history.js on master):
  // - each undoable action sends `clearRedo` on `undoChangeNotice`, even when the redo stack was
  //   already empty, with `canUndo`/`canRedo` after the action is added (:109-111, :366-370). This
  //   is how a plugin with its own undo/redo buttons learns that undo became possible.
  // - each undo or redo sends `undo` or `redo` on `document` (:160-167, :215-222). V3 adds
  //   `canUndo`/`canRedo`, so such a plugin can keep its buttons in step.
  // V2 also sent `clearUndo` with `clearRedo` when a change that could not be undone erased the
  // history. V3 never erases the history, so it never sends them for that.
  document.treeManagerAPI?.undoManager.setHistoryListener(change => {
    const { canUndo, canRedo } = document
    if (change === "add") {
      document.content?.broadcastMessage({
        action: "notify",
        resource: "undoChangeNotice",
        values: { operation: "clearRedo", canUndo, canRedo }
      }, () => {})
    } else if (change === "undo") {
      document.content?.broadcastMessage({
        action: "notify",
        resource: "document",
        values: { operation: "undo", canUndo, canRedo }
      }, () => {})
    } else {
      document.content?.broadcastMessage({
        action: "notify",
        resource: "document",
        values: { operation: "redo", canUndo, canRedo }
      }, () => {})
    }
  })

  // In CLUE we handled exceptions thrown by DocumentModel.create and returned a document
  // with a contentError property. This way the document object would be treated like any
  // other document and when it was rendered it would show the error message instead of
  // the document content

  // In CODAP we just let the exception be thrown. It is caught higher in the stack and
  // the user is informed of the error in a dialog. Details of the error will be available
  // in the console. In the future we might want to include the `e.message` in some details
  // of the error dialog. This will help with bug reports

  return document
}
