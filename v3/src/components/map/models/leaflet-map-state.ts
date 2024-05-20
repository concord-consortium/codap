import { LatLng, LatLngBoundsExpression, LatLngExpression, Map as LeafletMap, LeafletMouseEvent } from 'leaflet'
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
  // Callback function to be called on clicks
  onClick?: (event: MouseEvent) => void
  // bound event handlers for passing to leaflet
  handleClickBound: (event: LeafletMouseEvent) => void
  handleMoveStartBound: () => void
  handleMoveBound: () => void
  handleMoveEndBound: () => void
  handleZoomStartBound: () => void
  handleZoomBound: () => void
  handleZoomEndBound: () => void

  constructor(leafletMap?: LeafletMap) {
    this.setLeafletMap(leafletMap)

    // For on/off to work correctly, the same function must be passed to both.
    // By default, leaflet callbacks are called with `this` set to the map instance.
    // By binding `this` for these function instances we can override the leaflet
    // behavior, allowing these functions to be passed to on/off.
    this.handleClickBound = this.handleClick.bind(this)
    this.handleMoveStartBound = this.handleMoveStart.bind(this)
    this.handleMoveBound = this.handleMove.bind(this)
    this.handleMoveEndBound = this.handleMoveEnd.bind(this)
    this.handleZoomStartBound = this.handleZoomStart.bind(this)
    this.handleZoomBound = this.handleZoom.bind(this)
    this.handleZoomEndBound = this.handleZoomEnd.bind(this)

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

  @action
  setZoom(zoom: number) {
    this.zoom = zoom
  }

  @action
  setCenter(center: LatLng) {
    this.center = center
  }

  @action
  setIsZooming(isZooming: boolean) {
    this.isZooming = isZooming
  }

  @action
  setIsMoving(isMoving: boolean) {
    this.isMoving = isMoving
  }

  @action
  setOnClickCallback(onClick?: (event: MouseEvent) => void) {
    this.onClick = onClick
  }

  handleClick(event: LeafletMouseEvent) {
    this.onClick?.(event.originalEvent)
  }

  @action
  handleMoveStart() {
    if (!this.isChanging) this.startLeafletInteraction("DG.Undo.map.pan", "DG.Redo.map.pan")
    this.setIsMoving(true)
  }

  @action
  handleMove() {
    this.setCenter(this.leafletMap?.getCenter() ?? new LatLng(0, 0))
  }

  @action
  handleMoveEnd() {
    this.completeInProgressChanges()
    this.setIsMoving(false)
  }

  @action
  handleZoomStart() {
    if (!this.isChanging) this.startLeafletInteraction("DG.Undo.map.zoom", "DG.Redo.map.zoom")
    this.setIsZooming(true)
  }

  @action
  handleZoom() {
    this.setZoom(this.leafletMap?.getZoom() ?? 0)
  }

  @action
  handleZoomEnd() {
    this.completeInProgressChanges()
    this.setIsZooming(false)
  }

  installHandlers() {
    this.leafletMap?.on({
      "click": this.handleClickBound,
      "movestart": this.handleMoveStartBound,
      "move": this.handleMoveBound,
      "moveend": this.handleMoveEndBound,
      "zoomstart": this.handleZoomStartBound,
      "zoom": this.handleZoomBound,
      "zoomend": this.handleZoomEndBound
    })
  }

  removeHandlers() {
    this.leafletMap?.off({
      "click": this.handleClickBound,
      "movestart": this.handleMoveStartBound,
      "move": this.handleMoveBound,
      "moveend": this.handleMoveEndBound,
      "zoomstart": this.handleZoomStartBound,
      "zoom": this.handleZoomBound,
      "zoomend": this.handleZoomEndBound
    })
  }

  enableDefaultEventHandlers() {
    if (this.leafletMap) {
      this.leafletMap.dragging.enable()
      this.leafletMap.touchZoom.enable()
      this.leafletMap.doubleClickZoom.enable()
      this.leafletMap.scrollWheelZoom.enable()
      this.leafletMap.boxZoom.enable()
      this.leafletMap.keyboard.enable()
    }
  }

  disableDefaultEventHandlers() {
    if (this.leafletMap) {
      this.leafletMap.dragging.disable()
      this.leafletMap.touchZoom.disable()
      this.leafletMap.doubleClickZoom.disable()
      this.leafletMap.scrollWheelZoom.disable()
      this.leafletMap.boxZoom.disable()
      this.leafletMap.keyboard.disable()
    }
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
