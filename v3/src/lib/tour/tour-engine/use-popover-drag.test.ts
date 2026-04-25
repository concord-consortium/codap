import { act, renderHook } from "@testing-library/react"
import { usePopoverDrag } from "./use-popover-drag"

function makePopoverEl(rect = { left: 100, top: 100, width: 200, height: 100 }): HTMLElement {
  const el = document.createElement("div")
  document.body.appendChild(el)
  jest.spyOn(el, "getBoundingClientRect").mockReturnValue({
    ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height,
    x: rect.left, y: rect.top, toJSON: () => ({})
  } as DOMRect)
  return el
}

function pointerDownEvent(clientX = 150, clientY = 130): React.PointerEvent {
  return {
    button: 0,
    clientX, clientY,
    target: document.body,
    preventDefault: jest.fn(),
  } as unknown as React.PointerEvent
}

describe("usePopoverDrag", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { writable: true, value: 1024 })
    Object.defineProperty(window, "innerHeight", { writable: true, value: 768 })
  })

  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("starts inactive with no position", () => {
    const popoverEl = makePopoverEl()
    const { result } = renderHook(() => usePopoverDrag("step-key", popoverEl))
    expect(result.current.isDragging).toBe(false)
    expect(result.current.position).toBeNull()
  })

  it("sets isDragging on pointerdown and updates position on pointermove", () => {
    const popoverEl = makePopoverEl()
    const { result } = renderHook(() => usePopoverDrag("step-key", popoverEl))

    act(() => { result.current.onPointerDown(pointerDownEvent(150, 130)) })
    expect(result.current.isDragging).toBe(true)

    const move = new MouseEvent("pointermove", { clientX: 200, clientY: 180 })
    act(() => { document.dispatchEvent(move) })
    expect(result.current.position).toEqual({ x: 150, y: 150 })
  })

  it("clears isDragging on pointerup and removes document listeners", () => {
    const popoverEl = makePopoverEl()
    const { result } = renderHook(() => usePopoverDrag("step-key", popoverEl))

    act(() => { result.current.onPointerDown(pointerDownEvent()) })
    act(() => { document.dispatchEvent(new MouseEvent("pointerup")) })
    expect(result.current.isDragging).toBe(false)

    // After pointerup, further moves should not affect state
    const before = result.current.position
    act(() => { document.dispatchEvent(new MouseEvent("pointermove", { clientX: 999, clientY: 999 })) })
    expect(result.current.position).toBe(before)
  })

  it("removes in-flight document listeners when the hook unmounts mid-drag", () => {
    const popoverEl = makePopoverEl()
    const removeSpy = jest.spyOn(document, "removeEventListener")
    const { result, unmount } = renderHook(() => usePopoverDrag("step-key", popoverEl))

    act(() => { result.current.onPointerDown(pointerDownEvent()) })
    removeSpy.mockClear()

    unmount()

    const removedEvents = removeSpy.mock.calls.map(c => c[0])
    expect(removedEvents).toContain("pointermove")
    expect(removedEvents).toContain("pointerup")
    expect(removedEvents).toContain("pointercancel")

    removeSpy.mockRestore()
  })

  it("ignores pointerdown on interactive children (button/input/select/textarea/a)", () => {
    const popoverEl = makePopoverEl()
    const button = document.createElement("button")
    popoverEl.appendChild(button)
    const { result } = renderHook(() => usePopoverDrag("step-key", popoverEl))

    const evt = {
      button: 0, clientX: 150, clientY: 130,
      target: button,
      preventDefault: jest.fn(),
    } as unknown as React.PointerEvent
    act(() => { result.current.onPointerDown(evt) })

    expect(result.current.isDragging).toBe(false)
    expect(evt.preventDefault).not.toHaveBeenCalled()
  })

  it("clamps drag position to viewport with 8px padding", () => {
    const popoverEl = makePopoverEl({ left: 0, top: 0, width: 200, height: 100 })
    const { result } = renderHook(() => usePopoverDrag("step-key", popoverEl))

    act(() => { result.current.onPointerDown(pointerDownEvent(0, 0)) })
    // Try to drag way past the viewport edge
    act(() => { document.dispatchEvent(new MouseEvent("pointermove", { clientX: 99999, clientY: 99999 })) })
    // maxX = 1024 - 200 - 8 = 816; maxY = 768 - 100 - 8 = 660
    expect(result.current.position).toEqual({ x: 816, y: 660 })

    act(() => { document.dispatchEvent(new MouseEvent("pointermove", { clientX: -99999, clientY: -99999 })) })
    expect(result.current.position).toEqual({ x: 8, y: 8 })
  })

  it("detaches leaked listeners from a prior gesture when pointerdown fires twice without pointerup", () => {
    const popoverEl = makePopoverEl()
    const { result } = renderHook(() => usePopoverDrag("step-key", popoverEl))

    // First gesture — never receives pointerup (e.g. browser swallowed it)
    act(() => { result.current.onPointerDown(pointerDownEvent(150, 130)) })
    // Second gesture starts before the first one closed out
    act(() => { result.current.onPointerDown(pointerDownEvent(300, 200)) })

    // A single pointermove should now drive only the second gesture's handler.
    // Spy on setPosition indirectly: assert position reflects the second gesture's grab offsets.
    // First gesture grabbed at (150,130) on a popover at (100,100) → grab offset (50,30).
    // Second gesture grabbed at (300,200) on the same popover → grab offset (200,100).
    // A move to (310,210) should yield position (310-200, 210-100) = (110, 110), NOT (260, 180).
    act(() => { document.dispatchEvent(new MouseEvent("pointermove", { clientX: 310, clientY: 210 })) })
    expect(result.current.position).toEqual({ x: 110, y: 110 })
  })

  it("resets position when resetKey changes (e.g. step transition)", () => {
    const popoverEl = makePopoverEl()
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => usePopoverDrag(key, popoverEl),
      { initialProps: { key: "step-1" } }
    )

    act(() => { result.current.onPointerDown(pointerDownEvent()) })
    act(() => { document.dispatchEvent(new MouseEvent("pointermove", { clientX: 200, clientY: 180 })) })
    act(() => { document.dispatchEvent(new MouseEvent("pointerup")) })
    expect(result.current.position).not.toBeNull()

    rerender({ key: "step-2" })
    expect(result.current.position).toBeNull()
  })
})
