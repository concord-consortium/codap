import {
  applyPatch, flow, getSnapshot, IJsonPatch, isAlive, resolvePath, resolveIdentifier, types
} from "mobx-state-tree"
import { DEBUG_HISTORY } from "../../lib/debug"
import { IDocumentContentModel } from "../document/document-content"
import { SharedModelMapSnapshotOutType } from "../document/shared-model-entry"
import { ISharedModel } from "../shared/shared-model"
import { ITileModel, TileModel } from "../tiles/tile-model"
import { TreeManagerAPI } from "./tree-manager-api"
import { withoutUndo } from "./without-undo"

export const Tree = types.model("Tree", {
})
.volatile(self => ({
  applyingManagerPatches: false,
  treeManagerAPI: undefined as TreeManagerAPI | undefined
}))
.views(self => ({
  get treeId(): string {
    throw new Error("Trees need to provide a treeId property")
  }
}))
.actions(self => ({
  updateTreeAfterSharedModelChanges(options?: {sharedModel: ISharedModel,
    initialSharedModelMap: SharedModelMapSnapshotOutType})
  {
    // If there is no sharedModel param, run the update function on all tiles which
    // have shared model references.
    // If there is a sharedModel param, only run the update function on tiles which
    // have this shared model.

    // If we don't have a document let the exception happen so we
    // can track this down
    const document = (self as any).content as IDocumentContentModel

    // FIXME: In the case where several changes have been applied we need to notify
    // any new tiles that were just linked and any old tiles that were unlinked
    // This will happen when there is no specific shared model being updated.
    // We can probably punt this case for later.
    // FIXME: when we start deleting shared models the code below will have to
    // be updated to handle this case.

    // We can probably optimize this by using a MSTView to cache the tiles
    // here. But I don't remember how it handles parameter values
    const tiles: Array<ITileModel> = []
    let sharedModel: ISharedModel | undefined
    if (options) {
      sharedModel = options.sharedModel
      const newSharedModelEntry = document.sharedModelMap.get(sharedModel.id)
      if (!newSharedModelEntry) {
        console.warn(`no shared model entry for shared model: ${sharedModel.id}`)
      } else {
        tiles.push(...newSharedModelEntry.tiles)
      }
      const initialSharedModelEntry = options.initialSharedModelMap[sharedModel.id]
      if (!initialSharedModelEntry) {
        // This entry didn't exist before
      } else {
        initialSharedModelEntry.tiles.forEach(tileId => {
          if (tiles.find(existingTile => existingTile.id === tileId)) {
            // This tile has already been added to our list
          } else {
            const tile = resolveIdentifier(TileModel, document, tileId)
            if (tile) {
              tiles.push(tile)
            }
          }
        })
      }
    } else {

      // Only include tiles that have at least one shared model
      document.sharedModelMap.forEach(sharedModelEntry => {
        sharedModelEntry.tiles.forEach(tile => {
          if (!tiles.includes(tile)) {
            tiles.push(tile)
          }
        })
      })
    }

    // Run update function on the tiles
    for (const tile of tiles) {
      if (isAlive(tile)) {
        tile.content.updateAfterSharedModelChanges(sharedModel)
      }
    }
  }
}))
.actions(self => {
  const updateTreeAfterSharedModelChangesInternal = (sharedModel: ISharedModel,
      initialSharedModelMap: SharedModelMapSnapshotOutType) => {
    // If we are applying manager patches, then we ignore any sync actions
    // otherwise the user might make a change such as changing the name of a
    // node while the patches are applied. When they do this the patch for
    // the shared model might have been applied first, and which if sync is
    // enabled could create a new node in the diagram. Then the patch for the
    // diagram is applied which also creates a new node in the diagram.
    // Even if we just disable the sync when the shared model update is done
    // from the patch, if the user makes a change, this would be a separate
    // action would would trigger the sync. So if the user made this change
    // at just the right time it would could result in duplicate nodes in the
    // diagram.
    if (self.applyingManagerPatches) {
      return
    }

    // The TreeMonitor middleware should pickup the historyEntryId and
    // exchangeId parameters automatically. And then when it sends any
    // changes captured during the update, it should include these ids
    if (isAlive(self)) {
      self.updateTreeAfterSharedModelChanges({sharedModel, initialSharedModelMap})
    }
  }

  return {
    updateTreeAfterSharedModelChangesInternal
  }
})
.actions(self => {
  return {
    //
    // Special actions called by the framework. These define the Tree API.
    //

    // This will be called by the manager when a shared model tree changes
    applySharedModelSnapshotFromManager(historyEntryId: string, exchangeId: string, snapshot: any) {
      throw new Error("not implemented yet")
    },

    // The manager calls this before it calls applyPatchesFromManager
    startApplyingPatchesFromManager(historyEntryId: string, exchangeId: string) {
      self.applyingManagerPatches = true

      // We return a promise because the API is async
      // The action itself doesn't do anything asynchronous though
      // so it isn't necessary to use a flow
      return Promise.resolve()
    },

    // Actually apply the patches.
    // It might be called multiple times after startApplyingPatchesFromManager
    applyPatchesFromManager(historyEntryId: string, exchangeId: string, patchesToApply: readonly IJsonPatch[]) {
      applyPatch(self, patchesToApply)
      // We return a promise because the API is async
      // The action itself doesn't do anything asynchronous though
      // so it isn't necessary to use a flow
      return Promise.resolve()
    },

    // The manager calls this after all patches have been applied
    finishApplyingPatchesFromManager(historyEntryId: string, exchangeId: string) {
      self.applyingManagerPatches = false

      // TODO: Need to deal with possible effects on the undo stack
      //
      // If all of the patches applied correctly and the user didn't inject any
      // changes while the patches were applying, then everything should be
      // fine. There should be nothing to updated by
      // updateTreeAfterSharedModelChanges
      //
      // However, if the user made a change in the shared model like deleting a
      // node while the patches were being applied this would make the shared
      // model be out of sync with the tree. The tree would not be updated
      // before now because applyingManagerPatches is true. So that deleted
      // node change would get applied here. When it is applied it would
      // generate a new undoable action that is not grouped with the action that
      // deleted the node from the shared model. So now if the user undoes, the
      // actions will not get undone together. This will probably result in a
      // broken UI for the user.
      //
      // We could record the action id of any actions that happen while the
      // patches are being applied. It is possible that multiple actions could
      // happen. Because we aren't running the updateTreeAfterSharedModelChanges
      // after each of these actions, we wouldn't be able to tell what tree
      // updates are associated with which of the multiple actions.
      //
      // I think the best thing to do is:
      // - merge any actions that happened during the patch application into a
      //   single action. So basically combine their patches.
      // - use the id of that combined action for any changes the
      //   updateTreeAfterSharedModelChanges causes here.
      //
      // If there were no injected or intermediate actions, but for some reason
      // this update function does make changes in the tree, what should we do?
      // We should at least log this issue to the console, so we can try to
      // track down what happened. One likely reason is a broken implementation
      // of the updateTreeAfterSharedModelChanges. And that will be likely to
      // happen during development.
      self.updateTreeAfterSharedModelChanges()

      // We return a promise because the API is async
      // The action itself doesn't do anything asynchronous though
      // so it isn't necessary to use a flow
      return Promise.resolve()
    },

    applyCustomUndoRedo(customUndoRedo: () => void) {
      withoutUndo()
      customUndoRedo()
    }
  }

})
.actions(self => ({
  handleSharedModelChanges: flow(function* handleSharedModelChanges(historyEntryId: string, exchangeId: string,
      call: any, sharedModelPath: string, initialSharedModelMap: SharedModelMapSnapshotOutType) {

      let model: ISharedModel | undefined

      try {
        // The sharedModelPath is to the sharedModel entry we have to tack on /sharedModel to
        // get the actual model object that was just updated.
        // TODO: see if there is a helper method to join paths for us
        model = resolvePath(self, `${sharedModelPath}/sharedModel`)
      }
      catch {
        console.warn("Tree.handleSharedModelChanges failed to find model at:", sharedModelPath)
      }
      if (!model) return

      // Note: the environment of the call will be undefined because the undoRecorder cleared
      // it out before calling this function
      if (DEBUG_HISTORY) {
        // eslint-disable-next-line no-console
        console.log(`observed changes in sharedModel: ${model.id} of tree: ${self.treeId}`,
          {historyEntryId, action: call})
      }

      if (!self.treeManagerAPI) {
        console.warn("handleSharedModelChanges before a treeManagerAPI is set")
        return
      }

      // When this is called by the TreeManager, we want to do the internal
      // shared model sync, but we don't want to resend the snapshot back to the
      // manager.
      if (call.name !== "applySharedModelSnapshotFromManager") {

        // TODO: figure out if we should be recording this special action in the undo
        // stack
        const snapshot = getSnapshot(model)

        // TODO: we use the exchangeId from the original exchange here so we
        // need to wait for the manager to confirm this updateSharedModel call
        // before we can continue. Otherwise the manager might receive the final
        // addTreePatchRecord before it gets any shared model updates. Currently
        // updateSharedModel waits for all of the dependent trees to update
        // their shared models before returning, so this might cause a long
        // delay.
        //
        // We could start a new exchange with the manager and just wait for
        // that, and then call updateSharedModel with the exchangeId for this
        // new exchange.
        //
        // Or we could add a new option to updateSharedModel so in some cases it
        // waits for all of the dependent trees to be updated and in other cases
        // it just waits for the manager to confirm it received the request.
        //
        // It might also be possible that we can change the async flow of
        // applying history events so it isn't necessary for the trees to wait
        // for the shared model to be fully updated. So then this
        // updateSharedModel call can just wait for a confirmation in all cases.
        //
        // - Q: Why is the exchangeId passed to updateSharedModel
        // - A: It isn't really needed but it is useful for debugging.
        //   updateSharedModel makes a new exchangeId for each tree that it
        //   sends the shared model to. It doesn't do anything with the passed
        //   in exchangeId.
        //
        // Note that the TreeMonitor takes care of closing the exchangeId used
        // here. This same exchangeId is passed to all the shared model
        // callbacks and then they are all waited for, and finally the exchange
        // is closed.
        //
        yield self.treeManagerAPI.updateSharedModel(historyEntryId, exchangeId, self.treeId, snapshot)
      }

      // Notify the tiles about the shared model update.
      //
      // TODO: an inefficiency  with this approach is that we are
      // treating all changes within the sharedModelPath the same.
      // The change in the shared model might not require the tree's
      // tiles to update any of their state.
      //
      // There is probably a way to use the mobx internals so we can
      // track what updateTreeAfterSharedModelChanges references and
      // only run it when one of those things have changed.
      //
      // TODO: This should not cause a loop because the implementation
      // of updateTreeAfterSharedModelChanges should not modify
      // the shared model or shared model view that triggered this
      // handler in the first place. However a developer might make
      // a mistake. So it would be useful if we could identify the
      // looping and notify them.
      if (isAlive(self)) {
        self.updateTreeAfterSharedModelChangesInternal(model, initialSharedModelMap)
      }
  })
}))
