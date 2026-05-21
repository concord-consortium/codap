import { applySnapshot, getSnapshot, types } from "mobx-state-tree"

const kPersistentStateKey = "persistentState"

/*
  PersistentState represents globally accessible state that is not undoable and doesn't dirty the document
  (and thus trigger an auto-save), but is saved to local storage between sessions and shared between tabs.
 */
export const PersistentState = types.model("PersistentState", {
  toolbarPosition: types.optional(types.enumeration(["Top", "Left"]), "Top"),
  disableGraphicsAcceleration: types.maybe(types.boolean)
})
.actions(self => ({
  save() {
    try {
      localStorage.setItem(kPersistentStateKey, JSON.stringify(getSnapshot(self)))
    } catch (e) {
      //
    }
  }
}))
.actions(self => ({
  setToolbarPosition(position: "Top" | "Left") {
    self.toolbarPosition = position
    self.save()
  },
  // Signature is `boolean`, not `boolean | undefined`: on re-enable we write
  // `false` explicitly rather than clearing to `undefined`, so the change
  // fires MobX reactions and the cross-tab `storage` event propagates.
  setDisableGraphicsAcceleration(disabled: boolean) {
    self.disableGraphicsAcceleration = disabled
    self.save()
  }
}))

function getSavedSnapshot() {
  let storedState: string | null = null
  try {
    storedState = localStorage.getItem(kPersistentStateKey)
  } catch (e) {
    //
  }
  return storedState ? JSON.parse(storedState) : {}
}

export const persistentState = PersistentState.create(getSavedSnapshot())

export function updatePersistentStateFromStorage() {
  applySnapshot(persistentState, getSavedSnapshot())
}

// Updates persistentState whenever another tab changes the stored value
window.addEventListener("storage", e => {
  if (e.key === kPersistentStateKey) {
    updatePersistentStateFromStorage()
  }
})
