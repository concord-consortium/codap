import { renderHook } from "@testing-library/react"
import { MockAnimationFrame } from "../../test/mock-animation-frame"
import { useRowScrolling } from "./use-row-scrolling"

const mockGetBoundingClientRect = jest.fn().mockImplementation(() => ({ width: 1000, height: 350 }))
const mockGridElt = {
  scrollTop: 0,
  getBoundingClientRect: () => mockGetBoundingClientRect()
} as HTMLDivElement

describe("useRowScrolling", () => {

  let rafMock: MockAnimationFrame

  beforeEach(() => {
    rafMock = new MockAnimationFrame()
    mockGridElt.scrollTop = 0
    mockGetBoundingClientRect.mockClear()
  })

  afterEach(() => {
    rafMock.restore()
  })

  describe("scrollToRow", () => {
    it("does nothing without a grid element", () => {
      const { result } = renderHook(() => useRowScrolling(null))
      result.current.scrollToRow(1)
      expect(true).toBe(true)
    })

    it("doesn't scroll unnecessarily", () => {
      const { result } = renderHook(() => useRowScrolling(mockGridElt))
      result.current.scrollToRow(0)
      expect(rafMock.mockRequest).toHaveBeenCalledTimes(0)
      expect(rafMock.queue.size).toBe(0)
    })

    it("scrolls to specified row in multiple steps", () => {
      const { result } = renderHook(() => useRowScrolling(mockGridElt))
      result.current.scrollToRow(1)
      expect(rafMock.mockRequest).toHaveBeenCalledTimes(1)
      expect(rafMock.queue.size).toBe(1)
      // initial trigger -- initializes scroll
      const startTime = rafMock.triggerNext()
      expect(rafMock.mockRequest).toHaveBeenCalledTimes(2)
      expect(rafMock.queue.size).toBe(1)
      expect(mockGridElt.scrollTop).toBe(0)
      // next trigger -- too soon
      rafMock.triggerNext()
      expect(rafMock.mockRequest).toHaveBeenCalledTimes(3)
      expect(rafMock.queue.size).toBe(1)
      expect(mockGridElt.scrollTop).toBe(0)
      // next trigger -- first scroll
      rafMock.triggerNext()
      expect(rafMock.mockRequest).toHaveBeenCalledTimes(4)
      expect(rafMock.queue.size).toBe(1)
      expect(mockGridElt.scrollTop).toBeGreaterThan(0)
      // trigger half-way (rounded)
      rafMock.triggerNext(startTime + 250 - rafMock.time)
      expect(rafMock.mockRequest).toHaveBeenCalledTimes(5)
      expect(rafMock.queue.size).toBe(1)
      expect(mockGridElt.scrollTop).toBeGreaterThan(15)
      expect(mockGridElt.scrollTop).toBeLessThan(20)
      // trigger completion
      rafMock.triggerNext(startTime + 600)
      expect(rafMock.mockRequest).toHaveBeenCalledTimes(5)
      expect(rafMock.queue.size).toBe(0)
      expect(mockGridElt.scrollTop).toBe(35)
    })

    it("smoothly scrolls with alternate row heights", () => {
      const { result } = renderHook(() => useRowScrolling(mockGridElt, 30))
      result.current.scrollToRow(10)
      expect(rafMock.mockRequest).toHaveBeenCalledTimes(1)
      expect(rafMock.queue.size).toBe(1)
      rafMock.triggerAll()
      expect(rafMock.mockRequest.mock.calls.length).toBeGreaterThan(30)
      expect(rafMock.queue.size).toBe(0)
      expect(mockGridElt.scrollTop).toBe(300)
    })

    it("can be redirected before the scroll is complete", () => {
      const { result } = renderHook(() => useRowScrolling(mockGridElt))
      result.current.scrollToRow(20)
      rafMock.triggerNext()
      // advance to half-way
      rafMock.triggerNext(250)
      expect(mockGridElt.scrollTop).toBe(350)
      // issue another request to a different location
      result.current.scrollToRow(100)
      // still only one request queued
      expect(rafMock.queue.size).toBe(1)
      rafMock.triggerAll()
      expect(mockGridElt.scrollTop).toBe(3500)
    })
  })

  describe("scrollRowIntoView", () => {
    it("handles a null grid element", () => {
      const { result } = renderHook(() => useRowScrolling(null))
      result.current.scrollRowIntoView(1)
      expect(true).toBe(true)
    })

    it("does nothing if row is already in view", () => {
      const { result } = renderHook(() => useRowScrolling(mockGridElt))
      result.current.scrollRowIntoView(0)
      rafMock.triggerAll()
       result.current.scrollRowIntoView(1)
      rafMock.triggerAll()
      expect(mockGridElt.scrollTop).toBe(0)
      result.current.scrollRowIntoView(9)
      rafMock.triggerAll()
      expect(mockGridElt.scrollTop).toBe(0)
    })

    it("scrolls to rows outside the viewport", () => {
      const { result } = renderHook(() => useRowScrolling(mockGridElt))
      result.current.scrollRowIntoView(25)
      rafMock.triggerAll()
      expect(mockGridElt.scrollTop).toBeGreaterThanOrEqual(600)
      result.current.scrollRowIntoView(1)
      rafMock.triggerAll()
      expect(mockGridElt.scrollTop).toBe(0)
    })
  })

  describe("scrollClosestRowIntoView", () => {
    it("handles a null grid element", () => {
      const { result } = renderHook(() => useRowScrolling(null))
      result.current.scrollClosestRowIntoView([])
      expect(true).toBe(true)
    })

    it("doesn't scroll unless necessary", () => {
      const { result } = renderHook(() => useRowScrolling(mockGridElt))
      result.current.scrollClosestRowIntoView([])
      rafMock.triggerAll()
      expect(mockGridElt.scrollTop).toBe(0)
      result.current.scrollClosestRowIntoView([1, 3, 5, 7, 9])
      rafMock.triggerAll()
      expect(mockGridElt.scrollTop).toBe(0)
    })

    it("scrolls to nearest row", () => {
      const { result } = renderHook(() => useRowScrolling(mockGridElt))
      result.current.scrollClosestRowIntoView([22, 100])
      rafMock.triggerAll()
      expect(mockGridElt.scrollTop).toBeGreaterThan(500)
      expect(mockGridElt.scrollTop).toBeLessThan(600)
      result.current.scrollClosestRowIntoView([11, 40])
      rafMock.triggerAll()
      expect(mockGridElt.scrollTop).toBe(350)
    })
  })
})
