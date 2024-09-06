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
  // attribute id of the cell being edited
  @observable attrIdToEdit: Maybe<string>
  // rulerState is used by graph inspector to manage the visibility univariate measure groups
  @observable
  rulerState: RulerState = {
    measuresOfCenter: true,
    measuresOfSpread: false,
    boxPlotAndNormalCurve: false,
    otherValues: false
  }

  // Values used by the Collaborative plugin to ensure a shared table does not change while a user is editing it

  // True if the user is editing a cell in a table.
  @observable
  private _isEditingCell = false

  // True if the user is currently editing a table that blocks API requests,
  // preventing the table from changing out from under the user.
  @observable
  private _isEditingBlockingCell = false

  // True if the prior cell edit was completed via navigation to another cell.
  @observable
  private _isNavigatingToNextEditCell = false

  // The number of request batches that have been processed.
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

  get isEditingCell() {
    return this._isEditingCell
  }

  get isEditingBlockingCell() {
    return this._isEditingBlockingCell
  }

  get isNavigatingToNextEditCell() {
    return this._isNavigatingToNextEditCell
  }

  // When we refresh the selected cell, it should be in editing mode if we were editing
  // or we navigated from the last edit with "enter" or "tab".
  get refreshSelectedCellEditing() {
    return this.isEditingCell || this.isNavigatingToNextEditCell
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
  setIsEditingCell(value: boolean) {
    this._isEditingCell = value
  }

  @action
  setIsEditingBlockingCell(isEditingBlockingCell = false) {
    this._isEditingBlockingCell = isEditingBlockingCell
  }

  @action
  setIsNavigatingToNextEditCell(isNavigating: boolean) {
    this._isNavigatingToNextEditCell = isNavigating
  }

  @action
  incrementRequestBatchesProcessed() {
    this._requestBatchesProcessed += 1
  }

  @action setAttrIdToEdit(attrId?: string) {
    this.attrIdToEdit = attrId
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
