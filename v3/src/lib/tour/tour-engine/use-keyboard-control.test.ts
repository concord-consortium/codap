import { renderHook } from "@testing-library/react"
import { useKeyboardControl } from "./use-keyboard-control"

function dispatch(key: string, target: HTMLElement = document.body) {
  const e = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
  target.dispatchEvent(e)
  return e
}

describe("useKeyboardControl", () => {
  let onNext: jest.Mock
  let onPrev: jest.Mock
  let onClose: jest.Mock

  beforeEach(() => {
    onNext = jest.fn()
    onPrev = jest.fn()
    onClose = jest.fn()
  })

  it("does not attach a listener when disabled", () => {
    renderHook(() => useKeyboardControl({
      enabled: false, allowClose: true, popoverEl: null, onNext, onPrev, onClose
    }))
    dispatch("ArrowRight")
    expect(onNext).not.toHaveBeenCalled()
  })

  it("ArrowRight fires onNext", () => {
    renderHook(() => useKeyboardControl({
      enabled: true, allowClose: true, popoverEl: null, onNext, onPrev, onClose
    }))
    dispatch("ArrowRight")
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it("ArrowLeft fires onPrev", () => {
    renderHook(() => useKeyboardControl({
      enabled: true, allowClose: true, popoverEl: null, onNext, onPrev, onClose
    }))
    dispatch("ArrowLeft")
    expect(onPrev).toHaveBeenCalledTimes(1)
  })

  it("Escape fires onClose when allowClose is true", () => {
    renderHook(() => useKeyboardControl({
      enabled: true, allowClose: true, popoverEl: null, onNext, onPrev, onClose
    }))
    dispatch("Escape")
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("Escape does not fire onClose when allowClose is false", () => {
    renderHook(() => useKeyboardControl({
      enabled: true, allowClose: false, popoverEl: null, onNext, onPrev, onClose
    }))
    dispatch("Escape")
    expect(onClose).not.toHaveBeenCalled()
  })

  it("does not preventDefault on Escape when allowClose is false", () => {
    renderHook(() => useKeyboardControl({
      enabled: true, allowClose: false, popoverEl: null, onNext, onPrev, onClose
    }))
    const event = dispatch("Escape")
    expect(event.defaultPrevented).toBe(false)
  })

  it("preventDefaults Escape when allowClose is true", () => {
    renderHook(() => useKeyboardControl({
      enabled: true, allowClose: true, popoverEl: null, onNext, onPrev, onClose
    }))
    const event = dispatch("Escape")
    expect(event.defaultPrevented).toBe(true)
  })

  it("ignores arrow keys when focus is in INPUT/TEXTAREA/SELECT/contenteditable", () => {
    renderHook(() => useKeyboardControl({
      enabled: true, allowClose: true, popoverEl: null, onNext, onPrev, onClose
    }))
    const input = document.createElement("input")
    document.body.appendChild(input)
    dispatch("ArrowRight", input)
    expect(onNext).not.toHaveBeenCalled()
    input.remove()
  })

  it("ignores ArrowRight when focus is inside a [role='menuitem']", () => {
    renderHook(() => useKeyboardControl({
      enabled: true, allowClose: true, popoverEl: null, onNext, onPrev, onClose
    }))
    const menu = document.createElement("div")
    menu.setAttribute("role", "menuitem")
    document.body.appendChild(menu)
    dispatch("ArrowRight", menu)
    expect(onNext).not.toHaveBeenCalled()
    menu.remove()
  })

  it.each(["option", "slider", "spinbutton", "dialog"])(
    "ignores ArrowRight when focus is inside [role='%s']",
    (role) => {
      renderHook(() => useKeyboardControl({
        enabled: true, allowClose: true, popoverEl: null, onNext, onPrev, onClose
      }))
      const widget = document.createElement("div")
      widget.setAttribute("role", role)
      document.body.appendChild(widget)
      dispatch("ArrowRight", widget)
      expect(onNext).not.toHaveBeenCalled()
      widget.remove()
    }
  )

  it("still fires onNext on ArrowRight when focus is INSIDE the popover", () => {
    const popoverEl = document.createElement("div")
    document.body.appendChild(popoverEl)
    const innerInput = document.createElement("input")
    popoverEl.appendChild(innerInput)
    renderHook(() => useKeyboardControl({
      enabled: true, allowClose: true, popoverEl, onNext, onPrev, onClose
    }))
    dispatch("ArrowRight", innerInput)
    expect(onNext).toHaveBeenCalledTimes(1)
    popoverEl.remove()
  })

  it("returns early when defaultPrevented (set by capturing listener)", () => {
    renderHook(() => useKeyboardControl({
      enabled: true, allowClose: true, popoverEl: null, onNext, onPrev, onClose
    }))
    const captureHandler = (e: KeyboardEvent) => e.preventDefault()
    document.addEventListener("keydown", captureHandler, true)
    try {
      dispatch("ArrowRight")
      expect(onNext).not.toHaveBeenCalled()
    } finally {
      document.removeEventListener("keydown", captureHandler, true)
    }
  })

  it("removes the listener on unmount", () => {
    const { unmount } = renderHook(() => useKeyboardControl({
      enabled: true, allowClose: true, popoverEl: null, onNext, onPrev, onClose
    }))
    unmount()
    dispatch("ArrowRight")
    expect(onNext).not.toHaveBeenCalled()
  })
})
