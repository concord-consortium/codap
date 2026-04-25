import { observable, runInAction } from "mobx"
import { createRoot, Root } from "react-dom/client"
import { EngineLiveState } from "./tour-engine-state"
import { CreateTourEngineArgs, EngineHandle, EngineStep } from "./tour-engine-types"
import { TourRoot } from "./tour-root"

export type { EngineLiveState } from "./tour-engine-state"

export function createTourEngine(args: CreateTourEngineArgs): EngineHandle {
  const {
    steps: initialSteps = [],
    onHighlightStarted, onDeselected, onDestroyed, onCancelRequested,
    ...options
  } = args

  const state = observable<EngineLiveState>({
    active: false,
    kind: "tour",
    activeIndex: 0,
    steps: [],
    currentStep: null,
    options,
    callbacks: { onHighlightStarted, onDeselected, onDestroyed, onCancelRequested },
    refreshTick: 0,
    preFocusAnchor: null,
    moveNext: () => moveNext(),
    movePrevious: () => movePrevious(),
    cancel: () => state.callbacks.onCancelRequested?.(),
  })

  const container = document.createElement("div")
  container.setAttribute("data-testid", "codap-tour-root")
  document.body.appendChild(container)
  const root: Root = createRoot(container)
  root.render(<TourRoot state={state} />)

  function enterStep(index: number) {
    const step = state.steps[index]
    if (!step) return
    runInAction(() => {
      if (state.preFocusAnchor == null) {
        state.preFocusAnchor = document.activeElement as HTMLElement | null
      }
      state.activeIndex = index
      state.currentStep = step
      state.active = true
    })
    state.callbacks.onHighlightStarted?.(step.element, step, { state: { activeIndex: index } })
  }

  function leaveStep() {
    if (!state.active) return
    state.callbacks.onDeselected?.()
  }

  function drive() {
    if (initialSteps.length === 0) return
    runInAction(() => {
      state.kind = "tour"
      state.steps = initialSteps
      state.activeIndex = 0
    })
    enterStep(0)
  }

  function highlight(step: EngineStep) {
    runInAction(() => {
      state.kind = "highlight"
      state.steps = [step]
      state.activeIndex = 0
    })
    enterStep(0)
  }

  function moveNext() {
    if (!state.active) return
    const next = state.activeIndex + 1
    if (next >= state.steps.length) {
      leaveStep()
      state.callbacks.onDestroyed?.()
      destroy()
      return
    }
    leaveStep()
    enterStep(next)
  }

  function movePrevious() {
    if (!state.active) return
    const prev = state.activeIndex - 1
    if (prev < 0) return
    leaveStep()
    enterStep(prev)
  }

  function moveTo(index: number) {
    if (!state.active) return
    if (index < 0 || index >= state.steps.length) return
    if (index === state.activeIndex) return
    leaveStep()
    enterStep(index)
  }

  function refresh() {
    if (!state.active) return
    runInAction(() => { state.refreshTick += 1 })
  }

  function destroy() {
    const active = document.activeElement as HTMLElement | null
    const focusInPopover = !!active?.closest(".codap-tour-popover")
    const focusTarget = state.currentStep?.element ?? null
    const preAnchor = state.preFocusAnchor

    runInAction(() => {
      state.active = false
      state.currentStep = null
    })

    if (focusInPopover) {
      if (focusTarget?.isConnected) {
        if (!focusTarget.hasAttribute("tabindex")) focusTarget.setAttribute("tabindex", "-1")
        focusTarget.focus({ preventScroll: true })
      } else if (preAnchor?.isConnected) {
        preAnchor.focus({ preventScroll: true })
      }
    }

    queueMicrotask(() => {
      root.unmount()
      container.remove()
    })
  }

  return { drive, highlight, moveNext, movePrevious, moveTo, refresh, destroy }
}
