import { fireEvent, render, screen } from "@testing-library/react"
import { Popover } from "./popover"
import { EngineLiveState } from "./tour-engine-state"
import * as scrollIntoViewModule from "./scroll-into-view"

jest.mock("../tour-styles.scss", () => ({}))

function makeState(overrides: Partial<EngineLiveState> = {}): EngineLiveState {
  const target = document.createElement("div")
  document.body.appendChild(target)
  const step = { element: target, popover: { title: "Title", description: "Body" } }
  return {
    active: true,
    kind: "tour",
    activeIndex: 0,
    steps: [step],
    currentStep: step,
    options: { showProgress: true },
    callbacks: {},
    refreshTick: 0,
    preFocusAnchor: null,
    moveNext: jest.fn(),
    movePrevious: jest.fn(),
    cancel: jest.fn(),
    ...overrides,
  }
}

describe("Popover component", () => {
  it("renders with role=region and aria-label='Tour step'", () => {
    const state = makeState()
    render(<Popover state={state} />)
    const popover = screen.getByRole("region", { name: "Tour step" })
    expect(popover).toBeInTheDocument()
    expect(popover.getAttribute("data-testid")).toBe("codap-tour-popover")
  })

  it("renders title and description with their testids", () => {
    const state = makeState()
    render(<Popover state={state} />)
    expect(screen.getByTestId("codap-tour-popover-title")).toHaveTextContent("Title")
    expect(screen.getByTestId("codap-tour-popover-description")).toHaveTextContent("Body")
  })

  it("title/description live region has aria-live='polite' and aria-atomic='true'", () => {
    const state = makeState()
    render(<Popover state={state} />)
    const live = screen.getByTestId("codap-tour-popover-live-region")
    expect(live.getAttribute("aria-live")).toBe("polite")
    expect(live.getAttribute("aria-atomic")).toBe("true")
  })

  it("close button has aria-label='Close'", () => {
    const state = makeState()
    render(<Popover state={state} />)
    const close = screen.getByTestId("codap-tour-popover-close-btn")
    expect(close.getAttribute("aria-label")).toBe("Close")
  })

  it("renders progress text in tour mode when showProgress is true", () => {
    const t1 = document.createElement("div"); document.body.appendChild(t1)
    const t2 = document.createElement("div"); document.body.appendChild(t2)
    const t3 = document.createElement("div"); document.body.appendChild(t3)
    const steps = [
      { element: t1, popover: { title: "A" } },
      { element: t2, popover: { title: "B" } },
      { element: t3, popover: { title: "C" } },
    ]
    const state = makeState({
      steps,
      currentStep: steps[0],
      activeIndex: 0,
      options: { showProgress: true }
    })
    render(<Popover state={state} />)
    expect(screen.getByTestId("codap-tour-popover-progress-text")).toHaveTextContent("1 of 3")
  })

  it("does not render progress text in highlight mode", () => {
    const state = makeState({ kind: "highlight", options: { showProgress: true } })
    render(<Popover state={state} />)
    expect(screen.queryByTestId("codap-tour-popover-progress-text")).toBeNull()
  })

  it("applies the reduced-motion modifier class when matchMedia matches", () => {
    const original = window.matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: () => ({
        matches: true, media: "", onchange: null,
        addEventListener: jest.fn(), removeEventListener: jest.fn(),
        addListener: jest.fn(), removeListener: jest.fn(), dispatchEvent: jest.fn(),
      }),
    })
    try {
      const state = makeState()
      render(<Popover state={state} />)
      const popover = screen.getByTestId("codap-tour-popover")
      expect(popover.className).toContain("codap-tour-popover--reduced-motion")
    } finally {
      Object.defineProperty(window, "matchMedia", { writable: true, value: original })
    }
  })

  it("does not apply the reduced-motion modifier class when matchMedia does not match", () => {
    const state = makeState()
    render(<Popover state={state} />)
    const popover = screen.getByTestId("codap-tour-popover")
    expect(popover.className).not.toContain("codap-tour-popover--reduced-motion")
  })

  it("applies the reduced-motion modifier class when opts.animate is false", () => {
    const state = makeState({ options: { animate: false } })
    render(<Popover state={state} />)
    expect(screen.getByTestId("codap-tour-popover").className)
      .toContain("codap-tour-popover--reduced-motion")
  })

  it("clicking the next button calls state.moveNext()", () => {
    const state = makeState()
    render(<Popover state={state} />)
    fireEvent.click(screen.getByTestId("codap-tour-popover-next-btn"))
    expect(state.moveNext).toHaveBeenCalled()
  })

  it("clicking the close button calls state.cancel()", () => {
    const state = makeState()
    render(<Popover state={state} />)
    fireEvent.click(screen.getByTestId("codap-tour-popover-close-btn"))
    expect(state.cancel).toHaveBeenCalled()
  })

  it("defaults smoothScroll to false when opts.smoothScroll is unset", () => {
    const spy = jest.spyOn(scrollIntoViewModule, "scrollTargetIntoView")
    const state = makeState({ options: {} })
    render(<Popover state={state} />)
    expect(spy).toHaveBeenCalledWith(state.currentStep!.element, false)
    spy.mockRestore()
  })

  it("honors smoothScroll: true when explicitly set", () => {
    const spy = jest.spyOn(scrollIntoViewModule, "scrollTargetIntoView")
    const state = makeState({ options: { smoothScroll: true } })
    render(<Popover state={state} />)
    expect(spy).toHaveBeenCalledWith(state.currentStep!.element, true)
    spy.mockRestore()
  })

  // Without this, focus stays on whatever launched the tour (often a plugin iframe)
  // and arrow keys never reach the document-level keydown listener.
  it("focuses the popover on mount so arrow keys reach the keyboard handler", () => {
    const state = makeState()
    render(<Popover state={state} />)
    const popover = screen.getByTestId("codap-tour-popover")
    expect(popover.getAttribute("tabindex")).toBe("-1")
    expect(popover).toHaveFocus()
  })
})
