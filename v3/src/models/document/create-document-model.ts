import { addDisposer, onAction } from "mobx-state-tree"
import { IDataSet as IFormulaDataSet } from "@concord-consortium/codap-formulas/models/data/data-set"
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
  sharedModelManager.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType)
    .forEach((model: ISharedDataSet) => formulaManager.addDataSet(model.dataSet as IFormulaDataSet))

  // configure logging
  fullEnvironment.log = function({ message, args, category }) {
    Logger.log(message, args, category)
  }

  // configure notifications
  fullEnvironment.notify = function(message, callback, targetTileId) {
    document.content?.broadcastMessage(message, callback, targetTileId)
  }

  historyService.setDependencies(fullEnvironment)

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
