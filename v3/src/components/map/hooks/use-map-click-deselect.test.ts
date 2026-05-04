import { renderHook, act } from "@testing-library/react"
import { useMapClickDeselect } from "./use-map-click-deselect"
import { IMapContentModel } from "../models/map-content-model"
import { kDoubleClickDelay } from "../../constants" // Use the constant directly

// JSDom doesn't implement PointerEvent; polyfill it from MouseEvent.
const OriginalPointerEvent = window.PointerEvent
class MockPointerEvent extends MouseEvent {
  pointerId: number
  constructor(type: string, init?: PointerEventInit) {
    super(type, init)
    this.pointerId = init?.pointerId ?? 0
  }
}
window.PointerEvent = MockPointerEvent as any
afterAll(() => {
  if (OriginalPointerEvent) {
    window.PointerEvent = OriginalPointerEvent
  } else {
    delete (window as any).PointerEvent
  }
})

// JSDom marks isTrusted as a non-configurable own property (always false) on
// every Event instance. We intercept the capture-phase pointerdown listener
// and call it directly with a plain object where isTrusted = true.
let capturedPointerDownHandler: ((e: any) => void) | undefined

// Mock useTileSelectionContext
const mockIsTileSelected = jest.fn().mockReturnValue(true)
jest.mock("../../../hooks/use-tile-selection-context", () => ({
  useTileSelectionContext: () => ({
    isTileSelected: mockIsTileSelected,
    selectTile: jest.fn(),
    addFocusIgnoreFn: jest.fn()
  })
}))

// Mock selectAllCases
const mockSelectAllCases = jest.fn()
jest.mock("../../../models/data/data-set-utils", () => ({
  selectAllCases(data: unknown, select: unknown) { return mockSelectAllCases(data, select) }
}))

// Minimal mock Leaflet map with event emitter behavior
function createMockLeafletMap() {
  const listeners: Record<string, Array<() => void>> = {}
  return {
    on: jest.fn((event: string, handler: () => void) => {
      if (!listeners[event]) listeners[event] = []
      listeners[event].push(handler)
    }),
    off: jest.fn((event: string, handler: () => void) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter(h => h !== handler)
      }
    }),
    // Helper to simulate firing an event
    _fire: (event: string) => {
      listeners[event]?.forEach(h => h())
    }
  }
}

function createMockMapModel(leafletMap: ReturnType<typeof createMockLeafletMap>) {
  let onClickCallback: ((event: MouseEvent) => void) | undefined
  const mockDataset = { id: "ds1" }
  return {
    _ignoreLeafletClicks: false,
    datasetsArray: [mockDataset],
    leafletMapState: {
      leafletMap,
      setOnClickCallback: jest.fn((cb?: (event: MouseEvent) => void) => {
        onClickCallback = cb
      })
    },
    // Helper to simulate a Leaflet map click (invoking the registered callback)
    _simulateClick: (event: Partial<MouseEvent> = {}) => {
      onClickCallback?.({ shiftKey: false, metaKey: false, ctrlKey: false, ...event } as MouseEvent)
    }
  } as unknown as IMapContentModel & {
    _simulateClick: (event?: Partial<MouseEvent>) => void
  }
}

describe("useMapClickDeselect", () => {
  let leafletMap: ReturnType<typeof createMockLeafletMap>
  let mapModel: IMapContentModel & { _simulateClick: (event?: Partial<MouseEvent>) => void }

  beforeEach(() => {
    jest.useFakeTimers()
    const origAddEventListener = window.addEventListener.bind(window)
    jest.spyOn(window, "addEventListener").mockImplementation(
      ((type: string, handler: any, options?: any) => {
        if (type === "pointerdown") capturedPointerDownHandler = handler
        origAddEventListener(type, handler, options)
      }) as typeof window.addEventListener
    )
    mockIsTileSelected.mockReturnValue(true)
    mockSelectAllCases.mockClear()
    leafletMap = createMockLeafletMap()
    mapModel = createMockMapModel(leafletMap)
  })

  afterEach(() => {
    capturedPointerDownHandler = undefined
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  // Render the hook and simulate the common pointerdown → click sequence.
  // We call the captured handler directly with isTrusted: true because JSDom
  // always sets isTrusted to false on dispatched events and it's non-configurable.
  function renderAndSimulateClick(clickOverrides?: Partial<MouseEvent>) {
    renderHook(() => useMapClickDeselect(mapModel))
    act(() => { capturedPointerDownHandler?.({ isTrusted: true }) })
    act(() => { mapModel._simulateClick(clickOverrides) })
  }

  it("deselects all cases after delay on single click", () => {
    renderAndSimulateClick()
    expect(mockSelectAllCases).not.toHaveBeenCalled()

    act(() => { jest.advanceTimersByTime(kDoubleClickDelay) })
    expect(mockSelectAllCases).toHaveBeenCalledTimes(1)
    expect(mockSelectAllCases).toHaveBeenCalledWith(expect.anything(), false)
  })

  it("does NOT deselect on double-click (dblclick cancels pending deselect)", () => {
    renderAndSimulateClick()

    // Simulate dblclick firing before the delay expires
    act(() => {
      jest.advanceTimersByTime(100)
      leafletMap._fire("dblclick")
    })

    // Let all timers expire
    act(() => { jest.advanceTimersByTime(kDoubleClickDelay) })
    expect(mockSelectAllCases).not.toHaveBeenCalled()
  })

  it("does not deselect when tile was not previously selected", () => {
    mockIsTileSelected.mockReturnValue(false)
    renderAndSimulateClick()

    act(() => { jest.advanceTimersByTime(kDoubleClickDelay) })
    expect(mockSelectAllCases).not.toHaveBeenCalled()
  })

  it("does not deselect when _ignoreLeafletClicks is true", () => {
    ;(mapModel as any)._ignoreLeafletClicks = true
    renderAndSimulateClick()

    act(() => { jest.advanceTimersByTime(kDoubleClickDelay) })
    expect(mockSelectAllCases).not.toHaveBeenCalled()
  })

  it("does not deselect when modifier keys are held", () => {
    renderAndSimulateClick({ shiftKey: true })

    act(() => { jest.advanceTimersByTime(kDoubleClickDelay) })
    expect(mockSelectAllCases).not.toHaveBeenCalled()
  })
})
