import { types, Instance, flow, getParent, IAnyStateTreeNode, getType } from "mobx-state-tree"
import { nanoid } from "nanoid"
import { HistoryEntry, HistoryEntryType, HistoryOperation } from "./history"
// eslint-disable-next-line import/no-cycle
import { TreeManager } from "./tree-manager"
import { applyCustomRedo, applyCustomUndo, hasCustomUndoRedo } from "./custom-undo-redo-registry"
import { DEBUG_UNDO } from "../../lib/debug"

export interface IUndoManager {
  undoLevels : number
  redoLevels : number
  canUndo : boolean
  canRedo : boolean
  undoEntry : HistoryEntryType | undefined
  redoEntry : HistoryEntryType | undefined
  undo() : IUndoInformation
  redo() : IUndoInformation
}

// Information that is returned by undo and redo calls
export interface IUndoInformation {
  id: string|undefined,
  action: string|undefined
}

export const UndoStore = types
.model("UndoStore", {
  history: types.array(types.reference(HistoryEntry)),
  undoIdx: 0
})
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
  findHistoryEntry(historyEntryId: string) {
    return self.history.find(entry => entry.id === historyEntryId)
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
      yield tree.applyPatchesFromManager(historyEntryId,  applyExchangeId,
          treePatchRecord.getPatches(opType))
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
  })

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

      const entryToUndo = self.history[self.undoIdx -1]

      if (entryToUndo.customPatches?.length) {
        const manager: Instance<typeof TreeManager> = getParent(self)
        const document = manager.mainDocument as IAnyStateTreeNode | undefined
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
        applyPatchesToTrees(entryToUndo, HistoryOperation.Undo)
      }

      self.undoIdx--
      return {
        id: entryToUndo.id,
        action: entryToUndo.action
      }
    },
    redo() {
      if (!self.canRedo) {
        throw new Error("redo not possible, nothing to redo")
      }

      const entryToRedo = self.history[self.undoIdx]

      if (entryToRedo.customPatches?.length) {
        const manager: Instance<typeof TreeManager> = getParent(self)
        const document = manager.mainDocument as IAnyStateTreeNode | undefined
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
        applyPatchesToTrees(entryToRedo, HistoryOperation.Redo)
      }

      self.undoIdx++
      return {
        id: entryToRedo.id,
        action: entryToRedo.action
      }
    },
  }
})
