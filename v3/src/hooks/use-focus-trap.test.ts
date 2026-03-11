import { renderHook } from "@testing-library/react"
import { useFocusTrap } from "./use-focus-trap"

// mock KeyboardEvents for the handler
function tabEvent(opts: { shiftKey?: boolean } = {}) {
  const event = {
    key: "Tab",
    shiftKey: opts.shiftKey ?? false,
    preventDefault: jest.fn()
  }
  return event as unknown as React.KeyboardEvent<HTMLDivElement>
}

function nonTabEvent(key = "Enter") {
  return {
    key,
    shiftKey: false,
    preventDefault: jest.fn()
  } as unknown as React.KeyboardEvent<HTMLDivElement>
}

// JSDom doesn't compute layout so offsetParent is always null.
// We stub it on elements we want treated as visible.
function makeVisible(el: HTMLElement) {
  Object.defineProperty(el, "offsetParent", { value: document.body, configurable: true })
}

describe("useFocusTrap", () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  it("returns a ref and a keydown handler", () => {
    const { result } = renderHook(() => useFocusTrap())
    expect(result.current.formRef).toBeDefined()
    expect(typeof result.current.handleFormKeyDown).toBe("function")
  })

  it("ignores non-Tab keys", () => {
    const { result } = renderHook(() => useFocusTrap())
    const event = nonTabEvent("Enter")
    // Should not throw even with no ref attached
    result.current.handleFormKeyDown(event)
    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it("does nothing when container ref is null", () => {
    const { result } = renderHook(() => useFocusTrap())
    const event = tabEvent()
    // formRef.current is null by default
    result.current.handleFormKeyDown(event)
    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it("does nothing when container has no focusable elements", () => {
    const { result } = renderHook(() => useFocusTrap())
    // Attach ref to an empty container
    Object.defineProperty(result.current.formRef, "current", { value: container, writable: true })

    const event = tabEvent()
    result.current.handleFormKeyDown(event)
    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  describe("with focusable elements", () => {
    let input1: HTMLInputElement
    let input2: HTMLInputElement
    let button1: HTMLButtonElement

    beforeEach(() => {
      input1 = document.createElement("input")
      input2 = document.createElement("input")
      button1 = document.createElement("button")
      container.append(input1, input2, button1)
      makeVisible(input1)
      makeVisible(input2)
      makeVisible(button1)
    })

    it("wraps focus from last to first on Tab", () => {
      const { result } = renderHook(() => useFocusTrap())
      Object.defineProperty(result.current.formRef, "current", { value: container, writable: true })

      button1.focus()
      const event = tabEvent()
      result.current.handleFormKeyDown(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(input1).toHaveFocus()
    })

    it("wraps focus from first to last on Shift+Tab", () => {
      const { result } = renderHook(() => useFocusTrap())
      Object.defineProperty(result.current.formRef, "current", { value: container, writable: true })

      input1.focus()
      const event = tabEvent({ shiftKey: true })
      result.current.handleFormKeyDown(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(button1).toHaveFocus()
    })

    it("does not prevent default when focus is on a middle element", () => {
      const { result } = renderHook(() => useFocusTrap())
      Object.defineProperty(result.current.formRef, "current", { value: container, writable: true })

      input2.focus()
      const forwardEvent = tabEvent()
      result.current.handleFormKeyDown(forwardEvent)
      expect(forwardEvent.preventDefault).not.toHaveBeenCalled()

      const backwardEvent = tabEvent({ shiftKey: true })
      result.current.handleFormKeyDown(backwardEvent)
      expect(backwardEvent.preventDefault).not.toHaveBeenCalled()
    })
  })

  describe("element filtering", () => {
    it("excludes elements inside aria-hidden containers", () => {
      const visibleInput = document.createElement("input")
      const hiddenWrapper = document.createElement("div")
      hiddenWrapper.setAttribute("aria-hidden", "true")
      const hiddenInput = document.createElement("input")
      hiddenWrapper.appendChild(hiddenInput)
      container.append(visibleInput, hiddenWrapper)
      makeVisible(visibleInput)
      makeVisible(hiddenInput)

      const { result } = renderHook(() => useFocusTrap())
      Object.defineProperty(result.current.formRef, "current", { value: container, writable: true })

      // With only one visible focusable element, Tab on it should wrap to itself
      visibleInput.focus()
      const event = tabEvent()
      result.current.handleFormKeyDown(event)

      // first === last === visibleInput, so both forward and backward wrap to it
      expect(event.preventDefault).toHaveBeenCalled()
      expect(visibleInput).toHaveFocus()
    })

    it("excludes hidden elements (offsetParent is null)", () => {
      const visibleInput = document.createElement("input")
      const hiddenButton = document.createElement("button")
      container.append(visibleInput, hiddenButton)
      makeVisible(visibleInput)
      // hiddenButton has offsetParent === null (JSDom default), so it's excluded

      const { result } = renderHook(() => useFocusTrap())
      Object.defineProperty(result.current.formRef, "current", { value: container, writable: true })

      visibleInput.focus()
      const event = tabEvent()
      result.current.handleFormKeyDown(event)

      // Only one focusable element, wraps to itself
      expect(event.preventDefault).toHaveBeenCalled()
      expect(visibleInput).toHaveFocus()
    })

    it("includes anchor elements with href", () => {
      const link = document.createElement("a")
      link.href = "https://example.com"
      const input = document.createElement("input")
      container.append(link, input)
      makeVisible(link)
      makeVisible(input)

      const { result } = renderHook(() => useFocusTrap())
      Object.defineProperty(result.current.formRef, "current", { value: container, writable: true })

      // Focus last element, Tab should wrap to link
      input.focus()
      const event = tabEvent()
      result.current.handleFormKeyDown(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(link).toHaveFocus()
    })

    it("includes elements with tabindex", () => {
      const div = document.createElement("div")
      div.setAttribute("tabindex", "0")
      const input = document.createElement("input")
      container.append(div, input)
      makeVisible(div)
      makeVisible(input)

      const { result } = renderHook(() => useFocusTrap())
      Object.defineProperty(result.current.formRef, "current", { value: container, writable: true })

      input.focus()
      const event = tabEvent()
      result.current.handleFormKeyDown(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(div).toHaveFocus()
    })

    it("excludes elements with tabindex=-1", () => {
      // Place a tabindex=-1 div between two inputs to verify it's skipped.
      // If the div were included, Tab on input2 would not wrap to input1
      // (the div would be last, not input2).
      const input1 = document.createElement("input")
      const div = document.createElement("div")
      div.setAttribute("tabindex", "-1")
      const input2 = document.createElement("input")
      container.append(input1, div, input2)
      makeVisible(input1)
      makeVisible(div)
      makeVisible(input2)

      const { result } = renderHook(() => useFocusTrap())
      Object.defineProperty(result.current.formRef, "current", { value: container, writable: true })

      // Tab on the last focusable element (input2) should wrap to input1,
      // skipping the tabindex=-1 div entirely
      input2.focus()
      const event = tabEvent()
      result.current.handleFormKeyDown(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(input1).toHaveFocus()
    })
  })
})
