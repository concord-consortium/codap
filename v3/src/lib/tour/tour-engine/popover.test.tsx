import { act, fireEvent, render, screen } from "@testing-library/react"
import { Popover } from "./popover"
import { EngineLiveState } from "./tour-engine-state"
import * as scrollIntoViewModule from "./scroll-into-view"
import * as translateModule from "../../../utilities/translation/translate"

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

  // Screen readers ignore a live region that is already filled when it appears, so the
  // first step would never be announced.
  it("mounts the live region empty and fills it with the step text afterwards", () => {
    jest.useFakeTimers()
    try {
      const state = makeState()
      render(<Popover state={state} />)
      const live = screen.getByTestId("codap-tour-popover-live-region")
      expect(live).toHaveTextContent(/^$/)
      act(() => { jest.runAllTimers() })
      expect(live).toHaveTextContent("Title Body")
    } finally {
      jest.useRealTimers()
    }
  })

  it("close button has aria-label='Close tour'", () => {
    const state = makeState()
    render(<Popover state={state} />)
    const close = screen.getByTestId("codap-tour-popover-close-btn")
    expect(close.getAttribute("aria-label")).toBe("Close tour")
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

  it("moves focus to Next when Previous returns to the first step, where Previous is hidden", () => {
    const state = makeState()
    const steps = [state.steps[0], { ...state.steps[0] }]
    const onSecond = { ...state, steps, activeIndex: 1, currentStep: steps[1] }
    const { rerender } = render(<Popover state={onSecond} />)
    const prev = screen.getByTestId("codap-tour-popover-prev-btn")
    prev.focus()
    fireEvent.click(prev)
    expect(onSecond.movePrevious).toHaveBeenCalled()

    rerender(<Popover state={{ ...onSecond, activeIndex: 0, currentStep: steps[0] }} />)
    expect(screen.queryByTestId("codap-tour-popover-prev-btn")).toBeNull()
    expect(screen.getByTestId("codap-tour-popover-next-btn")).toHaveFocus()
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

  it("does not steal focus on mount when active element is in the parent document", () => {
    const launcher = document.createElement("button")
    document.body.appendChild(launcher)
    launcher.focus()
    const state = makeState()
    render(<Popover state={state} />)
    const popover = screen.getByTestId("codap-tour-popover")
    expect(popover.getAttribute("tabindex")).toBe("-1")
    expect(launcher).toHaveFocus()
    document.body.removeChild(launcher)
  })

  // Plugin iframes don't bubble keydown to the parent document, so arrow/Escape would
  // otherwise be dead until the user clicked somewhere in the parent.
  it("pulls focus out of an iframe so arrow keys reach the keyboard handler", () => {
    const iframe = document.createElement("iframe")
    document.body.appendChild(iframe)
    iframe.focus()
    const state = makeState()
    render(<Popover state={state} />)
    const popover = screen.getByTestId("codap-tour-popover")
    expect(popover).toHaveFocus()
    document.body.removeChild(iframe)
  })

  describe("localized labels", () => {
    beforeEach(() => {
      jest.spyOn(translateModule, "t").mockImplementation((key: string) => `[${key}]`)
    })
    afterEach(() => { jest.restoreAllMocks() })

    function makeTwoStepState(activeIndex: number, kind: "tour" | "highlight" = "tour") {
      const state = makeState({ kind })
      const steps = [state.steps[0], { ...state.steps[0] }]
      return { ...state, steps, activeIndex, currentStep: steps[activeIndex] }
    }

    it("takes the region name, button labels and progress text from translation keys", () => {
      render(<Popover state={makeTwoStepState(1)} />)
      expect(screen.getByRole("region", { name: "[V3.Tour.stepRegion]" })).toBeInTheDocument()
      expect(screen.getByTestId("codap-tour-popover-prev-btn")).toHaveTextContent("[V3.Tour.previous]")
      expect(screen.getByTestId("codap-tour-popover-next-btn")).toHaveTextContent("[V3.Tour.gotIt]")
      expect(screen.getByTestId("codap-tour-popover-close-btn").getAttribute("aria-label"))
        .toBe("[V3.Tour.close]")
      expect(screen.getByTestId("codap-tour-popover-progress-text")).toHaveTextContent("[V3.Tour.progress]")
    })

    it("labels Next from a translation key before the last step", () => {
      render(<Popover state={makeTwoStepState(0)} />)
      expect(screen.getByTestId("codap-tour-popover-next-btn")).toHaveTextContent("[V3.Tour.next]")
    })

    it("labels a highlight's button Done", () => {
      render(<Popover state={makeState({ kind: "highlight" })} />)
      expect(screen.getByTestId("codap-tour-popover-next-btn")).toHaveTextContent("[V3.Tour.done]")
    })

    it("prefers plugin-supplied labels", () => {
      const state = makeTwoStepState(1)
      render(<Popover state={{ ...state, options: { ...state.options, doneBtnText: "Finish" } }} />)
      expect(screen.getByTestId("codap-tour-popover-next-btn")).toHaveTextContent("Finish")
    })
  })
})
