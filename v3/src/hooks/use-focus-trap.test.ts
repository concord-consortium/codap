/* eslint-disable testing-library/no-node-access */
import { renderHook } from "@testing-library/react"
import React from "react"
import { useFocusTrap } from "./use-focus-trap"

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

  // Helper: set up the trap with an external ref pointing at `container`
  function setupTrap() {
    const ref = { current: container } as React.RefObject<HTMLDivElement | null>
    return renderHook(() => useFocusTrap(ref))
  }

  // Simulate a Tab or Shift+Tab keydown so the hook tracks direction
  function simulateTab(shiftKey = false) {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey, bubbles: true }))
  }

  it("returns a ref", () => {
    const { result } = renderHook(() => useFocusTrap())
    expect(result.current.focusTrapRef).toBeDefined()
  })

  describe("sentinel elements", () => {
    it("inserts start and end sentinels into the container", () => {
      setupTrap()
      const sentinels = container.querySelectorAll<HTMLElement>('[aria-hidden="true"]')
      expect(sentinels.length).toBe(2)
      expect(sentinels[0]).toBe(container.firstChild)
      expect(sentinels[1]).toBe(container.lastChild)
      expect(sentinels[0].tabIndex).toBe(0)
      expect(sentinels[1].tabIndex).toBe(0)
    })

    it("removes sentinels on unmount", () => {
      const { unmount } = setupTrap()
      expect(container.querySelectorAll('[aria-hidden="true"]').length).toBe(2)
      unmount()
      expect(container.querySelectorAll('[aria-hidden="true"]').length).toBe(0)
    })
  })

  describe("focus wrapping", () => {
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

    it("wraps focus from end sentinel to first focusable element", () => {
      setupTrap()
      const endSentinel = container.lastChild as HTMLElement
      endSentinel.focus()
      expect(input1).toHaveFocus()
    })

    it("wraps focus from start sentinel to last focusable element on Shift+Tab", () => {
      setupTrap()
      simulateTab(true)
      const startSentinel = container.firstChild as HTMLElement
      startSentinel.focus()
      expect(button1).toHaveFocus()
    })

    it("wraps focus from start sentinel to first focusable element on forward Tab", () => {
      setupTrap()
      simulateTab()
      const startSentinel = container.firstChild as HTMLElement
      startSentinel.focus()
      expect(input1).toHaveFocus()
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

      setupTrap()

      // End sentinel should redirect to the only visible focusable element
      const endSentinel = container.lastChild as HTMLElement
      endSentinel.focus()
      expect(visibleInput).toHaveFocus()

      // Start sentinel should also redirect to it (first === last)
      const startSentinel = container.firstChild as HTMLElement
      startSentinel.focus()
      expect(visibleInput).toHaveFocus()
    })

    it("excludes hidden elements (offsetParent is null)", () => {
      const visibleInput = document.createElement("input")
      const hiddenButton = document.createElement("button")
      container.append(visibleInput, hiddenButton)
      makeVisible(visibleInput)
      // hiddenButton has offsetParent === null (JSDom default), so it's excluded

      setupTrap()

      const endSentinel = container.lastChild as HTMLElement
      endSentinel.focus()
      expect(visibleInput).toHaveFocus()
    })

    it("includes anchor elements with href", () => {
      const link = document.createElement("a")
      link.href = "https://example.com"
      const input = document.createElement("input")
      container.append(link, input)
      makeVisible(link)
      makeVisible(input)

      setupTrap()

      // End sentinel → first element (link)
      const endSentinel = container.lastChild as HTMLElement
      endSentinel.focus()
      expect(link).toHaveFocus()

      // Start sentinel + Shift+Tab → last element (input)
      simulateTab(true)
      const startSentinel = container.firstChild as HTMLElement
      startSentinel.focus()
      expect(input).toHaveFocus()
    })

    it("includes elements with tabindex", () => {
      const div = document.createElement("div")
      div.setAttribute("tabindex", "0")
      const input = document.createElement("input")
      container.append(div, input)
      makeVisible(div)
      makeVisible(input)

      setupTrap()

      const endSentinel = container.lastChild as HTMLElement
      endSentinel.focus()
      expect(div).toHaveFocus()
    })

    it("excludes elements with tabindex=-1", () => {
      const input1 = document.createElement("input")
      const div = document.createElement("div")
      div.setAttribute("tabindex", "-1")
      const input2 = document.createElement("input")
      container.append(input1, div, input2)
      makeVisible(input1)
      makeVisible(div)
      makeVisible(input2)

      setupTrap()

      // Start sentinel + Shift+Tab should wrap to last focusable (input2), skipping div
      simulateTab(true)
      const startSentinel = container.firstChild as HTMLElement
      startSentinel.focus()
      expect(input2).toHaveFocus()

      // End sentinel + forward Tab should wrap to first focusable (input1), skipping div
      simulateTab()
      const endSentinel = container.lastChild as HTMLElement
      endSentinel.focus()
      expect(input1).toHaveFocus()
    })

    it("excludes disabled form elements", () => {
      const input = document.createElement("input")
      const disabledButton = document.createElement("button")
      disabledButton.disabled = true
      const button = document.createElement("button")
      container.append(input, disabledButton, button)
      makeVisible(input)
      makeVisible(disabledButton)
      makeVisible(button)

      setupTrap()

      // End sentinel should wrap to first focusable (input), skipping disabled button
      const endSentinel = container.lastChild as HTMLElement
      endSentinel.focus()
      expect(input).toHaveFocus()

      // Start sentinel + Shift+Tab should wrap to last focusable (button), skipping disabled button
      simulateTab(true)
      const startSentinel = container.firstChild as HTMLElement
      startSentinel.focus()
      expect(button).toHaveFocus()
    })
  })
})
