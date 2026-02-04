import { CaseDataWithSubPlot } from "../d3-types"
import { NullPointRenderer } from "./null-point-renderer"
import { IPointStyle } from "./point-renderer-types"
import { PointsState } from "./points-state"

/**
 * Tests for NullPointRenderer.
 * Since NullPointRenderer is the simplest concrete implementation of PointRendererBase,
 * these tests also validate the base class template method pattern and state management.
 */
describe("NullPointRenderer", () => {
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

  let renderer: NullPointRenderer

  beforeEach(() => {
    renderer = new NullPointRenderer()
  })

  afterEach(() => {
    renderer.dispose()
  })

  describe("construction", () => {
    it("creates a new PointsState if none provided", () => {
      const r = new NullPointRenderer()
      expect(r.getState()).toBeDefined()
      expect(r.getState()).toBeInstanceOf(PointsState)
      r.dispose()
    })

    it("uses provided PointsState", () => {
      const sharedState = new PointsState()
      const r = new NullPointRenderer(sharedState)
      expect(r.getState()).toBe(sharedState)
      r.dispose()
    })
  })

  describe("capability", () => {
    it("reports null capability", () => {
      expect(renderer.capability).toBe("null")
    })
  })

  describe("canvas", () => {
    it("returns null for canvas", () => {
      expect(renderer.canvas).toBeNull()
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
  })

  describe("anyTransitionActive", () => {
    it("always returns false for NullPointRenderer", () => {
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

    it("updates scale for all points", async () => {
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

    it("executes callback immediately (no animation)", async () => {
      let callbackCalled = false

      await renderer.transition(() => {
        callbackCalled = true
      }, { duration: 500 })

      expect(callbackCalled).toBe(true)
    })

    it("returns resolved promise immediately", async () => {
      const startTime = Date.now()

      await renderer.transition(() => {}, { duration: 1000 })

      const elapsed = Date.now() - startTime
      // Should complete nearly instantly, not wait 1000ms
      expect(elapsed).toBeLessThan(100)
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
    it("defaults to visible", () => {
      expect(renderer.isVisible).toBe(true)
    })

    it("can be toggled", () => {
      renderer.setVisibility(false)
      expect(renderer.isVisible).toBe(false)

      renderer.setVisibility(true)
      expect(renderer.isVisible).toBe(true)
    })
  })

  describe("resize", () => {
    beforeEach(async () => {
      await renderer.init()
    })

    it("accepts resize call without error", () => {
      expect(() => renderer.resize(800, 600, 2, 3, 1, 1)).not.toThrow()
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
      const renderer1 = new NullPointRenderer(sharedState)
      await renderer1.init()
      renderer1.matchPointsToData("dataset1", [
        createCaseData(0, "case1"),
        createCaseData(0, "case2")
      ], "points", defaultStyle)

      const point1 = renderer1.getPointForCaseData(createCaseData(0, "case1"))!
      renderer1.setPointPosition(point1, 100, 200)

      // Second renderer uses same state
      const renderer2 = new NullPointRenderer(sharedState)
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

  describe("animation frame management", () => {
    beforeEach(async () => {
      await renderer.init()
    })

    it("requestAnimationFrame registers callback", () => {
      const mockCallback = jest.fn()
      const rafSpy = jest.spyOn(window, "requestAnimationFrame").mockImplementation(cb => {
        cb(0)
        return 1
      })

      renderer.requestAnimationFrame("test", mockCallback)

      expect(rafSpy).toHaveBeenCalled()
      expect(mockCallback).toHaveBeenCalled()

      rafSpy.mockRestore()
    })

    it("cancelAnimationFrame cancels pending request", () => {
      const mockCallback = jest.fn()
      const frameId = 123
      const rafSpy = jest.spyOn(window, "requestAnimationFrame").mockReturnValue(frameId)
      const cafSpy = jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {})

      renderer.requestAnimationFrame("test", mockCallback)
      renderer.cancelAnimationFrame("test")

      expect(cafSpy).toHaveBeenCalledWith(frameId)

      rafSpy.mockRestore()
      cafSpy.mockRestore()
    })

    it("prevents duplicate animation frame requests with same ID", () => {
      const mockCallback = jest.fn()
      let callCount = 0
      const rafSpy = jest.spyOn(window, "requestAnimationFrame").mockImplementation(() => {
        callCount++
        return callCount
      })

      renderer.requestAnimationFrame("test", mockCallback)
      renderer.requestAnimationFrame("test", mockCallback)
      renderer.requestAnimationFrame("test", mockCallback)

      // Should only have one pending request
      expect(callCount).toBe(1)

      rafSpy.mockRestore()
    })
  })
})
