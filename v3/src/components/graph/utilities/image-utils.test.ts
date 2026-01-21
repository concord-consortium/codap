import { PointRendererBase } from "../../data-display/renderer"
import { graphSnapshot } from "./image-utils"

// Mock renderer with PIXI-specific properties accessed via (renderer as any) in image-utils.ts
const mockRenderer = {
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
const graphEl = document.createElement("div")
graphEl.classList.add("graph-plot")
const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg")
svgEl.classList.add("graph-svg")
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
    expect(result).toBeInstanceOf(Blob)
  })
})
