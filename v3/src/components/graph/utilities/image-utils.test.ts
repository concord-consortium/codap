import { PointRendererBase } from "../../data-display/renderer"
import { exportGraphToPng, graphSnapshot } from "./image-utils"

// Mock canvas for the renderer
const mockCanvas = document.createElement("canvas")
mockCanvas.width = 100
mockCanvas.height = 100
mockCanvas.getBoundingClientRect = jest.fn(() => ({
  left: 0,
  top: 0,
  width: 100,
  height: 100,
  right: 100,
  bottom: 100,
  x: 0,
  y: 0,
  toJSON: () => ({})
}))

// Mock renderer with PIXI-specific properties accessed via (renderer as any) in image-utils.ts
// and canvas property for the new exportGraphToPng approach
const mockRenderer = {
  canvas: mockCanvas,
  renderer: {
    extract: {
      canvas: jest.fn(() => {
        const canvas = document.createElement("canvas")
        canvas.toDataURL = jest.fn(() => "data:image/png;base64,")
        canvas.width = 100
        canvas.height = 100
        return canvas
      })
    }
  },
  stage: {}
} as unknown as PointRendererBase

beforeAll(() => {
  const mockImage = jest.fn(() => {
    const img = document.createElement("img")
    img.width = 100
    img.height = 100
    // Simulate async image loading.
    Object.defineProperty(img, "src", {
      set(url) {
        setTimeout(() => {
          if (img.onload) {
            img.onload(new Event("load"))
          }
        }, 0)
      },
    })
    return img
  })

  global.Image = mockImage as unknown as typeof Image
})

afterAll(() => {
  delete (global as any).Image
})

const styleEl = document.createElement("style")
styleEl.textContent = ".codap-graph { background-color: gray; height: 100px; width: 100px; }"
const containerEl = document.createElement("div")
containerEl.classList.add("codap-graph")
containerEl.getBoundingClientRect = jest.fn(() => ({
  left: 0,
  top: 0,
  width: 100,
  height: 100,
  right: 100,
  bottom: 100,
  x: 0,
  y: 0,
  toJSON: () => ({})
}))
const graphEl = document.createElement("div")
graphEl.classList.add("graph-plot")
const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg")
svgEl.classList.add("graph-svg")
svgEl.getBoundingClientRect = jest.fn(() => ({
  left: 0,
  top: 0,
  width: 100,
  height: 100,
  right: 100,
  bottom: 100,
  x: 0,
  y: 0,
  toJSON: () => ({})
}))
const foreignObjectEl = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject")
const canvasElt = document.createElement("canvas")

foreignObjectEl.appendChild(canvasElt)
svgEl.appendChild(foreignObjectEl)
graphEl.appendChild(svgEl)
containerEl.appendChild(graphEl)
document.head.appendChild(styleEl)
document.body.appendChild(containerEl)

describe("graphSnaphsot", () => {
  it("should return a data URL string when `asDataUrl` is true", async () => {
    const svgElementsToImageOptions = {
      rootEl: containerEl,
      graphWidth: 100,
      graphHeight: 100,
      graphTitle: "Empty Test Graph",
      asDataURL: true,
      renderer: mockRenderer
    }
    const result = await graphSnapshot(svgElementsToImageOptions)
    expect(typeof result).toBe("string")
    expect(result).toContain("data:image/png;base64,00")
  })
  it("should return a blob when `asDataUrl` is false", async () => {
    const svgElementsToImageOptions = {
      rootEl: containerEl,
      graphWidth: 100,
      graphHeight: 100,
      graphTitle: "Empty Test Graph",
      asDataURL: false,
      renderer: mockRenderer
    }
    const result = await graphSnapshot(svgElementsToImageOptions)
    expect(typeof result).toBe("object")
    // Check for Blob-like properties (toBeInstanceOf(Blob) fails due to jest/jsdom realm differences)
    expect(result).toHaveProperty("size")
    expect(result).toHaveProperty("type")
  })
})

describe("exportGraphToPng", () => {
  it("should return a data URL string", async () => {
    const result = await exportGraphToPng({
      graphElement: containerEl,
      renderer: mockRenderer,
      width: 100,
      height: 100
    })
    expect(typeof result).toBe("string")
    expect(result).toContain("data:image/png;base64,")
  })

  it("should handle missing renderer canvas gracefully", async () => {
    const noCanvasRenderer = { canvas: null } as unknown as PointRendererBase
    const result = await exportGraphToPng({
      graphElement: containerEl,
      renderer: noCanvasRenderer,
      width: 100,
      height: 100
    })
    expect(typeof result).toBe("string")
    expect(result).toContain("data:image/png;base64,")
  })
})
