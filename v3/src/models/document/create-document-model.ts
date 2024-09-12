import iframePhone from "iframe-phone"
import { addDisposer, onAction } from "mobx-state-tree"
import { DIMessage } from "../../data-interactive/iframe-phone-types"
import { ILogMessage } from "../../lib/log-message"
import { Logger } from "../../lib/logger"
import { ITileEnvironment } from "../tiles/tile-environment"
import { DocumentModel, IDocumentModelSnapshot } from "./document"
import { IDocumentEnvironment } from "./document-environment"
import { SharedModelDocumentManager } from "./shared-model-document-manager"
import { FormulaManager } from "../formula/formula-manager"
import { AttributeFormulaAdapter } from "../formula/attribute-formula-adapter"
import { PlottedValueFormulaAdapter } from "../formula/plotted-value-formula-adapter"
import { PlottedFunctionFormulaAdapter } from "../formula/plotted-function-formula-adapter"
import { ISharedDataSet, SharedDataSet, kSharedDataSetType } from "../shared/shared-data-set"

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
  const fullEnvironment: ITileEnvironment & {documentEnv: IDocumentEnvironment} = {
    sharedModelManager,
    formulaManager,
    documentEnv: {}
  }
  try {
    const document = DocumentModel.create(snapshot, fullEnvironment)

    // initialize formula adapters after the document has been created
    formulaManager.addAdapters([
      new AttributeFormulaAdapter(adapterApi),
      new PlottedValueFormulaAdapter(adapterApi),
      new PlottedFunctionFormulaAdapter(adapterApi)
    ])

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
      .forEach((model: ISharedDataSet) => formulaManager.addDataSet(model.dataSet))

    // configure logging
    fullEnvironment.log = function({ message, args, category }: ILogMessage) {
      Logger.log(message, args, category)
    }

    // configure notifications
    fullEnvironment.notify = function(message: DIMessage, callback: iframePhone.ListenerCallback) {
      document.content?.broadcastMessage(message, callback)
    }

    return document
  } catch (e) {
    // The only time we've seen this error so far is when MST fails to load the content
    // because it doesn't match the types of the MST models
    if (!snapshot) {
      console.error("Empty document failed to be created")
      throw e
    }

    if (!snapshot.content) {
      console.error("Document with empty content failed to be created", {docKey: snapshot.key})
      throw e
    }

    // Putting the error in an object like this prevents Chrome from expanding the
    // error and taking up a bunch of console lines.
    console.error("Failed to load document", {docKey: snapshot.key, error: e})

    // Create a document without the content, so this can be returned and passed
    // through the rest of the CLUE system. The Canvas component checks the contentStatus
    // and renders a DocumentError component if the status is Error
    const {content, ...snapshotWithoutContent} = snapshot
    const documentWithoutContent = DocumentModel.create(snapshotWithoutContent, fullEnvironment)
    // documentWithoutContent.setContentError(content, (e as Error)?.message)
    return documentWithoutContent
  }
}
