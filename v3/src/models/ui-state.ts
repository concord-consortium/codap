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

  // True if _isEditingCell was true before being interrupted (e.g. by API processing).
  @observable
  private _wasEditingCellBeforeInterruption = false

  // The number of editing interruptions (e.g. processing API requests) that have occurred.
  // This triggers refreshes to the selected cell after delayed API requests have been processed.
  @observable
  private _interruptionCount = 0

  @observable private _draggingDatasetId = ""
  @observable private _draggingAttributeId = ""
  @observable private _draggingXOffset = 0
  @observable private _draggingYOffset = 0
  @observable private _draggingOverlayHeight = 100
  @observable private _draggingOverlayWidth = 100

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

  get wasEditingCellBeforeInterruption() {
    return this._wasEditingCellBeforeInterruption
  }

  get interruptionCount() {
    return this._interruptionCount
  }

  get draggingDatasetId() {
    return this._draggingDatasetId
  }

  get draggingAttributeId() {
    return this._draggingAttributeId
  }

  get draggingXOffset() {
    return this._draggingXOffset
  }

  get draggingYOffset() {
    return this._draggingYOffset
  }

  get draggingOverlayHeight() {
    return this._draggingOverlayHeight
  }

  get draggingOverlayWidth() {
    return this._draggingOverlayWidth
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
  setIsEditingCell(isEditing: boolean) {
    if (!isEditing) {
      this._isEditingBlockingCell = false
    }
    this._isEditingCell = isEditing
  }

  @action
  setIsEditingBlockingCell() {
    this._isEditingBlockingCell = true
  }

  @action
  captureEditingStateBeforeInterruption() {
    if (this.isEditingCell) {
      this._wasEditingCellBeforeInterruption = true
    }
  }

  @action
  clearEditingStateAfterInterruption() {
    this._wasEditingCellBeforeInterruption = false
  }

  @action
  incrementInterruptionCount() {
    this._interruptionCount += 1
  }

  @action setAttrIdToEdit(attrId?: string) {
    this.attrIdToEdit = attrId
  }

  @action setDraggingDatasetId(datasetId?: string) {
    this._draggingDatasetId = datasetId ?? ""
  }

  @action setDraggingAttributeId(attributeId?: string) {
    this._draggingAttributeId = attributeId ?? ""
  }

  @action setDraggingXOffset(offset = 0) {
    this._draggingXOffset = offset
  }

  @action setDraggingYOffset(offset = 0) {
    this._draggingYOffset = offset
  }

  @action setDraggingOverlayHeight(height = 100) {
    this._draggingOverlayHeight = height
  }

  @action setDraggingOverlayWidth(width = 100) {
    this._draggingOverlayWidth = width
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
