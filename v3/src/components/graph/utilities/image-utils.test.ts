import { PixiPoints } from "../../data-display/pixi/pixi-points"
import { graphSnaphsot } from "./image-utils"

const mockPixiPoints: Partial<PixiPoints> = {
  renderer: {
    extract: {
      canvas: jest.fn()
    } as any,
  } as any,
  stage: {} as any
}

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

const styleElt = document.createElement("style")
styleElt.textContent = ".codap-graph { background-color: gray; height: 100px; width: 100px; }"
const containerElt = document.createElement("div")
containerElt.classList.add("codap-graph")
const graphElt = document.createElement("div")
graphElt.classList.add("graph-plot")
const svgElt = document.createElement("svg")
svgElt.classList.add("graph-svg")
const foreignObjectElt = document.createElement("foreignObject")
const canvasElt = document.createElement("canvas")

foreignObjectElt.appendChild(canvasElt)
svgElt.appendChild(foreignObjectElt)
graphElt.appendChild(svgElt)
containerElt.appendChild(graphElt)

describe("graphSnaphsot", () => {
  it("should return a data URL string when `asDataUrl` is true", async () => {
    const svgElementsToImageOptions = {
      rootEl: containerElt,
      graphWidth: 100,
      graphHeight: 100,
      graphTitle: "Empty Test Graph",
      asDataURL: true,
      pixiPoints: mockPixiPoints as PixiPoints
    }
    const result = await graphSnaphsot(svgElementsToImageOptions)
    expect(typeof result).toBe("string")
    expect(result).toContain("data:image/png;base64,00")
  })
  it("should return a blob when `asDataUrl` is false", async () => {
    const svgElementsToImageOptions = {
      rootEl: containerElt,
      graphWidth: 100,
      graphHeight: 100,
      graphTitle: "Empty Test Graph",
      asDataURL: false,
      pixiPoints: mockPixiPoints as PixiPoints
    }
    const result = await graphSnaphsot(svgElementsToImageOptions)
    expect(typeof result).toBe("object")
    expect(result).toBeInstanceOf(Blob)
  })
})
