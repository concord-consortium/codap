import { CaseDataWithSubPlot } from "../d3-types"
import { CanvasPointRenderer } from "./canvas-point-renderer"
import { IPointStyle } from "./point-renderer-types"
import { PointsState } from "./points-state"

/**
 * Tests for CanvasPointRenderer.
 *
 * These tests validate the Canvas 2D fallback renderer which is used when
 * WebGL contexts are unavailable or exhausted.
 */
describe("CanvasPointRenderer", () => {
  const defaultStyle: IPointStyle = {
    radius: 6,
    fill: "#ff0000",
    stroke: "#000000",
    strokeWidth: 1
  }

  const createCaseData = (plotNum: number, caseID: string, subPlotNum?: number): CaseDataWithSubPlot => ({
    plotNum,
    caseID,
    subPlotNum
  })

  // Mock canvas context
  let mockContext: jest.Mocked<CanvasRenderingContext2D>

  // Track RAF callbacks for manual execution
  let rafCallbacks: Map<number, FrameRequestCallback>
  let rafId: number

  beforeEach(() => {
    jest.useFakeTimers()

    // Set up RAF tracking
    rafCallbacks = new Map()
    rafId = 0

    // Create mock canvas context
    mockContext = {
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      clearRect: jest.fn(),
      setTransform: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      rect: jest.fn(),
      clip: jest.fn(),
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      globalAlpha: 1
    } as unknown as jest.Mocked<CanvasRenderingContext2D>

    // Mock canvas element creation
    const originalCreateElement = document.createElement.bind(document)
    jest.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName === "canvas") {
        const canvas = originalCreateElement("canvas")
        jest.spyOn(canvas, "getContext").mockReturnValue(mockContext as any)
        return canvas
      }
      return originalCreateElement(tagName)
    })

    // Mock requestAnimationFrame to track callbacks
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
      const id = ++rafId
      rafCallbacks.set(id, cb)
      return id
    })

    // Mock cancelAnimationFrame to remove callbacks
    jest.spyOn(window, "cancelAnimationFrame").mockImplementation((id: number) => {
      rafCallbacks.delete(id)
    })
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  // Helper to execute pending RAF callbacks
  const flushRAF = () => {
    const callbacks = Array.from(rafCallbacks.entries())
    rafCallbacks.clear()
    const now = performance.now()
    callbacks.forEach(([, cb]) => cb(now))
  }

  let renderer: CanvasPointRenderer

  beforeEach(() => {
    renderer = new CanvasPointRenderer()
  })

  afterEach(() => {
    renderer.dispose()
  })

  describe("construction", () => {
    it("creates a new PointsState if none provided", () => {
      const r = new CanvasPointRenderer()
      expect(r.getState()).toBeDefined()
      expect(r.getState()).toBeInstanceOf(PointsState)
      r.dispose()
    })

    it("uses provided PointsState", () => {
      const sharedState = new PointsState()
      const r = new CanvasPointRenderer(sharedState)
      expect(r.getState()).toBe(sharedState)
      r.dispose()
    })
  })

  describe("capability", () => {
    it("reports canvas capability", () => {
      expect(renderer.capability).toBe("canvas")
    })
  })

  describe("canvas", () => {
    it("returns null before init", () => {
      expect(renderer.canvas).toBeNull()
    })

    it("returns canvas element after init", async () => {
      await renderer.init()
      expect(renderer.canvas).not.toBeNull()
      expect(renderer.canvas).toBeInstanceOf(HTMLCanvasElement)
    })
  })

  describe("init / isReady", () => {
    it("starts not ready", () => {
      expect(renderer.isReady).toBe(false)
    })

    it("becomes ready after init", async () => {
      await renderer.init()
      expect(renderer.isReady).toBe(true)
    })

    it("creates canvas with correct styles", async () => {
      await renderer.init()
      const canvas = renderer.canvas!
      expect(canvas.style.position).toBe("absolute")
      expect(canvas.style.top).toBe("0px")
      expect(canvas.style.left).toBe("0px")
      expect(canvas.style.pointerEvents).toBe("auto")
    })

    it("init accepts options without error", async () => {
      const mockElement = document.createElement("div")
      await renderer.init({
        resizeTo: mockElement,
        backgroundEventDistribution: {
          elementToHide: mockElement
        }
      })
      expect(renderer.isReady).toBe(true)
    })
  })

  describe("dispose", () => {
    it("sets isReady to false", async () => {
      await renderer.init()
      expect(renderer.isReady).toBe(true)

      renderer.dispose()
      expect(renderer.isReady).toBe(false)
    })

    it("sets canvas to null", async () => {
      await renderer.init()
      expect(renderer.canvas).not.toBeNull()

      renderer.dispose()
      expect(renderer.canvas).toBeNull()
    })
  })

  describe("anyTransitionActive", () => {
    it("returns false when no transitions", async () => {
      await renderer.init()
      expect(renderer.anyTransitionActive).toBe(false)
    })
  })

  describe("matchPointsToData", () => {
    beforeEach(async () => {
      await renderer.init()
    })

    it("syncs points with case data", () => {
      const caseDataArray: CaseDataWithSubPlot[] = [
        createCaseData(0, "case1"),
        createCaseData(0, "case2"),
        createCaseData(0, "case3")
      ]

      renderer.matchPointsToData("dataset1", caseDataArray, "points", defaultStyle)

      expect(renderer.pointsCount).toBe(3)
    })

    it("sets the dataset ID", () => {
      const caseDataArray: CaseDataWithSubPlot[] = [createCaseData(0, "case1")]

      renderer.matchPointsToData("myDataset", caseDataArray, "points", defaultStyle)

      expect(renderer.getState().getDatasetID()).toBe("myDataset")
    })

    it("sets the display type", () => {
      const caseDataArray: CaseDataWithSubPlot[] = [createCaseData(0, "case1")]

      renderer.matchPointsToData("dataset1", caseDataArray, "bars", defaultStyle)

      expect(renderer.displayType).toBe("bars")
    })
  })

  describe("getPointForCaseData", () => {
    beforeEach(async () => {
      await renderer.init()
    })

    it("returns point for existing case data", () => {
      const caseData = createCaseData(0, "case1")
      renderer.matchPointsToData("dataset1", [caseData], "points", defaultStyle)

      const point = renderer.getPointForCaseData(caseData)
      expect(point).toBeDefined()
      expect(point?.id).toMatch(/^point-\d+$/)
    })

    it("returns undefined for non-existent case data", () => {
      renderer.matchPointsToData("dataset1", [], "points", defaultStyle)

      const point = renderer.getPointForCaseData(createCaseData(0, "nonexistent"))
      expect(point).toBeUndefined()
    })
  })

  describe("setPointPosition", () => {
    beforeEach(async () => {
      await renderer.init()
    })

    it("updates point position in state", () => {
      const caseData = createCaseData(0, "case1")
      renderer.matchPointsToData("dataset1", [caseData], "points", defaultStyle)

      const point = renderer.getPointForCaseData(caseData)!
      renderer.setPointPosition(point, 100, 200)

      const state = renderer.getState().getPoint(point.id)
      expect(state?.x).toBe(100)
      expect(state?.y).toBe(200)
    })
  })

  describe("setPointScale", () => {
    beforeEach(async () => {
      await renderer.init()
    })

    it("updates point scale in state", () => {
      const caseData = createCaseData(0, "case1")
      renderer.matchPointsToData("dataset1", [caseData], "points", defaultStyle)

      const point = renderer.getPointForCaseData(caseData)!
      renderer.setPointScale(point, 2.5)

      const state = renderer.getState().getPoint(point.id)
      expect(state?.scale).toBe(2.5)
    })
  })

  describe("setPointStyle", () => {
    beforeEach(async () => {
      await renderer.init()
    })

    it("updates point style in state", () => {
      const caseData = createCaseData(0, "case1")
      renderer.matchPointsToData("dataset1", [caseData], "points", defaultStyle)

      const point = renderer.getPointForCaseData(caseData)!
      renderer.setPointStyle(point, { fill: "#00ff00", radius: 10 })

      const state = renderer.getState().getPoint(point.id)
      expect(state?.style.fill).toBe("#00ff00")
      expect(state?.style.radius).toBe(10)
      expect(state?.style.stroke).toBe("#000000")
    })
  })

  describe("setPointRaised", () => {
    beforeEach(async () => {
      await renderer.init()
    })

    it("updates point raised state", () => {
      const caseData = createCaseData(0, "case1")
      renderer.matchPointsToData("dataset1", [caseData], "points", defaultStyle)

      const point = renderer.getPointForCaseData(caseData)!
      renderer.setPointRaised(point, true)

      const state = renderer.getState().getPoint(point.id)
      expect(state?.isRaised).toBe(true)
    })
  })

  describe("setPointSubPlot", () => {
    beforeEach(async () => {
      await renderer.init()
    })

    it("updates point subplot in state", () => {
      const caseData = createCaseData(0, "case1")
      renderer.matchPointsToData("dataset1", [caseData], "points", defaultStyle)

      const point = renderer.getPointForCaseData(caseData)!
      renderer.setPointSubPlot(point, 3)

      const state = renderer.getState().getPoint(point.id)
      expect(state?.subPlotNum).toBe(3)
    })
  })

  describe("setPositionOrTransition", () => {
    beforeEach(async () => {
      await renderer.init()
    })

    it("updates position and style in state", () => {
      const caseData = createCaseData(0, "case1")
      renderer.matchPointsToData("dataset1", [caseData], "points", defaultStyle)

      const point = renderer.getPointForCaseData(caseData)!
      renderer.setPositionOrTransition(point, { fill: "#0000ff" }, 50, 75)

      const state = renderer.getState().getPoint(point.id)
      expect(state?.x).toBe(50)
      expect(state?.y).toBe(75)
      expect(state?.style.fill).toBe("#0000ff")
    })
  })

  describe("setAllPointsScale", () => {
    beforeEach(async () => {
      await renderer.init()
    })

    it("updates scale for all points (instant)", async () => {
      const caseDataArray: CaseDataWithSubPlot[] = [
        createCaseData(0, "case1"),
        createCaseData(0, "case2"),
        createCaseData(0, "case3")
      ]
      renderer.matchPointsToData("dataset1", caseDataArray, "points", defaultStyle)

      await renderer.setAllPointsScale(1.5)

      renderer.getState().forEach(point => {
        expect(point.scale).toBe(1.5)
      })
    })
  })

  describe("transition", () => {
    beforeEach(async () => {
      await renderer.init()
    })

    it("executes callback synchronously", () => {
      let callbackCalled = false

      renderer.transition(() => {
        callbackCalled = true
      }, { duration: 500 })

      // Callback should be called synchronously
      expect(callbackCalled).toBe(true)
    })

    it("executes callback immediately with duration 0", async () => {
      let callbackCalled = false

      await renderer.transition(() => {
        callbackCalled = true
      }, { duration: 0 })

      expect(callbackCalled).toBe(true)
    })

    it("reports transition active during animation", () => {
      renderer.transition(() => {
        // Set up some targets
        const caseData = createCaseData(0, "case1")
        renderer.matchPointsToData("dataset1", [caseData], "points", defaultStyle)
        const point = renderer.getPointForCaseData(caseData)!
        // Set a position target to trigger transition tracking
        renderer.setPositionOrTransition(point, defaultStyle, 100, 100)
      }, { duration: 1000 })

      // With duration > 0 and position targets set, transitions should be active
      expect(renderer.anyTransitionActive).toBe(true)
    })
  })

  describe("forEachPoint", () => {
    beforeEach(async () => {
      await renderer.init()
    })

    it("iterates over all points", () => {
      const caseDataArray: CaseDataWithSubPlot[] = [
        createCaseData(0, "case1"),
        createCaseData(0, "case2"),
        createCaseData(0, "case3")
      ]
      renderer.matchPointsToData("dataset1", caseDataArray, "points", defaultStyle)

      const visitedCaseIds: string[] = []
      renderer.forEachPoint((point, metadata) => {
        visitedCaseIds.push(metadata.caseID)
      })

      expect(visitedCaseIds).toHaveLength(3)
      expect(visitedCaseIds).toContain("case1")
      expect(visitedCaseIds).toContain("case2")
      expect(visitedCaseIds).toContain("case3")
    })

    it("provides correct metadata", () => {
      renderer.matchPointsToData("myDataset", [createCaseData(2, "case1")], "points", defaultStyle)

      renderer.forEachPoint((point, metadata) => {
        expect(metadata.caseID).toBe("case1")
        expect(metadata.plotNum).toBe(2)
        expect(metadata.datasetID).toBe("myDataset")
        expect(metadata.style).toEqual(defaultStyle)
      })
    })
  })

  describe("forEachSelectedPoint", () => {
    beforeEach(async () => {
      await renderer.init()
    })

    it("only iterates over raised points", () => {
      const caseDataArray: CaseDataWithSubPlot[] = [
        createCaseData(0, "case1"),
        createCaseData(0, "case2"),
        createCaseData(0, "case3")
      ]
      renderer.matchPointsToData("dataset1", caseDataArray, "points", defaultStyle)

      const point2 = renderer.getPointForCaseData(createCaseData(0, "case2"))!
      renderer.setPointRaised(point2, true)

      const visitedCaseIds: string[] = []
      renderer.forEachSelectedPoint((point, metadata) => {
        visitedCaseIds.push(metadata.caseID)
      })

      expect(visitedCaseIds).toHaveLength(1)
      expect(visitedCaseIds).toContain("case2")
    })
  })

  describe("getMetadata", () => {
    beforeEach(async () => {
      await renderer.init()
    })

    it("returns metadata for a point", () => {
      renderer.matchPointsToData("myDataset", [createCaseData(1, "case1")], "points", defaultStyle)

      const point = renderer.getPointForCaseData(createCaseData(1, "case1"))!
      const metadata = renderer.getMetadata(point)

      expect(metadata.caseID).toBe("case1")
      expect(metadata.plotNum).toBe(1)
      expect(metadata.datasetID).toBe("myDataset")
    })

    it("throws for non-existent point", () => {
      expect(() => renderer.getMetadata({ id: "non-existent" })).toThrow("Point not found in state")
    })
  })

  describe("displayType", () => {
    it("defaults to points", () => {
      expect(renderer.displayType).toBe("points")
    })

    it("can be set and retrieved", () => {
      renderer.displayType = "bars"
      expect(renderer.displayType).toBe("bars")
    })
  })

  describe("pointsFusedIntoBars", () => {
    it("defaults to false", () => {
      expect(renderer.pointsFusedIntoBars).toBe(false)
    })

    it("can be set and retrieved", () => {
      renderer.pointsFusedIntoBars = true
      expect(renderer.pointsFusedIntoBars).toBe(true)
    })
  })

  describe("anchor", () => {
    it("has default anchor at center", () => {
      expect(renderer.anchor).toEqual({ x: 0.5, y: 0.5 })
    })

    it("can be set and retrieved", () => {
      renderer.anchor = { x: 0, y: 1 }
      expect(renderer.anchor).toEqual({ x: 0, y: 1 })
    })
  })

  describe("visibility", () => {
    beforeEach(async () => {
      await renderer.init()
    })

    it("defaults to visible", () => {
      expect(renderer.isVisible).toBe(true)
    })

    it("can be toggled", () => {
      renderer.setVisibility(false)
      expect(renderer.isVisible).toBe(false)

      renderer.setVisibility(true)
      expect(renderer.isVisible).toBe(true)
    })

    it("updates canvas visibility style", () => {
      renderer.setVisibility(false)
      expect(renderer.canvas!.style.visibility).toBe("hidden")

      renderer.setVisibility(true)
      expect(renderer.canvas!.style.visibility).toBe("visible")
    })
  })

  describe("resize", () => {
    beforeEach(async () => {
      await renderer.init()
    })

    it("resizes canvas element", () => {
      renderer.resize(800, 600, 1, 1, 1, 1)

      const canvas = renderer.canvas!
      expect(canvas.style.width).toBe("800px")
      expect(canvas.style.height).toBe("600px")
    })

    it("accepts resize call with subplot parameters", () => {
      expect(() => renderer.resize(800, 600, 2, 3, 1, 1)).not.toThrow()
    })

    it("applies device pixel ratio", () => {
      const dpr = window.devicePixelRatio || 1
      renderer.resize(100, 100, 1, 1, 1, 1)

      const canvas = renderer.canvas!
      expect(canvas.width).toBe(100 * dpr)
      expect(canvas.height).toBe(100 * dpr)
    })
  })

  describe("removeMasks", () => {
    beforeEach(async () => {
      await renderer.init()
    })

    it("accepts removeMasks call without error", () => {
      expect(() => renderer.removeMasks()).not.toThrow()
    })
  })

  describe("startRendering", () => {
    beforeEach(async () => {
      await renderer.init()
    })

    it("accepts startRendering call without error", () => {
      expect(() => renderer.startRendering()).not.toThrow()
    })

    it("triggers redraw via requestAnimationFrame", () => {
      const rafSpy = jest.spyOn(window, "requestAnimationFrame")

      renderer.startRendering()

      expect(rafSpy).toHaveBeenCalled()
    })
  })

  describe("setupBackgroundEventDistribution", () => {
    beforeEach(async () => {
      await renderer.init()
    })

    it("accepts options without error", () => {
      const element = document.createElement("div")
      expect(() => renderer.setupBackgroundEventDistribution({
        elementToHide: element
      })).not.toThrow()
    })
  })

  describe("state sharing between renderers", () => {
    it("allows state to be shared and preserved across renderer instances", async () => {
      const sharedState = new PointsState()

      // First renderer adds points
      const renderer1 = new CanvasPointRenderer(sharedState)
      await renderer1.init()
      renderer1.matchPointsToData("dataset1", [
        createCaseData(0, "case1"),
        createCaseData(0, "case2")
      ], "points", defaultStyle)

      const point1 = renderer1.getPointForCaseData(createCaseData(0, "case1"))!
      renderer1.setPointPosition(point1, 100, 200)

      // Second renderer uses same state
      const renderer2 = new CanvasPointRenderer(sharedState)
      await renderer2.init()

      // Verify state is preserved
      expect(renderer2.pointsCount).toBe(2)
      const point1InRenderer2 = renderer2.getPointForCaseData(createCaseData(0, "case1"))
      expect(point1InRenderer2).toBeDefined()
      expect(sharedState.getPoint(point1InRenderer2!.id)?.x).toBe(100)
      expect(sharedState.getPoint(point1InRenderer2!.id)?.y).toBe(200)

      renderer1.dispose()
      renderer2.dispose()
    })
  })

  describe("rendering", () => {
    beforeEach(async () => {
      await renderer.init()
      renderer.resize(400, 300, 1, 1, 1, 1)
    })

    it("clears canvas before drawing", () => {
      renderer.matchPointsToData("dataset1", [createCaseData(0, "case1")], "points", defaultStyle)

      // Trigger render
      renderer.startRendering()
      flushRAF()

      expect(mockContext.clearRect).toHaveBeenCalled()
    })

    it("draws circles for points display type", () => {
      const caseData = createCaseData(0, "case1")
      renderer.matchPointsToData("dataset1", [caseData], "points", defaultStyle)
      const point = renderer.getPointForCaseData(caseData)!
      renderer.setPointPosition(point, 100, 100)

      // Trigger render
      renderer.startRendering()
      flushRAF()

      expect(mockContext.arc).toHaveBeenCalled()
      expect(mockContext.fill).toHaveBeenCalled()
    })

    it("draws rectangles for bars display type", () => {
      const barStyle: IPointStyle = { ...defaultStyle, width: 20, height: 50 }
      const caseData = createCaseData(0, "case1")
      renderer.matchPointsToData("dataset1", [caseData], "bars", barStyle)
      const point = renderer.getPointForCaseData(caseData)!
      renderer.setPointPosition(point, 100, 100)

      // Trigger render
      renderer.startRendering()
      flushRAF()

      expect(mockContext.fillRect).toHaveBeenCalled()
    })

    it("applies translation and scale", () => {
      const caseData = createCaseData(0, "case1")
      renderer.matchPointsToData("dataset1", [caseData], "points", defaultStyle)
      const point = renderer.getPointForCaseData(caseData)!
      renderer.setPointPosition(point, 150, 200)

      // Trigger render
      renderer.startRendering()
      flushRAF()

      expect(mockContext.translate).toHaveBeenCalled()
      expect(mockContext.scale).toHaveBeenCalled()
    })
  })

  describe("type guard", () => {
    it("isCanvasPointRenderer returns true for CanvasPointRenderer", async () => {
      const { isCanvasPointRenderer } = await import("./canvas-point-renderer")
      expect(isCanvasPointRenderer(renderer)).toBe(true)
    })

    it("isCanvasPointRenderer returns false for undefined", async () => {
      const { isCanvasPointRenderer } = await import("./canvas-point-renderer")
      expect(isCanvasPointRenderer(undefined)).toBe(false)
    })
  })
})
