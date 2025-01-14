
import { IAnyStateTreeNode, Instance, types } from "mobx-state-tree"
import { kUnknownSharedModel, SharedModel, ISharedModel } from "./shared-model"
import { getSharedModelClasses, getSharedModelInfoByType } from "./shared-model-registry"

export function sharedModelFactory(snapshot: any) {
  const sharedModelType: string | undefined = snapshot?.type
  return sharedModelType && getSharedModelInfoByType(sharedModelType)?.modelClass || UnknownSharedModel
}

export const SharedModelUnion = types.late<typeof SharedModel>(() => {
  const sharedModels = getSharedModelClasses()
  return types.union({ dispatcher: sharedModelFactory }, ...sharedModels) as typeof SharedModel
})

// The UnknownSharedModel has to be defined in this shared-model module because it both
// "extends" SharedModel and UnknownSharedModel is used by the sharedModelFactory function
// above. Because of this it is a kind of circular dependency.
// If UnknownSharedModel is moved to its own module this circular dependency causes an error.
// If they are in the same module then this isn't a problem.
// The UnknownSharedModel is not currently registered like other shared models. It is created
// by the sharedModelFactory when no matching model type is found.
const _UnknownSharedModel = SharedModel
  .named("UnknownSharedModel")
  .props({
    type: types.optional(types.literal(kUnknownSharedModel), kUnknownSharedModel),
    original: types.maybe(types.string)
  })

export const UnknownSharedModel = types.snapshotProcessor(_UnknownSharedModel, {
  // Maybe we can type the snapshot better?
  preProcessor(snapshot: any) {
    const type = snapshot?.type
    return type && (type !== kUnknownSharedModel)
            ? {
              type: kUnknownSharedModel,
              original: JSON.stringify(snapshot)
            }
            : snapshot
  },

  postProcessor(snapshot: any) {
    return JSON.parse(snapshot.original)
  }
})

/**
 * An instance of this interface should be provided to tiles so they can interact
 * with shared models.
 */
export interface ISharedModelManager {
  /**
   * The manager might be available, but is not ready to be used yet.
   */
  get isReady(): boolean;

  /**
   * Retrieve the shared model with the specified id.
   *
   * @param sharedModelType the MST model "class" of the shared model
   */
  getSharedModelById<OT extends Instance<typeof SharedModel>>(id: string): OT | undefined;

  /**
   * Find the shared model at the container level. If the tile wants to use this
   * shared model it should call `addTileSharedModel`. This is necessary so the
   * container knows to call the tile's updateAfterSharedModelChanges action
   * whenever the shared model changes.
   *
   * @param sharedModelType the MST model "class" of the shared model
   */
  findFirstSharedModelByType<IT extends typeof SharedModel>(
    sharedModelType: IT, providerId?: string): IT["Type"] | undefined;

  /**
   * Return an array of all models of the specified type.
   *
   * @param sharedModelType the MST model "class" of the shared model
   */
  getSharedModelsByType<IT extends typeof SharedModel>(type: string): IT["Type"][];

  /**
   * Add a shared model to the container if it doesn't exist.
   *
   * If the shared model was already part of this container it won't be added to
   * the container twice.
   *
   * This method adds a shared model to the container without associating it
   * with any tiles.
   *
   * @param sharedModel the new or existing shared model that is going to be
   * used by this tile.
   */
  addSharedModel(sharedModel: ISharedModel): void;

  /**
   * Removes a shared model from the container.
   *
   * @param sharedModel the existing shared model that is going to be
   * removed from the document.
   */
  removeSharedModel(sharedModelId: string): void;

  /**
   * Add a shared model to the container if it doesn't exist and add a link to
   * the tile from the shared model.
   *
   * If the shared model was already part of this container it won't be added to
   * the container twice. If the shared model already had a link to this tile it
   * won't be added twice.
   *
   * Tiles need to call this method when they use a shared model. This is how
   * the container knows to call the tile's updateAfterSharedModelChanges when
   * the shared model changes.
   *
   * Multiple shared models can be added to a single tile. All of these shared
   * models will be returned by getTileSharedModels. If a tile is using multiple
   * shared models of the same type, it might want to additionally keep its own
   * references to these shared models. Without these extra references it would
   * be hard to tell which shared model is which.
   *
   * @param tileContentModel the tile content model that should be notified when
   * this shared model changes
   *
   * @param sharedModel the new or existing shared model that is going to be
   * used by this tile.
   */
  addTileSharedModel(tileContentModel: IAnyStateTreeNode, sharedModel: ISharedModel, isProvider?: boolean): void;

  /**
   * Remove the link from the shared model to the tile.
   *
   * @param tileContentModel the tile content model that doesn't want to be
   * notified anymore of shared model changes.
   *
   * @param sharedModel an existing shared model
   */
  removeTileSharedModel(tileContentModel: IAnyStateTreeNode, sharedModel: ISharedModel): void;

  /**
   * Get all of the shared models that link to this tile
   *
   * @param tileContentModel
   */
  getTileSharedModels(tileContentModel: IAnyStateTreeNode): ISharedModel[];

  /**
   * Get the tiles that link to this shared model
   *
   * @param sharedModel
   */
  getSharedModelTiles(sharedModel?: ISharedModel): IAnyStateTreeNode[];

  /**
   * Get the ids of the tiles that link to this shared model
   *
   * @param sharedModel
   */
  getSharedModelTileIds(sharedModel?: ISharedModel): string[];
}
