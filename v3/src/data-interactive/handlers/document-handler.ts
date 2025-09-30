import { applySnapshot, destroy, getSnapshot } from "mobx-state-tree"
import { isWebViewModel } from "../../components/web-view/web-view-model"
import { DEBUG_PLUGINS, debugLog } from "../../lib/debug"
import { appState } from "../../models/app-state"
import {
  ISerializedV3Document, serializeCodapV2Document, serializeCodapV3Document
} from "../../models/document/serialize-document"
import { CodapV2Document } from "../../v2/codap-v2-document"
import { ICodapV2DocumentJson } from "../../v2/codap-v2-types"
import { registerDIHandler } from "../data-interactive-handler"
import { DIHandler, DIResources, DIValues } from "../data-interactive-types"
import { importV2Document } from "../../v2/import-v2-document"
import { isSharedDataSet, isSharedDataSetSnapshot } from "../../models/shared/shared-data-set"
import { isDataSetMetadata, isDataSetMetadataSnapshot } from "../../models/shared/data-set-metadata"
import { isGlobalValueManager, isGlobalValueManagerSnapshot } from "../../models/global/global-value-manager"
import { ISharedModel, ISharedModelSnapshot } from "../../models/shared/shared-model"
import { isGraphContentModel, isGraphContentModelSnapshot } from "../../components/graph/models/graph-content-model"
import { isMapContentModel, isMapModelContentSnapshot } from "../../components/map/models/map-content-model"

/**
 * We need to update ids in the incoming snapshot to match the existing document.
 * This way when the incoming snapshot is applied to the existing document, it will
 * just update the existing instances of the models instead of creating new ones.
 * The conversion to v2 and back to v3 preserves the tile ids, but not the shared
 * model entry ids. However there are ids within the shared models that are preserved
 * and can be used to match up the entries with each other.
 *
 * An example of the structure being updated is:
 * sharedModelMap: {
 *   "SHARV8oaPqqqnjm4": {
 *     "sharedModel": {
 *       "type": "SharedDataSet",
 *       "id": "SHARV8oaPqqqnjm4",
 *       "providerId": "",
 *       "dataSet": {
 *         "id": "DATA277341785405236",
 *         ...
 *       }
 *     },
 *     ...
 *   },
 *   ...
 * },
 * "tileMap": {
 *   "GRPH583792987052227": {
 *     "id": "GRPH583792987052227",
 *     "content": {
 *       "type": "Graph",
 *       "id": "GRCMHwojrf3ikAHt",
 *       ...
 *     },
 *     ...
 *   },
 *   ...
 * }
 *
 * In this example, the shared model entry id is "SHARV8oaPqqqnjm4" and the
 * shared model's id is also "SHARV8oaPqqqnjm4". The dataSet id is "DATA277341785405236".
 * We use the dataSet id to match the incoming shared model entry with the existing
 * shared model entry, and then update the incoming shared model entry id to match
 * the existing shared model entry id.
 *
 * @param incomingSnapshot
 * @returns
 */
function updateIncomingSnapshotIds(incomingSnapshot: ISerializedV3Document) {
  const { document } = appState

  // This new v3Snapshot will not have the same document id as the current document
  // so we need to update it to match.
  incomingSnapshot.key = document.key

  const existingSharedModelMap = document.content?.sharedModelMap
  const incomingSharedModelMap = incomingSnapshot.content?.sharedModelMap

  /**
   * A helper function to update the ids of a specific type of shared model.
   * If matchNewModelSnapshot returns true, then the id of the shared model entry
   * for this shared model is updated to match the existing shared model's id.
   */
  function updateSharedModelEntryIds<SpecificSharedModelType extends ISharedModel>({
    existingModelTypeGuard,
    matchNewModelSnapshot
  } : {
    existingModelTypeGuard: (model?: ISharedModel) => model is SpecificSharedModelType,
    matchNewModelSnapshot: (existingSharedModel: SpecificSharedModelType, snapshot: ISharedModelSnapshot) => boolean
  }) {
    if (!incomingSharedModelMap) return

    existingSharedModelMap?.forEach((sharedModelEntry) => {
      const { sharedModel } = sharedModelEntry
      if (existingModelTypeGuard(sharedModel)) {

        Object.values(incomingSharedModelMap).forEach((v3SharedModelEntry) => {
          const newSharedModel = v3SharedModelEntry.sharedModel
          if (newSharedModel.id && matchNewModelSnapshot(sharedModel, newSharedModel)) {
            // We have a match, update key in the shared model map and the id
            // stored in the sharedModel itself
            delete incomingSharedModelMap[newSharedModel.id]
            newSharedModel.id = sharedModel.id
            incomingSharedModelMap[sharedModel.id] = v3SharedModelEntry
          }
        })
      }
    })
  }

  // Update shared datasets matching by the dataSet id
  updateSharedModelEntryIds({
    existingModelTypeGuard: isSharedDataSet,
    matchNewModelSnapshot: (existingSharedModel, snapshot) => {
      return isSharedDataSetSnapshot(snapshot) &&
             existingSharedModel.dataSet?.id === snapshot.dataSet?.id
    }
  })

  // Update shared case metadata models matching by the data id
  updateSharedModelEntryIds({
    existingModelTypeGuard: isDataSetMetadata,
    matchNewModelSnapshot: (existingSharedModel, snapshot) => {
      return isDataSetMetadataSnapshot(snapshot) &&
             existingSharedModel.data?.id === snapshot.data
    }
  })

  // Update the globals shared model
  updateSharedModelEntryIds({
    existingModelTypeGuard: isGlobalValueManager,
    matchNewModelSnapshot: (existingSharedModel, snapshot) => {
      // There should be only one global value manager, so we only need to check types
      return isGlobalValueManagerSnapshot(snapshot)
    }
  })

  // The following code matches the ids of the map and content models.
  // It doesn't do anything with these matches because making the ids the same causes more
  // problems than it solves. When the ids are the same, MST will reuse the existing
  // model instances when an snapshot is applied. This should be more efficient, because
  // fewer views ought to be re-rendered.
  // However, within these content models are other models like the dataConfiguration and
  // layers. These models also have MST ids, and they aren't round tripped through the
  // v2 format. So when the snapshot is applied, these child models are recreated with new
  // ids, and the old models are destroyed. This causes problems because there are a lot of
  // reactions observing these child models, and some of them are generic observers that
  // don't really know about the child models. For example the autorun in AttributeLabel.
  // So it isn't easy to get these reactions to be disposed properly.
  //
  // Originally these ids were not real MST ids, just strings. That has the same problem
  // as matching up the ids to be the same. The content model was reused, but the child
  // objects were not. This also caused other problems where the id of the object would
  // change, but there were maps referring to the object by the old id. An example is
  // the `BaseGraphFormulaAdapter.graphContentModels`.
  const existingTileMap = document.content?.tileMap
  const incomingTileMap = incomingSnapshot.content?.tileMap
  if (incomingTileMap && existingTileMap) {
    Object.values(incomingTileMap).forEach((incomingTile) => {
      const existingTile = existingTileMap.get(incomingTile.id || "")
      const existingContentModel = existingTile?.content
      const incomingContentModel = incomingTile.content
      if (
        (
          isGraphContentModelSnapshot(incomingContentModel) &&
          isGraphContentModel(existingContentModel)
        ) ||
        (
          isMapModelContentSnapshot(incomingContentModel) &&
          isMapContentModel(existingContentModel)
        )
      ) {
        // As described above, we do not actually make the ids the same
        // incomingContentModel.id = existingContentModel.id
      }
    })
  }
}

async function asyncUpdate(resources: DIResources, values?: DIValues) {
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

  notifyDocumentChange('updateDocumentBegun')

  // Convert v2 Document to v3
  const v3Document = importV2Document(v2Document)
  const v3Snapshot = await serializeCodapV3Document(v3Document)
  // Destroy the document once we've retrieved the snapshot
  // This cleans up many of the reactions coming from the managers
  // that were created along with the document.
  destroy(v3Document)

  updateIncomingSnapshotIds(v3Snapshot)

  // Replace the tile state for any webview tiles that is subscribed to document events
  // This is a way to identify the story builder tile. Tiles like story builder
  // update the document state but don't want to update themselves in the process.
  const snapshotTileMap = v3Snapshot.content?.tileMap
  if (!snapshotTileMap) {
    // TODO: perhaps we should just do nothing in this case
    throw new Error("v3 Document content's tileMap is undefined")
  }
  Object.values(snapshotTileMap).forEach((tileSnapshot) => {
    const tileId = tileSnapshot.id
    if (!tileId) return

    const existingTile = tileMap?.get(tileId)
    if (!existingTile) return

    // Check if the tile is listening to document events
    const shouldIgnoreIncomingTile = isWebViewModel(existingTile.content) &&
                              existingTile.content.subscribeToDocuments
    if (shouldIgnoreIncomingTile) {
      // Update the tile's content in the snapshot with the current snapshot
      // with the new snapshot
      snapshotTileMap[tileId] = getSnapshot(existingTile)
    }
  })

  if (DEBUG_PLUGINS) {
    console.log("Updating document",
      {
        // Note: calling getSnapshot on the existing document is not exactly the same
        // as what is saved as the document state because it is not asking to objects
        // like the dataset to prepare their data for serialization.
        "1) existing doc": getSnapshot(document),
        "2) incoming v2 doc": v2DocumentJson,
        "3) converted v3 doc": v3Snapshot
      }
    )
  }
  // TODO: try wrapping this in a an action so the afterApplySnapshot call happens
  // before the reactions run from the applySnapshot. This should prevent an initial
  // formula recomputation that happens too soon. But that computation will still
  // happen. So to prevent the duplicate recomputation, we also need to make changes
  // to how the formula manager observers work and how the manual recomputation is
  // triggered.
  applySnapshot(document, v3Snapshot)
  document.content?.afterApplySnapshot()

  await new Promise(resolve => setTimeout(resolve, 500))
  notifyDocumentChange('updateDocumentEnded')

}

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
            debugLog(DEBUG_PLUGINS, `Sending document to tile ${tileId}`, message)
            const callback = (response: any) => {
              debugLog(DEBUG_PLUGINS, "Tile response:", response)
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
    asyncUpdate(resources, values)

    return { success: true }
  }
}

registerDIHandler("document", diDocumentHandler)
