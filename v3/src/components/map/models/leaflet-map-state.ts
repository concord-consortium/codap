import { LatLng, LatLngBoundsExpression, LatLngExpression, Map as LeafletMap } from 'leaflet'
import { debounce } from 'lodash'
import { action, computed, makeObservable, observable, runInAction } from "mobx"

interface IAdjustMapViewOptions {
  // specify center and/or zoom to set those directly
  center?: LatLngExpression
  zoom?: number
  // specify fitBounds to fit the bounds of the map to the data
  fitBounds?: LatLngBoundsExpression
  // let leaflet know when its bounds have changed
  invalidateSize?: boolean
  animate?: boolean
  // actions that complete within the debounce period are coalesced
  debounceMS?: number
  // if no leaflet events occur within the timeout period, complete the action
  timeoutMS?: number
  // if undo/redo strings are not specified, the action is not undoable
  undoStringKey?: string
  redoStringKey?: string
}

export class LeafletMapState {
  @observable leafletMap?: LeafletMap
  @observable center?: LatLng
  @observable zoom?: number
  @observable isMoving = false
  @observable isZooming = false
  // debounced completion function set during direct user pan/zoom of leaflet map
  @observable completeLeafletInteraction: (() => void) | undefined
  // debounced completion function set during client map view changes, e.g. responding to tile resize
  @observable completeMapViewChange: (() => void) | undefined
  // string keys to use when applying undoable changes
  // if not set, then changes are not considered undoable
  undoStringKey = ""
  redoStringKey = ""
  deselectFunction: () => void = () => {}

  constructor(leafletMap?: LeafletMap) {
    this.setLeafletMap(leafletMap)

    makeObservable(this)
  }

  destroy() {
    this.removeHandlers()
  }

  // true if the user is currently interacting directly with the leaflet map
  @computed
  get isLeafletInteracting() {
    return !!this.completeLeafletInteraction
  }

  // true if we have triggered a map change from code but the leaflet map
  // has not yet completed the change.
  @computed
  get isMapViewChanging() {
    return !!this.completeMapViewChange
  }

  @computed
  get isChanging() {
    return this.isMoving || this.isZooming || this.isLeafletInteracting || this.isMapViewChanging
  }

  handleClick(event:MouseEvent) {
    if (!event.shiftKey) this.deselectFunction()
  }

  @action
  handleMoveStart() {
    if (!this.isChanging) this.startLeafletInteraction("DG.Undo.map.pan", "DG.Redo.map.pan")
    this.isMoving = true
  }

  @action
  handleMove() {
    this.center = this.leafletMap?.getCenter()
  }

  @action
  handleMoveEnd() {
    this.completeInProgressChanges()
    this.isMoving = false
  }

  @action
  handleZoomStart() {
    if (!this.isChanging) this.startLeafletInteraction("DG.Undo.map.zoom", "DG.Redo.map.zoom")
    this.isZooming = true
  }

  @action
  handleZoom() {
    this.zoom = this.leafletMap?.getZoom()
  }

  @action
  handleZoomEnd() {
    this.completeInProgressChanges()
    this.isZooming = false
  }

  installHandlers() {
    this.leafletMap?.on({
      "click": () => this.handleClick(event as MouseEvent),
      "movestart": () => this.handleMoveStart(),
      "move": () => this.handleMove(),
      "moveend": () => this.handleMoveEnd(),
      "zoomstart": () => this.handleZoomStart(),
      "zoom": () => this.handleZoom(),
      "zoomend": () => this.handleZoomEnd()
    })
  }

  removeHandlers() {
    this.leafletMap?.off({
      "click": () => this.handleClick(event as MouseEvent),
      "movestart": () => this.handleMoveStart(),
      "move": () => this.handleMove(),
      "moveend": () => this.handleMoveEnd(),
      "zoomstart": () => this.handleZoomStart(),
      "zoom": () => this.handleZoom(),
      "zoomend": () => this.handleZoomEnd()
    })
  }

  @action
  setLeafletMap(leafletMap?: LeafletMap) {
    this.removeHandlers()
    this.leafletMap = leafletMap
    this.installHandlers()
  }

  @action
  startLeafletInteraction(undoStringKey: string, redoStringKey: string) {
    this.undoStringKey = undoStringKey
    this.redoStringKey = redoStringKey
    this.completeLeafletInteraction = debounce(() => {
      runInAction(() => this.completeLeafletInteraction = undefined)
      // user interactions in close proximity are coalesced
    }, 1000)
  }

  /**
   * adjustMapView
   *
   * @param options: IAdjustMapViewOptions
   *
   * Allows clients to trigger center/zoom adjustments, fit bounds, and invalidate
   * the map size. Captures all leaflet events that occur (asynchronously) in response
   * and optionally applies the resulting effects as an undoable change.
   * See IAdjustMapViewOptions definition for details of the arguments.
   */
  @action
  adjustMapView({
    center, zoom, fitBounds, invalidateSize = false, animate = false,
    debounceMS = 200, timeoutMS = 100, undoStringKey = "", redoStringKey = ""
  }: IAdjustMapViewOptions) {
    if (!this.leafletMap) return

    this.undoStringKey = undoStringKey
    this.redoStringKey = redoStringKey

    if (!this.completeMapViewChange) {
      this.completeMapViewChange = debounce(() => {
        runInAction(() => this.completeMapViewChange = undefined)
      }, debounceMS)
    }

    if (invalidateSize) {
      this.leafletMap.invalidateSize({ animate })
    }
    if (fitBounds) {
      this.leafletMap.fitBounds(fitBounds, { animate })
    }
    else if (center != null || zoom != null) {
      const newCenter = center ?? this.leafletMap.getCenter()
      const newZoom = zoom ?? this.leafletMap.getZoom()
      this.leafletMap.setView(newCenter, newZoom, { animate })
    }

    // if no response, leaflet may have determined that no change was required
    setTimeout(() => {
      if (!this.isMoving && !this.isZooming) {
        this.completeMapViewChange?.()
      }
    }, timeoutMS)
  }

  @action
  completeInProgressChanges() {
    this.completeLeafletInteraction?.()
    this.completeMapViewChange?.()
  }

}
