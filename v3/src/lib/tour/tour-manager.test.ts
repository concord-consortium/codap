import { ITileModel } from "../../models/tiles/tile-model"

// --- driver.js mock ---
const mockDrive = jest.fn()
const mockHighlight = jest.fn()
const mockDestroy = jest.fn()
let capturedConfig: any = {}

const mockDriver = jest.fn((config: any) => {
  capturedConfig = config
  return { drive: mockDrive, highlight: mockHighlight, destroy: mockDestroy }
})

jest.mock("driver.js", () => ({
  driver: (config: unknown) => mockDriver(config)
}))
jest.mock("driver.js/dist/driver.css", () => ({}))
jest.mock("./tour-styles.scss", () => ({}))

// --- Mock resolveElement ---
const mockResolveElement = jest.fn()
jest.mock("./tour-elements", () => ({
  resolveElement: (...args: any[]) => mockResolveElement(...args)
}))

// --- Mock findTileFromNameOrId ---
const mockFindTileFromNameOrId = jest.fn()
jest.mock("../../data-interactive/resource-parser-utils", () => ({
  findTileFromNameOrId: (...args: any[]) => mockFindTileFromNameOrId(...args)
}))

// --- Mock isWebViewModel ---
const mockBroadcastMessage = jest.fn()
jest.mock("../../components/web-view/web-view-model", () => ({
  isWebViewModel: () => true
}))

import { tourManager } from "./tour-manager"

function makeTile(id = "tile1"): ITileModel {
  return {
    id,
    content: {
      broadcastMessage: mockBroadcastMessage
    }
  } as unknown as ITileModel
}

function makeTile2(id = "tile2"): ITileModel {
  return {
    id,
    content: {
      broadcastMessage: mockBroadcastMessage
    }
  } as unknown as ITileModel
}

// Helper to get the last broadcastMessage call's values
function lastNotification() {
  const calls = mockBroadcastMessage.mock.calls
  return calls[calls.length - 1]?.[0]?.values
}

function allNotifications() {
  return mockBroadcastMessage.mock.calls.map((c: any) => c[0]?.values)
}

describe("TourManager", () => {
  beforeEach(() => {
    // Clean up any active tour
    tourManager.cancelActive()
    mockDriver.mockClear()
    mockDrive.mockClear()
    mockHighlight.mockClear()
    mockDestroy.mockClear()
    mockBroadcastMessage.mockClear()
    mockResolveElement.mockClear()
    mockFindTileFromNameOrId.mockClear()
    capturedConfig = {}

    // Default: elements exist in DOM
    jest.spyOn(document, "querySelector").mockImplementation((sel: string) => {
      if (sel.includes("nonexistent")) return null
      return document.createElement("div")
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe("highlight", () => {
    it("highlights an element by tourKey and sends highlighted notification", () => {
      mockResolveElement.mockReturnValue({
        selector: '[data-testid="tool-shelf-button-graph"]',
        title: "Graph",
        description: "Click Graph to create a new graph."
      })

      const tile = makeTile()
      const result = tourManager.highlight(tile, { tourKey: "toolShelf.graph", id: "step1" })

      expect(result.success).toBe(true)
      expect(mockDriver).toHaveBeenCalledTimes(1)
      expect(mockHighlight).toHaveBeenCalledTimes(1)
      expect(tourManager.isActive).toBe(true)
      expect(tourManager.activeType).toBe("highlight")

      // Check highlighted notification
      expect(mockBroadcastMessage).toHaveBeenCalledTimes(1)
      const notification = lastNotification()
      expect(notification.operation).toBe("highlightUpdate")
      expect(notification.type).toBe("highlighted")
      expect(notification.tourKey).toBe("toolShelf.graph")
      expect(notification.id).toBe("step1")
    })

    it("highlights an element by testId", () => {
      const tile = makeTile()
      const result = tourManager.highlight(tile, { testId: "my-button" })

      expect(result.success).toBe(true)
      expect(mockHighlight).toHaveBeenCalledTimes(1)
      expect(lastNotification().testId).toBe("my-button")
    })

    it("highlights an element by raw selector", () => {
      const tile = makeTile()
      const result = tourManager.highlight(tile, { selector: ".my-class" })

      expect(result.success).toBe(true)
      expect(mockHighlight).toHaveBeenCalledTimes(1)
      expect(lastNotification().selector).toBe(".my-class")
    })

    it("silently skips when element is not found", () => {
      jest.spyOn(document, "querySelector").mockReturnValue(null)

      const tile = makeTile()
      const result = tourManager.highlight(tile, { selector: ".nonexistent" })

      expect(result.success).toBe(true)
      expect(mockHighlight).not.toHaveBeenCalled()
      expect(mockBroadcastMessage).not.toHaveBeenCalled()
    })

    it("silently skips invalid tourKey without dot", () => {
      const tile = makeTile()
      const result = tourManager.highlight(tile, { tourKey: "invalidKey" })

      expect(result.success).toBe(true)
      expect(mockHighlight).not.toHaveBeenCalled()
    })

    it("silently skips when tourKey not in registry", () => {
      mockResolveElement.mockReturnValue(undefined)

      const tile = makeTile()
      const result = tourManager.highlight(tile, { tourKey: "unknown.key" })

      expect(result.success).toBe(true)
      expect(mockHighlight).not.toHaveBeenCalled()
    })

    it("merges registry defaults with popover overrides for tourKey", () => {
      mockResolveElement.mockReturnValue({
        selector: '[data-testid="tool-shelf-button-graph"]',
        title: "Graph",
        description: "Default description"
      })

      const tile = makeTile()
      tourManager.highlight(tile, {
        tourKey: "toolShelf.graph",
        popover: { description: "Custom description" }
      })

      const highlightCall = mockHighlight.mock.calls[0][0]
      expect(highlightCall.popover.title).toBe("Graph")
      expect(highlightCall.popover.description).toBe("Custom description")
    })

    it("replaces previous highlight and notifies previous owner", () => {
      mockResolveElement.mockReturnValue({
        selector: '[data-testid="something"]',
        title: "T", description: "D"
      })

      const tile1 = makeTile("tile1")
      const tile2 = makeTile2("tile2")

      tourManager.highlight(tile1, { tourKey: "toolShelf.graph", id: "first" })
      mockBroadcastMessage.mockClear()

      tourManager.highlight(tile2, { tourKey: "toolShelf.graph", id: "second" })

      // First call should be highlightCleared for previous owner
      const notifications = allNotifications()
      expect(notifications[0].operation).toBe("highlightUpdate")
      expect(notifications[0].type).toBe("highlightCleared")
      expect(notifications[0].id).toBe("first")
      // Second call should be highlighted for new owner
      expect(notifications[1].operation).toBe("highlightUpdate")
      expect(notifications[1].type).toBe("highlighted")
      expect(notifications[1].id).toBe("second")
    })

    it("sends highlightCleared when user dismisses", () => {
      mockResolveElement.mockReturnValue({
        selector: '[data-testid="something"]',
        title: "T", description: "D"
      })

      const tile = makeTile()
      tourManager.highlight(tile, { tourKey: "toolShelf.graph", id: "h1" })
      mockBroadcastMessage.mockClear()

      // Simulate user dismissal via onDeselected
      capturedConfig.onDeselected()

      expect(lastNotification().operation).toBe("highlightUpdate")
      expect(lastNotification().type).toBe("highlightCleared")
      expect(lastNotification().id).toBe("h1")
      expect(tourManager.isActive).toBe(false)
    })

    it("scopes querySelector to component root when component is provided", () => {
      const mockComponentEl = document.createElement("div")
      const mockTargetEl = document.createElement("button")
      const mockComponentQS = jest.fn().mockReturnValue(mockTargetEl)
      mockComponentEl.querySelector = mockComponentQS

      mockFindTileFromNameOrId.mockReturnValue({ id: "TILE123" })
      jest.spyOn(document, "getElementById").mockImplementation((id: string) => {
        if (id === "TILE123") return mockComponentEl as unknown as HTMLElement
        return null
      })

      const tile = makeTile()
      tourManager.highlight(tile, { testId: "my-button", component: "myGraph" })

      expect(mockFindTileFromNameOrId).toHaveBeenCalledWith("myGraph")
      expect(mockComponentQS).toHaveBeenCalledWith('[data-testid="my-button"]')
    })

    it("targets the tile root element when only component is provided", () => {
      const mockComponentEl = document.createElement("div")

      mockFindTileFromNameOrId.mockReturnValue({ id: "TILE456" })
      jest.spyOn(document, "getElementById").mockImplementation((id: string) => {
        if (id === "TILE456") return mockComponentEl as unknown as HTMLElement
        return null
      })

      const tile = makeTile()
      tourManager.highlight(tile, { component: "myTable" })

      expect(mockFindTileFromNameOrId).toHaveBeenCalledWith("myTable")
      expect(mockHighlight).toHaveBeenCalled()
      const highlightArg = mockHighlight.mock.calls[0][0]
      expect(highlightArg.element).toBe(mockComponentEl)
    })

    it("silently skips when only component is provided but not found", () => {
      mockFindTileFromNameOrId.mockReturnValue(undefined)

      const tile = makeTile()
      tourManager.highlight(tile, { component: "nonexistent" })

      expect(mockHighlight).not.toHaveBeenCalled()
    })
  })

  describe("clearHighlight", () => {
    it("clears an active highlight without notifying the calling plugin", () => {
      mockResolveElement.mockReturnValue({
        selector: '[data-testid="something"]', title: "T", description: "D"
      })

      const tile = makeTile()
      tourManager.highlight(tile, { tourKey: "toolShelf.graph" })
      mockBroadcastMessage.mockClear()

      const result = tourManager.clearHighlight(tile)
      expect(result.success).toBe(true)
      expect(tourManager.isActive).toBe(false)
      // No notification to calling plugin
      expect(mockBroadcastMessage).not.toHaveBeenCalled()
    })

    it("is idempotent — safe to call when nothing is active", () => {
      const tile = makeTile()
      const result = tourManager.clearHighlight(tile)
      expect(result.success).toBe(true)
    })

    it("notifies different owner when clearing another plugin's highlight", () => {
      mockResolveElement.mockReturnValue({
        selector: '[data-testid="something"]', title: "T", description: "D"
      })

      const tile1 = makeTile("tile1")
      const tile2 = makeTile2("tile2")
      tourManager.highlight(tile1, { tourKey: "toolShelf.graph", id: "owned" })
      mockBroadcastMessage.mockClear()

      tourManager.clearHighlight(tile2)

      expect(lastNotification().operation).toBe("highlightUpdate")
      expect(lastNotification().type).toBe("highlightCleared")
      expect(lastNotification().id).toBe("owned")
    })
  })

  describe("startTour", () => {
    it("starts a tour and returns a tourId", () => {
      const tile = makeTile()
      const result = tourManager.startTour(tile, {
        steps: [{ selector: ".step1" }, { selector: ".step2" }]
      })

      expect(result.success).toBe(true)
      expect(result.values?.tourId).toMatch(/^tour-/)
      expect(mockDrive).toHaveBeenCalledTimes(1)
      expect(tourManager.isActive).toBe(true)
      expect(tourManager.activeType).toBe("tour")
    })

    it("filters out steps with missing elements", () => {
      jest.spyOn(document, "querySelector").mockImplementation((sel: string) => {
        if (sel === ".exists") return document.createElement("div")
        return null
      })

      const tile = makeTile()
      tourManager.startTour(tile, {
        steps: [
          { selector: ".exists" },
          { selector: ".missing" },
          { selector: ".also-missing" }
        ]
      })

      const steps = capturedConfig.steps
      expect(steps).toHaveLength(1)
    })

    it("sends immediate completed when all steps are filtered", () => {
      jest.spyOn(document, "querySelector").mockReturnValue(null)

      const tile = makeTile()
      const result = tourManager.startTour(tile, {
        steps: [{ selector: ".missing1" }, { selector: ".missing2" }]
      })

      expect(result.success).toBe(true)
      expect(result.values?.tourId).toBeTruthy()
      expect(mockDrive).not.toHaveBeenCalled()
      expect(lastNotification().type).toBe("completed")
      expect(lastNotification().totalSteps).toBe(2)
      expect(lastNotification().visibleSteps).toBe(0)
    })

    it("sends immediate completed for empty steps array", () => {
      const tile = makeTile()
      const result = tourManager.startTour(tile, { steps: [] })

      expect(result.success).toBe(true)
      expect(lastNotification().type).toBe("completed")
      expect(lastNotification().totalSteps).toBe(0)
    })

    it("sends stepStarted notification via onHighlightStarted", () => {
      const tile = makeTile()
      tourManager.startTour(tile, {
        steps: [
          { selector: ".step1", id: "s1" },
          { selector: ".step2", id: "s2" }
        ]
      })
      mockBroadcastMessage.mockClear()

      // Simulate onHighlightStarted for step 0
      capturedConfig.onHighlightStarted(null, null, { state: { activeIndex: 0 } })

      const n = lastNotification()
      expect(n.operation).toBe("tourUpdate")
      expect(n.type).toBe("stepStarted")
      expect(n.stepIndex).toBe(0)
      expect(n.totalSteps).toBe(2)
      expect(n.visibleSteps).toBe(2)
      expect(n.id).toBe("s1")
      expect(n.selector).toBe(".step1")
    })

    it("sends stepEnded notification via onDeselected", () => {
      const tile = makeTile()
      tourManager.startTour(tile, {
        steps: [{ selector: ".step1", id: "s1" }]
      })

      // Trigger onHighlightStarted first to set currentFilteredIdx
      capturedConfig.onHighlightStarted(null, null, { state: { activeIndex: 0 } })
      mockBroadcastMessage.mockClear()

      capturedConfig.onDeselected()

      const n = lastNotification()
      expect(n.type).toBe("stepEnded")
      expect(n.id).toBe("s1")
    })

    it("sends completed notification via onDestroyed", () => {
      const tile = makeTile()
      const result = tourManager.startTour(tile, {
        steps: [{ selector: ".step1" }]
      })
      mockBroadcastMessage.mockClear()

      capturedConfig.onDestroyed()

      const n = lastNotification()
      expect(n.type).toBe("completed")
      expect(n.tourId).toBe(result.values?.tourId)
      expect(n.totalSteps).toBe(1)
      expect(n.visibleSteps).toBe(1)
    })

    it("maps filtered step indices to original indices", () => {
      jest.spyOn(document, "querySelector").mockImplementation((sel: string) => {
        if (sel === ".missing") return null
        return document.createElement("div")
      })

      const tile = makeTile()
      tourManager.startTour(tile, {
        steps: [
          { selector: ".step0", id: "a" },
          { selector: ".missing", id: "b" },
          { selector: ".step2", id: "c" }
        ]
      })
      mockBroadcastMessage.mockClear()

      // Second visible step (filtered index 1) should map to original index 2
      capturedConfig.onHighlightStarted(null, null, { state: { activeIndex: 1 } })

      const n = lastNotification()
      expect(n.stepIndex).toBe(2)
      expect(n.id).toBe("c")
      expect(n.totalSteps).toBe(3)
      expect(n.visibleSteps).toBe(2)
    })

    it("includes tourKey targeting property in notifications", () => {
      mockResolveElement.mockReturnValue({
        selector: '[data-testid="tool-shelf-button-graph"]',
        title: "Graph", description: "Desc"
      })

      const tile = makeTile()
      tourManager.startTour(tile, {
        steps: [{ tourKey: "toolShelf.graph", id: "s1" }]
      })
      mockBroadcastMessage.mockClear()

      capturedConfig.onHighlightStarted(null, null, { state: { activeIndex: 0 } })

      expect(lastNotification().tourKey).toBe("toolShelf.graph")
      expect(lastNotification().selector).toBeUndefined()
    })

    it("passes tour-level options to driver", () => {
      const tile = makeTile()
      tourManager.startTour(tile, {
        steps: [{ selector: ".s" }],
        overlayOpacity: 0.5,
        showProgress: false,
        allowKeyboardControl: false,
        allowClose: false
      })

      expect(capturedConfig.overlayOpacity).toBe(0.5)
      expect(capturedConfig.showProgress).toBe(false)
      expect(capturedConfig.allowKeyboardControl).toBe(false)
      expect(capturedConfig.allowClose).toBe(false)
    })
  })

  describe("endTour", () => {
    it("ends an active tour", () => {
      const tile = makeTile()
      const { values } = tourManager.startTour(tile, {
        steps: [{ selector: ".step1" }]
      })
      // Simulate a step starting
      capturedConfig.onHighlightStarted(null, null, { state: { activeIndex: 0 } })
      mockBroadcastMessage.mockClear()

      const result = tourManager.endTour(tile)
      expect(result.success).toBe(true)
      expect(tourManager.isActive).toBe(false)

      // Should have sent cancelled notification
      expect(lastNotification().type).toBe("cancelled")
      expect(lastNotification().tourId).toBe(values?.tourId)
    })

    it("is idempotent — safe to call when nothing is active", () => {
      const tile = makeTile()
      const result = tourManager.endTour(tile)
      expect(result.success).toBe(true)
    })

    it("is a no-op when tourId doesn't match", () => {
      const tile = makeTile()
      tourManager.startTour(tile, { steps: [{ selector: ".s" }] })

      const result = tourManager.endTour(tile, "tour-wrong-id")
      expect(result.success).toBe(true)
      expect(tourManager.isActive).toBe(true) // still active
    })

    it("ends tour when tourId matches", () => {
      const tile = makeTile()
      const { values } = tourManager.startTour(tile, { steps: [{ selector: ".s" }] })

      const result = tourManager.endTour(tile, values?.tourId)
      expect(result.success).toBe(true)
      expect(tourManager.isActive).toBe(false)
    })

    it("does not emit stepEnded on cancellation — only cancelled", () => {
      const tile = makeTile()
      tourManager.startTour(tile, {
        steps: [{ selector: ".step1", id: "s1" }]
      })
      capturedConfig.onHighlightStarted(null, null, { state: { activeIndex: 0 } })
      mockBroadcastMessage.mockClear()

      tourManager.endTour(tile)

      const notifications = allNotifications()
      expect(notifications).toHaveLength(1)
      expect(notifications[0].type).toBe("cancelled")
      // No stepEnded
      expect(notifications.find((n: any) => n.type === "stepEnded")).toBeUndefined()
    })

    it("cancelled notification includes step info when a step was active", () => {
      const tile = makeTile()
      tourManager.startTour(tile, {
        steps: [{ selector: ".step1", id: "s1" }]
      })
      capturedConfig.onHighlightStarted(null, null, { state: { activeIndex: 0 } })
      mockBroadcastMessage.mockClear()

      tourManager.endTour(tile)

      const n = lastNotification()
      expect(n.type).toBe("cancelled")
      expect(n.stepIndex).toBe(0)
      expect(n.id).toBe("s1")
      expect(n.totalSteps).toBe(1)
      expect(n.visibleSteps).toBe(1)
    })

    it("endTour is a no-op when called by a non-owner tile", () => {
      const tile1 = makeTile("tile1")
      const tile2 = makeTile2("tile2")
      tourManager.startTour(tile1, { steps: [{ selector: ".s" }] })

      const result = tourManager.endTour(tile2)
      expect(result.success).toBe(true)
      expect(tourManager.isActive).toBe(true)
    })
  })

  describe("tourNext / tourPrevious / tourMoveTo", () => {
    let mockMoveNext: jest.Mock
    let mockMovePrevious: jest.Mock
    let mockMoveTo: jest.Mock

    beforeEach(() => {
      mockMoveNext = jest.fn()
      mockMovePrevious = jest.fn()
      mockMoveTo = jest.fn()
      mockDriver.mockImplementation((config: any) => {
        capturedConfig = config
        return {
          drive: mockDrive, highlight: mockHighlight, destroy: mockDestroy,
          moveNext: mockMoveNext, movePrevious: mockMovePrevious, moveTo: mockMoveTo
        }
      })
    })

    it("tourNext calls moveNext on the driver instance", () => {
      const tile = makeTile()
      tourManager.startTour(tile, { steps: [{ selector: ".s1" }, { selector: ".s2" }] })

      const result = tourManager.tourNext(tile)
      expect(result.success).toBe(true)
      expect(mockMoveNext).toHaveBeenCalledTimes(1)
    })

    it("tourNext is a no-op when no tour is active", () => {
      const tile = makeTile()
      const result = tourManager.tourNext(tile)
      expect(result.success).toBe(true)
      expect(mockMoveNext).not.toHaveBeenCalled()
    })

    it("tourNext is a no-op when a highlight (not tour) is active", () => {
      mockResolveElement.mockReturnValue({
        selector: '[data-testid="something"]', title: "T", description: "D"
      })
      const tile = makeTile()
      tourManager.highlight(tile, { tourKey: "toolShelf.graph" })

      const result = tourManager.tourNext(tile)
      expect(result.success).toBe(true)
      expect(mockMoveNext).not.toHaveBeenCalled()
    })

    it("tourPrevious calls movePrevious on the driver instance", () => {
      const tile = makeTile()
      tourManager.startTour(tile, { steps: [{ selector: ".s1" }, { selector: ".s2" }] })

      const result = tourManager.tourPrevious(tile)
      expect(result.success).toBe(true)
      expect(mockMovePrevious).toHaveBeenCalledTimes(1)
    })

    it("tourPrevious is a no-op when no tour is active", () => {
      const tile = makeTile()
      const result = tourManager.tourPrevious(tile)
      expect(result.success).toBe(true)
      expect(mockMovePrevious).not.toHaveBeenCalled()
    })

    it("tourMoveTo moves to a specific step by original index", () => {
      const tile = makeTile()
      tourManager.startTour(tile, {
        steps: [{ selector: ".s0" }, { selector: ".s1" }, { selector: ".s2" }]
      })

      const result = tourManager.tourMoveTo(tile, 2)
      expect(result.success).toBe(true)
      expect(mockMoveTo).toHaveBeenCalledWith(2)
    })

    it("tourMoveTo maps original index to filtered index when steps were filtered", () => {
      jest.spyOn(document, "querySelector").mockImplementation((sel: string) => {
        if (sel === ".missing") return null
        return document.createElement("div")
      })

      const tile = makeTile()
      tourManager.startTour(tile, {
        steps: [
          { selector: ".s0" },
          { selector: ".missing" },
          { selector: ".s2" }
        ]
      })

      tourManager.tourMoveTo(tile, 2)
      expect(mockMoveTo).toHaveBeenCalledWith(1)
    })

    it("tourMoveTo is a no-op when target step was filtered out", () => {
      jest.spyOn(document, "querySelector").mockImplementation((sel: string) => {
        if (sel === ".missing") return null
        return document.createElement("div")
      })

      const tile = makeTile()
      tourManager.startTour(tile, {
        steps: [{ selector: ".s0" }, { selector: ".missing" }]
      })

      const result = tourManager.tourMoveTo(tile, 1)
      expect(result.success).toBe(true)
      expect(mockMoveTo).not.toHaveBeenCalled()
    })

    it("tourMoveTo is a no-op when no tour is active", () => {
      const tile = makeTile()
      const result = tourManager.tourMoveTo(tile, 0)
      expect(result.success).toBe(true)
      expect(mockMoveTo).not.toHaveBeenCalled()
    })

    it("tourMoveTo is a no-op when stepIndex is not provided", () => {
      const tile = makeTile()
      tourManager.startTour(tile, { steps: [{ selector: ".s" }] })

      const result = tourManager.tourMoveTo(tile, undefined)
      expect(result.success).toBe(true)
      expect(mockMoveTo).not.toHaveBeenCalled()
    })

    it("tourNext is a no-op when called by a non-owner tile", () => {
      const tile1 = makeTile("tile1")
      const tile2 = makeTile2("tile2")
      tourManager.startTour(tile1, { steps: [{ selector: ".s1" }, { selector: ".s2" }] })

      const result = tourManager.tourNext(tile2)
      expect(result.success).toBe(true)
      expect(mockMoveNext).not.toHaveBeenCalled()
    })

    it("tourPrevious is a no-op when called by a non-owner tile", () => {
      const tile1 = makeTile("tile1")
      const tile2 = makeTile2("tile2")
      tourManager.startTour(tile1, { steps: [{ selector: ".s1" }, { selector: ".s2" }] })

      const result = tourManager.tourPrevious(tile2)
      expect(result.success).toBe(true)
      expect(mockMovePrevious).not.toHaveBeenCalled()
    })

    it("tourMoveTo is a no-op when called by a non-owner tile", () => {
      const tile1 = makeTile("tile1")
      const tile2 = makeTile2("tile2")
      tourManager.startTour(tile1, { steps: [{ selector: ".s0" }, { selector: ".s1" }] })

      const result = tourManager.tourMoveTo(tile2, 1)
      expect(result.success).toBe(true)
      expect(mockMoveTo).not.toHaveBeenCalled()
    })
  })

  describe("tourRefresh", () => {
    const mockRefresh = jest.fn()

    beforeEach(() => {
      mockDriver.mockImplementation((config: any) => {
        capturedConfig = config
        return {
          drive: mockDrive, highlight: mockHighlight, destroy: mockDestroy,
          moveNext: jest.fn(), movePrevious: jest.fn(), moveTo: jest.fn(),
          refresh: mockRefresh
        }
      })
    })

    it("calls refresh on the driver instance for an active tour", () => {
      const tile = makeTile()
      tourManager.startTour(tile, { steps: [{ selector: ".s1" }] })

      const result = tourManager.tourRefresh(tile)
      expect(result.success).toBe(true)
      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })

    it("calls refresh on the driver instance for an active highlight", () => {
      mockResolveElement.mockReturnValue({
        selector: '[data-testid="something"]', title: "T", description: "D"
      })
      const tile = makeTile()
      tourManager.highlight(tile, { tourKey: "toolShelf.graph" })
      mockRefresh.mockClear()

      const result = tourManager.tourRefresh(tile)
      expect(result.success).toBe(true)
      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })

    it("is a no-op when nothing is active", () => {
      mockRefresh.mockClear()
      const tile = makeTile()
      const result = tourManager.tourRefresh(tile)
      expect(result.success).toBe(true)
      expect(mockRefresh).not.toHaveBeenCalled()
    })

    it("tourRefresh is a no-op when called by a non-owner tile", () => {
      const tile1 = makeTile("tile1")
      const tile2 = makeTile2("tile2")
      tourManager.startTour(tile1, { steps: [{ selector: ".s1" }] })
      mockRefresh.mockClear()

      const result = tourManager.tourRefresh(tile2)
      expect(result.success).toBe(true)
      expect(mockRefresh).not.toHaveBeenCalled()
    })
  })

  describe("config passthrough", () => {
    it("passes presentation and label options to driver", () => {
      const tile = makeTile()
      tourManager.startTour(tile, {
        steps: [{ selector: ".s" }],
        animate: false,
        smoothScroll: true,
        popoverOffset: 20,
        progressText: "{{current}} / {{total}}",
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Done!",
        disableButtons: ["previous"]
      })

      expect(capturedConfig.animate).toBe(false)
      expect(capturedConfig.smoothScroll).toBe(true)
      expect(capturedConfig.popoverOffset).toBe(20)
      expect(capturedConfig.progressText).toBe("{{current}} / {{total}}")
      expect(capturedConfig.nextBtnText).toBe("Next")
      expect(capturedConfig.prevBtnText).toBe("Back")
      expect(capturedConfig.doneBtnText).toBe("Done!")
      expect(capturedConfig.disableButtons).toEqual(["previous"])
    })

    it("does not include options that are not provided", () => {
      const tile = makeTile()
      tourManager.startTour(tile, { steps: [{ selector: ".s" }] })

      expect(capturedConfig.animate).toBeUndefined()
      expect(capturedConfig.smoothScroll).toBeUndefined()
      expect(capturedConfig.popoverOffset).toBeUndefined()
      expect(capturedConfig.progressText).toBeUndefined()
      expect(capturedConfig.nextBtnText).toBeUndefined()
      expect(capturedConfig.prevBtnText).toBeUndefined()
      expect(capturedConfig.disableButtons).toBeUndefined()
    })
  })

  describe("tour replacement", () => {
    it("sends cancelled to previous owner before starting new tour", () => {
      const tile1 = makeTile("tile1")
      const tile2 = makeTile2("tile2")

      const { values: v1 } = tourManager.startTour(tile1, {
        steps: [{ selector: ".s1", id: "old" }]
      })
      capturedConfig.onHighlightStarted(null, null, { state: { activeIndex: 0 } })
      mockBroadcastMessage.mockClear()

      tourManager.startTour(tile2, {
        steps: [{ selector: ".s2", id: "new" }]
      })

      const notifications = allNotifications()
      // First notification should be cancelled for old tour
      const cancelledIdx = notifications.findIndex((n: any) => n.type === "cancelled")
      expect(cancelledIdx).toBeGreaterThanOrEqual(0)
      expect(notifications[cancelledIdx].tourId).toBe(v1?.tourId)
    })
  })

  describe("runInternalTour", () => {
    it("runs a feature tour with no ownerTile", () => {
      tourManager.runInternalTour({
        options: { showProgress: true },
        steps: [{ element: "body", popover: { description: "Test" } }]
      })

      expect(mockDrive).toHaveBeenCalledTimes(1)
      expect(tourManager.isActive).toBe(true)
    })

    it("cancels a plugin tour when starting an internal tour", () => {
      const tile = makeTile()
      tourManager.startTour(tile, { steps: [{ selector: ".s" }] })
      capturedConfig.onHighlightStarted(null, null, { state: { activeIndex: 0 } })
      mockBroadcastMessage.mockClear()

      tourManager.runInternalTour({
        steps: [{ element: "body", popover: { description: "Feature tour" } }]
      })

      // Plugin should have received cancelled notification
      expect(lastNotification().type).toBe("cancelled")
    })

    it("does not send notification when cancelling internal tour (no ownerTile)", () => {
      tourManager.runInternalTour({
        steps: [{ element: "body", popover: { description: "Tour 1" } }]
      })
      mockBroadcastMessage.mockClear()

      // Start a plugin tour that replaces the internal tour
      const tile = makeTile()
      tourManager.startTour(tile, { steps: [{ selector: ".s" }] })

      // No cancelled notification was sent (internal tour has no ownerTile)
      const cancelledNotifications = allNotifications().filter((n: any) => n.type === "cancelled")
      expect(cancelledNotifications).toHaveLength(0)
    })

    it("filters out skipped and missing-element steps", () => {
      jest.spyOn(document, "querySelector").mockImplementation((sel: string) => {
        if (sel === ".missing") return null
        return document.createElement("div")
      })

      tourManager.runInternalTour({
        steps: [
          { element: "body", popover: { description: "Visible" } },
          { element: ".missing", popover: { description: "Missing" } },
          { element: "body", popover: { description: "Skipped" }, skip: true }
        ]
      })

      expect(capturedConfig.steps).toHaveLength(1)
    })

    it("does not launch when all steps are filtered", () => {
      jest.spyOn(document, "querySelector").mockReturnValue(null)

      tourManager.runInternalTour({
        steps: [{ element: ".nonexistent", popover: { description: "Missing" } }]
      })

      expect(mockDrive).not.toHaveBeenCalled()
    })
  })

  describe("cleanupForTile", () => {
    it("destroys active tour owned by the tile", () => {
      const tile = makeTile()
      tourManager.startTour(tile, { steps: [{ selector: ".s" }] })

      tourManager.cleanupForTile(tile)

      expect(mockDestroy).toHaveBeenCalled()
      expect(tourManager.isActive).toBe(false)
    })

    it("does not affect active tour owned by a different tile", () => {
      const tile1 = makeTile("tile1")
      const tile2 = makeTile2("tile2")
      tourManager.startTour(tile1, { steps: [{ selector: ".s" }] })

      tourManager.cleanupForTile(tile2)

      expect(tourManager.isActive).toBe(true)
    })

    it("does not send notification — plugin is gone", () => {
      const tile = makeTile()
      tourManager.startTour(tile, { steps: [{ selector: ".s" }] })
      mockBroadcastMessage.mockClear()

      tourManager.cleanupForTile(tile)

      expect(mockBroadcastMessage).not.toHaveBeenCalled()
    })
  })
})
