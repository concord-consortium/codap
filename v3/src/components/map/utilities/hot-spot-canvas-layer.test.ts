import { Map as LeafletMap } from "leaflet"
import { HotSpotCanvasLayer } from "./hot-spot-canvas-layer"

describe("HotSpotCanvasLayer", () => {
  function setup() {
    const container = document.createElement("div")
    Object.defineProperty(container, "clientWidth", { value: 400 })
    Object.defineProperty(container, "clientHeight", { value: 300 })
    document.body.appendChild(container)
    const map = new LeafletMap(container, { center: [40, -95], zoom: 4 })
    const draw = jest.fn()
    const layer = new HotSpotCanvasLayer({ pane: "overlayPane" })
    layer.setDrawFunction(draw)
    layer.addTo(map)
    const canvas = map.getPane("overlayPane")!.querySelector("canvas")!
    return { map, draw, layer, canvas }
  }

  it("adds a padded canvas with one backing pixel per cell, and draws it", () => {
    const { map, draw, canvas } = setup()
    // 400 × 300 plus 50% padding on each side is 800 × 600 CSS px, or 400 × 300 cells of 2px
    expect(canvas.width).toBe(400)
    expect(canvas.height).toBe(300)
    expect(canvas.style.width).toBe("800px")
    expect(canvas.style.height).toBe("600px")
    expect(draw).toHaveBeenCalledTimes(1)
    expect(draw).toHaveBeenCalledWith(expect.anything(),
      { originX: -200, originY: -150, cols: 400, rows: 300, cellSize: 2 })
    map.remove()
  })

  it("redraws when the map finishes moving", () => {
    const { map, draw } = setup()
    draw.mockClear()
    map.fire("moveend")
    expect(draw).toHaveBeenCalledTimes(1)
    map.remove()
  })

  it("scales the canvas during a zoom animation", () => {
    const { map, canvas } = setup()
    map.fire("zoomanim", { center: map.getCenter(), zoom: map.getZoom() + 1, noUpdate: false })
    expect(canvas.style.transform).toContain("scale(2)")
    map.remove()
  })

  it("leaves the canvas alone during a zoom animation if Leaflet lacks _getNewPixelOrigin", () => {
    const { map, canvas } = setup()
    const transform = canvas.style.transform
    // shadow the prototype method, as if a Leaflet upgrade had removed it
    Object.defineProperty(map, "_getNewPixelOrigin", { value: undefined })
    map.fire("zoomanim", { center: map.getCenter(), zoom: map.getZoom() + 1, noUpdate: false })
    expect(canvas.style.transform).toBe(transform)
    map.remove()
  })

  it("sets the canvas opacity", () => {
    const { map, layer, canvas } = setup()
    layer.setOpacity(0.75)
    expect(canvas.style.opacity).toBe("0.75")
    map.remove()
  })

  it("removes its canvas", () => {
    const { map, layer } = setup()
    layer.remove()
    expect(map.getPane("overlayPane")!.querySelector("canvas")).toBeNull()
    map.remove()
  })
})
