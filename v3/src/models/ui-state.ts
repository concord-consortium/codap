import { action, makeObservable, observable } from "mobx"
import { scrollTileIntoView } from "../utilities/dom-utils"
import { booleanParam, urlParams } from "../utilities/url-params"
import { ITileModel } from "./tiles/tile-model"
import { RulerState, RulerStateKey } from "./ui-state-types"

/*
  UIState represents globally accessible user-interface state that is not undoable, is not
  automatically saved, and doesn't dirty the document (and thus trigger an auto-save).
  It can be manually saved by copying it into the document during pre-serialization if desired.
 */
export class UIState {
  // support for standalone mode for data interactives/plugins
  @observable
  private _standaloneMode = false
  @observable
  private _standalonePlugin = ""
  // support for component mode (minimal chrome for embedding)
  @observable
  private _componentMode = false
  // support for embedded mode (like component mode, but with iframePhone communication)
  @observable
  private _embeddedMode = false
  // support for embedded server (iframePhone communication without UI changes)
  @observable
  private _embeddedServer = false
  @observable
  private _hideUndoRedoInComponent = false
  @observable
  private _suppressUnsavedWarning = false
  @observable
  private _hideSplashScreen = false
  @observable
  private _hideUserEntryModal = false
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

  @observable
  isDraggingTile = false

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

  // Id of attribute whose formula is being edited using the editor modal
  @observable private _editFormulaAttributeId = ""

  constructor() {
    const {
      componentMode, dashboard, di, embeddedMode, embeddedServer, hideSplashScreen,
      hideUndoRedoInComponent, noEntryModal, sample, standalone, suppressUnsavedWarning
    } = urlParams
    this._hideSplashScreen = booleanParam(hideSplashScreen)
    this._hideUserEntryModal = !!sample || booleanParam(dashboard) || !!di || booleanParam(noEntryModal)

    // Initialize standalone mode
    this._standaloneMode = booleanParam(standalone)
    const standaloneParamLower = (standalone || "").toLowerCase()
    const kTrueStrings = ["true", "yes", "1"]
    // if standalone is a plugin name, then only that plugin is standalone
    this._standalonePlugin = standalone && this._standaloneMode && !kTrueStrings.includes(standaloneParamLower)
                              ? standalone
                              : ""

    // Initialize component mode
    this._componentMode = booleanParam(componentMode)
    this._hideUndoRedoInComponent = booleanParam(hideUndoRedoInComponent)
    this._suppressUnsavedWarning = booleanParam(suppressUnsavedWarning)

    // Initialize embedded mode
    this._embeddedMode = booleanParam(embeddedMode)
    // embeddedServer is active in embedded mode OR when explicitly enabled
    this._embeddedServer = this._embeddedMode || booleanParam(embeddedServer)

    makeObservable(this)
  }

  get hideAppToolbar() {
    return this._standaloneMode
  }

  get standaloneMode() {
    return this._standaloneMode
  }

  // support for standalone mode for data interactives/plugins
  isStandaloneTile(tile?: ITileModel): boolean {
    const standalonePlugin = this._standalonePlugin.toLowerCase()
    const tileNameLower = (tile?.name || '').toLowerCase()
    const tileTitleLower = (tile?.title || '').toLowerCase()
    const tileType = tile?.content.type

    return this._standaloneMode &&
          tileType === 'CodapWebView' && // V3 equivalent of DG.GameView
          (!standalonePlugin || [tileNameLower, tileTitleLower].includes(standalonePlugin))
  }

  // Component mode getters
  get componentMode() {
    return this._componentMode
  }

  // Embedded mode getters
  get embeddedMode() {
    return this._embeddedMode
  }

  get embeddedServer() {
    return this._embeddedServer
  }

  get shouldRenderMenuBar() {
    return !this._componentMode && !this._embeddedMode
  }

  get shouldRenderToolShelf() {
    return !this._componentMode && !this._embeddedMode && !this.standaloneMode
  }

  get shouldRenderBetaBanner() {
    return !this._componentMode && !this._embeddedMode
  }

  get allowComponentMove() {
    return !this._componentMode && !this._embeddedMode
  }

  get allowComponentResize() {
    return !this._componentMode && !this._embeddedMode
  }

  get allowComponentClose() {
    return !this._componentMode && !this._embeddedMode
  }

  get allowComponentMinimize() {
    return !this._componentMode && !this._embeddedMode
  }

  get shouldShowUndoRedoInComponentTitleBar() {
    return (this._componentMode || this._embeddedMode) && !this._hideUndoRedoInComponent
  }

  get shouldSuppressUnsavedWarning() {
    return this._suppressUnsavedWarning || this._componentMode || this._embeddedMode
  }

  get shouldUpdateBrowserTitleFromDocument() {
    return !this._componentMode && !this._embeddedMode
  }

  get shouldShowSplashScreen() {
    return !this._componentMode && !this._embeddedMode
  }

  get shouldAutoFocusInitialTile() {
    return this._componentMode || this._embeddedMode
  }

  get hideSplashScreen() {
    return this._hideSplashScreen
  }

  @action
  setHideSplashScreen() {
    this._hideSplashScreen = true
  }

  get hideUserEntryModal() {
    return this._hideUserEntryModal
  }

  @action
  setHideUserEntryModal() {
    this._hideUserEntryModal = true
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

  get editFormulaAttributeId() {
    return this._editFormulaAttributeId
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
    if (tileId) {
      scrollTileIntoView(tileId)
    }
  }

  @action
  setHoveredTile(tileId = "") {
    this.hoverTileId = tileId
  }

  @action
  setIsDraggingTile(isDragging: boolean) {
    this.isDraggingTile = isDragging
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

  @action setEditFormulaAttributeId(id?: string) {
    this._editFormulaAttributeId = id ?? ""
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
