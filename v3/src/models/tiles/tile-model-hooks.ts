import { ISerializedActionCall } from "mobx-state-tree"
import { ITileMetadataModel } from "./tile-metadata"

export interface ITileModelHooks {
  /**
   * This is called after the wrapper around the content model is created. This wrapper is
   * a TileModel. This should only be called once.
   *
   * @param metadata an instance of this model's metadata it might be shared by
   * multiple instances of the model if the document of this model is open in
   * more than one place.
   */
  doPostCreate(metadata: ITileMetadataModel): void,

  /**
   * This is called for any action that is called on the wrapper (TileModel) or one of
   * its children. It can be used for logging or internal monitoring of action calls.
   */
  onTileAction(call: ISerializedActionCall): void,

  /**
   * This is called before the tile is removed from the row of the document.
   * Immediately after the tile is removed from the row it is also removed from
   * the tileMap which is the actual container of the tile.
   */
  willRemoveFromDocument(): void
}

// This is a way to work with MST action syntax
// The input argument has to match the api and the result
// is a literal object type which is compatible with the ModelActions
// type that is required.

/**
 * A TypeScript helper method for adding hooks to a content model. It should be
 * used like:
 * ```
 * .actions(self => tileModelHooks({
 *   // add your hook functions here
 * }))
 * ```
 * @param clientHooks the hook functions
 * @returns the hook functions in a literal object format that is compatible
 * with the ModelActions type of MST
 */
export function tileModelHooks(clientHooks: Partial<ITileModelHooks>) {
  const hooks: ITileModelHooks = {
    doPostCreate(metadata: ITileMetadataModel) {
      // no-op
    },
    onTileAction(call: ISerializedActionCall) {
      // no-op
    },
    willRemoveFromDocument() {
      // no-op
    },
    ...clientHooks
  }
  return {...hooks}
}
