import { EngineCallbacks, EngineOptions, EngineStep } from "./tour-engine-types"

export interface EngineLiveState {
  active: boolean
  kind: "highlight" | "tour"
  activeIndex: number
  steps: EngineStep[]
  currentStep: EngineStep | null
  options: EngineOptions
  callbacks: EngineCallbacks
  /** Bumped by `refresh()` to force observers to re-run useFloating's `update()`. */
  refreshTick: number
  /** Captured on first step entry; used as a focus fallback during teardown. */
  preFocusAnchor: HTMLElement | null
  moveNext(): void
  movePrevious(): void
  cancel(): void
}
