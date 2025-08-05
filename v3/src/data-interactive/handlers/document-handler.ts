import { appState } from "../../models/app-state"
import { applySnapshot, getSnapshot } from "mobx-state-tree"
import { toV2Id, toV3GlobalId } from "../../utilities/codap-utils"
import { isWebViewModel } from "../../components/web-view/web-view-model"
import { ICodapV2DocumentJson } from "../../v2/codap-v2-types"
import { CodapV2Document } from "../../v2/codap-v2-document"
import { ITileModel, ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { ITileContentModel } from "../../models/tiles/tile-content"
import { getTileComponentInfo } from "../../models/tiles/tile-component-info"
import { IFreeTileInRowOptions, IFreeTileRow } from "../../models/document/free-tile-row"
import { GetCaseDataResult, importV2Component, LayoutTransformFn } from "../../v2/codap-v2-tile-importers"
import { serializeCodapV2Document, serializeCodapV3Document } from "../../models/document/serialize-document"
import { DocumentModel } from "../../models/document/document"
import { DocumentContentModel } from "../../models/document/document-content"
import { SharedModelDocumentManager } from "../../models/document/shared-model-document-manager"
import { getGlobalValueManager, IGlobalValueManagerSnapshot } from "../../models/global/global-value-manager"
import { ISharedModel } from "../../models/shared/shared-model"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { isV2ExternalContext } from "../../v2/codap-v2-data-context-types"
import { CodapV2DataSetImporter, getCaseDataFromV2ContextGuid } from "../../v2/codap-v2-data-set-importer"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DIValues } from "../data-interactive-types"

export const diDocumentHandler: DIHandler = {
  get() {
    // The following is asynchronous. The returned value is the JSON we send to the plugin.
    serializeCodapV2Document(appState.document).then((v2Document) => {
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
    })
    return {
      success: true,
    }
  },
  update(resources: DIResources, values?: DIValues) {
    const v2DocumentJson = values as ICodapV2DocumentJson
    const v2Document = new CodapV2Document(v2DocumentJson)
    const { document } = appState
    const tileMap = document.content?.tileMap
    const interactiveFrameId = resources.interactiveFrame?.id || ''

    const notifyDocumentChange = (operation: string) => {
      document.content?.broadcastMessage({
        action: 'notify',
        resource: 'documentChangeNotice',
        values: {operation}
      }, () => {}, interactiveFrameId)
    }

    const deleteTilesNotInV2 = () => {
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

    const reinstateDatasets = async () => {
      const tempSharedModelManager = new SharedModelDocumentManager()
      // The 2nd parameter we send to create is the "environment."
      const tempDocModel = DocumentModel.create({ type: "CODAP" }, { sharedModelManager: tempSharedModelManager})
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
      const tempDocSnapshot = await serializeCodapV3Document(tempDocModel)
      if (tempDocSnapshot.content) {
        applySnapshot(currentSharedModelMap, tempDocSnapshot.content.sharedModelMap)
      }
   }

    const reinstateComponents = () => {
      const kRehydrateExistingTiles = true  // The alternative to rehydration is to delete and recreate tiles
      const { content } = document
      if (!content) {
        throw new Error("Document content is undefined")
      }
      const row = content.firstRow as IFreeTileRow
      let maxZIndex = 0

      // This function will return the shared data set and case metadata for a given data context
      const getCaseData = (dataContextGuid: number): GetCaseDataResult => {
        return getCaseDataFromV2ContextGuid(dataContextGuid, getSharedModelManager(document))
      }

      const getGlobalValues = () => {
        return getGlobalValueManager(getSharedModelManager(document))
      }

      const linkSharedModel = (tileContent: ITileContentModel, sharedModel?: ISharedModel, isProvider?: boolean) => {
        const sharedModelManager = getSharedModelManager(document)
        if (sharedModelManager && sharedModel) {
          sharedModelManager.addTileSharedModel(tileContent, sharedModel, isProvider)
        }
      }

      v2Document.components.forEach(v2Component => {
        const insertTile = (tile: ITileModelSnapshotIn, transform?: LayoutTransformFn) => {
          let existingTile = tileMap?.get(tile.id || '')
          // If we are not rehydrating existing tiles, we check if the tile already exists
          // and if it does, we delete it to insert a new one. But we never delete the WebView tile (almost certainly
          // a Story Builder plugin) that subscribes to documents, as it is expected to be persistent.
          if (!kRehydrateExistingTiles && existingTile && interactiveFrameId !== existingTile.id) {
            content.deleteTile(existingTile.id || '') // Remove the existing tile
            existingTile = undefined // Reset to ensure we insert a new tile
          }
          let resultTile: ITileModel | undefined
          if (row && tile) {
            const info = getTileComponentInfo(tile.content.type)
            if (info) {
              const {
                layout: { left = 0, top = 0, width, height: v2Height, isVisible, zIndex, x, y }, savedHeight
              } = v2Component
              const isHidden = isVisible === false
              const v2Minimized = (!!savedHeight && v2Height != null && savedHeight >= v2Height) || undefined
              const isMinimized = v2Minimized && !isHidden
              const height = savedHeight && v2Minimized ? savedHeight : v2Height
              // only apply imported width and height to resizable tiles
              const _width = !info.isFixedWidth ? { width } : {}
              const _height = !info?.isFixedHeight ? { height } : {}
              const _zIndex = zIndex != null ? { zIndex } : {}
              if (zIndex != null && zIndex > maxZIndex) maxZIndex = zIndex
              const _layout: IFreeTileInRowOptions = {
                x: left ?? x, y: top ?? y, ..._width, ..._height, ..._zIndex, isHidden, isMinimized
              }
              const layout = transform?.(_layout) ?? _layout
              if (existingTile) { // If the tile already exists, update its content and layout
                // A webView that subscribes to documents (like Story Builder) should not be updated
                const shouldBeUpdated = !(isWebViewModel(existingTile.content) &&
                  existingTile.content.subscribeToDocuments)
                if (shouldBeUpdated) applySnapshot(existingTile, tile)
                row.setTilePosition(existingTile.id, layout)
                row.setTileDimensions(existingTile.id, layout)
                resultTile = existingTile
              }
              else {
                resultTile = content.insertTileSnapshotInRow(tile, row, layout)
              }
            }
          }
          return resultTile
        }

        importV2Component({ v2Component, v2Document, getCaseData, getGlobalValues, insertTile, linkSharedModel })
      })
    }

    notifyDocumentChange('updateDocumentBegun')

    deleteTilesNotInV2()

    reinstateGlobalValues()

    reinstateDatasets().then(() => {
      reinstateComponents()
    })

    // The 500ms timeout here gives the document time to settle down.
    // Especially any changes to center and zoom of a map
    setTimeout(function() {
      // DG.UndoHistory.clearUndoRedoHistory();
      notifyDocumentChange('updateDocumentEnded')
    }, 500)

    return { success: true }
  }
}

registerDIHandler("document", diDocumentHandler)
