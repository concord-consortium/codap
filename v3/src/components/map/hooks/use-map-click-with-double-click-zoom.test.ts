import { renderHook, act } from "@testing-library/react"
import { Map as LeafletMap, Point as LeafletPoint, LatLng } from "leaflet"
import { useMapClickWithDoubleClickZoom } from "./use-map-click-with-double-click-zoom"
import { kDoubleClickDelay } from "../../constants"

// Mock leaflet map
function createMockLeafletMap() {
  return {
    mouseEventToContainerPoint: jest.fn().mockReturnValue(new LeafletPoint(100, 100)),
    containerPointToLatLng: jest.fn().mockReturnValue(new LatLng(40, -74)),
    getZoom: jest.fn().mockReturnValue(5),
    setZoomAround: jest.fn()
  } as unknown as LeafletMap
}

function createMouseEvent(overrides: Partial<MouseEvent> = {}): MouseEvent {
  return { clientX: 100, clientY: 100, shiftKey: false, detail: 1, ...overrides } as MouseEvent
}

describe("useMapClickWithDoubleClickZoom", () => {

  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it("calls onClick after short delay for a single click", () => {
    const leafletMap = createMockLeafletMap()
    const { result } = renderHook(() => useMapClickWithDoubleClickZoom(leafletMap))
    const onClick = jest.fn()

    act(() => {
      result.current.wrapClickHandler(onClick, createMouseEvent())
    })

    // Not called immediately
    expect(onClick).not.toHaveBeenCalled()

    // Called after delay
    act(() => { jest.advanceTimersByTime(kDoubleClickDelay) })
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("does NOT call onClick on double-click", () => {
    const leafletMap = createMockLeafletMap()
    const { result } = renderHook(() => useMapClickWithDoubleClickZoom(leafletMap))
    const onClick = jest.fn()

    // First click
    act(() => {
      result.current.wrapClickHandler(onClick, createMouseEvent())
    })

    // Second click with detail: 2 (browser-reported double-click)
    act(() => {
      result.current.wrapClickHandler(onClick, createMouseEvent({ detail: 2 }))
    })

    // Let all timers expire
    act(() => { jest.advanceTimersByTime(kDoubleClickDelay) })
    expect(onClick).not.toHaveBeenCalled()
  })

  it("triggers zoom in on double-click", () => {
    const leafletMap = createMockLeafletMap()
    const { result } = renderHook(() => useMapClickWithDoubleClickZoom(leafletMap))
    const onClick = jest.fn()

    // First click
    act(() => {
      result.current.wrapClickHandler(onClick, createMouseEvent())
    })

    // Second click with detail: 2
    act(() => {
      result.current.wrapClickHandler(onClick, createMouseEvent({ detail: 2 }))
    })

    expect(leafletMap.setZoomAround).toHaveBeenCalledWith(expect.any(LatLng), 6)
  })

  it("triggers zoom out on shift+double-click", () => {
    const leafletMap = createMockLeafletMap()
    const { result } = renderHook(() => useMapClickWithDoubleClickZoom(leafletMap))
    const onClick = jest.fn()

    // First click with shift
    act(() => {
      result.current.wrapClickHandler(onClick, createMouseEvent({ shiftKey: true }))
    })

    // Second click with shift + detail: 2
    act(() => {
      result.current.wrapClickHandler(onClick,
        createMouseEvent({ shiftKey: true, detail: 2 }))
    })

    expect(leafletMap.setZoomAround).toHaveBeenCalledWith(expect.any(LatLng), 4)
  })

  it("treats two single clicks (detail: 1) as separate actions", () => {
    const leafletMap = createMockLeafletMap()
    const { result } = renderHook(() => useMapClickWithDoubleClickZoom(leafletMap))
    const onClick1 = jest.fn()
    const onClick2 = jest.fn()

    // First click
    act(() => {
      result.current.wrapClickHandler(onClick1, createMouseEvent())
    })

    act(() => { jest.advanceTimersByTime(kDoubleClickDelay) })
    expect(onClick1).toHaveBeenCalledTimes(1)

    // Second click, also detail: 1
    act(() => {
      result.current.wrapClickHandler(onClick2, createMouseEvent())
    })

    act(() => { jest.advanceTimersByTime(kDoubleClickDelay) })
    expect(onClick2).toHaveBeenCalledTimes(1)
    expect(leafletMap.setZoomAround).not.toHaveBeenCalled()
  })

  it("does not call setZoomAround when leafletMap is undefined", () => {
    const { result } = renderHook(() => useMapClickWithDoubleClickZoom(undefined))
    const onClick = jest.fn()

    // First click
    act(() => {
      result.current.wrapClickHandler(onClick, createMouseEvent())
    })

    // Second click with detail: 2
    act(() => {
      result.current.wrapClickHandler(onClick, createMouseEvent({ detail: 2 }))
    })

    // Advance past the double-click delay to ensure no delayed callback fires
    act(() => { jest.advanceTimersByTime(kDoubleClickDelay) })

    // onClick should not be called — pending single-click was cancelled, and no zoom without a map
    expect(onClick).not.toHaveBeenCalled()
  })
})
