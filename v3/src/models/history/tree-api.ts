import { IJsonPatch } from "mobx-state-tree"

/**
 * This is the API for a Tree in the system.
 *
 * It would typically be implemented by a MST model that defines actions for
 * each of the functions below.
 *
 * Each action should return a promise that resolves when the action is complete
 * this is necessary to support trees running in iframes or workers. The
 * function comment should define what "complete" means for each action.
 */

export interface TreeAPI {
  /**
   * This is called before the manager starts doing an undo or redo or
   * replaying history events. The tree should use this action to disable any
   * updating it does when it receives changes in the shared models it is
   * using.
   *
   * @param historyEntryId the id of the history entry that will record all of
   * these changes to the tree. This is *not* the historyEntryId that is the
   * parent of the patches that will be sent next. This historyEntryId is
   * passed back to the manager when this action is complete. In the CLUE
   * implementation, this is done by the tree-monitor not by the action
   * itself.
   *
   * @param exchangeId the id of this `startApplyingPatchesFromManager` request.
   * It should be passed back to the manager when this action is complete.
   * In the CLUE implementation, this is done by the tree-monitor not by the
   * action itself.
   *
   * @returns a promise that should resolve when the tree is ready to receive
   * patches from the manager and changes in the shared models.
   *
   * The `Tree` model implements this action.
   *
   * Note: The historyEntryId and exchangeId are not currently used by the
   * TreeManager or UndoStore when they call startApplyingPatchesFromManager.
   * They use promises to wait for the tree to finish with this. However, to
   * support trees in iframes it will be necessary to tie the request of to
   * startApplyingPatchesFromManager with the tree's response. So these two ids are
   * here to support that scenario.
   */
  startApplyingPatchesFromManager(historyEntryId: string, exchangeId: string): Promise<void>

  /**
   * This is called by the manager to do an undo or redo or replay history
   * events. This is how the manager sends the tree the patches that it
   * should apply. These are patches that the tree previously sent to the
   * manager with `addTreePatchRecord`. If the tree did this right, it
   * should only include patches that are modifying the tree's state, it
   * shouldn't include patches that are for the shared models that are owned
   * by a different tree.
   *
   * @param historyEntryId the id of the history entry that will record all of
   * these changes to the tree. This is *not* the historyEntryId that is the
   * parent of the patches. This historyEntryId needs to be passed back when
   * the tree records this change back to the manager with
   * addTreePatchRecord.
   *
   * @param exchangeId the manager uses this id to identify this specific
   * set of patches. This exchangeId needs to be passed back when the tree
   * records this change back to the manager with addTreePatchRecord.
   *
   * @param patchesToApply an array of JSON patches to be applied to the tree.
   * The patches should be applied in order starting from the first in the
   * array.
   */
  applyPatchesFromManager(historyEntryId: string, exchangeId: string,
    patchesToApply: readonly IJsonPatch[]): Promise<void>

  /**
   * This is called after the manager has applied all of the patches. Before
   * this is called by the manager, all trees modified by the patches will
   * have confirmed they have received the patches. And all shared models
   * modified by the patches will have confirmed that trees using them have
   * received the updated shared model.
   *
   * When the tree receives this it should re-enable its process of updating
   * the tile state when its shared models change. The `Tree` model implements
   * this for you.
   *
   * @param historyEntryId the id of the history entry that will record all of
   * these changes to the tree. This is *not* the historyEntryId that is the
   * parent of the patches that were just applied.
   *
   * @param exchangeId an id created by the manager to track this request.
   * It should be passed back to the manager with addTreePatchRecord after
   * the tree has handled the request.
   *
   * TODO: describe when the promise should resolve in this case. Should it
   * wait for any updates to tree state from shared model changes?
   *
   */
  finishApplyingPatchesFromManager(historyEntryId: string, exchangeId: string): Promise<void>

  /**
   * TODO: need to bring over updated documentation from prototype
   */
  applySharedModelSnapshotFromManager(historyEntryId: string, exchangeId: string, snapshot: any): Promise<void>
}
