/* eslint-disable testing-library/render-result-naming-convention */
import { PointRendererBase } from "../renderer"
import { DataDisplayRenderState } from "./data-display-render-state"

// Mock graphSnapshot to avoid needing a full DOM/canvas setup
jest.mock("../../graph/utilities/image-utils", () => ({
  graphSnapshot: jest.fn(async ({ asDataURL }: { asDataURL: boolean }) => ({
    image: asDataURL ? "data:image/png;base64,mockdata" : new Blob(["mock"], { type: "image/png" }),
    width: 200,
    height: 150
  }))
}))

const mockRect = (overrides: Partial<DOMRect> = {}): DOMRect => ({
  left: 0, top: 0, width: 200, height: 150, right: 200, bottom: 150, x: 0, y: 0,
  toJSON: () => ({}),
  ...overrides
})

function createMockRenderer(): PointRendererBase {
  return { canvas: document.createElement("canvas") } as unknown as PointRendererBase
}

function createMockElement(width = 200, height = 150): HTMLElement {
  const el = document.createElement("div")
  el.getBoundingClientRect = jest.fn(() => mockRect({ width, height, right: width, bottom: height }))
  return el
}

describe("DataDisplayRenderState", () => {
  describe("constructor", () => {
    it("should initialize with provided values", () => {
      const renderer = createMockRenderer()
      const el = createMockElement()
      const state = new DataDisplayRenderState([renderer], el, "data:image/png;base64,initial")
      expect(state.rendererArray).toEqual([renderer])
      expect(state.displayElement).toBe(el)
      expect(state.dataUri).toBe("data:image/png;base64,initial")
    })

    it("should initialize with undefined dataUri when not provided", () => {
      const state = new DataDisplayRenderState([createMockRenderer()], createMockElement())
      expect(state.dataUri).toBeUndefined()
    })
  })

  describe("setDataUri", () => {
    it("should update the dataUri", () => {
      const state = new DataDisplayRenderState([createMockRenderer()], createMockElement())
      expect(state.dataUri).toBeUndefined()
      state.setDataUri("data:image/png;base64,updated")
      expect(state.dataUri).toBe("data:image/png;base64,updated")
    })
  })

  describe("imageOptions", () => {
    it("should return options with element dimensions", () => {
      const renderer = createMockRenderer()
      const el = createMockElement(300, 200)
      const state = new DataDisplayRenderState([renderer], el)
      const opts = state.imageOptions
      expect(opts).toBeDefined()
      expect(opts?.rootEl).toBe(el)
      expect(opts?.graphWidth).toBe(300)
      expect(opts?.graphHeight).toBe(200)
      expect(opts?.renderer).toBe(renderer)
    })

    it("should return undefined when rendererArray is empty", () => {
      const el = createMockElement()
      const state = new DataDisplayRenderState([], el)
      expect(state.imageOptions).toBeUndefined()
    })

    it("should return undefined when first renderer is undefined", () => {
      const el = createMockElement()
      const state = new DataDisplayRenderState([undefined as any], el)
      expect(state.imageOptions).toBeUndefined()
    })
  })

  describe("updateSnapshot", () => {
    it("should update dataUri from graphSnapshot", async () => {
      const state = new DataDisplayRenderState([createMockRenderer()], createMockElement())
      expect(state.dataUri).toBeUndefined()
      await state.updateSnapshot()
      expect(state.dataUri).toBe("data:image/png;base64,mockdata")
    })

    it("should not update dataUri when imageOptions is undefined", async () => {
      const state = new DataDisplayRenderState([], createMockElement())
      state.setDataUri("data:image/png;base64,existing")
      await state.updateSnapshot()
      // dataUri should remain unchanged since imageOptions returns undefined
      expect(state.dataUri).toBe("data:image/png;base64,existing")
    })
  })
})
/* eslint-enable testing-library/render-result-naming-convention */
