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
  @observable
  private hoverTileId = ""
  // rulerState is used by graph inspector to manage the visibility univariate measure groups
  @observable
  rulerState: RulerState = {
    measuresOfCenter: true,
    measuresOfSpread: false,
    boxPlotAndNormalCurve: false,
    otherValues: false
  }

  // Values used by the Collaborative plugin to ensure a shared table does not change while a user is editing it

  // the last key the user has entered into a table cell
  // This is used to determine whether the selected cell should be in editing mode when refreshing it after
  // allowing delayed API requests to potentially modify the table.
  @observable
  private _lastTableKey = ""
  // true if the user is currently editing a table
  // This blocks the API request handler, preventing the table from changing out from under the user.
  @observable
  private _editingTable = false
  // the number of request batches that have been processed
  // This triggers refreshes to the selected cell after delayed API requests have been processed.
  @observable
  private _requestBatchesProcessed = 0

  constructor() {
    makeObservable(this)
  }

  get focusedTile() {
    return this.focusTileId
  }

  get hoveredTile() {
    return this.hoverTileId
  }

  get lastTableKey() {
    return this._lastTableKey
  }

  get tableInEditMode() {
    return ["Enter", "Tab"].includes(this.lastTableKey)
  }

  get editingTable() {
    return this._editingTable
  }

  get requestBatchesProcessed() {
    return this._requestBatchesProcessed
  }

  isFocusedTile(tileId?: string) {
    return this.focusTileId === tileId
  }

  isHoveredTile(tileId?: string) {
    return this.hoverTileId === tileId
  }

  @action
  setFocusedTile(tileId = "") {
    this.focusTileId = tileId
  }

  @action
  setHoveredTile(tileId = "") {
    this.hoverTileId = tileId
  }

  @action
  setLastTableKey(key = "") {
    this._lastTableKey = key
  }

  @action
  setEditingTable(editingTable = false) {
    this._editingTable = editingTable
  }

  @action
  incrementRequestBatchesProcessed() {
    this._requestBatchesProcessed += 1
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
