import { EngineOptions, EngineStepPopover } from "./tour-engine/tour-engine-types"

export interface ITourStep {
  /**
   * Config-layer element reference. Strings are CSS selectors resolved to
   * HTMLElement by runInternalTour() before the step is handed to the engine.
   * The engine's EngineStep.element is always HTMLElement; the engine never
   * resolves selectors.
   */
  element: string | HTMLElement
  popover?: EngineStepPopover
  /** Optional flag to skip this step without removing it from the configuration */
  skip?: boolean
}

export interface ITourConfig {
  /** Tour engine options */
  options?: EngineOptions
  /** Ordered list of tour steps */
  steps: ITourStep[]
}

export const defaultTourOptions: EngineOptions = {
  showProgress: true,
  doneBtnText: "Got it!",
  allowClose: true,
  allowKeyboardControl: true,
}
