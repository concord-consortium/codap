import { action, makeObservable, observable } from "mobx"

/*
  UIState represents globally accessible user-interface state that is not undoable, is not
  automatically saved, and doesn't dirty the document (and thus trigger an auto-save).
  It can be manually saved by copying it into the document during pre-serialization if desired.
 */
export class UIState {
  // the focused tile is a singleton; in theory there can be multiple selected tiles
  @observable
  private focusTileId = ""

  constructor() {
    makeObservable(this)
  }

  get focusedTile() {
    return this.focusTileId
  }

  isFocusedTile(tileId?: string) {
    return this.focusTileId === tileId
  }

  @action
  setFocusedTile(tileId: string) {
    this.focusTileId = tileId
  }
}

export const uiState = new UIState()
