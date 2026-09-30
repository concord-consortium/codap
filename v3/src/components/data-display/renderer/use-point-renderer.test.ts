import { act, renderHook, waitFor } from "@testing-library/react"
import { persistentState } from "../../../models/persistent-state"
import { CanvasPointRenderer } from "./canvas-point-renderer"
import { usePointRenderer } from "./use-point-renderer"
import { webGLContextManager } from "./webgl-context-manager"

// stand-ins that need neither a canvas nor WebGL; the canvas one counts how many are created
jest.mock("./canvas-point-renderer", () => {
  const { NullPointRenderer } = jest.requireActual("./null-point-renderer")
  class MockCanvasPointRenderer extends NullPointRenderer {
    static created = 0
    constructor(state: any) {
      super(state)
      ++MockCanvasPointRenderer.created
    }
    get capability() { return "canvas" }
  }
  return { CanvasPointRenderer: MockCanvasPointRenderer }
})
jest.mock("./pixi-point-renderer", () => {
  const { NullPointRenderer } = jest.requireActual("./null-point-renderer")
  class MockPixiPointRenderer extends NullPointRenderer {
    get capability() { return "webgl" }
  }
  return { PixiPointRenderer: MockPixiPointRenderer }
})

const canvasInstanceCount = () => (CanvasPointRenderer as unknown as { created: number }).created

describe("usePointRenderer", () => {
  beforeEach(() => {
    persistentState.setDisableGraphicsAcceleration(true)
    jest.spyOn(webGLContextManager, "requestContext").mockReturnValue(true)
  })

  afterEach(() => {
    persistentState.setDisableGraphicsAcceleration(false)
    jest.restoreAllMocks()
  })

  it("keeps its canvas renderer when only the priority changes while canvas is forced", async () => {
    // rebuilding the renderer would recreate every point, replaying its appearance animation
    const { result, rerender } = renderHook(({ priority }) => usePointRenderer({ id: "graph-1", priority }),
      { initialProps: { priority: 10 } })
    await waitFor(() => expect(result.current.renderer.capability).toBe("canvas"))
    const { renderer: initial } = result.current
    const initialCount = canvasInstanceCount()

    rerender({ priority: 5 })
    rerender({ priority: 7 })
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })

    expect(result.current.renderer).toBe(initial)
    expect(canvasInstanceCount()).toBe(initialCount)
    // and it never asked for a WebGL context it would only give back
    expect(webGLContextManager.requestContext).not.toHaveBeenCalled()
  })
})
