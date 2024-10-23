import { action, makeObservable, observable } from "mobx"

/*
  DataInteractiveState represents globally accessible data interactive (plugin) state that is not undoable, is not
  automatically saved, and doesn't dirty the document (and thus trigger an auto-save).
 */
export class DataInteractiveState {
  @observable private _draggingDatasetId = ""
  @observable private _draggingAttributeId = ""
  @observable private _draggingXOffset = 0
  @observable private _draggingYOffset = 0
  @observable private _draggingOverlayHeight = 100
  @observable private _draggingOverlayWidth = 100

  constructor() {
    makeObservable(this)
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

  @action endDrag() {
    this.setDraggingAttributeId()
    this.setDraggingDatasetId()
    this.setDraggingOverlayHeight()
    this.setDraggingOverlayWidth()
    this.setDraggingXOffset()
    this.setDraggingYOffset()
  }
}

export const dataInteractiveState = new DataInteractiveState()
