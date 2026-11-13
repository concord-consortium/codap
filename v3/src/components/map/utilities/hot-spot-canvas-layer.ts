import {
  DomUtil, LatLng, Layer, LayerOptions, Map as LeafletMap, Point, setOptions, ZoomAnimEvent
} from "leaflet"
import { IDensityGridRegion, kHotSpotCellSize, kHotSpotPadding } from "./hot-spot-utils"

export type HotSpotDrawFunction = (context: CanvasRenderingContext2D, region: IDensityGridRegion) => void

// Leaflet's own renderers use this private method to position themselves during zoom animations
interface ILeafletMapInternals {
  _getNewPixelOrigin(center: LatLng, zoom: number): Point
}

function hasGetNewPixelOrigin(map: LeafletMap): map is LeafletMap & ILeafletMapInternals {
  return "_getNewPixelOrigin" in map && typeof map._getNewPixelOrigin === "function"
}

/**
 * A canvas covering the map's viewport plus padding, in its own pane. The canvas has one backing pixel per grid
 * cell and is stretched to kHotSpotCellSize CSS pixels per cell, so the browser smooths between cells.
 * Modeled on Leaflet's L.Renderer.
 */
export class HotSpotCanvasLayer extends Layer {
  private canvas?: HTMLCanvasElement
  private drawFunction?: HotSpotDrawFunction
  private opacity = 1
  // The view the canvas was last drawn for, used to transform it during zooms
  private drawnCenter?: LatLng
  private drawnZoom = 0

  constructor(options?: LayerOptions) {
    super()
    // L.Layer has no initialize method, so Leaflet doesn't apply constructor options for us
    setOptions(this, options)
  }

  onAdd(map: LeafletMap) {
    this.canvas = DomUtil.create("canvas", "codap-hot-spot-canvas leaflet-zoom-animated")
    this.canvas.style.opacity = String(this.opacity)
    this.getPane()?.appendChild(this.canvas)
    // zoomanim is registered here rather than in getEvents, whose handler map is typed for plain LeafletEvents
    // and would need a cast. map.on has a typed overload for zoomanim.
    map.on("zoomanim", this.onAnimZoom, this)
    this.redraw()
    return this
  }

  onRemove(map: LeafletMap) {
    map.off("zoomanim", this.onAnimZoom, this)
    this.canvas && DomUtil.remove(this.canvas)
    this.canvas = undefined
    return this
  }

  getEvents() {
    return {
      viewreset: this.redraw,
      moveend: this.redraw,
      zoom: this.onZoom
    }
  }

  setDrawFunction(drawFunction: HotSpotDrawFunction) {
    this.drawFunction = drawFunction
    return this.redraw()
  }

  setOpacity(opacity: number) {
    this.opacity = opacity
    if (this.canvas) this.canvas.style.opacity = String(opacity)
    return this
  }

  redraw() {
    const map: Maybe<LeafletMap> = this._map
    const { canvas } = this
    if (!map || !canvas) return this

    const size = map.getSize()
    const topLeft = size.multiplyBy(-kHotSpotPadding).round()
    const cols = Math.ceil(size.x * (1 + 2 * kHotSpotPadding) / kHotSpotCellSize)
    const rows = Math.ceil(size.y * (1 + 2 * kHotSpotPadding) / kHotSpotCellSize)
    // setting the size also clears the canvas
    canvas.width = cols
    canvas.height = rows
    canvas.style.width = `${cols * kHotSpotCellSize}px`
    canvas.style.height = `${rows * kHotSpotCellSize}px`
    DomUtil.setPosition(canvas, map.containerPointToLayerPoint(topLeft))
    this.drawnCenter = map.getCenter()
    this.drawnZoom = map.getZoom()
    const context = canvas.getContext("2d")
    if (context && cols > 0 && rows > 0) {
      this.drawFunction?.(context, {
        originX: topLeft.x, originY: topLeft.y, cols, rows, cellSize: kHotSpotCellSize
      })
    }
    return this
  }

  private onZoom() {
    this.updateTransform(this._map.getCenter(), this._map.getZoom())
  }

  private onAnimZoom(event: ZoomAnimEvent) {
    this.updateTransform(event.center, event.zoom)
  }

  // Scales and offsets the canvas drawn for drawnCenter/drawnZoom to where it belongs at the given view.
  // Same computation as L.Renderer._updateTransform. Without _getNewPixelOrigin the canvas just stays put during
  // the zoom and is redrawn correctly on moveend.
  private updateTransform(center: LatLng, zoom: number) {
    const map: Maybe<LeafletMap> = this._map
    if (!map || !hasGetNewPixelOrigin(map) || !this.canvas || !this.drawnCenter) return

    const scale = map.getZoomScale(zoom, this.drawnZoom)
    const viewHalf = map.getSize().multiplyBy(0.5 + kHotSpotPadding)
    const drawnCenterPoint = map.project(this.drawnCenter, zoom)
    const newPixelOrigin = map._getNewPixelOrigin(center, zoom)
    const topLeftOffset = viewHalf.multiplyBy(-scale).add(drawnCenterPoint).subtract(newPixelOrigin)
    DomUtil.setTransform(this.canvas, topLeftOffset, scale)
  }
}
