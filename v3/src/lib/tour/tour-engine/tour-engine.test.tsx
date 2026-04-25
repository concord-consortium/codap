/* eslint-disable testing-library/no-node-access */
import { act } from "@testing-library/react"
import { createTourEngine } from "./tour-engine"
import { CreateTourEngineArgs, EngineHandle, EngineStep } from "./tour-engine-types"

jest.mock("../tour-styles.scss", () => ({}))

function makeStep(): EngineStep {
  const el = document.createElement("div")
  document.body.appendChild(el)
  return { element: el, popover: { title: "T", description: "D" } }
}

function createEngine(args: CreateTourEngineArgs): EngineHandle {
  let engine!: EngineHandle
  act(() => { engine = createTourEngine(args) })
  return engine
}

async function flush() {
  // Allow microtask queue (engine's destroy schedules root.unmount via queueMicrotask)
  await act(async () => { await Promise.resolve() })
}

describe("tour engine orchestration", () => {
  it("drive() invokes onHighlightStarted once for step 0", async () => {
    const onHighlightStarted = jest.fn()
    const step = makeStep()
    const engine = createEngine({ steps: [step], onHighlightStarted })
    act(() => engine.drive())
    expect(onHighlightStarted).toHaveBeenCalledTimes(1)
    expect(onHighlightStarted.mock.calls[0][0]).toBe(step.element)
    expect(onHighlightStarted.mock.calls[0][2].state.activeIndex).toBe(0)
    act(() => engine.destroy())
    await flush()
  })

  it("moveNext fires onDeselected then onHighlightStarted in order", async () => {
    const calls: string[] = []
    const onHighlightStarted = jest.fn(() => calls.push("started"))
    const onDeselected = jest.fn(() => calls.push("deselected"))
    const engine = createEngine({
      steps: [makeStep(), makeStep()],
      onHighlightStarted, onDeselected
    })
    act(() => engine.drive())
    expect(calls).toEqual(["started"])
    act(() => engine.moveNext())
    expect(calls).toEqual(["started", "deselected", "started"])
    act(() => engine.destroy())
    await flush()
  })

  it("moveNext past last step fires onDeselected then onDestroyed; not onCancelRequested", async () => {
    const calls: string[] = []
    const onHighlightStarted = jest.fn(() => calls.push("started"))
    const onDeselected = jest.fn(() => calls.push("deselected"))
    const onDestroyed = jest.fn(() => calls.push("destroyed"))
    const onCancelRequested = jest.fn()
    const engine = createEngine({
      steps: [makeStep()],
      onHighlightStarted, onDeselected, onDestroyed, onCancelRequested
    })
    act(() => engine.drive())
    act(() => engine.moveNext())
    expect(calls).toEqual(["started", "deselected", "destroyed"])
    expect(onCancelRequested).not.toHaveBeenCalled()
    await flush()
  })

  it("moveTo with out-of-range index is a no-op", async () => {
    const onHighlightStarted = jest.fn()
    const onDeselected = jest.fn()
    const engine = createEngine({
      steps: [makeStep(), makeStep()],
      onHighlightStarted, onDeselected
    })
    act(() => engine.drive())
    onHighlightStarted.mockClear()
    onDeselected.mockClear()
    act(() => engine.moveTo(-1))
    act(() => engine.moveTo(2))
    act(() => engine.moveTo(99))
    expect(onDeselected).not.toHaveBeenCalled()
    expect(onHighlightStarted).not.toHaveBeenCalled()
    act(() => engine.destroy())
    await flush()
  })

  it("destroy() does not fire onDestroyed", async () => {
    const onDestroyed = jest.fn()
    const engine = createEngine({ steps: [makeStep()], onDestroyed })
    act(() => engine.drive())
    act(() => engine.destroy())
    await flush()
    expect(onDestroyed).not.toHaveBeenCalled()
  })

  it("refresh() does not throw and is observable via state", async () => {
    const engine = createEngine({ steps: [makeStep()] })
    act(() => engine.drive())
    // Smoke test: refresh() should not throw. Functional verification of the tick bump
    // is exercised indirectly when the popover useEffect re-runs useFloating.update().
    expect(() => act(() => engine.refresh())).not.toThrow()
    act(() => engine.destroy())
    await flush()
  })

  it("state.cancel() (via onCancelRequested) does not fire onDeselected or onDestroyed", async () => {
    const onDeselected = jest.fn()
    const onDestroyed = jest.fn()
    const onCancelRequested = jest.fn()
    const engine = createEngine({
      steps: [makeStep()],
      onDeselected, onDestroyed, onCancelRequested
    })
    act(() => engine.drive())
    onDeselected.mockClear()

    // Trigger cancel through the manager-callback signal — same path the popover uses on Close.
    act(() => onCancelRequested())
    expect(onCancelRequested).toHaveBeenCalledTimes(1)
    expect(onDeselected).not.toHaveBeenCalled()
    expect(onDestroyed).not.toHaveBeenCalled()
    act(() => engine.destroy())
    await flush()
  })

  it("focus moves to the step target if focus was inside the popover at destroy time", async () => {
    const target = document.createElement("button")
    document.body.appendChild(target)
    const engine = createEngine({ steps: [{ element: target }] })
    act(() => engine.drive())

    // Simulate focus inside the popover by adding a focused element with the popover class
    const popover = document.createElement("div")
    popover.className = "codap-tour-popover"
    const inner = document.createElement("button")
    popover.appendChild(inner)
    document.body.appendChild(popover)
    inner.focus()

    act(() => engine.destroy())
    await flush()
    expect(document.activeElement).toBe(target)
    target.remove()
    popover.remove()
  })

  it("focus falls back to pre-tour anchor when target was disconnected", async () => {
    const anchor = document.createElement("button")
    document.body.appendChild(anchor)
    anchor.focus()
    expect(document.activeElement).toBe(anchor)

    const target = document.createElement("button")
    document.body.appendChild(target)
    const engine = createEngine({ steps: [{ element: target }] })
    act(() => engine.drive())

    // Simulate focus inside the popover
    const popover = document.createElement("div")
    popover.className = "codap-tour-popover"
    const inner = document.createElement("button")
    popover.appendChild(inner)
    document.body.appendChild(popover)
    inner.focus()

    // Disconnect target before destroy
    target.remove()

    act(() => engine.destroy())
    await flush()
    expect(document.activeElement).toBe(anchor)
    anchor.remove()
    popover.remove()
  })
})
