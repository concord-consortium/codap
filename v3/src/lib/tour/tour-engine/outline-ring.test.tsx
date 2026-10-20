import { render, screen } from "@testing-library/react"
import { OutlineRing } from "./outline-ring"
import { EngineLiveState } from "./tour-engine-state"

jest.mock("../tour-styles.scss", () => ({}))

function makeState(): EngineLiveState {
  const target = document.createElement("div")
  document.body.appendChild(target)
  const step = { element: target, popover: { title: "T", description: "D" } }
  return {
    active: true,
    kind: "tour",
    activeIndex: 0,
    steps: [step],
    currentStep: step,
    options: {},
    callbacks: {},
    refreshTick: 0,
    preFocusAnchor: null,
    moveNext: jest.fn(),
    movePrevious: jest.fn(),
    cancel: jest.fn(),
  }
}

describe("OutlineRing component", () => {
  it("renders with aria-hidden='true' and pointer-events:none", () => {
    const state = makeState()
    render(<OutlineRing target={state.currentStep!.element} state={state} />)
    const ring = screen.getByTestId("codap-tour-outline-ring")
    expect(ring.getAttribute("aria-hidden")).toBe("true")
    expect(ring.style.pointerEvents).toBe("none")
  })

  it("uses position fixed with computed rect from getBoundingClientRect", () => {
    const state = makeState()
    const target = state.currentStep!.element
    jest.spyOn(target, "getBoundingClientRect").mockReturnValue({
      top: 10, left: 20, right: 60, bottom: 40, width: 40, height: 30,
      x: 20, y: 10, toJSON: () => ({})
    })
    render(<OutlineRing target={target} state={state} />)
    const ring = screen.getByTestId("codap-tour-outline-ring")
    expect(ring.style.position).toBe("fixed")
    expect(ring.style.top).toBe("8px")
    expect(ring.style.left).toBe("18px")
    expect(ring.style.width).toBe("44px")
    expect(ring.style.height).toBe("34px")
  })

  it("unmounts cleanly", () => {
    const state = makeState()
    const { unmount } = render(<OutlineRing target={state.currentStep!.element} state={state} />)
    expect(screen.getByTestId("codap-tour-outline-ring")).toBeInTheDocument()
    unmount()
    expect(screen.queryByTestId("codap-tour-outline-ring")).toBeNull()
  })
})
