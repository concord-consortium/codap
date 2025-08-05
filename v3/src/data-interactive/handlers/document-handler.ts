import { appState } from "../../models/app-state"
import { applySnapshot, getSnapshot } from "mobx-state-tree"
import { toV2Id, toV3GlobalId } from "../../utilities/codap-utils"
import { isWebViewModel } from "../../components/web-view/web-view-model"
import { ICodapV2DocumentJson } from "../../v2/codap-v2-types"
import { CodapV2Document } from "../../v2/codap-v2-document"
import { ITileModel } from "../../models/tiles/tile-model"
import { DocumentModel } from "../../models/document/document"
import { DocumentContentModel } from "../../models/document/document-content"
import { SharedModelDocumentManager } from "../../models/document/shared-model-document-manager"
import { getGlobalValueManager, IGlobalValueManagerSnapshot } from "../../models/global/global-value-manager"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { isV2ExternalContext } from "../../v2/codap-v2-data-context-types"
import { exportV2Document } from "../../v2/export-v2-document"
import { CodapV2DataSetImporter } from "../../v2/codap-v2-data-set-importer"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DIValues } from "../data-interactive-types"

/*
const illegalValueResult = { success: false, values: { error: t("V3.DI.Error.globalIllegalValue") } } as const
const isIllegalValue = (value: any) => !isFinite(value)
*/

export const diDocumentHandler: DIHandler = {
  get(resources: DIResources) {
    const v2Document = exportV2Document(appState.document)
    const message = {
      action: 'notify',
      resource: 'document',
      values: {
        operation: 'newDocumentState',
        state: v2Document
      }
    }
    const tileMap = appState.document.content?.tileMap
    const tileIds = tileMap?.keys()
    if (tileMap && tileIds) {
      Array.from(tileIds).forEach(tileId => {
        const tile = tileMap.get(tileId)
        const tileContent = tile?.content
        if (isWebViewModel(tileContent) && tileContent.subscribeToDocuments) {
          const callback = (response: any) => {
            console.log("Tile response:", response)
          }
          tileContent.broadcastMessage(message, callback)
        }
      })
    }
    return {
      success: true,
    }
  },
  update(resources: DIResources, values?: DIValues) {
    const v2DocumentJson = values as ICodapV2DocumentJson
    const v2Document = new CodapV2Document(v2DocumentJson)
    const { document } = appState
    const interactiveFrameId = resources.interactiveFrame?.id || ''

    const notifyDocumentChange = (operation: string) => {
      document.content?.broadcastMessage({
        action: 'notify',
        resource: 'documentChangeNotice',
        values: {operation}
      }, () => {}, interactiveFrameId)
    }

    const deleteTilesNotInV2 = () => {
      const tileMap = document.content?.tileMap
      if (tileMap) {
        const tileIds = tileMap.keys()
        Array.from(tileIds).forEach(tileId => {
          if (!v2Document.components.some(component => component.guid === toV2Id(tileId))) {
            document.content?.deleteTile(tileId)
          }
        })
      }
    }

    const reinstateGlobalValues = () => {
      const globalManager = getGlobalValueManager(getSharedModelManager(document))
      if (!globalManager) return
      // Define the type for globalManagerSnapshot
      const globalManagerSnapshot: IGlobalValueManagerSnapshot = {
        type: "GlobalValueManager", // Set the correct literal value
        id: globalManager.id,
        globals: {}
      }
      v2DocumentJson.globalValues?.forEach(globalValue => {
        globalManagerSnapshot.globals[toV3GlobalId(globalValue.guid)] = {
          id: toV3GlobalId(globalValue.guid),
          name: globalValue.name,
          value: globalValue.value,
        }
      })
      applySnapshot(globalManager, globalManagerSnapshot)
    }

    const reinstateDatasets = () => {
      /**
       * The thing you need a snapshot of is the sharedModelMap in BaseDocumentContent.
       * So for the previous approach to work, you’d have to create a DocumentModel, create a
       * SharedModelDocumentManager, call sharedModelManager.setDocument, then import the shared models,
       * and then finally get the snapshot of the document’s sharedModelMap.
       */
      const tempSharedModelManager = new SharedModelDocumentManager()
      const tempDocModel = DocumentModel.create({ type: "CODAP" })
      tempDocModel.setContent(getSnapshot(DocumentContentModel.create()))
      if (!tempDocModel.content) {
        throw new Error("Temporary document content is undefined")
      }
      tempSharedModelManager.setDocument(tempDocModel.content)
      const dataSetImporter = new CodapV2DataSetImporter(v2Document.guidMap)
      v2Document.contexts.forEach(context => {
        if (!isV2ExternalContext(context)) {
          dataSetImporter.importContext(context, tempSharedModelManager)
        }
      })
      const tempSharedModelMap = tempDocModel.content?.sharedModelMap
      const currentSharedModelMap = document.content?.sharedModelMap
      if (!tempSharedModelMap || !currentSharedModelMap) {
        throw new Error("Document content's sharedModelMap is undefined")
      }
      const tempSharedModelMapSnapshot = getSnapshot(tempSharedModelMap)
      applySnapshot(currentSharedModelMap, tempSharedModelMapSnapshot)
    }

    const reinstateComponents = () => {
      const { content } = document
      const row = content?.firstRow
      // let maxZIndex = 0

      v2Document.components.forEach(v2Component => {
        const insertTile = (tile: ITileModel) => {
 /*         if (row && tile) {
            const info = tile.content.type ? tile.content.type : v2Component.content.type
            tile.content.zIndex = ++maxZIndex
            row.insertTile(tile)
          }
*/        }

/*
        importV2Component(v2Component, insertTile, v2Document.guidMap, interactiveFrameId)
          .then(tile => {
            if (tile) {
              notifyDocumentChange('tileAdded')
            }
          })
          .catch(error => {
            console.error("Error importing component:", error)
          })
*/
      })
    }

    notifyDocumentChange('updateDocumentBegun')

    deleteTilesNotInV2()

    reinstateGlobalValues()

    reinstateDatasets()

    reinstateComponents()

    notifyDocumentChange('updateDocumentEnded')

    return { success: true }
  }
}

registerDIHandler("document", diDocumentHandler)
