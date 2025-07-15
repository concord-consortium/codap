import { ICreateHistoryEntry, TreePatchRecordSnapshot } from "./history"
import { IUndoManager } from "./undo-store"

export interface TreeManagerAPI {
    /**
     * Propagate shared model state to other trees.
     *
     * The shared model is identified by an id inside of the snapshot. The
     * sourceTreeId indicates which tree is sending this update. The new shared
     * model snapshot will not be sent back to this source.
     *
     * Note: The returned promise should only resolve after the shared model has
     * been updated in the manager and in all trees that are using the shared
     * model. The promise does not guarantee that all of the tiles have updated
     * their own objects related to the shared model. In particular when this is
     * called when applying patches from an undo or redo, the tiles will
     * explicitly not update their related objects because they will receive
     * patches that should contain these changes separately.
     *
     * This promise is needed because we need to stop some updating before
     * replaying a history event, and then we need to start it up again
     * afterward. So we need to know when the history event has been fully
     * applied. When the history event includes changes to a shared model, fully
     * applying it means the tree of the shared model has sent its changes to
     * all of the trees that are using it. So when the shared model tree gets
     * the applyPatchesFromManager call it then calls this updateSharedModel and
     * waits for it to resolve before resolving its own promise.
     *
     * The returned promise will also be used when a user event is sent, we need
     * to make sure the manager has received this update message before the
     * tree tells the manager is done modifying the historyEntry. In this case
     * it isn't necessary for the returned promise to wait until all of the
     * trees have received the message. That could be the responsibility of the
     * manager. Perhaps we can simplify this so this call doesn't need to
     * block until all of the trees using the shared model have been notified.
     * That blocking could be the responsibility of the manager after this call
     * is done.
     */
    updateSharedModel: (historyEntryId: string, exchangeId: string,
        sourceTreeId: string, snapshot: any) => Promise<void>

    /**
     * Trees should call this to start a new history entry. These history
     * entries are used for 2 things:
     * - the undo stack
     * - time traveling the document back to a previous state
     *
     * When the user does an undo the manager will send the inversePatches of
     * the recorded tree patch records that are grouped by the
     * historyEntryId to the tree with `applyPatchesFromManager`.
     *
     * When time traveling is done, the manager will collect all the history
     * events from the current time to the desired time. It will then
     * group all of the patches in these events by tree and send them all to the
     * tree at the same time. This is done with `applyPatchesFromManager`.
     *
     * The tree calling `addHistoryEntry` should wait for the returned promise
     * to resolve and then call a `addTreePatchRecord`. If the tree is also
     * calling `updateSharedModel` it should wait for both the updateSharedModel
     * and the `addHistoryEntry` to resolve before calling `addTreePatchRecord`.
     * Calling `addTreePatchRecord` is necessary so the manager knows the tree
     * is done sending information about this historyEntryId. Because other
     * trees might respond to a sharedModel update with further changes to other
     * sharedModels this might trigger another change back in the original tree.
     * In order to differentiate between the initiating call and the second call
     * the exchangeId parameter is used.
     *
     * One reason why we don't just use addTreePatchRecord to start the history
     * entry is because some actions don't have any patches in their own tree
     * but they change a shared model owned by another tree. In that case we
     * want to record the initiating tree action so there is more info for the
     * researcher.
     *
     * @param entryInfo.id should be a unique id created by the tree.
     *
     * @param entryInfo.exchangeId should be another unique id created by the tree. The
     * manager uses this to differentiate between multiple flows of messages
     * being sent to the manager. For every addHistoryEntry message there
     * should be a addTreePatchRecord message with the same exchangeId.
     *
     * @param entryInfo.treeId id of the tree that is adding this history entry.
     *
     * @param entryInfo.modelName name of the model that caused this history entry to be
     * added.
     *
     * @param entryInfo.actionName name of the action that caused this history entry to be
     * added.
     *
     * @param entryInfo.undoable true if this action should be saved to the undo stack.
     * Changes that result from `applyPatchesFromManager` should not be undo-able.
     *
     * @param entryInfo.customPatches array of client-provided patches for custom undo/redo.
     *
     * @param entryInfo.clientData client-provided metadata for undo/redo.
     */
    addHistoryEntry: (entryInfo: ICreateHistoryEntry) => Promise<void>

    /**
     * Trees should call this to record the actual patches of a history event.
     * They should always call this even if there are no patches. This message
     * is how the manager knows the tree is done sending messages with this
     * particular exchangeId.
     *
     * @param historyEntryId the id of the entry these patches are for. If this
     * tree initiated this history entry with `addHistoryEntry`, this id should
     * be the historyEntryId sent in that call. If the patches being sent were
     * triggered by the manager this id should be the `historyEntryId` that
     * was passed in with the message from the manager. TODO: list the tree
     * methods the manager can call that might result in changes.
     *
     * @param exchangeId the exchangeId that started this flow of events. If
     * this tree initiated this history entry with `addHistoryEntry`, this id
     * should be the exchangeId sent in that call.  If the patches being sent were
     * triggered by the manager this id should be the `exchangeId` that was
     * passed in with the message from the manager. TODO: list the tree
     * methods the manager can call that might result in changes.
     *
     * @param record the actual changes. If there are no changes this should
     * still be sent with empty patches.
     */
    addTreePatchRecord: (historyEntryId: string, exchangeId: string, record: TreePatchRecordSnapshot) => void

    /**
     * This starts a new "exchange" in the history entry. These exchanges are
     * used by the manager to know when the history entry is complete. If there
     * are any open exchanges, then the history entry is still recording.
     * `addHistoryEntry` automatically starts an exchange, so it isn't necessary
     * to call `startExchange` before `addHistoryEntry`.
     * When the manager calls the tree with `applyPatchesFromManager`, the
     * manager starts an exchange.
     *
     * startExchange should be called when the tree wants to start some async
     * code outside of one of these existing exchanges. It should call
     * `startExchange` while it is handling an existing exchange. And it should
     * wait for the promise of `startExchange` to resolve before it closes out
     * the existing exchange (by calling addTreePatchRecord). This way there
     * will not be a time when all the exchanges of this history entry are
     * closed, so the manager will keep the history entry "recording".
     *
     * This is currently used when the tree's tiles are updating themselves
     * after the shared model has changed. It is also used by the undo store
     * when it is replaying events to the trees.
     *
     * @param historyEntryId the history entry id that this exchange is being
     * added to. This could be the one that was created with addHistoryEntry or
     * it could be one that was initialized by the manager.
     *
     * @param exchangeId a unique id created by the tree to identify this
     * exchange. This same exchangeId needs to be passed to addTreePatchRecord
     * to end this call.
     *
     * @param name this is an identifier that is useful for error messages if a
     * history entry is not complete when it is expected to be complete. The list
     * of active exchanges can be viewed to see which one hasn't ended yet.
     */
    startExchange: (historyEntryId: string, exchangeId: string, name: string) => Promise<void>

    /**
     * This provides an interface for Trees to undo and redo history events
     */
    undoManager: IUndoManager
}
