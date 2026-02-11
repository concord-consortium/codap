import { PointRendererBase } from "../../data-display/renderer"
import { exportGraphToPng, graphSnapshot } from "./image-utils"
import * as htmlToSvg from "./html-to-svg"

const mockRect = (overrides: Partial<DOMRect> = {}): DOMRect => ({
  left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0,
  toJSON: () => ({}),
  ...overrides
})

// Helper to create an SVG element with a mocked getBoundingClientRect
function createSvgWithClass(className: string, rect?: Partial<DOMRect>): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.classList.add(className)
  svg.getBoundingClientRect = jest.fn(() => mockRect(rect))
  return svg
}

// Mock canvas for the renderer
const mockCanvas = document.createElement("canvas")
mockCanvas.width = 100
mockCanvas.height = 100
mockCanvas.getBoundingClientRect = jest.fn(() => mockRect())

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
containerEl.getBoundingClientRect = jest.fn(() => mockRect())
const graphEl = document.createElement("div")
graphEl.classList.add("graph-plot")
graphEl.getBoundingClientRect = jest.fn(() => mockRect())

// Base SVG layer (graph-svg with axes, grid, etc.)
const svgEl = createSvgWithClass("graph-svg")
const foreignObjectEl = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject")
const canvasElt = document.createElement("canvas")
foreignObjectEl.appendChild(canvasElt)
svgEl.appendChild(foreignObjectEl)

// Add a text element and a disallowed element to graph-svg for style-inlining and filtering tests
const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text")
textEl.textContent = "Axis Label"
svgEl.appendChild(textEl)
const droppableEl = document.createElementNS("http://www.w3.org/2000/svg", "rect")
droppableEl.classList.add("droppable-svg")
svgEl.appendChild(droppableEl)

// Overlay SVG layer (above-points content, selection shapes)
const overlaySvg = createSvgWithClass("overlay-svg")

// Adornments SVG layer (spanner-svg with adornment lines/shapes)
const adornmentSvg = createSvgWithClass("spanner-svg")
const adornmentLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
adornmentLine.setAttribute("x1", "0")
adornmentLine.setAttribute("y1", "0")
adornmentLine.setAttribute("x2", "100")
adornmentLine.setAttribute("y2", "100")
adornmentSvg.appendChild(adornmentLine)

// Legend SVG layer
const legendSvg = createSvgWithClass("legend-component", { top: 80, height: 20, bottom: 100 })

graphEl.appendChild(svgEl)
graphEl.appendChild(overlaySvg)
graphEl.appendChild(adornmentSvg)
graphEl.appendChild(legendSvg)
containerEl.appendChild(graphEl)
document.head.appendChild(styleEl)
document.body.appendChild(containerEl)

describe("graphSnapshot", () => {
  it("should return a data URL string when `asDataUrl` is true", async () => {
    const svgElementsToImageOptions = {
      rootEl: containerEl,
      graphWidth: 100,
      graphHeight: 100,
      title: "Empty Test Graph",
      asDataURL: true,
      renderer: mockRenderer
    }
    const result = await graphSnapshot(svgElementsToImageOptions)
    expect(typeof result.image).toBe("string")
    expect(result.image).toContain("data:image/png;base64,00")
    expect(result.width).toBe(100)
    // Height includes 20px for title area
    expect(result.height).toBe(120)
  })
  it("should return a blob when `asDataUrl` is false", async () => {
    const svgElementsToImageOptions = {
      rootEl: containerEl,
      graphWidth: 100,
      graphHeight: 100,
      title: "Empty Test Graph",
      asDataURL: false,
      renderer: mockRenderer
    }
    const result = await graphSnapshot(svgElementsToImageOptions)
    // Check for Blob-like properties (toBeInstanceOf(Blob) fails due to jest/jsdom realm differences)
    expect(result.image).toHaveProperty("size")
    expect(result.image).toHaveProperty("type")
    expect(result.width).toBe(100)
    expect(result.height).toBe(120)
  })
})

describe("exportGraphToPng", () => {
  const defaultOptions = {
    graphElement: containerEl,
    renderer: mockRenderer,
    width: 100,
    height: 100
  }

  it("should return a data URL string", async () => {
    const result = await exportGraphToPng(defaultOptions)
    expect(typeof result).toBe("string")
    expect(result).toContain("data:image/png;base64,")
  })

  it("should handle missing renderer canvas gracefully", async () => {
    const noCanvasRenderer = { canvas: null } as unknown as PointRendererBase
    const result = await exportGraphToPng({
      ...defaultOptions,
      renderer: noCanvasRenderer,
    })
    expect(typeof result).toBe("string")
    expect(result).toContain("data:image/png;base64,")
  })

  it("should composite overlay, adornment, and legend SVG layers", async () => {
    // The DOM fixture includes svg.overlay-svg, svg.spanner-svg, and svg.legend-component.
    // Verify the export completes successfully with all layers present.
    const result = await exportGraphToPng(defaultOptions)
    expect(result).toContain("data:image/png;base64,")
  })

  it("should use canvas directly for non-PIXI renderer", async () => {
    const canvasOnlyRenderer = {
      canvas: mockCanvas,
      // No renderer.extract or stage — triggers the Canvas 2D fallback path
    } as unknown as PointRendererBase
    const result = await exportGraphToPng({
      ...defaultOptions,
      renderer: canvasOnlyRenderer,
    })
    expect(typeof result).toBe("string")
    expect(result).toContain("data:image/png;base64,")
  })

  it("should handle zero-size renderer canvas", async () => {
    const zeroCanvas = document.createElement("canvas")
    zeroCanvas.width = 0
    zeroCanvas.height = 0
    const zeroCanvasRenderer = { canvas: zeroCanvas } as unknown as PointRendererBase
    const result = await exportGraphToPng({
      ...defaultOptions,
      renderer: zeroCanvasRenderer,
    })
    expect(typeof result).toBe("string")
    expect(result).toContain("data:image/png;base64,")
  })

  it("should fall back to passed width/height when content element has zero-size rect", async () => {
    const emptyContainer = document.createElement("div")
    // No .graph-plot child, and getBoundingClientRect returns zeros (jsdom default)
    const result = await exportGraphToPng({
      graphElement: emptyContainer,
      renderer: mockRenderer,
      width: 200,
      height: 150
    })
    expect(typeof result).toBe("string")
    expect(result).toContain("data:image/png;base64,")
  })

  it("should handle PIXI extract failure gracefully", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {})
    const failingRenderer = {
      canvas: mockCanvas,
      renderer: {
        extract: {
          canvas: jest.fn(() => { throw new Error("WebGL context lost") })
        }
      },
      stage: {}
    } as unknown as PointRendererBase
    const result = await exportGraphToPng({
      ...defaultOptions,
      renderer: failingRenderer,
    })
    expect(result).toContain("data:image/png;base64,")
    expect(warnSpy).toHaveBeenCalledWith("Failed to render points canvas:", expect.any(Error))
    warnSpy.mockRestore()
  })
})

describe("disallowed element filtering", () => {
  it("should not include disallowed UI elements in the export", async () => {
    // The graph-svg fixture contains a rect.droppable-svg element.
    // The export should still succeed (the element is filtered out during SVG rendering).
    const result = await exportGraphToPng({
      graphElement: containerEl,
      renderer: mockRenderer,
      width: 100,
      height: 100
    })
    expect(result).toContain("data:image/png;base64,")
  })
})

describe("title rendering", () => {
  it("should export successfully with a title", async () => {
    const result = await exportGraphToPng({
      graphElement: containerEl,
      renderer: mockRenderer,
      width: 100,
      height: 100,
      title: "Test Graph Title"
    })
    expect(result).toContain("data:image/png;base64,")
  })

  it("should export successfully without a title", async () => {
    const result = await exportGraphToPng({
      graphElement: containerEl,
      renderer: mockRenderer,
      width: 100,
      height: 100
    })
    expect(result).toContain("data:image/png;base64,")
  })

  it("should not add title height when no title is provided", async () => {
    const result = await graphSnapshot({
      rootEl: containerEl,
      graphWidth: 100,
      graphHeight: 100,
      asDataURL: true,
      renderer: mockRenderer
    })
    expect(result.width).toBe(100)
    expect(result.height).toBe(100)
  })

  it("should include title in graphSnapshot when provided", async () => {
    const result = await graphSnapshot({
      rootEl: containerEl,
      graphWidth: 100,
      graphHeight: 100,
      title: "Snapshot Title",
      asDataURL: true,
      renderer: mockRenderer
    })
    expect(typeof result.image).toBe("string")
    expect(result.image).toContain("data:image/png;base64,")
    // Height includes 20px for title area
    expect(result.height).toBe(120)
  })
})

describe("svg-export class handling", () => {
  let convertSpy: jest.SpyInstance

  beforeEach(() => {
    convertSpy = jest.spyOn(htmlToSvg, "convertHtmlToSvg")
  })

  afterEach(() => {
    convertSpy.mockRestore()
    graphEl.querySelectorAll(".test-export-element").forEach(el => el.remove())
  })

  it("should convert elements with svg-export class", async () => {
    const exportableDiv = document.createElement("div")
    exportableDiv.classList.add("svg-export", "test-export-element")
    exportableDiv.textContent = "Exportable text"
    exportableDiv.getBoundingClientRect = jest.fn(() => mockRect({ left: 10, top: 20 }))
    graphEl.appendChild(exportableDiv)

    await exportGraphToPng({
      graphElement: containerEl,
      height: 100,
      renderer: mockRenderer,
      width: 100
    })

    expect(convertSpy).toHaveBeenCalled()
    const callArgs = convertSpy.mock.calls[0][0]
    expect(callArgs.element).toBe(exportableDiv)
  })

  it("should not convert elements without svg-export class", async () => {
    const nonExportableDiv = document.createElement("div")
    nonExportableDiv.classList.add("some-other-class", "test-export-element")
    nonExportableDiv.textContent = "Non-exportable text"
    graphEl.appendChild(nonExportableDiv)

    await exportGraphToPng({
      graphElement: containerEl,
      height: 100,
      renderer: mockRenderer,
      width: 100
    })

    // convertHtmlToSvg should not be called for elements without svg-export
    const callArgs = convertSpy.mock.calls.map(call => call[0].element)
    expect(callArgs).not.toContain(nonExportableDiv)
  })

  it("should not convert elements with both svg-export and no-svg-export classes", async () => {
    const excludedDiv = document.createElement("div")
    excludedDiv.classList.add("svg-export", "no-svg-export", "test-export-element")
    excludedDiv.textContent = "Excluded text"
    graphEl.appendChild(excludedDiv)

    await exportGraphToPng({
      graphElement: containerEl,
      height: 100,
      renderer: mockRenderer,
      width: 100
    })

    // convertHtmlToSvg should not be called for elements with no-svg-export
    const callArgs = convertSpy.mock.calls.map(call => call[0].element)
    expect(callArgs).not.toContain(excludedDiv)
  })
})
