import { types, Instance, flow, getParent, getType, IJsonPatch } from "mobx-state-tree"
import { nanoid } from "nanoid"
import { HistoryEntry, HistoryEntryType, HistoryOperation } from "./history"
// eslint-disable-next-line import-x/no-cycle
import { TreeManager } from "./tree-manager"
import { applyCustomRedo, applyCustomUndo, hasCustomUndoRedo } from "./custom-undo-redo-registry"
import { DEBUG_UNDO } from "../../lib/debug"
import { getRollbar } from "../../lib/rollbar/rollbar"

export interface IUndoManager {
  undoLevels : number
  redoLevels : number
  canUndo : boolean
  canRedo : boolean
  undoEntry : HistoryEntryType | undefined
  redoEntry : HistoryEntryType | undefined
  undo() : IUndoInformation
  redo() : IUndoInformation
  setHistoryListener(listener?: UndoHistoryListener): void
  liveHistoryEntryIds: string[]
  clearHistory(): void
}

// Called after the undo history changes: an undoable entry is added ("add"), an entry is undone
// or redone, or the entries that could be undone ("clearUndo") or redone ("clearRedo") are erased.
// Lets the app notify plugins of each change as it happens.
export type UndoHistoryChange = "add" | "undo" | "redo" | "clearUndo" | "clearRedo"
// For "undo" and "redo", entryId is the id of the entry undone or redone.
export type UndoHistoryListener = (change: UndoHistoryChange, entryId?: string) => void

// Why applying an undo or redo step failed, and why reverting it failed if it did
interface IApplyFailure {
  error: unknown
  revertError?: unknown
}

// Information that is returned by undo and redo calls
export interface IUndoInformation {
  id?: string,
  action?: string
}

export const UndoStore = types
.model("UndoStore", {
  history: types.array(types.reference(HistoryEntry)),
  undoIdx: 0
})
.volatile(() => ({
  historyListener: undefined as UndoHistoryListener | undefined,
  // the number of undos and redos made so far
  undoRedoCount: 0
}))
.views((self) => ({
  get undoLevels() {
    return self.undoIdx
  },
  get redoLevels() {
    return self.history.length - self.undoIdx
  },
  get canUndo() {
    return this.undoLevels > 0
  },
  get canRedo() {
    return this.redoLevels > 0
  },
  get undoEntry() {
    return this.canUndo ? self.history[self.undoIdx - 1] : undefined
  },
  get redoEntry() {
    return this.canRedo ? self.history[self.undoIdx] : undefined
  },
  // the ids of the entries in the undo history and of those still being recorded
  get liveHistoryEntryIds(): string[] {
    const manager = getParent<{ activeHistoryEntries: HistoryEntryType[] }>(self)
    return [...self.history.map(entry => entry.id), ...manager.activeHistoryEntries.map(entry => entry.id)]
  },
  findHistoryEntry(historyEntryId: string) {
    return self.history.find(entry => entry.id === historyEntryId)
  },
  // whether an entry clears the redo list when it completes: a change that can't be undone, made on purpose, and
  // with no undo or redo made since it was made
  clearsRedoOnCompletion(entry: HistoryEntryType) {
    return !!entry.clearsRedo && !entry.noDirty && entry.undoRedoCountAtStart === self.undoRedoCount
  }
}))
.actions((self) => ({
  setHistoryListener(listener?: UndoHistoryListener) {
    self.historyListener = listener
  },

  // erase the whole history, the undo side first, as V2's clearUndoRedoHistory did (undo_history.js:248-251)
  clearHistory() {
    self.history.splice(0, self.undoIdx)
    self.undoIdx = 0
    self.historyListener?.("clearUndo")
    self.history.clear()
    self.historyListener?.("clearRedo")
  },

  // erase the entries that could be redone, telling the listener only when there were some, so a burst of
  // changes that can't be undone reports it once
  clearRedo() {
    if (self.redoLevels === 0) return
    self.history.splice(self.undoIdx)
    self.historyListener?.("clearRedo")
  }
}))
.actions((self) => {
  // We use a flow here so we don't have to create separate actions for each of
  // the parts of this action
  const applyPatchesToTrees = flow(function* applyPatchesToTrees(
    entryToUndo: Instance<typeof HistoryEntry>, opType: HistoryOperation) {

    const treePatchRecords = entryToUndo.records

    const historyEntryId = nanoid()
    const exchangeId = nanoid()

    const manager: Instance<typeof TreeManager> = getParent(self)

    // Start a non-undoable action with this id
    // TODO: we are using a fake tree id of "manager" here. This is currently
    // working, but we probably want to review this approach.
    const historyEntry = manager.createHistoryEntry({
      id: historyEntryId,
      exchangeId,
      tree: "manager",
      model: getType(self).name,
      action: opType,
      undoable: false
    })

    // Collect the trees that we are going to work with
    const treeIds = treePatchRecords.map(treePatchRecord => treePatchRecord.tree)
    const uniqueTreeIds = [...new Set(treeIds)]

    // first disable shared model syncing in each tree
    // Order of calls does not matter for this operation.
    const startPromises = uniqueTreeIds.map(treeId => {
      const startExchangeId = nanoid()
      manager.startExchange(historyEntryId, startExchangeId, "UndoStore.applyPatchesToTrees.start")
      return manager.trees[treeId].startApplyingPatchesFromManager(historyEntryId, startExchangeId)
    })
    yield Promise.all(startPromises)

    // apply the patches to all trees, in reverse order if we are undoing changes.
    const undoRecords = [ ...treePatchRecords ]
    if (opType === HistoryOperation.Undo) {
      undoRecords.reverse()
    }
    // The patches that revert each record applied so far, so a failure can revert them
    const appliedRecords: Array<{ treeId: string, revertPatches: IJsonPatch[] }> = []
    let failure: Maybe<IApplyFailure>
    for (const treePatchRecord of undoRecords) {
      // console.log(`send tile entry to ${opType} to the tree`, getSnapshot(treeEntry))

      // If there are multiple trees, and a patch is applied to shared model
      // owned by a tree. The tree will send an updated snapshot of the
      // shared model to the tree manager. The tree manager will send this
      // snapshot to all of other trees that have a views of this shared
      // model. If this is working properly the promise returned by
      // the owning tree's applyPatchesFromManager will not resolve until all
      // trees with views of this shared model have updated their views.

      // We use a new exchangeId for each tree's apply call, so the tree
      // can finish its own exchange when it calls addTreeRecordPatches.
      const applyExchangeId = nanoid()
      manager.startExchange(historyEntryId, applyExchangeId, "UndoStore.applyPatchesToTrees.apply")

      const tree = manager.trees[treePatchRecord.tree]
      try {
        const revertPatches: IJsonPatch[] = yield tree.applyPatchesFromManager(historyEntryId,  applyExchangeId,
            treePatchRecord.getPatches(opType))
        appliedRecords.push({ treeId: treePatchRecord.tree, revertPatches })
      } catch (error) {
        // The tree reverted its changes but didn't record them, so it didn't close this exchange
        manager.endExchange(historyEntry, applyExchangeId)
        failure = { error }
        break
      }
    }

    if (failure) {
      // Typically the entry refers to a tile or data set that a change which can't be undone has
      // since removed. Revert the records already applied so the document is unchanged.
      for (const { treeId, revertPatches } of appliedRecords.reverse()) {
        const revertExchangeId = nanoid()
        manager.startExchange(historyEntryId, revertExchangeId, "UndoStore.applyPatchesToTrees.revert")
        try {
          yield manager.trees[treeId].applyPatchesFromManager(historyEntryId, revertExchangeId, revertPatches)
        } catch (revertError) {
          // Not expected, since this reverses changes just made. The document's state is now
          // uncertain, so stop reverting; the trees still finish and the history is cleared.
          manager.endExchange(historyEntry, revertExchangeId)
          failure.revertError = revertError
          break
        }
      }
    }

    // finish the patch application
    //
    // Need to tell all of the tiles to re-enable the sync and run the sync to
    // update their tile models with any changes in the shared models. For this
    // final step, we still use promises so we can wait for everything to
    // complete. This can be used in the future to make sure multiple
    // applyPatchesToTrees are not running at the same time.
    const finishPromises = uniqueTreeIds.map(treeId => {
      const finishExchangeId = nanoid()
      manager.startExchange(historyEntryId, finishExchangeId, "UndoStore.applyPatchesToTrees.finish")

      return manager.trees[treeId]
        .finishApplyingPatchesFromManager(historyEntryId, finishExchangeId)
    })
    yield Promise.all(finishPromises)

    // The top level exchange after the finish Promises is called. This
    // way each tree has a chance to add a new exchange to the history
    // entry which will keep it "recording" until that new exchange is
    // also finished.
    manager.endExchange(historyEntry, exchangeId)

    return failure
  })

  // After an entry fails to apply, the entries around it may refer to what is missing too, so
  // erase the whole history, much as V2 did whenever a change was made outside an undo command.
  function handleApplyFailure(opType: HistoryOperation, { error, revertError }: IApplyFailure) {
    const message = `${opType === HistoryOperation.Undo ? "Undo" : "Redo"} failed; clearing the undo history`
    const details = revertError === undefined ? [error] : [error, "Reverting the step also failed:", revertError]
    console.warn(message, ...details)
    getRollbar()?.warning(message, ...details)
    self.clearHistory()
  }

  // Tells the listener once the patches have been applied, as V2 did after the command's undo or redo
  function handlePatchesApplied(opType: HistoryOperation, patchesApplied: Promise<Maybe<IApplyFailure>>,
      entryId: string) {
    const change = opType === HistoryOperation.Undo ? "undo" : "redo"
    patchesApplied.then(
      failure => failure ? handleApplyFailure(opType, failure) : self.historyListener?.(change, entryId),
      // applyPatchesToTrees reports the failures it expects, so this is anything else it throws
      error => handleApplyFailure(opType, { error })
    )
  }

  // An undo or redo can come before the entries of the changes made just before it complete, as when a plugin
  // sends a change and undoButtonPress in one request. The redo list those changes clear is cleared before the
  // undo or redo, as V2 cleared it when the change was made, and the undo or redo keeps what it can redo.
  function beginUndoOrRedo() {
    const manager = getParent<{ activeHistoryEntries: HistoryEntryType[] }>(self)
    if (manager.activeHistoryEntries.some(entry => self.clearsRedoOnCompletion(entry))) self.clearRedo()
    self.undoRedoCount++
  }

  return {
    addHistoryEntry(entry: Instance<typeof HistoryEntry>) {
      // Find if there is already an HistoryEntry with this
      // historyEntryId. This action is called each time a new
      // TreePatchRecord is added to the HistoryEntry. If the
      // HistoryEntry has already been added then we don't modify it,
      // but we do always reset the undoIdx to the end of the history.

      if (DEBUG_UNDO) {
        // eslint-disable-next-line no-console
        console.log(`adding to undo history`, (entry as any).toJSON()/*.action*/)
      }
      const existingEntry = self.findHistoryEntry(entry.id)
      if (!existingEntry) {
        // This is a new user action, so if they had undone some amount already
        // we delete the part of the history that was past this undone point
        self.history.splice(self.undoIdx)
        self.history.push(entry)
      }

      // Reset the undoIdx to the end of the history, this is because it is a
      // user action so if the user had been undoing things, once they start
      // doing new things they can no longer 'redo' what was undone before.
      //
      // The fact that the undoIdx is reset in all cases even with an existing
      // entry is kind of confusing. This happens because if additional patches
      // are being added to an existing entry these are still user triggered
      // patches. So this needs to prevent the ability to redo.
      self.undoIdx = self.history.length
      self.historyListener?.("add")
    },

    // TODO: The MST undo manager that this code is based on, used atomic
    // operations for this. That way if the was an error applying the patch, then
    // the whole set of changes would be aborted. We do not currently take this
    // approach because it is harder to support when we have multiple trees.
    // Each tree would have to tell the tree manager if it succeeded or
    // failed to apply the patches. And then if one of them failed all of the trees
    // that succeeded would have to be reverted by the tree manager.
    undo() {
      if (!self.canUndo) {
        throw new Error("undo not possible, nothing to undo")
      }

      beginUndoOrRedo()
      const entryToUndo = self.history[self.undoIdx -1]
      let patchesApplied: Promise<Maybe<IApplyFailure>> | undefined

      if (entryToUndo.customPatches?.length) {
        const manager: Instance<typeof TreeManager> = getParent(self)
        const document = manager.mainDocument
        const patchCount = entryToUndo.customPatches.length
        for (let patchIdx = patchCount - 1; patchIdx >= 0; --patchIdx) {
          const patch = entryToUndo.customPatches[patchIdx]
          if (hasCustomUndoRedo(patch)) {
            document?.applyCustomUndoRedo(() => applyCustomUndo(document, patch, entryToUndo))
          }
        }
      }
      // don't apply standard patches if custom patches were specified
      else {
        // TODO: If there is an applyPatchesToTrees currently running we
        // should wait for it.
        //
        // TODO: we aren't actually calling this as an action and we
        // aren't waiting for it to finish before returning
        patchesApplied = applyPatchesToTrees(entryToUndo, HistoryOperation.Undo)
      }

      self.undoIdx--
      if (patchesApplied) {
        handlePatchesApplied(HistoryOperation.Undo, patchesApplied, entryToUndo.id)
      } else {
        self.historyListener?.("undo", entryToUndo.id)
      }
      return {
        id: entryToUndo.id,
        action: entryToUndo.action
      }
    },
    redo() {
      if (!self.canRedo) {
        throw new Error("redo not possible, nothing to redo")
      }

      beginUndoOrRedo()
      // the changes made just before may have cleared what could be redone
      if (!self.canRedo) return {}
      const entryToRedo = self.history[self.undoIdx]
      let patchesApplied: Promise<Maybe<IApplyFailure>> | undefined

      if (entryToRedo.customPatches?.length) {
        const manager: Instance<typeof TreeManager> = getParent(self)
        const document = manager.mainDocument
        const patchCount = entryToRedo.customPatches.length
        for (let patchIdx = patchCount - 1; patchIdx >= 0; --patchIdx) {
          const patch = entryToRedo.customPatches[patchIdx]
          if (hasCustomUndoRedo(patch)) {
            document?.applyCustomUndoRedo(() => applyCustomRedo(document, patch, entryToRedo))
          }
        }
      }
      // don't apply standard patches if custom patches were specified
      else {
        // TODO: If there is an applyPatchesToTrees currently running we
        // should wait for it.
        //
        // TODO: we aren't actually calling this as an action and we
        // aren't waiting for it to finish before returning
        //
        patchesApplied = applyPatchesToTrees(entryToRedo, HistoryOperation.Redo)
      }

      self.undoIdx++
      if (patchesApplied) {
        handlePatchesApplied(HistoryOperation.Redo, patchesApplied, entryToRedo.id)
      } else {
        self.historyListener?.("redo", entryToRedo.id)
      }
      return {
        id: entryToRedo.id,
        action: entryToRedo.action
      }
    },
  }
})
