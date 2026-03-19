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
  return { clientX: 100, clientY: 100, shiftKey: false, ...overrides } as MouseEvent
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

    // Second click within the delay window
    act(() => {
      jest.advanceTimersByTime(100)
      result.current.wrapClickHandler(onClick, createMouseEvent())
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

    // Second click
    act(() => {
      jest.advanceTimersByTime(100)
      result.current.wrapClickHandler(onClick, createMouseEvent())
    })

    expect(leafletMap.setZoomAround).toHaveBeenCalledWith(expect.any(LatLng), 6)
  })

  it("triggers zoom out on shift+double-click", () => {
    const leafletMap = createMockLeafletMap()
    const { result } = renderHook(() => useMapClickWithDoubleClickZoom(leafletMap))
    const onClick = jest.fn()
    const shiftEvent = createMouseEvent({ shiftKey: true } as Partial<MouseEvent>)

    // First click with shift
    act(() => {
      result.current.wrapClickHandler(onClick, shiftEvent)
    })

    // Second click with shift
    act(() => {
      jest.advanceTimersByTime(100)
      result.current.wrapClickHandler(onClick, shiftEvent)
    })

    expect(leafletMap.setZoomAround).toHaveBeenCalledWith(expect.any(LatLng), 4)
  })

  it("treats two clicks far apart in time as separate single clicks", () => {
    const leafletMap = createMockLeafletMap()
    const { result } = renderHook(() => useMapClickWithDoubleClickZoom(leafletMap))
    const onClick1 = jest.fn()
    const onClick2 = jest.fn()

    // First click
    act(() => {
      result.current.wrapClickHandler(onClick1, createMouseEvent())
    })

    // Wait for the first click's timer to fire
    act(() => { jest.advanceTimersByTime(kDoubleClickDelay) })
    expect(onClick1).toHaveBeenCalledTimes(1)

    // Second click, well after the delay window
    act(() => {
      jest.advanceTimersByTime(500)
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

    // Second click
    act(() => {
      jest.advanceTimersByTime(100)
      result.current.wrapClickHandler(onClick, createMouseEvent())
    })

    // onClick should not be called
    expect(onClick).not.toHaveBeenCalled()
  })
})
