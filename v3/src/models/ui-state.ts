import { action, makeObservable, observable } from "mobx"
import { RulerState, RulerStateKey } from "./ui-state-types"

/*
  UIState represents globally accessible user-interface state that is not undoable, is not
  automatically saved, and doesn't dirty the document (and thus trigger an auto-save).
  It can be manually saved by copying it into the document during pre-serialization if desired.
 */
export class UIState {
  // the focused tile is a singleton; in theory there can be multiple selected tiles
  @observable
  private focusTileId = ""
  // rulerState is used by graph inspector to manage the visibility univariate measure groups
  @observable
  rulerState: RulerState = {
    measuresOfCenter: true,
    measuresOfSpread: false,
    boxPlotAndNormalCurve: false,
    otherValues: false
  }

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
  setFocusedTile(tileId = "") {
    this.focusTileId = tileId
  }

  getRulerStateVisibility(key: RulerStateKey) {
    return this.rulerState[key]
  }

  @action
  setRulerStateVisibility(key: RulerStateKey, visible: boolean) {
    this.rulerState[key] = visible
  }

  @action
  toggleRulerStateVisibility(key: RulerStateKey) {
    this.rulerState[key] = !this.rulerState[key]
  }
}

export const uiState = new UIState()
