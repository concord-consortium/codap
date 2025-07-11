import { action, computed, makeObservable, observable } from "mobx"
import { getParentOfType, hasParentOfType, IAnyStateTreeNode, Instance } from "mobx-state-tree"
// TODO: eliminate this dependency -- should be a generic way of indicating tile requires shared model
import { kCaseTableTileType } from "../../components/case-table/case-table-defs"
import { DataSetMetadata, kDataSetMetadataType } from "../shared/data-set-metadata"
import { kSharedDataSetType, SharedDataSet } from "../shared/shared-data-set"
import { ISharedModel, SharedModel } from "../shared/shared-model"
import { ISharedModelManager } from "../shared/shared-model-manager"
import { ITileModel, TileModel } from "../tiles/tile-model"
import { IDocumentContentModel } from "./document-content"


function getTileModel(tileContentModel: IAnyStateTreeNode) {
  if (!hasParentOfType(tileContentModel, TileModel)) {
    // we aren't attached in the right place yet
    return undefined
  }
  return getParentOfType(tileContentModel, TileModel)
}

export interface ISharedModelDocumentManager extends ISharedModelManager {
  setDocument(document: IDocumentContentModel): void;
}

export class SharedModelDocumentManager implements ISharedModelDocumentManager {
  document: IDocumentContentModel | undefined = undefined

  constructor() {
    makeObservable(this, {
      document: observable,
      isReady: computed,
      setDocument: action,
      findFirstSharedModelByType: action,
      addTileSharedModel: action,
      removeTileSharedModel: action
    })
  }

  get isReady() {
    return !!this.document
  }

  setDocument(document: IDocumentContentModel) {
    this.document = document
  }

  getSharedModelById<OT extends Instance<typeof SharedModel>>(id: string): OT | undefined {
    return this.document?.sharedModelMap.get(id)?.sharedModel as OT | undefined
  }

  findFirstSharedModelByType<IT extends typeof SharedModel>(
    sharedModelType: IT, providerId?: string): IT["Type"] | undefined {
    if (!this.document) {
      console.warn("findFirstSharedModelByType has no document")
    }
    return this.document?.getFirstSharedModelByType(sharedModelType, providerId)
  }

  getSharedModelsByType<IT extends typeof SharedModel>(type: string): IT["Type"][] {
    return this.document?.getSharedModelsByType<IT>(type) || []
  }

  addSharedModel(sharedModel: ISharedModel) {
    if (!this.document) {
      console.warn("addSharedModel has no document. this will have no effect")
      return
    }

    // assign an indexOfType if necessary
    if (sharedModel.indexOfType < 0) {
      const usedIndices = new Set<number>()
      const sharedModels = this.document.getSharedModelsByType(sharedModel.type)
      sharedModels.forEach(model => {
        if (model.indexOfType >= 0) {
          usedIndices.add(model.indexOfType)
        }
      })
      for (let i = 1; sharedModel.indexOfType < 0; ++i) {
        if (!usedIndices.has(i)) {
          sharedModel.setIndexOfType(i)
          break
        }
      }
    }

    // register it with the document if necessary.
    // This won't re-add it if it is already there
    return this.document.addSharedModel(sharedModel)
  }

  // TODO: Need to make this usable in CLUE
  removeSharedModel(dataSetId: string) {
    if (!this.document || !dataSetId) {
      console.warn("removeSharedModel has no document or data set ID. this will have no effect")
      return
    }
    const sharedModelsToRemove: ISharedModel[] = []
    let sharedDataSetToDelete: Maybe<ISharedModel>
    const sharedDatasets = this.document.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType)
    const sharedMetadata = this.document.getSharedModelsByType<typeof DataSetMetadata>(kDataSetMetadataType)
    const dataSetToDeleteIndex = sharedDatasets.map(model => model.dataSet.id).indexOf(dataSetId)
    if (dataSetToDeleteIndex >= 0) {
      sharedDataSetToDelete = sharedDatasets[dataSetToDeleteIndex]
      sharedModelsToRemove.push(sharedDataSetToDelete)
    }
    const metadataToDeleteIndex = sharedMetadata.map(model => model.data?.id).indexOf(dataSetId)
    if (metadataToDeleteIndex >= 0) {
      sharedModelsToRemove.push(sharedMetadata[metadataToDeleteIndex])
    }
    // remove table associated with data set from document
    const tilesToRemove = this.getSharedModelTiles(sharedDataSetToDelete)
                              .filter(tile => tile.content.type === kCaseTableTileType)
    this.document.removeSharedModelsAndTiles(sharedModelsToRemove, tilesToRemove)
  }

  addTileSharedModel(tileContentModel: IAnyStateTreeNode, sharedModel: ISharedModel, isProvider = false): void {
    if (!this.document) {
      console.warn("addTileSharedModel has no document. this will have no effect")
      return
    }

    // add this tile to the sharedModel entry
    const tile = getTileModel(tileContentModel)
    if (!tile) {
      console.warn("addTileSharedModel can't find the tile")
      return
    }

    // register it with the document if necessary.
    // This won't re-add it if it is already there
    const sharedModelEntry = this.addSharedModel(sharedModel)

    // If the sharedModel was added before we don't need to do anything
    if (!sharedModelEntry || sharedModelEntry.tiles.includes(tile)) {
      return
    }

    sharedModelEntry.addTile(tile, isProvider)

    // When a shared model entry changes updateAfterSharedModelChanges is called on
    // the tile content model automatically by the tree monitor. This will also
    // pick up this case of adding a tile.
  }

  // This is not an action because it is deriving state.
  getTileSharedModels(tileContentModel: IAnyStateTreeNode): ISharedModel[] {
    if (!this.document) {
      console.warn("getTileSharedModels has no document")
      return []
    }

    // add this tile to the sharedModel entry
    const tile = getTileModel(tileContentModel)
    if (!tile) {
      console.warn("getTileSharedModels can't find the tile")
      return []
    }

    const sharedModels: ISharedModel[] = []
    for (const sharedModelEntry of this.document.sharedModelMap.values()) {
      if (sharedModelEntry.tiles.includes(tile)) {
        sharedModels.push(sharedModelEntry.sharedModel)
      }
    }
    return sharedModels
  }

  getSharedModelTiles(sharedModel?: ISharedModel): ITileModel[] {
    const entry = sharedModel?.id && this.document?.sharedModelMap.get(sharedModel.id)
    return entry ? Array.from(entry.tiles) : []
  }

  getSharedModelTileIds(sharedModel?: ISharedModel): string[] {
    const tiles = this.getSharedModelTiles(sharedModel)
    return tiles.map(tile => tile.id)
  }

  removeTileSharedModel(tileContentModel: IAnyStateTreeNode, sharedModel: ISharedModel): void {
    if (!this.document) {
      console.warn("removeTileSharedModel has no document")
      return
    }

    const tile = getTileModel(tileContentModel)
    if (!tile) {
      console.warn("removeTileSharedModel can't find the tile")
      return
    }

    const sharedModelEntry = this.document.sharedModelMap.get(sharedModel.id)
    if (!sharedModelEntry) {
      console.warn(`removeTileSharedModel can't find sharedModelEntry for sharedModel: ${sharedModel.id}`)
      return
    }

    // When a tile is removed from the shared model entry this is picked
    // up by the tree-monitor middleware and updateAfterSharedModelChanges will
    // be called on all of the tiles that were or are referring to the sharedModel.
    sharedModelEntry.removeTile(tile)
  }
}
