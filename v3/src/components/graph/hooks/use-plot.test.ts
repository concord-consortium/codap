import { act, renderHook } from "@testing-library/react"
import { useAccumulatingDebouncedCallback } from "./use-plot"

describe("useAccumulatingDebouncedCallback", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("debounces multiple calls into a single execution", () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useAccumulatingDebouncedCallback(callback, 100))

    act(() => {
      result.current()
      result.current()
      result.current()
    })

    // Callback should not have been called yet
    expect(callback).not.toHaveBeenCalled()

    // Advance timers to trigger the debounced callback
    act(() => {
      jest.advanceTimersByTime(100)
    })

    // Should only be called once
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it("accumulates updateMasks with OR logic", () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useAccumulatingDebouncedCallback(callback, 100))

    act(() => {
      result.current({ updateMasks: false })
      result.current({ updateMasks: false })
      result.current({ updateMasks: true })
      result.current({ updateMasks: false })
    })

    act(() => {
      jest.advanceTimersByTime(100)
    })

    // updateMasks should be true because at least one call set it to true
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ updateMasks: true }))
  })

  it("keeps updateMasks false when no call sets it true", () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useAccumulatingDebouncedCallback(callback, 100))

    act(() => {
      result.current({ updateMasks: false })
      result.current({ updateMasks: false })
    })

    act(() => {
      jest.advanceTimersByTime(100)
    })

    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ updateMasks: false }))
  })

  it("accumulates selectedOnly with AND logic", () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useAccumulatingDebouncedCallback(callback, 100))

    act(() => {
      result.current({ selectedOnly: true })
      result.current({ selectedOnly: true })
      result.current({ selectedOnly: false })
      result.current({ selectedOnly: true })
    })

    act(() => {
      jest.advanceTimersByTime(100)
    })

    // selectedOnly should be false because at least one call set it to false
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ selectedOnly: false }))
  })

  it("keeps selectedOnly true when all calls set it true", () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useAccumulatingDebouncedCallback(callback, 100))

    act(() => {
      result.current({ selectedOnly: true })
      result.current({ selectedOnly: true })
      result.current({ selectedOnly: true })
    })

    act(() => {
      jest.advanceTimersByTime(100)
    })

    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ selectedOnly: true }))
  })

  it("treats call with no props as selectedOnly=false", () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useAccumulatingDebouncedCallback(callback, 100))

    act(() => {
      result.current({ selectedOnly: true })
      result.current() // no props means full refresh (selectedOnly=false)
      result.current({ selectedOnly: true })
    })

    act(() => {
      jest.advanceTimersByTime(100)
    })

    // selectedOnly should be false because the call with no props defaults to false
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ selectedOnly: false }))
  })

  it("treats undefined selectedOnly as false (full refresh)", () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useAccumulatingDebouncedCallback(callback, 100))

    act(() => {
      result.current({ selectedOnly: true })
      result.current({ updateMasks: true }) // selectedOnly is undefined, should count as false
      result.current({ selectedOnly: true })
    })

    act(() => {
      jest.advanceTimersByTime(100)
    })

    // selectedOnly should be false because undefined counts as false
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ selectedOnly: false }))
  })

  it("accumulates both options correctly", () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useAccumulatingDebouncedCallback(callback, 100))

    act(() => {
      result.current({ selectedOnly: true, updateMasks: false })
      result.current({ selectedOnly: true, updateMasks: true })
      result.current({ selectedOnly: true, updateMasks: false })
    })

    act(() => {
      jest.advanceTimersByTime(100)
    })

    // updateMasks=true (OR), selectedOnly=true (AND, all were true)
    expect(callback).toHaveBeenCalledWith({ selectedOnly: true, updateMasks: true })
  })

  it("resets accumulated values after execution", () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useAccumulatingDebouncedCallback(callback, 100))

    // First batch: set updateMasks=true
    act(() => {
      result.current({ updateMasks: true, selectedOnly: false })
    })

    act(() => {
      jest.advanceTimersByTime(100)
    })

    expect(callback).toHaveBeenCalledWith({ updateMasks: true, selectedOnly: false })

    // Second batch: don't set updateMasks, it should reset to false
    act(() => {
      result.current({ selectedOnly: true })
    })

    act(() => {
      jest.advanceTimersByTime(100)
    })

    // updateMasks should be back to false (default), selectedOnly should be true
    expect(callback).toHaveBeenLastCalledWith({ updateMasks: false, selectedOnly: true })
  })

  it("handles rapid successive batches correctly", () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useAccumulatingDebouncedCallback(callback, 100))

    // First call
    act(() => {
      result.current({ updateMasks: true })
    })

    // Wait 50ms (not enough to trigger)
    act(() => {
      jest.advanceTimersByTime(50)
    })
    expect(callback).not.toHaveBeenCalled()

    // Second call resets the debounce timer
    act(() => {
      result.current({ selectedOnly: true })
    })

    // Wait another 50ms (100ms total, but only 50ms since last call)
    act(() => {
      jest.advanceTimersByTime(50)
    })
    expect(callback).not.toHaveBeenCalled()

    // Wait final 50ms to complete the 100ms since last call
    act(() => {
      jest.advanceTimersByTime(50)
    })

    // Both options should be accumulated
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith({ updateMasks: true, selectedOnly: false })
  })
})
