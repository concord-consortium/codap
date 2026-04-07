import { renderHook } from "@testing-library/react"
import React from "react"
import { useTabTrap } from "./use-tab-trap"

// JSDom doesn't compute layout so offsetParent is always null.
// We stub it on elements we want treated as visible.
function makeVisible(el: HTMLElement) {
  Object.defineProperty(el, "offsetParent", { value: document.body, configurable: true })
}

describe("useTabTrap", () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  function setupTrap(getAdditionalElements?: () => HTMLElement[]) {
    const ref = { current: container } as React.RefObject<HTMLDivElement | null>
    return renderHook(() => useTabTrap({ containerRef: ref, getAdditionalElements }))
  }

  // Helper to dispatch a React-like keydown through the hook's handler
  function pressTab(handler: (e: React.KeyboardEvent) => void, shiftKey = false) {
    const event = {
      key: "Tab",
      shiftKey,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      preventDefault: jest.fn(),
    } as unknown as React.KeyboardEvent
    handler(event)
    return event
  }

  it("returns an onKeyDown handler", () => {
    const { result } = setupTrap()
    expect(typeof result.current.onKeyDown).toBe("function")
  })

  describe("Tab cycling", () => {
    let btn1: HTMLButtonElement
    let btn2: HTMLButtonElement
    let btn3: HTMLButtonElement

    beforeEach(() => {
      btn1 = document.createElement("button")
      btn2 = document.createElement("button")
      btn3 = document.createElement("button")
      container.append(btn1, btn2, btn3)
      makeVisible(btn1)
      makeVisible(btn2)
      makeVisible(btn3)
    })

    it("moves focus forward through tabbable elements", () => {
      const { result } = setupTrap()
      btn1.focus()
      pressTab(result.current.onKeyDown)
      expect(btn2).toHaveFocus()
    })

    it("moves focus backward with Shift+Tab", () => {
      const { result } = setupTrap()
      btn3.focus()
      pressTab(result.current.onKeyDown, true)
      expect(btn2).toHaveFocus()
    })

    it("wraps from last element to first on forward Tab", () => {
      const { result } = setupTrap()
      btn3.focus()
      pressTab(result.current.onKeyDown)
      expect(btn1).toHaveFocus()
    })

    it("wraps from first element to last on Shift+Tab", () => {
      const { result } = setupTrap()
      btn1.focus()
      pressTab(result.current.onKeyDown, true)
      expect(btn3).toHaveFocus()
    })

    it("calls preventDefault on Tab", () => {
      const { result } = setupTrap()
      btn1.focus()
      const event = pressTab(result.current.onKeyDown)
      expect(event.preventDefault).toHaveBeenCalled()
    })
  })

  describe("element filtering", () => {
    it("skips elements with tabindex=-1 (roving tabindex)", () => {
      const btn1 = document.createElement("button")
      const btn2 = document.createElement("button")
      btn2.setAttribute("tabindex", "-1")
      const btn3 = document.createElement("button")
      container.append(btn1, btn2, btn3)
      makeVisible(btn1)
      makeVisible(btn2)
      makeVisible(btn3)

      const { result } = setupTrap()
      btn1.focus()
      pressTab(result.current.onKeyDown)
      expect(btn3).toHaveFocus()
    })

    it("skips elements inside aria-hidden containers", () => {
      const btn1 = document.createElement("button")
      const hiddenDiv = document.createElement("div")
      hiddenDiv.setAttribute("aria-hidden", "true")
      const hiddenBtn = document.createElement("button")
      hiddenDiv.appendChild(hiddenBtn)
      const btn2 = document.createElement("button")
      container.append(btn1, hiddenDiv, btn2)
      makeVisible(btn1)
      makeVisible(hiddenBtn)
      makeVisible(btn2)

      const { result } = setupTrap()
      btn1.focus()
      pressTab(result.current.onKeyDown)
      expect(btn2).toHaveFocus()
    })
  })

  describe("modifier keys", () => {
    it("does not intercept Ctrl+Tab", () => {
      const btn1 = document.createElement("button")
      const btn2 = document.createElement("button")
      container.append(btn1, btn2)
      makeVisible(btn1)
      makeVisible(btn2)

      const { result } = setupTrap()
      btn1.focus()
      const event = {
        key: "Tab",
        shiftKey: false,
        ctrlKey: true,
        altKey: false,
        metaKey: false,
        preventDefault: jest.fn(),
      } as unknown as React.KeyboardEvent
      result.current.onKeyDown(event)
      // Focus should not have moved
      expect(btn1).toHaveFocus()
      expect(event.preventDefault).not.toHaveBeenCalled()
    })

    it("ignores non-Tab keys", () => {
      const btn1 = document.createElement("button")
      container.append(btn1)
      makeVisible(btn1)

      const { result } = setupTrap()
      btn1.focus()
      const event = {
        key: "Enter",
        shiftKey: false,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
        preventDefault: jest.fn(),
      } as unknown as React.KeyboardEvent
      result.current.onKeyDown(event)
      expect(event.preventDefault).not.toHaveBeenCalled()
    })
  })

  describe("getAdditionalElements", () => {
    it("includes additional elements in the tab cycle", () => {
      const btn1 = document.createElement("button")
      container.append(btn1)
      makeVisible(btn1)

      const extraBtn = document.createElement("button")
      document.body.appendChild(extraBtn)
      makeVisible(extraBtn)

      const { result } = setupTrap(() => [extraBtn])
      btn1.focus()
      pressTab(result.current.onKeyDown)
      expect(extraBtn).toHaveFocus()

      // Tab again wraps back to btn1
      pressTab(result.current.onKeyDown)
      expect(btn1).toHaveFocus()

      document.body.removeChild(extraBtn)
    })

    it("filters out non-tabbable additional elements", () => {
      const btn1 = document.createElement("button")
      container.append(btn1)
      makeVisible(btn1)

      const extraBtn = document.createElement("button")
      extraBtn.setAttribute("tabindex", "-1")
      document.body.appendChild(extraBtn)
      makeVisible(extraBtn)

      const { result } = setupTrap(() => [extraBtn])
      btn1.focus()
      // Should wrap back to btn1 since extraBtn has tabindex=-1
      pressTab(result.current.onKeyDown)
      expect(btn1).toHaveFocus()

      document.body.removeChild(extraBtn)
    })
  })

  describe("edge cases", () => {
    it("does nothing when container is empty", () => {
      const { result } = setupTrap()
      const event = {
        key: "Tab",
        shiftKey: false,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
        preventDefault: jest.fn(),
      } as unknown as React.KeyboardEvent
      result.current.onKeyDown(event)
      expect(event.preventDefault).not.toHaveBeenCalled()
    })

    it("stays on the only element when container has one tabbable element", () => {
      const btn = document.createElement("button")
      container.append(btn)
      makeVisible(btn)

      const { result } = setupTrap()
      btn.focus()
      pressTab(result.current.onKeyDown)
      expect(btn).toHaveFocus()
    })

    it("does nothing when containerRef is null", () => {
      const ref = { current: null } as React.RefObject<HTMLDivElement | null>
      const { result } = renderHook(() => useTabTrap({ containerRef: ref }))
      const event = {
        key: "Tab",
        shiftKey: false,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
        preventDefault: jest.fn(),
      } as unknown as React.KeyboardEvent
      result.current.onKeyDown(event)
      expect(event.preventDefault).not.toHaveBeenCalled()
    })
  })
})
